import React, { useState, useContext, useMemo } from "react";
import Album from "./models/Album";
import "./AlbumDisplay.css";
import { MusicContext } from "./Player/MusicContext";
import SongDisplay from "./SongDisplay";
import { Link } from "react-router-dom";

// Utility: newest → oldest by createdAt
const compareByCreatedAtDesc = (a: Album, b: Album) => {
  const toMillis = (d: any) =>
    d?.toMillis ? d.toMillis() : new Date(d ?? 0).getTime();
  return toMillis(b.createdAt) - toMillis(a.createdAt);
};

interface AlbumDisplayProps {
  albums?: Album[];
  /** Callback fired when the user wants to delete an album */
  onAlbumRemove?: (albumId: string) => void;
}

const AlbumDisplay: React.FC<AlbumDisplayProps> = ({
  albums = [],
  onAlbumRemove,
}) => {
  useContext(MusicContext);
  const [expandedAlbum] = useState<string | null>(null);

  const sortedAlbums = useMemo(
    () => [...albums].sort(compareByCreatedAtDesc),
    [albums]
  );

  // Play the full album and arm it as a playlist
  // const handlePlayAlbum = (album: Album) => {
  //   console.log(" Album clicked:", album.title, "ID:", album.id);

  //   if (!album.songIds || album.songIds.length === 0) {
  //     console.warn(` No song IDs found for album: ${album.title}`);
  //     return;
  //   }

  //   console.log(" Album contains song IDs in this order:", album.songIds);

  //   console.log(" Checking all available songs...");
  //   allSongs.forEach((song) => {
  //     console.log(` Song: ${song.title}, ID: ${song.id}`);
  //   });

  //   // Ensure albumSongs appear in the correct order using `map()`
  //   const albumSongs: Song[] = album.songIds
  //     .map((id) => allSongs.find((song) => song.id === id.toString()))
  //     .filter((song): song is Song => Boolean(song)); // Remove undefined entries

  //   console.log("Ordered album songs:", albumSongs);

  //   if (albumSongs.length === 0) {
  //     console.warn(`⚠️ No matching songs found for album: ${album.title}`);
  //     return;
  //   }

  //   // Arm the playlist
  //   setArmedPlaylist({
  //     id: album.id,
  //     name: album.title,
  //     createdBy: album.vizionaries?.join(", ") || "Unknown",
  //     createdAt: new Date(),
  //     songIds: albumSongs.map((song) => song.id),
  //   });

  //   // Delay selecting the first song to ensure state updates
  //   setTimeout(() => {
  //     console.log("Playing first song:", albumSongs[0].title);
  //     setSelectedSong(albumSongs[0]);
  //   }, 200);
  // };

  return (
    <div className="album-display">
      <h2>Albums</h2>
      {sortedAlbums.length > 0 ? (
        <ul className="album-list">
          {sortedAlbums.map((album) => (
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

              <Link to={`/album/${album.id}`} className="play-album-button">
                Play Album
              </Link>

              {onAlbumRemove && (
                <button
                  className="remove-album-button text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Are you sure you want to delete?")) {
                      onAlbumRemove(album.id);
                    }
                  }}
                >
                  Remove Album
                </button>
              )}

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
