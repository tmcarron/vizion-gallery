import { useCallback, useContext, useEffect, useRef, useState } from "react";
import "./AudioPlayerComponent.css";
import { getDownloadURL, ref } from "firebase/storage";
import { MusicContext } from "./MusicContext";
import { storage } from "../firebase";
import { getBaseContrastAndComplementaryColor } from "./ColorMatrix";
import { Link } from "react-router-dom";

const AudioPlayerComponent: React.FC = () => {
  const {
    allSongs,
    armedPlaylist,
    selectedSong,
    setSelectedSong,
    setArmedPlaylist,
  } = useContext(MusicContext);

  const [playIconUrl, setPlayIconUrl] = useState("");
  const [pauseIconUrl, setPauseIconUrl] = useState("");
  const [coverArt, setCoverArt] = useState("");
  const [dominantColor, setDominantColor] = useState("#222");
  const [contrastColor, setContrastColor] = useState("#fff");
  const [setComplementaryColor] = useState("#ffff");
  const [isPlaying, setIsPlaying] = useState(false);
  // const [isLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ✅ Load first song from armedPlaylist clearly (autoPlay=true)

  // ✅ Update audio source when selectedSong changes
  useEffect(() => {
    const loadAndPlaySong = async () => {
      if (!audioRef.current || !selectedSong?.audio) return;

      console.log("🎵 Loading song:", selectedSong.title);

      audioRef.current.pause();
      let audioUrl = selectedSong.audio;

      if (audioUrl.startsWith("gs://")) {
        audioUrl = await getDownloadURL(ref(storage, selectedSong.audio));
      }

      audioRef.current.src = audioUrl;
      audioRef.current.load();

      audioRef.current.oncanplaythrough = async () => {
        console.log("✅ Audio is ready to play");
        if (isPlaying) {
          // ✅ Only play if isPlaying is true
          try {
            await audioRef.current!.play();
          } catch (error) {
            console.error("❌ Error playing audio:", error);
          }
        }
      };
    };

    loadAndPlaySong();
  }, [selectedSong, isPlaying]); // ✅ Depend on isPlaying
  useEffect(() => {
    if (!audioRef.current) return;

    const updateDuration = () => {
      if (audioRef.current?.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
        console.log("✅ Duration set:", audioRef.current.duration);
      }
    };

    audioRef.current.addEventListener("loadedmetadata", updateDuration);

    return () => {
      audioRef.current?.removeEventListener("loadedmetadata", updateDuration);
    };
  }, [selectedSong]);
  useEffect(() => {
    const fetchIcons = async () => {
      try {
        const playUrl = await getDownloadURL(
          ref(storage, "icons/icons8-play-50.png")
        );
        const pauseUrl = await getDownloadURL(
          ref(storage, "icons/icons8-pause-50.png")
        );
        setPlayIconUrl(playUrl);
        setPauseIconUrl(pauseUrl);
      } catch (error) {
        console.error("Error fetching icons:", error);
      }
    };
    fetchIcons();
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;

    const updateTime = () => {
      setCurrentTime(audioRef.current?.currentTime || 0);
    };

    audioRef.current.addEventListener("timeupdate", updateTime);

    return () => {
      audioRef.current?.removeEventListener("timeupdate", updateTime);
    };
  }, []);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!audioRef.current) return;
      const newTime = (Number(e.target.value) / 100) * duration;
      audioRef.current.currentTime = newTime;
    },
    [duration]
  );

  // ✅ Handle Next Song
  const handleNextSong = useCallback(() => {
    if (!selectedSong || !armedPlaylist?.songIds.length) return;

    const currentIndex = armedPlaylist.songIds.findIndex(
      (songId) => songId === selectedSong.id
    );
    const nextIndex = (currentIndex + 1) % armedPlaylist.songIds.length;
    const nextSongId = armedPlaylist.songIds[nextIndex];
    const nextSong = allSongs.find((song) => song.id === nextSongId);

    if (nextSong) {
      setSelectedSong(nextSong);
    } else {
      console.warn("⚠️ Next song not found:", nextSongId);
    }
  }, [selectedSong, armedPlaylist, setSelectedSong, allSongs]);

  // ✅ Handle Previous Song
  const handlePreviousSong = useCallback(() => {
    if (!selectedSong || !armedPlaylist?.songIds.length) return;

    const currentIndex = armedPlaylist.songIds.findIndex(
      (songId) => songId === selectedSong.id
    );
    const prevIndex =
      (currentIndex - 1 + armedPlaylist.songIds.length) %
      armedPlaylist.songIds.length;
    const prevSongId = armedPlaylist.songIds[prevIndex];
    const prevSong = allSongs.find((song) => song.id === prevSongId);

    if (prevSong) {
      setSelectedSong(prevSong);
    } else {
      console.warn("⚠️ Previous song not found:", prevSongId);
    }
  }, [selectedSong, armedPlaylist, setSelectedSong, allSongs]);

  // ✅ Handle Shuffle
  const handleShuffle = () => {
    if (!armedPlaylist?.songIds.length) return;

    const shuffledSongIds = [...armedPlaylist.songIds].sort(
      () => Math.random() - 0.5
    );

    setArmedPlaylist({
      ...armedPlaylist,
      songIds: shuffledSongIds,
    });

    const firstShuffledSong = allSongs.find(
      (song) => song.id === shuffledSongIds[0]
    );

    if (firstShuffledSong) {
      setSelectedSong(firstShuffledSong);
    }
  };

  useEffect(() => {
    const handleEnded = () => handleNextSong();
    audioRef.current?.addEventListener("ended", handleEnded);
    return () => audioRef.current?.removeEventListener("ended", handleEnded);
  }, [selectedSong, handleNextSong]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !audioRef.current.src) {
      console.warn("⚠️ No audio source found.");
      return;
    }

    if (audioRef.current.paused) {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          console.log("▶️ Playing");
        })
        .catch((error) => {
          console.error("❌ Error playing audio:", error);
        });
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
      console.log("⏸️ Paused");
    }
  }, []);
  useEffect(() => {
    if (!selectedSong?.coverArt) return;
    const updateCoverArt = async () => {
      const coverArtUrl = await getDownloadURL(
        ref(storage, selectedSong.coverArt)
      );
      setCoverArt(coverArtUrl);
      const { base, contrast } = await getBaseContrastAndComplementaryColor(
        coverArtUrl
      );
      setDominantColor(base);
      setContrastColor(contrast);
      setComplementaryColor;
    };
    updateCoverArt();
  }, [selectedSong]);
  useEffect(() => {
    console.log("🎵 selectedSong:", selectedSong);
    console.log("🔗 selectedSong.audio:", selectedSong?.audio);
    console.log("🎧 audioRef.current.src:", audioRef.current?.src);
  }, [selectedSong]);
  return (
    <section className="audio-player">
      <div
        className={`player-container ${isCollapsed ? "collapsed" : ""}`}
        style={{ backgroundColor: dominantColor }}
      >
        <audio ref={audioRef} />
        <div className="player-content">
          <div
            className={`cover-art-container ${isCollapsed ? "collapsed" : ""}`}
          >
            {selectedSong && coverArt ? (
              <img className="cover-art" src={coverArt} alt="Cover art" />
            ) : (
              <p>No cover art</p>
            )}
          </div>
          <p style={{ color: contrastColor }}>
            {selectedSong?.vizionaries?.length
              ? selectedSong.vizionaries.map((vizionaryId) => (
                  <Link
                    key={vizionaryId}
                    to={`/vizionary/${vizionaryId}`}
                    className="vizionary-link"
                    style={{ color: contrastColor }}
                  >
                    {vizionaryId}
                  </Link>
                ))
              : "Anonymous"}
          </p>
          <div className="audio-controls">
            <h2 style={{ color: contrastColor }}>
              {selectedSong?.title || "No song selected"}
            </h2>
            <section className="player-controls">
              <button onClick={handlePreviousSong}>{"<"}</button>
              <button onClick={handlePlayPause}>
                <img
                  src={isPlaying ? pauseIconUrl : playIconUrl}
                  alt="Play/Pause"
                />
              </button>
              <button onClick={handleNextSong}>{">"}</button>
            </section>
            <input
              className="audio-bar"
              type="range"
              min={0}
              max={100}
              value={duration ? (currentTime / duration) * 100 : 0}
              onChange={handleSeek}
            />
          </div>
          <button className="shuffle-button" onClick={handleShuffle}>
            Shuffle
          </button>
          <button
            className="toggle-button"
            onClick={() => setIsCollapsed((prev) => !prev)} // Explicit toggle state
          >
            {isCollapsed ? "Enlarge" : "Collapse"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default AudioPlayerComponent;
