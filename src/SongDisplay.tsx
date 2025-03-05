import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { MusicContext } from "./Player/MusicContext";
import { db, storage } from "./firebase";
import {
  collection,
  query,
  onSnapshot,
  where,
  addDoc,
  serverTimestamp,
  limit,
  getDocs,
} from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import "./SongDisplay.css";
import Song from "./models/Song";
import PlaylistPortal from "./pages/PlaylistPortal";
import SongSearch from "./SongSearch";
import { Playlist } from "./models/Playlist";

interface SongDisplayProps {
  vizionaryId?: string;
  playlist?: Playlist;
}

const SongDisplay: React.FC<SongDisplayProps> = ({ vizionaryId }) => {
  const { setSelectedSong } = useContext(MusicContext);
  const [songsByVizionary, setSongsByVizionary] = useState<{
    [vizionaryId: string]: Song[];
  }>({});
  const [sortedVizionaryIds, setSortedVizionaryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] =
    useState<Song | null>(null);
  const [showPlaylistPortal, setShowPlaylistPortal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedSongToShare, setSelectedSongToShare] = useState<Song | null>(
    null
  );
  const [playIconUrl, setPlayIconUrl] = useState("");

  const [receiverUsername, setReceiverUsername] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
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

  // Inside your useEffect where songs are fetched
  useEffect(() => {
    const songsCollectionRef = collection(db, "songs");
    const songQuery = vizionaryId
      ? query(
          songsCollectionRef,
          where("vizionaries", "array-contains", vizionaryId)
        )
      : songsCollectionRef;

    const unsubscribe = onSnapshot(songQuery, async (snapshot) => {
      if (snapshot.empty) {
        setSongsByVizionary({});
        setSortedVizionaryIds([]);
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

      // 🎲 Fisher-Yates Shuffle (corrected)
      for (let i = fetchedSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fetchedSongs[i], fetchedSongs[j]] = [fetchedSongs[j], fetchedSongs[i]];
      }

      // ✅ Immediately set the first song after shuffle
      if (fetchedSongs.length > 0) {
        setSelectedSong(fetchedSongs[0]);
      }

      // ✅ Correct grouping logic
      const groupedSongs: { [vizionaryId: string]: Song[] } = {};
      fetchedSongs.forEach((song) => {
        song.vizionaries.forEach((vizId: string) => {
          if (!groupedSongs[vizId]) groupedSongs[vizId] = [];
          groupedSongs[vizId].push(song);
        });
      });

      setSongsByVizionary(groupedSongs);
      setSortedVizionaryIds(Object.keys(groupedSongs));
      setLoading(false);
    });

    // Properly handle loading errors
    return () => unsubscribe();
  }, [vizionaryId]);

  // Additional states to manage songs directly

  const handleShareSong = (song: Song) => {
    setSelectedSongToShare(song);
    setShowShareModal(true);
  };

  const handleUsernameChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const input = e.target.value;
    setReceiverUsername(input);

    if (!input) {
      setSuggestions([]);
      return;
    }

    const snapshot = await getDocs(
      query(
        collection(db, "users"),
        where("username", ">=", input),
        where("username", "<=", input + "\uf8ff"),
        limit(3)
      )
    );

    setSuggestions(snapshot.docs.map((doc) => doc.data().username));
  };

  const sendSongToUser = async () => {
    if (!currentUserId || !receiverUsername || !selectedSongToShare) return;

    const userSnapshot = await getDocs(
      query(collection(db, "users"), where("username", "==", receiverUsername))
    );

    if (userSnapshot.empty) {
      alert("Username not found!");
      return;
    }

    const receiverUserId = userSnapshot.docs[0].id;
    const conversationId = [currentUserId, receiverUserId].sort().join("_");

    const attachment = {
      id: selectedSongToShare.id,
      title: selectedSongToShare.title,
      audio: selectedSongToShare.audio || "",
      coverArt: selectedSongToShare.coverArt || "",
    };

    await addDoc(collection(db, `chats/${conversationId}/messages`), {
      from: currentUserId,
      to: receiverUserId,
      text: `Shared a song: ${selectedSongToShare.title}`,
      attachmentType: "song",
      attachment,
      createdAt: serverTimestamp(),
      read: false,
    });

    alert(`Song "${selectedSongToShare.title}" sent to @${receiverUsername}!`);

    setShowShareModal(false);
    setReceiverUsername("");
    setSelectedSongToShare(null);
    setSuggestions([]);
  };

  return (
    <div className="song-display">
      {!vizionaryId && <SongSearch onSongSelect={setSelectedSong} />}
      <h2>{vizionaryId ? "Songs by This Vizionary" : "All Songs"}</h2>
      {loading ? (
        <p>Loading songs...</p>
      ) : sortedVizionaryIds.length === 0 ? (
        <p>No songs available.</p>
      ) : (
        sortedVizionaryIds.map((vizId) => (
          <div key={vizId} className="vizionary-group">
            {!vizionaryId && (
              <h3 className="vizionary-name">
                <Link to={`/vizionary/${vizId}`} className="vizionary-link">
                  {vizId}
                </Link>
              </h3>
            )}
            <ul className="song-list">
              {songsByVizionary[vizId].map((song) => (
                <li key={song.id} className="song-item">
                  <img
                    className="song-cover"
                    src={song.coverArt}
                    alt={song.title}
                  />
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
                    <button
                      className="share-song-button hidden"
                      onClick={() => handleShareSong(song)}
                    >
                      Share
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
      {showShareModal && selectedSongToShare && (
        <div className="playlist-modal-overlay">
          <div className="playlist-modal">
            <h3>Share "{selectedSongToShare.title}"</h3>
            <input
              type="text"
              placeholder="Enter username"
              value={receiverUsername}
              onChange={handleUsernameChange}
            />
            <div className="suggestions-dropdown">
              {suggestions.map((username) => (
                <div
                  key={username}
                  className="suggestion-item"
                  onClick={() => {
                    setReceiverUsername(username);
                    setSuggestions([]);
                  }}
                >
                  @{username}
                </div>
              ))}
            </div>
            <button onClick={sendSongToUser}>Send Song</button>
            <button onClick={() => setShowShareModal(false)}>Cancel</button>
          </div>
        </div>
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
