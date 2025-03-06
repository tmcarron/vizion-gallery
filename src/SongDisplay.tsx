import React, { useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { MusicContext } from "./Player/MusicContext";
import { db, storage } from "./firebase";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import "./SongDisplay.css";
import Song from "./models/Song";
import PlaylistPortal from "./pages/PlaylistPortal";
import { Playlist } from "./models/Playlist";

interface SongDisplayProps {
  vizionaryId?: string;
  albumId?: string;
  playlist?: Playlist;
  filteredSongs?: Song[];
}

const SongDisplay: React.FC<SongDisplayProps> = ({
  vizionaryId,
  albumId,
  filteredSongs,
}) => {
  const { setSelectedSong } = useContext(MusicContext);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] =
    useState<Song | null>(null);
  const [showPlaylistPortal, setShowPlaylistPortal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [playIconUrl, setPlayIconUrl] = useState("");

  useEffect(() => {
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      setCurrentUserId(user ? user.uid : null);
    });
    return unsubscribe;
  }, []);

  const convertGsUrlToHttps = async (gsUrl?: string): Promise<string> => {
    if (!gsUrl || !gsUrl.startsWith("gs://"))
      return gsUrl || "/fallback-cover.jpg";
    try {
      const storageRef = ref(
        storage,
        gsUrl.replace("gs://vizion-gallery.appspot.com/", "")
      );
      return await getDownloadURL(storageRef);
    } catch {
      return "/fallback-cover.jpg";
    }
  };

  useEffect(() => {
    // ✅ Use `filteredSongs` directly if available (prevents unnecessary Firestore fetch)
    if (filteredSongs && filteredSongs.length > 0) {
      setSongs(filteredSongs);
      setLoading(false);
      return;
    }

    // ✅ Fetch songs from Firestore based on vizionaryId or albumId
    const songsCollectionRef = collection(db, "songs");
    let songQuery;

    if (albumId) {
      songQuery = query(songsCollectionRef, where("albumId", "==", albumId));
    } else if (vizionaryId) {
      songQuery = query(
        songsCollectionRef,
        where("vizionaries", "array-contains", vizionaryId)
      );
    } else {
      songQuery = songsCollectionRef; // ✅ Show all songs if no filter is provided
    }

    console.log("🎵 Fetching songs with filters:", { albumId, vizionaryId });

    const unsubscribe = onSnapshot(songQuery, async (snapshot) => {
      if (snapshot.empty) {
        setSongs([]);
        setLoading(false);
        return;
      }

      const fetchedSongs: Song[] = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const songData = docSnap.data();
          return {
            id: docSnap.id,
            title: songData.title || "Untitled",
            audio: await convertGsUrlToHttps(songData.audio),
            coverArt: await convertGsUrlToHttps(songData.coverArt),
            vizionaries: songData.vizionaries || [],
          };
        })
      );

      setSongs(fetchedSongs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [vizionaryId, albumId, JSON.stringify(filteredSongs)]); // ✅ Prevents unnecessary re-fetching

  return (
    <div className="song-display">
      {loading ? (
        <p>Loading songs...</p>
      ) : songs.length === 0 ? (
        <p>No songs available.</p>
      ) : (
        <ul className="song-list">
          {songs.map((song) => (
            <li key={song.id} className="song-item">
              {/* ✅ Only show album cover if NOT displaying within an album */}
              {!albumId && (
                <img
                  className="song-cover"
                  src={song.coverArt}
                  alt={song.title}
                />
              )}
              <div className="song-details">
                <p className="song-title">{song.title}</p>
                <button
                  className="play-button"
                  onClick={() => setSelectedSong(song)}
                >
                  <img src={playIconUrl} alt="Play" />
                </button>
                <button
                  className="add-to-playlist-button"
                  onClick={() => {
                    setSelectedSongForPlaylist(song);
                    setShowPlaylistPortal(true);
                  }}
                >
                  +
                </button>
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
