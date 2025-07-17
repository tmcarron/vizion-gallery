import {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
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

  // Use refs to track initialization state
  const songsLoadedRef = useRef(false);
  const initialShuffleRef = useRef(false);

  // Convert Firebase Storage URLs
  const convertGsUrlToHttps = useCallback(
    async (gsUrl?: string): Promise<string> => {
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
    },
    []
  );

  // Fetch songs for a given playlist
  const fetchSongsForPlaylist = useCallback(
    async (songIds: string[]): Promise<Song[]> => {
      const songs: Song[] = [];
      for (const songId of songIds) {
        const songDoc = await getDoc(doc(db, "songs", songId));
        if (songDoc.exists()) {
          const data = songDoc.data();
          songs.push({
            id: songDoc.id,
            title: data.title || "Untitled",
            albumId: data.albumId || undefined,
            audio: await convertGsUrlToHttps(data.audio),
            coverArt: await convertGsUrlToHttps(data.coverArt),
            vizionaries: data.vizionaries || [],
          });
        }
      }
      return songs;
    },
    [convertGsUrlToHttps]
  );

  // Set a new armed playlist & update `selectedSong`
  const setArmedPlaylist = useCallback(
    async (playlist: Playlist) => {
      const songs = await fetchSongsForPlaylist(playlist.songIds);
      setArmedPlaylistState(playlist);
      if (songs.length > 0) {
        setSelectedSong(songs[0]);
      }
    },
    [fetchSongsForPlaylist]
  );

  // Create shuffled playlist once - separated from the fetch songs effect
  const createShuffledPlaylist = useCallback((songsList: Song[]) => {
    if (!initialShuffleRef.current && songsList.length > 0) {
      initialShuffleRef.current = true;

      // Create a shuffled copy of songs
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

      setArmedPlaylistState(defaultPlaylist);
      console.log("Default Playlist Armed:", defaultPlaylist);

      // Set first song
      setSelectedSong(shuffledSongs[0]);
      console.log("Playing first shuffled song:", shuffledSongs[0].title);
    }
  }, []);

  // Fetch all songs from Firebase only once
  useEffect(() => {
    // Only run this effect if songs haven't been loaded yet
    if (songsLoadedRef.current) return;

    const fetchSongs = async () => {
      try {
        songsLoadedRef.current = true; // Mark as loaded immediately to prevent double loading

        const snapshot = await getDocs(collection(db, "songs"));
        const songsList: Song[] = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const songData = docSnap.data();
            return {
              id: docSnap.id,
              title: songData.title || "Untitled",
              albumId:
                songData.albumId ||
                songData.AlbumID ||
                songData.album_id ||
                undefined,
              audio: await convertGsUrlToHttps(songData.audio || ""),
              coverArt: await convertGsUrlToHttps(songData.coverArt || ""),
              vizionaries: songData.vizionaries || [],
            };
          })
        );

        console.log("All Songs Loaded from Firestore:", songsList);
        setAllSongs(songsList);
      } catch (error) {
        console.error("Error fetching songs:", error);
        songsLoadedRef.current = false; // Reset on error to allow retry
      }
    };

    fetchSongs();
  }, [convertGsUrlToHttps]); // Added dependency

  // Initialize the playlist and selected song after songs are loaded
  useEffect(() => {
    createShuffledPlaylist(allSongs);
  }, [allSongs, createShuffledPlaylist]);

  // Update colors when `selectedSong` changes
  useEffect(() => {
    if (!selectedSong?.coverArt) return;

    let isCancelled = false;
    const updateColors = async () => {
      try {
        const coverArtUrl = await convertGsUrlToHttps(selectedSong.coverArt);
        if (!isCancelled) {
          const { base, contrast, complementary } =
            await getBaseContrastAndComplementaryColor(coverArtUrl);

          if (base && base !== dominantColor) setDominantColor(base);
          if (contrast && contrast !== contrastColor)
            setContrastColor(contrast);
          if (complementary && complementary !== complementaryColor)
            setComplementaryColor(complementary);

          // Add a small delay before re-rendering to prevent layout shift
          setTimeout(() => {
            document.documentElement.style.setProperty("--dominantColor", base);
            document.documentElement.style.setProperty(
              "--contrastColor",
              contrast
            );
            document.documentElement.style.setProperty(
              "--complementaryColor",
              complementary
            );
          }, 50);
        }
      } catch (error) {
        console.error("Error fetching colors:", error);
      }
    };

    updateColors();
    return () => {
      isCancelled = true;
    };
  }, [selectedSong, convertGsUrlToHttps]); // Added dependency

  // Update global CSS variables for colors
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
        setSelectedSong,
        setAllSongs,
        setArmedPlaylist,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export default MusicContextProvider;
