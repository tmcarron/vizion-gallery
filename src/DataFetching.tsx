import { useContext, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import Song from "./models/Song";
import { MusicContext } from "./Player/MusicContext";

const DataFetching: React.FC = () => {
  const { setAllSongs, selectedSong, setSelectedSong } =
    useContext(MusicContext);

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
            album: data.album,
          };
        });

        setAllSongs(songs);

        // ✅ Only set `selectedSong` if it's null
        if (!selectedSong && songs.length > 0) {
          console.log("Setting default selected song:", songs[0].title);
          setSelectedSong(songs[0]);
        }
      } catch (error) {
        console.error("Error fetching songs:", error);
      }
    };

    fetchData();
  }, [setAllSongs, selectedSong, setSelectedSong]);

  return null;
};

export default DataFetching;
