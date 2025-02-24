// DataFetching.tsx
import { useContext, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { MusicContext } from "./Player/MusicContext";
import { db } from "./firebase";
import Song from "./models/Song";

const DataFetching: React.FC = () => {
  const { setAllSongs, setSelectedSong } = useContext(MusicContext);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "songs"));
        const songs: Song[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            audio: data.audio,
            coverArt: data.coverArt,
            vizionaries: data.vizionaries,
          };
        });
        setAllSongs(songs);
        if (songs.length > 0) {
          // Set the first song as the default selected song.
          setSelectedSong(songs[0]);
        }
      } catch (error) {
        console.error("Error fetching songs:", error);
      }
    };

    fetchData();
  }, [setAllSongs, setSelectedSong]);

  // This component doesn't render anything
  return null;
};

export default DataFetching;
