import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { MusicContext } from "./Player/MusicContext";
import { db, storage } from "./firebase";
import {
  collection,
  query,
  onSnapshot,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import "./SongDisplay.css";
import Song from "./models/Song";
import PlaylistPortal from "./pages/PlaylistPortal";
import { Playlist } from "./models/Playlist";
import Album from "./models/Album";

// Utility: newest → oldest by createdAt
const compareByCreatedAtDesc = (a: Song, b: Song) => {
  const toMillis = (d: any) =>
    d?.toMillis ? d.toMillis() : new Date(d ?? 0).getTime();
  return toMillis(b.createdAt) - toMillis(a.createdAt);
};

interface SongDisplayProps {
  vizionaryId?: string;
  albumId?: string;
  playlist?: Playlist;
  /** Optional override: directly supply songs to display (skips fetching) */
  songs?: Song[];
  /** Optional filtered list (legacy) */
  filteredSongs?: Song[];
  /** Fired when the user wants to remove a song */
  onRemoveSong?: (songId: string) => void;
}

const SongDisplay: React.FC<SongDisplayProps> = ({
  vizionaryId,
  albumId,
  filteredSongs,
  songs: songsProp,
  onRemoveSong,
}) => {
  const { setSelectedSong, allSongs } = useContext(MusicContext);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSongForPlaylist] = useState<Song | null>(null);
  const [showPlaylistPortal, setShowPlaylistPortal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [playIconUrl, setPlayIconUrl] = useState("");

  // If songs are supplied via props, use them and skip fetching
  useEffect(() => {
    if (songsProp) {
      setSongs([...songsProp].sort(compareByCreatedAtDesc));
      setLoading(false);
      dataFetchedRef.current = true;
    }
  }, [songsProp]);

  // Track if data has been fetched to prevent refetching
  const dataFetchedRef = useRef(false);
  // Store the cleanup function for data fetching
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Stable references to props to prevent unnecessary fetches
  const vizionaryIdRef = useRef(vizionaryId);
  const albumIdRef = useRef(albumId);
  const filteredSongsRef = useRef(filteredSongs);

  // Memoize the filteredSongs prop to prevent unnecessary re-renders
  const memoizedFilteredSongs = useMemo(() => filteredSongs, [filteredSongs]);

  // Convert gs:// URLs to https://
  const convertGsUrlToHttps = useCallback(
    async (url?: string): Promise<string> => {
      // 1. Fallback for empty or missing values
      if (!url) return "/fallback-cover.jpg";

      // 2. If it's already an HTTP(S) URL, just return it
      if (url.startsWith("http://") || url.startsWith("https://")) return url;

      // 3. If it's a gs:// link, convert via getDownloadURL
      if (url.startsWith("gs://")) {
        try {
          const storageRef = ref(storage, url);
          return await getDownloadURL(storageRef);
        } catch (err) {
          console.error("Failed to convert gs:// URL:", err);
          return "/fallback-cover.jpg";
        }
      }

      // 4. Unknown scheme – fall back
      return "/fallback-cover.jpg";
    },
    []
  );

  // Fetch play icon once
  useEffect(() => {
    if (playIconUrl) return;

    const fetchIcons = async () => {
      try {
        const playUrl = await getDownloadURL(
          ref(storage, "icons/icons8-play-50.png")
        );
        setPlayIconUrl(playUrl);
      } catch (error) {
        console.error("Error fetching icons:", error);
      }
    };
    fetchIcons();
  }, []);

  // Track auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      setCurrentUserId(user ? user.uid : null);
    });
    return unsubscribe;
  }, []);

  // Isolated function to handle playing a song without triggering rerenders
  const handlePlaySong = useCallback(
    (song: Song) => {
      setSelectedSong(song);
    },
    [setSelectedSong]
  );

  // Isolated function to handle adding to playlist without triggering rerenders

  // Check if props have meaningfully changed to prevent unnecessary data fetching
  const shouldRefetch = useCallback(() => {
    // If we've never fetched or props changed, we should fetch
    const propsChanged =
      vizionaryIdRef.current !== vizionaryId ||
      albumIdRef.current !== albumId ||
      JSON.stringify(filteredSongsRef.current) !==
        JSON.stringify(filteredSongs);

    // Update refs to current props
    vizionaryIdRef.current = vizionaryId;
    albumIdRef.current = albumId;
    filteredSongsRef.current = filteredSongs;

    return !dataFetchedRef.current || propsChanged;
  }, [vizionaryId, albumId, filteredSongs]);

  // Main effect for fetching songs - only runs on first mount or when props change
  useEffect(() => {
    // Skip if we don't need to refetch
    if (!shouldRefetch()) {
      return;
    }

    let isMounted = true;

    // Clean up any existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const fetchSongs = async () => {
      if (!isMounted) return;

      setLoading(true);

      // Case 1: Use filtered songs directly if provided
      if (memoizedFilteredSongs && memoizedFilteredSongs.length > 0) {
        console.log("✅ Using filteredSongs instead of fetching.");
        setSongs([...memoizedFilteredSongs].sort(compareByCreatedAtDesc));
        setLoading(false);
        dataFetchedRef.current = true;
        return;
      }

      // Case 2: Fetch songs for an album
      if (albumId) {
        console.log("🎵 Fetching album data for:", albumId);

        try {
          const albumDoc = await getDoc(doc(db, "albums", albumId));
          if (!albumDoc.exists() || !isMounted) {
            if (isMounted) {
              setSongs([]);
              setLoading(false);
              dataFetchedRef.current = true;
            }
            return;
          }

          const albumData = albumDoc.data() as Album;
          if (
            !albumData.songIds ||
            albumData.songIds.length === 0 ||
            !isMounted
          ) {
            if (isMounted) {
              setSongs([]);
              setLoading(false);
              dataFetchedRef.current = true;
            }
            return;
          }

          // Retrieve songs from `allSongs` in the correct order
          const orderedSongs: Song[] = albumData.songIds
            .map((id) => allSongs.find((song) => song.id === id))
            .filter((song): song is Song => Boolean(song));

          if (isMounted) {
            setSongs([...orderedSongs].sort(compareByCreatedAtDesc));
            setLoading(false);
            dataFetchedRef.current = true;
          }
        } catch (error) {
          console.error("❌ Error fetching album data:", error);
          if (isMounted) {
            setSongs([]);
            setLoading(false);
            dataFetchedRef.current = true;
          }
        }
        return;
      }

      // Case 3: Fetch songs for a specific vizionary
      if (vizionaryId) {
        console.log("🎵 Fetching songs for Vizionary:", vizionaryId);
        try {
          const songQuery = query(
            collection(db, "songs"),
            where("vizionaries", "array-contains", vizionaryId)
          );

          const unsub = onSnapshot(songQuery, async (snapshot) => {
            if (!isMounted) return;

            if (snapshot.empty) {
              setSongs([]);
              setLoading(false);
              dataFetchedRef.current = true;
              return;
            }

            try {
              const fetchedSongs: Song[] = await Promise.all(
                snapshot.docs.map(async (docSnap) => {
                  const songData = docSnap.data();
                  return {
                    id: docSnap.id,
                    title: songData.title || "Untitled",
                    audio: await convertGsUrlToHttps(songData.audio),
                    coverArt: await convertGsUrlToHttps(songData.coverArt),
                    vizionaries: songData.vizionaries || [],
                    createdAt: songData.createdAt,
                  };
                })
              );

              if (isMounted) {
                setSongs([...fetchedSongs].sort(compareByCreatedAtDesc));
                setLoading(false);
                dataFetchedRef.current = true;
              }
            } catch (error) {
              console.error("Error processing songs:", error);
              if (isMounted) {
                setLoading(false);
                dataFetchedRef.current = true;
              }
            }
          });

          unsubscribeRef.current = unsub;
        } catch (error) {
          console.error("Error setting up vizionary listener:", error);
          if (isMounted) {
            setLoading(false);
            dataFetchedRef.current = true;
          }
        }
        return;
      }

      // Case 4: Fetch all songs (fallback)
      console.log("🎵 Fetching all songs...");
      try {
        const unsub = onSnapshot(collection(db, "songs"), async (snapshot) => {
          if (!isMounted) return;

          if (snapshot.empty) {
            setSongs([]);
            setLoading(false);
            dataFetchedRef.current = true;
            return;
          }

          try {
            const fetchedSongs: Song[] = await Promise.all(
              snapshot.docs.map(async (docSnap) => {
                const songData = docSnap.data();
                return {
                  id: docSnap.id,
                  title: songData.title || "Untitled",
                  audio: await convertGsUrlToHttps(songData.audio),
                  coverArt: await convertGsUrlToHttps(songData.coverArt),
                  vizionaries: songData.vizionaries || [],
                  createdAt: songData.createdAt,
                };
              })
            );

            if (isMounted) {
              setSongs([...fetchedSongs].sort(compareByCreatedAtDesc));
              setLoading(false);
              dataFetchedRef.current = true;
            }
          } catch (error) {
            console.error("Error processing all songs:", error);
            if (isMounted) {
              setLoading(false);
              dataFetchedRef.current = true;
            }
          }
        });

        unsubscribeRef.current = unsub;
      } catch (error) {
        console.error("Error setting up main listener:", error);
        if (isMounted) {
          setLoading(false);
          dataFetchedRef.current = true;
        }
      }
    };

    fetchSongs().catch((error) => {
      console.error("Unhandled error in fetchSongs:", error);
      if (isMounted) {
        setLoading(false);
        dataFetchedRef.current = true;
      }
    });

    return () => {
      isMounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [
    shouldRefetch,
    memoizedFilteredSongs,
    vizionaryId,
    albumId,
    allSongs,
    convertGsUrlToHttps,
  ]);

  // Fallback to ensure loading state isn't stuck
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoading(false);
      dataFetchedRef.current = true;
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, []);

  // If we already have songs and loading was triggered again, show content anyway
  const displayLoading = loading && songs.length === 0;

  return (
    <div className="song-display">
      {displayLoading ? (
        <p>Loading songs...</p>
      ) : songs.length === 0 ? (
        <p>No songs available.</p>
      ) : (
        <ul className="song-list">
          {songs.map((song) => (
            <li key={song.id} className="song-item">
              {!albumId && (
                <img
                  className="song-cover"
                  src={song.coverArt}
                  alt={song.title}
                />
              )}
              <div className="song-details">
                <p className="song-title">{song.title}</p>
                <section className="buttonSection">
                  <button
                    className="play-button"
                    onClick={() => handlePlaySong(song)}
                  >
                    {playIconUrl ? (
                      <img src={playIconUrl} alt="Play" />
                    ) : (
                      "▶" // Fallback if icon doesn't load
                    )}
                  </button>

                  {onRemoveSong && (
                    <button
                      className="remove-song-button"
                      onClick={() => {
                        onRemoveSong(song.id);
                      }}
                    >
                      Remove
                    </button>
                  )}
                </section>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showPlaylistPortal && selectedSongForPlaylist && currentUserId && (
        <PlaylistPortal
          currentUserId={currentUserId}
          songToAdd={selectedSongForPlaylist}
          onClose={() => setShowPlaylistPortal(false)}
          openMode="add"
        />
      )}
    </div>
  );
};

export default SongDisplay;
