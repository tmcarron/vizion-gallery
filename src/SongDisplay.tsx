import { useContext } from "react";
import "./SongDisplay.css";
import Song from "./models/Song";
import { MusicContext } from "./Player/MusicContext";

const SongDisplay: React.FC = () => {
  // Assumes your context now provides an array of all songs.
  const { allSongs, selectedSong, setSelectedSong } = useContext(MusicContext);

  // Create a unique list of artists from all songs.
  const allArtists: string[] = Array.from(
    new Set(allSongs.flatMap((song: Song) => song.vizionaries || []))
  );

  // When a song is clicked, update the context.
  const armClickedSong = (song: Song) => {
    if (selectedSong?.id !== song.id) {
      console.log("Setting selected song to:", song.title);
      setSelectedSong(song);
    } else {
      console.log("Song already selected");
    }
  };

  // Group songs by their vizionaries (artists)
  const groupedSongs: { [artist: string]: Song[] } = {};
  allSongs.forEach((song: Song) => {
    const artists =
      song.vizionaries && song.vizionaries.length > 0
        ? song.vizionaries
        : ["Unknown Artist"];
    artists.forEach((artist) => {
      if (!groupedSongs[artist]) {
        groupedSongs[artist] = [];
      }
      groupedSongs[artist].push(song);
    });
  });

  return (
    <div className="SongDisplay">
      <h2>All Songs</h2>
      {allArtists.map((artist) => (
        <div className="artist-group" key={artist}>
          <section className="artist-section">
            <h3>{artist}</h3>
            <ul className="songGroup">
              {groupedSongs[artist].map((song: Song) => (
                <li key={song.id}>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      armClickedSong(song);
                    }}
                  >
                    {song.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ))}
    </div>
  );
};

export default SongDisplay;
