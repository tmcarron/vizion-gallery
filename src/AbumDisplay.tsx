import React from "react";
import Album from "./models/Album";
import "./AlbumDisplay.css";

interface AlbumDisplayProps {
  albums?: Album[]; // Optional, defaults to empty array if not provided
  onAlbumSelect: (album: Album) => void;
}

const AlbumDisplay: React.FC<AlbumDisplayProps> = ({
  albums = [], // default to empty array
  onAlbumSelect,
}) => {
  return (
    <div className="album-display">
      <h2>Albums</h2>
      {albums.length > 0 ? (
        <ul className="album-list">
          {albums.map((album: Album) => (
            <li
              key={album.id}
              className="album-item"
              onClick={() => onAlbumSelect(album)}
            >
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
