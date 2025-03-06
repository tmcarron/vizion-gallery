import { createContext, useState, useEffect, ReactNode } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db, storage } from "../firebase";
import { getDownloadURL, ref } from "firebase/storage";
import { getBaseContrastAndComplementaryColor } from "./ColorMatrix";
import { Playlist } from "../models/Playlist";
import Song from "../models/Song";

interface MusicContextProps {
  allSongs: Song[];
  selectedSong: Song | null;
  armedPlaylist: Playlist | null;
  dominantColor: string;
  contrastColor: string;
  complementaryColor: string;
  setArmedPlaylist: (playlist: Playlist) => void;
  setSelectedSong: (song: Song) => void;
  setAllSongs: (songs: Song[]) => void;
}

export const MusicContext = createContext<MusicContextProps>({
  allSongs: [],
  selectedSong: null,
  armedPlaylist: null,
  dominantColor: "#ffffff",
  contrastColor: "#000000",
  complementaryColor: "#ff00ff",
  setSelectedSong: () => {},
  setAllSongs: () => {},
  setArmedPlaylist: () => {},
});

const MusicContextProvider = ({ children }: { children: ReactNode }) => {
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [armedPlaylist, setArmedPlaylistState] = useState<Playlist | null>(
    null
  );
  const [dominantColor, setDominantColor] = useState("#ffffff");
  const [contrastColor, setContrastColor] = useState("#000000");
  const [complementaryColor, setComplementaryColor] = useState("#ff00ff");

  // ✅ Convert Firebase Storage URLs
  const convertGsUrlToHttps = async (gsUrl?: string): Promise<string> => {
    if (!gsUrl || !gsUrl.startsWith("gs://"))
      return gsUrl || "/fallback-cover.jpg";
    try {
      const storageRef = ref(
        storage,
        gsUrl.replace("gs://vizion-gallery.appspot.com/", "")
      );
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("❌ Error converting gs:// URL:", error);
      return "/fallback-cover.jpg";
    }
  };

  // ✅ Fetch all songs from Firebase **only once**
  useEffect(() => {
    const fetchSongs = async () => {
      const snapshot = await getDocs(collection(db, "songs"));
      const songsList: Song[] = snapshot.docs.map((docSnap) => {
        const songData = docSnap.data();

        console.log("🔥 Firestore Song Data:", songData);
        console.log("🔍 Available Keys:", Object.keys(songData));

        return {
          id: docSnap.id,
          title: songData.title || "Untitled",
          albumId:
            songData.albumId ||
            songData.AlbumID ||
            songData.album_id ||
            undefined,
          audio: songData.audio || "",
          coverArt: songData.coverArt || "",
          vizionaries: songData.vizionaries || [],
        };
      });

      console.log("🎧 All Songs Loaded from Firestore:", songsList);
      setAllSongs(songsList);

      // ✅ Create a shuffled default playlist
      if (songsList.length > 0) {
        const shuffledSongs = [...songsList];
        for (let i = shuffledSongs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledSongs[i], shuffledSongs[j]] = [
            shuffledSongs[j],
            shuffledSongs[i],
          ];
        }

        const defaultPlaylist = {
          id: "default",
          name: "All Songs (Shuffled)",
          createdBy: "System",
          createdAt: new Date(),
          songIds: shuffledSongs.map((song) => song.id),
        };

        setArmedPlaylist(defaultPlaylist);
        console.log("✅ Default Playlist Armed:", defaultPlaylist);

        // ✅ Start playing the first shuffled song
        setTimeout(() => {
          setSelectedSong(shuffledSongs[0]);
          console.log(
            "▶️ Playing first shuffled song:",
            shuffledSongs[0].title
          );
        }, 100);
      }
    };

    fetchSongs();
  }, []);

  // ✅ Fetch songs for a given playlist
  const fetchSongsForPlaylist = async (songIds: string[]): Promise<Song[]> => {
    const songs: Song[] = [];
    for (const songId of songIds) {
      const songDoc = await getDoc(doc(db, "songs", songId));
      if (songDoc.exists()) {
        const data = songDoc.data();
        songs.push({
          id: songDoc.id,
          title: data.title || "Untitled",
          albumId: data.albumId || undefined, // ✅ Ensure albumId is included
          audio: await convertGsUrlToHttps(data.audio),
          coverArt: await convertGsUrlToHttps(data.coverArt),
          vizionaries: data.vizionaries || [],
        });
      }
    }
    return songs;
  };

  // ✅ Set a new armed playlist & update `selectedSong`
  const setArmedPlaylist = async (playlist: Playlist) => {
    const songs = await fetchSongsForPlaylist(playlist.songIds);
    setArmedPlaylistState(playlist);
    if (songs.length > 0) {
      setSelectedSong(songs[0]); // ✅ Always start playing the first song in the new playlist
    }
  };

  // ✅ Update colors when `selectedSong` changes
  useEffect(() => {
    if (!selectedSong?.coverArt) return;

    let isCancelled = false;
    const updateColors = async () => {
      try {
        const coverArtUrl = await convertGsUrlToHttps(selectedSong.coverArt);
        if (!isCancelled) {
          const { base, contrast, complementary } =
            await getBaseContrastAndComplementaryColor(coverArtUrl);
          setDominantColor(base || "#ffffff");
          setContrastColor(contrast || "#000000");
          setComplementaryColor(complementary || "#ff00ff");
        }
      } catch (error) {
        console.error("❌ Error fetching colors:", error);
      }
    };

    updateColors();
    return () => {
      isCancelled = true;
    };
  }, [selectedSong]);

  // ✅ Update global CSS variables for colors
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--dominantColor",
      dominantColor
    );
    document.documentElement.style.setProperty(
      "--contrastColor",
      contrastColor
    );
    document.documentElement.style.setProperty(
      "--complementaryColor",
      complementaryColor
    );
  }, [dominantColor, contrastColor, complementaryColor]);

  return (
    <MusicContext.Provider
      value={{
        allSongs,
        selectedSong,
        armedPlaylist,
        dominantColor,
        contrastColor,
        complementaryColor,
        setSelectedSong: setSelectedSong,
        setAllSongs,
        setArmedPlaylist,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export default MusicContextProvider;
