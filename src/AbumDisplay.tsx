import React, { useState, useContext } from "react";
import Album from "./models/Album";
import Song from "./models/Song";
import "./AlbumDisplay.css";
import { MusicContext } from "./Player/MusicContext";
import SongDisplay from "./SongDisplay";

interface AlbumDisplayProps {
  albums?: Album[];
}

const AlbumDisplay: React.FC<AlbumDisplayProps> = ({ albums = [] }) => {
  const { setArmedPlaylist, setSelectedSong, allSongs } =
    useContext(MusicContext);
  const [expandedAlbum, setExpandedAlbum] = useState<string | null>(null);

  // ✅ Play the full album and arm it as a playlist
  const handlePlayAlbum = (album: Album) => {
    console.log("📀 Album clicked:", album.title, "ID:", album.id);
    console.log("🎵 Checking allSongs for matching albumId...");

    allSongs.forEach((song) => {
      console.log(`🎵 Song: ${song.title}, Album ID: ${song.albumId}`);
    });

    // ✅ Ensure `albumId` comparison is type-safe
    const albumSongs: Song[] = allSongs.filter(
      (song) => String(song.albumId).trim() === String(album.id).trim()
    );

    console.log("✅ Filtered album songs:", albumSongs);

    if (albumSongs.length > 0) {
      console.log("✅ Found album songs:", albumSongs);

      setArmedPlaylist({
        id: album.id,
        name: album.title,
        createdBy: album.vizionaries?.join(", ") || "Unknown",
        createdAt: new Date(),
        songIds: albumSongs.map((song) => song.id),
      });

      setTimeout(() => {
        setSelectedSong(albumSongs[0]);
        console.log("▶️ Playing first song:", albumSongs[0].title);
      }, 100);
    } else {
      console.warn("⚠️ No songs found in album:", album.title);
    }
  };

  // ✅ Toggle album expansion
  const toggleAlbumExpansion = (albumId: string) => {
    setExpandedAlbum(expandedAlbum === albumId ? null : albumId);
  };

  return (
    <div className="album-display">
      <h2>Albums</h2>
      {albums.length > 0 ? (
        <ul className="album-list">
          {albums.map((album) => (
            <li key={album.id} className="album-item">
              <div className="album-cover">
                {album.coverArt ? (
                  <img src={album.coverArt} alt={album.title} />
                ) : (
                  <p>No Cover</p>
                )}
              </div>
              <div className="album-info">
                <h3>{album.title}</h3>
              </div>

              {/* Play Button to Arm the Album */}
              <button
                className="play-album-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayAlbum(album);
                }}
              >
                ▶ Play Album
              </button>

              {/* Expand Songs Button */}
              <button
                className="expand-album-button"
                onClick={() => toggleAlbumExpansion(album.id)}
              >
                {expandedAlbum === album.id ? "Close Songs" : "Show Songs"}
              </button>

              {/* Expandable Songs Section */}
              {expandedAlbum === album.id && (
                <div className="album-songs">
                  <SongDisplay albumId={album.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No albums available.</p>
      )}
    </div>
  );
};

export default AlbumDisplay;
