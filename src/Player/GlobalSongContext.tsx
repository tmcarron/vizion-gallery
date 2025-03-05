// SongsContext.tsx
import React, { createContext, useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import Song from "../models/Song";

interface SongsContextProps {
  songs: Record<string, Song>;
}

export const SongsContext = createContext<SongsContextProps>({ songs: {} });

export const SongsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [songs, setSongs] = useState<Record<string, Song>>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "songs"), (snapshot) => {
      const songsMap: Record<string, Song> = {};
      snapshot.forEach((doc) => {
        songsMap[doc.id] = { id: doc.id, ...doc.data() } as Song;
      });
      setSongs(songsMap);
    });

    return () => unsubscribe();
  }, []);

  return (
    <SongsContext.Provider value={{ songs }}>{children}</SongsContext.Provider>
  );
};
