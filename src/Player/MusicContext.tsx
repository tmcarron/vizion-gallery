// MusicContext.tsx
import React, { createContext, useState, ReactNode } from "react";
import Song from "../models/Song";

interface MusicContextType {
  selectedSong: Song | null;
  setSelectedSong: (song: Song) => void;
  allSongs: Song[];
  setAllSongs: (songs: Song[]) => void;
}

export const MusicContext = createContext<MusicContextType>({
  selectedSong: null,
  setSelectedSong: () => {},
  allSongs: [],
  setAllSongs: () => {},
});

interface MusicProviderProps {
  children: ReactNode;
}

export const MusicProvider: React.FC<MusicProviderProps> = ({ children }) => {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [allSongs, setAllSongs] = useState<Song[]>([]);

  return (
    <MusicContext.Provider
      value={{ selectedSong, setSelectedSong, allSongs, setAllSongs }}
    >
      {children}
    </MusicContext.Provider>
  );
};
