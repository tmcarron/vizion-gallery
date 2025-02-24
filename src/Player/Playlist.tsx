// Playlist.tsx
import React, { useContext } from "react";
import { MusicContext } from "./MusicContext";
import Song from "../models/Song";

interface PlaylistProps {
  songs: Song[];
}

const Playlist: React.FC<PlaylistProps> = ({ songs }) => {
  const { setSelectedSong } = useContext(MusicContext);

  return (
    <div className="playlist">
      {songs.map((song) => (
        <div
          key={song.id}
          className="song-item"
          onClick={() => setSelectedSong(song)}
          style={{
            cursor: "pointer",
            padding: "10px",
            borderBottom: "1px solid #ccc",
          }}
        >
          {song.title}
        </div>
      ))}
    </div>
  );
};

export default Playlist;
