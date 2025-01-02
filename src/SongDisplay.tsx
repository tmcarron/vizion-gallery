import "./SongDisplay.css";
import Song from "./models/Song";

const SongDisplay = (props: any) => {
  const armClickedSong = (song: Song) => {
    const songIndex = props.thePlaylist.findIndex(
      (s: Song) => s.id === song.id
    );

    props.setPlaylistNum(songIndex);
    if (props.armedSong?.id !== song.id) {
      console.log("Setting armed song to: ", song);
      props.setArmedSong(song);
    } else {
      console.log("Song already armed");
    }
  };
  return (
    <div className="SongDisplay">
      {props.thePlaylist.map((song: Song) => (
        <p key={song.id}>
          <a
            href=""
            onClick={(e) => {
              e.preventDefault();
              armClickedSong(song);
            }}
          >
            {song.title} - {song.vizionaries}
          </a>
        </p>
      ))}
    </div>
  );
};

export default SongDisplay;
