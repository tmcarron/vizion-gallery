import { useCallback, useContext, useEffect, useRef, useState } from "react";
import "./AudioPlayerComponent.css";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { storage } from "../firebase";
import { getDownloadURL, ref } from "firebase/storage";
import SongDisplay from "../SongDisplay";
import { MusicContext } from "./MusicContext";

const AudioPlayerComponent: React.FC = () => {
  const prevTimeRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [coverArt, setCoverArt] = useState<string>("");
  const [hasEnded, setHasEnded] = useState<boolean>(false);

  // Fetch songs on mount

  const { setSelectedSong, selectedSong, allSongs } = useContext(MusicContext);
  const { duration, seek, play, pause, load, getPosition } =
    useGlobalAudioPlayer();

  // Effect to load selected song (image and audio)
  useEffect(() => {
    if (selectedSong) {
      const fetchSelectedSong = async () => {
        try {
          const audioUrl = await getDownloadURL(
            ref(storage, selectedSong.audio)
          );
          const coverArtUrl = selectedSong.coverArt
            ? await getDownloadURL(ref(storage, selectedSong.coverArt))
            : "";
          setCoverArt(coverArtUrl);
          await load(audioUrl, { autoplay: false });
          if (isPlaying) {
            play();
          }
          console.log("Loaded selected song:", selectedSong.title);
        } catch (error) {
          console.error("Error loading selected song:", error);
        }
      };
      setHasEnded(false);

      fetchSelectedSong();
    }
  }, [selectedSong, load, play]);

  // Update current playback time
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        const pos = getPosition();
        if (!isNaN(pos)) {
          setCurrentTime(pos);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, getPosition, duration]);

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
      setIsPlaying(false);
    } else {
      play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (Number(e.target.value) / 100) * duration;
    seek(newTime);
    setCurrentTime(newTime);
  };
  useEffect(() => {
    if (isPlaying && duration > 0 && currentTime >= duration && !hasEnded) {
      setHasEnded(true);
      handleNextSong();
    }
  }, [
    currentTime,
    duration,
    isPlaying,
    hasEnded /* handleNextSong will be defined below */,
  ]);
  // Next song handler.
  const handleNextSong = useCallback(() => {
    if (!allSongs || !selectedSong || allSongs.length === 0) return;
    const currentIndex = allSongs.findIndex(
      (song) => song.id === selectedSong.id
    );
    const nextIndex = (currentIndex + 1) % allSongs.length;
    setSelectedSong(allSongs[nextIndex]);
    setCurrentTime(0);
    setIsPlaying(true);
  }, [allSongs, selectedSong, setSelectedSong]);

  // Function to handle moving to the previous song
  const handlePreviousSong = () => {
    if (!allSongs || allSongs.length === 0 || !selectedSong) return;
    const currentIndex = allSongs.findIndex(
      (song) => song.id === selectedSong.id
    );
    const prevIndex = (currentIndex - 1 + allSongs.length) % allSongs.length;
    setSelectedSong(allSongs[prevIndex]);
    // Reset state when moving to a new song
    setIsPlaying(true);
    setCurrentTime(0);
  };
  // Effect to listen for the "ended" event on the audio element

  // Listen for the "ended" event on the audio element

  // Effect to detect when currentTime meets or exceeds duration and trigger next song
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const pos = getPosition();
      if (!isNaN(pos)) {
        setCurrentTime(pos);

        // Check if we jumped from near the end back to near 0.
        // For example, if previous time > duration - 0.5 and current time < 0.1, assume song ended.
        if (
          duration > 0 &&
          prevTimeRef.current >= duration - 0.5 &&
          pos < 0.1
        ) {
          handleNextSong();
        }
        prevTimeRef.current = pos;
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, getPosition, duration, handleNextSong]);

  return (
    <div className="player-container">
      {coverArt ? (
        <img className="cover-art" src={coverArt} alt="Cover art" />
      ) : (
        <p>No image</p>
      )}
      <h2>{selectedSong ? selectedSong.title : "No song selected"}</h2>
      <p>
        {selectedSong
          ? selectedSong.vizionaries && selectedSong.vizionaries.length
            ? selectedSong.vizionaries.join(", ")
            : "Unknown Artist"
          : "Anonymous"}
      </p>

      <input
        type="range"
        min={0}
        max={100}
        value={duration > 0 ? (currentTime / duration) * 100 : 0}
        onChange={handleSeek}
      />
      <section className="player-controls">
        <button onClick={handlePreviousSong}>Previous</button>
        <button onClick={handlePlayPause}>
          {isPlaying ? "Pause" : "Play"}
        </button>

        <button onClick={handleNextSong}>Next </button>
      </section>
      <SongDisplay />
    </div>
  );
};

export default AudioPlayerComponent;
