import React, { useContext, useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { MusicContext } from "../Player/MusicContext";
import SongDisplay from "../SongDisplay";
import { Playlist } from "../models/Playlist";
import "./HomePage.css";

const HomePage: React.FC = () => {
  const { allSongs, setArmedPlaylist, setSelectedSong } =
    useContext(MusicContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [shuffledVizionaries, setShuffledVizionaries] = useState<string[]>([]);
  const shuffleCompletedRef = useRef(false);

  // Group songs by Vizionary
  const songsByVizionary = useMemo(() => {
    if (allSongs.length === 0) return {};

    const groupedSongs: { [vizionary: string]: any[] } = {};
    allSongs.forEach((song) => {
      song.vizionaries.forEach((vizionary: string) => {
        if (!groupedSongs[vizionary]) {
          groupedSongs[vizionary] = [];
        }
        groupedSongs[vizionary].push(song);
      });
    });

    return groupedSongs;
  }, [allSongs]);

  // Shuffle only once when songsByVizionary changes and has content
  useEffect(() => {
    const vizionaryNames = Object.keys(songsByVizionary);
    if (vizionaryNames.length === 0 || shuffleCompletedRef.current) return;

    shuffleCompletedRef.current = true;

    const shuffled = [...vizionaryNames];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setShuffledVizionaries(shuffled);
  }, [songsByVizionary]);

  // Filter songs and Vizionaries based on search query
  const filteredResults = useMemo(() => {
    if (!searchQuery) return { songs: [], vizionaries: [] };

    const lowerCaseQuery = searchQuery.toLowerCase();

    const songs = allSongs.filter((song) =>
      song.title.toLowerCase().includes(lowerCaseQuery)
    );

    const vizionaries = Object.keys(songsByVizionary).filter((vizionary) =>
      vizionary.toLowerCase().includes(lowerCaseQuery)
    );

    return { songs, vizionaries };
  }, [searchQuery, allSongs, songsByVizionary]);

  // Play All Songs Function
  const handlePlayAll = () => {
    if (allSongs.length === 0) return;

    // Shuffle songs
    const shuffledSongs = [...allSongs];
    for (let i = shuffledSongs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledSongs[i], shuffledSongs[j]] = [
        shuffledSongs[j],
        shuffledSongs[i],
      ];
    }

    // Create a playlist
    const playAllPlaylist: Playlist = {
      id: "play-all",
      name: "All Songs",
      createdBy: "System",
      createdAt: new Date(),
      songIds: shuffledSongs.map((song) => song.id),
    };

    setArmedPlaylist(playAllPlaylist);
    setSelectedSong(shuffledSongs[0]); // Start playing first song
  };

  if (allSongs.length === 0) {
    return (
      <div className="HomePage">
        <h1>Vizion Gallery</h1>
        <p>Loading Vizionaries...</p>
      </div>
    );
  }

  return (
    <div className="HomePage">
      <h1>Vizion Gallery</h1>

      {/* Play All Button */}
      <button className="play-all-button" onClick={handlePlayAll}>
        Play All
      </button>

      {/* Search Bar */}
      <input
        type="text"
        className="search-bar"
        placeholder="Search for a song or Vizionary..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Search Results */}
      {searchQuery && (
        <section className="search-results">
          <h2>Search Results</h2>
          {filteredResults.songs.length > 0 ||
          filteredResults.vizionaries.length > 0 ? (
            <>
              {filteredResults.vizionaries.length > 0 && (
                <div className="vizionary-results">
                  <h3>Vizionaries</h3>
                  {filteredResults.vizionaries.map((vizionary) => (
                    <p key={vizionary}>
                      <Link
                        to={`/vizionary/${vizionary}`}
                        className="vizionary-link"
                      >
                        {vizionary}
                      </Link>
                    </p>
                  ))}
                </div>
              )}

              {filteredResults.songs.length > 0 && (
                <div className="song-results">
                  <h3>Songs</h3>
                  <SongDisplay filteredSongs={filteredResults.songs} />
                </div>
              )}
            </>
          ) : (
            <p>No results found.</p>
          )}
        </section>
      )}

      {/* Display Songs by Vizionary */}
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
        <p>No Vizionaries Found</p>
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
