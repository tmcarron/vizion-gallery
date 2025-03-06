import React, { useContext, useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { MusicContext } from "../Player/MusicContext";
import SongDisplay from "../SongDisplay";
import "./HomePage.css";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { getStorage, ref, getDownloadURL } from "firebase/storage";

const HomePage: React.FC = () => {
  const { allSongs } = useContext(MusicContext);
  const [songsByVizionary, setSongsByVizionary] = useState<{
    [vizionary: string]: any[];
  }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredVizionaries, setFilteredVizionaries] = useState<string[]>([]);
  const [vizionaries, setVizionaries] = useState<string[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<any[]>([]); // ✅ Stores filtered songs

  const storage = getStorage();

  // ✅ Fetch all Vizionaries from Firestore
  useEffect(() => {
    const fetchVizionaries = async () => {
      try {
        const snapshot = await getDocs(collection(db, "vizionaries"));
        const vizNames = snapshot.docs.map((doc) => doc.data().vizionaryName);
        console.log("📜 Retrieved Vizionaries from Firestore:", vizNames);
        setVizionaries(vizNames);
      } catch (error) {
        console.error("❌ Error fetching vizionaries:", error);
      }
    };

    fetchVizionaries();
  }, []);

  // ✅ Group songs by Vizionary
  useEffect(() => {
    if (allSongs.length === 0) return;

    const groupedSongs: { [vizionary: string]: any[] } = {};

    allSongs.forEach((song) => {
      song.vizionaries.forEach((vizionary: string) => {
        if (!groupedSongs[vizionary]) {
          groupedSongs[vizionary] = [];
        }
        groupedSongs[vizionary].push(song);
      });
    });

    console.log("✅ Grouped Songs by Vizionary:", groupedSongs);
    setSongsByVizionary(groupedSongs);
  }, [allSongs]);

  // ✅ Shuffle Vizionaries only once per page load
  const shuffledVizionaries = useMemo(() => {
    if (Object.keys(songsByVizionary).length === 0) return [];

    const vizionaryNames = Object.keys(songsByVizionary);
    const shuffled = [...vizionaryNames];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    console.log("🔀 Shuffled Vizionaries:", shuffled);
    return shuffled;
  }, [Object.keys(songsByVizionary).length]);

  // ✅ Filter Songs and Convert `gs://` URLs
  useEffect(() => {
    if (!searchQuery) {
      setFilteredSongs([]);
      return;
    }

    const fetchSongs = async () => {
      const filtered = allSongs.filter((song) =>
        song.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

      const updatedSongs = await Promise.all(
        filtered.map(async (song) => {
          if (song.coverArt.startsWith("gs://")) {
            const storageRef = ref(storage, song.coverArt);
            song.coverArt = await getDownloadURL(storageRef);
          }
          return song;
        })
      );

      setFilteredSongs(updatedSongs);
    };

    fetchSongs();
  }, [searchQuery, allSongs]);

  // ✅ Filter Vizionaries based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredVizionaries([]);
      return;
    }
    setFilteredVizionaries(
      vizionaries.filter((vizionary) =>
        (vizionary || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, vizionaries]);

  return (
    <div className="HomePage">
      <h1>Vizion Gallery</h1>

      {/* ✅ Search Bar */}
      <input
        type="text"
        className="search-bar"
        placeholder="Search for a song or Vizionary..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* ✅ Display Search Results Using `SongDisplay` */}
      {searchQuery && (
        <section className="search-results">
          <h2>Search Results</h2>

          {/* ✅ Display Found Vizionaries */}
          {filteredVizionaries.length > 0 && (
            <div className="search-vizionaries">
              <h3>Vizionaries</h3>
              <ul>
                {filteredVizionaries.map((vizionary) => (
                  <li key={vizionary}>
                    <Link
                      to={`/vizionary/${vizionary}`}
                      className="search-vizionary-link"
                    >
                      {vizionary}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ✅ Display Found Songs */}
          {filteredSongs.length > 0 ? (
            <SongDisplay filteredSongs={filteredSongs} />
          ) : (
            <p>No songs found.</p>
          )}
        </section>
      )}

      {/* ✅ Loop through shuffled Vizionaries and display their songs */}
      {shuffledVizionaries.length > 0 ? (
        shuffledVizionaries.map((vizionary) => (
          <section key={vizionary} className="vizionary-section">
            <h2>
              <Link to={`/vizionary/${vizionary}`} className="vizionary-link">
                {vizionary}
              </Link>
            </h2>
            <SongDisplay vizionaryId={vizionary} />
          </section>
        ))
      ) : (
        <p>Loading Vizionaries...</p>
      )}

      <section className="summary-section">
        <p>
          A digital music platform pushing to give artists creative freedom,
          flexibility, and ownership of their work. This website is in open
          development.
        </p>
      </section>

      <footer>
        <p>Vizion LLC</p>
        <p>Created by Tyler Carron</p>
      </footer>
    </div>
  );
};

export default HomePage;
