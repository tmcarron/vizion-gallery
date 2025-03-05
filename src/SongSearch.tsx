import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db, storage } from "./firebase"; // ✅ Import storage for gs:// fix
import { collection, getDocs } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import Song from "./models/Song";
import "./SongSearch.css"; // ✅ Import new CSS file

interface SongSearchProps {
  onSongSelect: (song: Song) => void;
}

const SongSearch: React.FC<SongSearchProps> = ({ onSongSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ Convert gs:// URLs to HTTPS
  const convertGsUrlToHttps = async (gsUrl: string): Promise<string> => {
    if (!gsUrl.startsWith("gs://")) return gsUrl;
    try {
      const storagePath = gsUrl.replace("gs://vizion-gallery.appspot.com/", "");
      return await getDownloadURL(ref(storage, storagePath));
    } catch (error) {
      console.error(`❌ Error converting gs:// URL:`, error);
      return "/fallback-cover.jpg";
    }
  };

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setSongs([]);
      return;
    }

    const fetchAndFilterSongs = async () => {
      setLoading(true);
      try {
        const songsRef = collection(db, "songs");
        const snapshot = await getDocs(songsRef);
        const lowerSearchTerm = searchTerm.toLowerCase();
        const results: Song[] = [];

        snapshot.forEach((doc) => {
          const songData = doc.data();
          results.push({
            id: doc.id,
            title: songData.title || "Untitled",
            coverArt: songData.coverArt || "/fallback-cover.jpg",
            vizionaries: songData.vizionaries || [],
          } as Song);
        });

        // 🔹 Convert `gs://` URLs to HTTPS
        const updatedSongs = await Promise.all(
          results.map(async (song) => {
            if (song.coverArt.startsWith("gs://")) {
              return {
                ...song,
                coverArt: await convertGsUrlToHttps(song.coverArt),
              };
            }
            return song;
          })
        );

        // ✅ Filter results after converting cover art
        const filteredSongs = updatedSongs.filter((song) => {
          const titleMatch =
            song.title && song.title.toLowerCase().includes(lowerSearchTerm);
          const vizionariesMatch =
            song.vizionaries &&
            Array.isArray(song.vizionaries) &&
            song.vizionaries.some((v: string) =>
              v.toLowerCase().includes(lowerSearchTerm)
            );

          return titleMatch || vizionariesMatch;
        });

        setSongs(filteredSongs.slice(0, 10)); // Limit to 10 results
      } catch (error) {
        console.error("Error searching songs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndFilterSongs();
  }, [searchTerm]);

  return (
    <div className="song-search-container">
      <h3>Search Songs</h3>
      <input
        type="text"
        className="song-search-input"
        placeholder="Search by title or vizionaries..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {loading ? (
        <p className="loading-text">Loading...</p>
      ) : songs.length > 0 ? (
        <ul className="song-list">
          {songs.map((song) => (
            <li key={song.id} className="song-item">
              {/* 🎵 Clickable Cover Art */}
              <Link
                to={`/vizionary/${song.vizionaries[0]}`}
                className="song-cover-link"
              >
                <img
                  src={song.coverArt}
                  alt={song.title}
                  className="song-cover"
                />
              </Link>

              {/* 🎶 Song Details */}
              <div className="song-details">
                <p className="song-title">
                  <Link to={`/vizionary/${song.vizionaries[0]}`}>
                    {song.title}
                  </Link>
                </p>
                {song.vizionaries && (
                  <p className="song-vizionary">
                    By:{" "}
                    {song.vizionaries.map((vizionaryId, index) => (
                      <Link
                        key={index}
                        to={`/vizionary/${vizionaryId}`}
                        className="vizionary-link"
                      >
                        {vizionaryId}
                      </Link>
                    ))}
                  </p>
                )}
              </div>

              {/* 🎧 Select Button */}
              <button
                className="select-song-btn"
                onClick={() => onSongSelect(song)}
              >
                ▶
              </button>
            </li>
          ))}
        </ul>
      ) : (
        searchTerm && <p className="no-results-text">No songs found.</p>
      )}
    </div>
  );
};

export default SongSearch;
