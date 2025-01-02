import { useEffect, useState } from "react";
import "./AudioPlayerComponent.css";
import "react-h5-audio-player/lib/styles.css";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import Song from "../models/Song";
import { db, storage } from "../firebase";
import { getDownloadURL, ref } from "firebase/storage";
import { collection, getDocs } from "firebase/firestore";
import SongDisplay from "../SongDisplay";

const AudioPlayerComponent = () => {
  const viewTime = 1000;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [armedSong, setArmedSong] = useState<Song>();
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [viewMicroItterator, setViewMicroItterator] = useState(0);
  const [playlistNum, setPlaylistNum] = useState(0);
  // const imageStorageRef = playlist.length
  //   ? ref(storage, playlist[playlistNum].coverArt)
  //   : null;
  // const songStorageRef = playlist.length
  //   ? ref(storage, playlist[playlistNum].audio)
  //   : null;
  const [armedImage, setArmedImage] = useState("");

  const { duration, seek, play, pause, load, getPosition } =
    useGlobalAudioPlayer();

  const nextSong = () => {
    setViewMicroItterator(0);
    if (playlistNum < playlist.length - 1) {
      setPlaylistNum((prev) => prev + 1);
      if (isPlaying) {
        play();
      }
    }
  };
  const prevSong = () => {
    setViewMicroItterator(0);
    if (playlistNum > 0) {
      setPlaylistNum((prev) => prev - 1);
    }
  };
  useEffect(() => {
    if (isShuffled === false && playlist.length > 0) {
      setPlaylist(shuffle(playlist));
      setIsShuffled(true);
    }
  }, [playlist, isShuffled]);

  useEffect(() => {
    const fetchSongData = async () => {
      const currentSong = playlist[playlistNum];

      try {
        const audioUrl = await getDownloadURL(ref(storage, currentSong.audio));
        const coverArtUrl = currentSong.coverArt
          ? await getDownloadURL(ref(storage, currentSong.coverArt))
          : "";

        console.log("Fetched audio URL:", audioUrl); // Debug audio URL
        console.log("Fetched cover art URL:", coverArtUrl); // Debug cover art URL

        const updatedSong = {
          ...currentSong,
          audio: audioUrl,
          coverArt: coverArtUrl,
        };
        setArmedSong(updatedSong);
        setArmedImage(updatedSong.coverArt);
      } catch (error) {
        console.error("Error fetching song data:", error);
      }
    };

    if (playlist.length) {
      fetchSongData();
    }
  }, [playlist, playlistNum]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        setViewMicroItterator((prevItterator) => prevItterator + 1);
      }
      if (viewMicroItterator >= 30) {
        setViewMicroItterator(0);
        console.log("View counted!");
      }
    }, viewTime);
    return () => clearInterval(interval);
  }, [viewMicroItterator, isPlaying]);
  useEffect(() => {
    console.log(viewMicroItterator);
  }, [viewMicroItterator]);
  useEffect(() => {
    if (armedSong?.audio) {
      pause();
      // setIsPlaying(false);
      load(armedSong.audio, { autoplay: isPlaying });

      if (isPlaying) {
        setIsPlaying(true);
        play();
      }
    }
  }, [armedSong]);
  useEffect(() => {
    if (armedSong) {
      if (currentTime >= duration - 1) {
        nextSong();
      }
    }
  }, [currentTime]);
  useEffect(() => {
    if (playlist.length > 0 && !armedSong) {
      const initialSong = playlist[0];
      const fetchInitialData = async () => {
        try {
          const audioUrl = await getDownloadURL(
            ref(storage, initialSong.audio)
          );
          const coverArtUrl = initialSong.coverArt
            ? await getDownloadURL(ref(storage, initialSong.coverArt))
            : "";

          const updatedSong = {
            ...initialSong,
            audio: audioUrl,
            coverArt: coverArtUrl,
          };
          setArmedSong(updatedSong);
          setArmedImage(coverArtUrl);

          console.log("Loaded initial song:", updatedSong);
        } catch (error) {
          console.error("Error loading initial song:", error);
        }
      };

      fetchInitialData();
    }
  }, [playlist, armedSong]);
  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
      setIsPlaying(false);
    } else {
      play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const docSnap = await getDocs(collection(db, "songs"));
      let subPlaylist: Song[] = [];
      docSnap.docs.forEach((doc) => {
        const data = doc.data();
        const songToPlaylist: Song = {
          id: doc.id,
          title: data.title,
          audio: data.audio,
          coverArt: data.coverArt,
          vizionaries: data.vizionaries,
          vizionaryLinks: data.vizionaryLinks,
          viewsAllTime: data.viewsAllTime,
          viewsThisMonth: data.viewsThisMonth,
        };
        subPlaylist.push(songToPlaylist);
      });
      setPlaylist(subPlaylist);
    };
    fetchData();
  }, []);
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        const position = getPosition();
        if (!isNaN(position)) {
          setCurrentTime(position);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, getPosition, duration]);

  const handleSeek = (e: any) => {
    const newTime = (e.target.value / 100) * duration;
    seek(newTime);
    setCurrentTime(newTime);
  };
  const shuffle = (playlist: any) => {
    setPlaylistNum(0);
    const shuffledPlaylist = [...playlist];
    for (let i = playlist.length - 2; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPlaylist[i], shuffledPlaylist[j]] = [
        shuffledPlaylist[j],
        shuffledPlaylist[i],
      ];
    }
    return shuffledPlaylist;
  };

  const handleShuffle = () => {
    setPlaylist((prevPlaylist) => shuffle(prevPlaylist));
  };
  return (
    <div className="player-container">
      {playlist.length ? (
        <img className="cover-art" src={armedImage} alt="" />
      ) : (
        <p>No image</p>
      )}
      <h2>{playlist.length ? playlist[playlistNum].title : "Loading..."}</h2>
      <p>{playlist.length ? playlist[playlistNum].vizionaries : "Anonymous"}</p>

      <input
        type="range"
        min={0}
        max={100}
        value={duration > 0 ? (currentTime / duration) * 100 : 0}
        onChange={handleSeek}
      />
      <section className="player-controls">
        <button onClick={handlePlayPause}>
          {isPlaying ? "Pause" : "Play"}
        </button>
      </section>
      <section className="playlist-buttons">
        <button onClick={prevSong}>Previous song</button>
        <button onClick={handleShuffle}>Shuffle</button>
        <button onClick={nextSong}>Next song</button>
      </section>

      <SongDisplay
        armedSong={armedSong}
        setArmedSong={setArmedSong}
        thePlaylist={playlist}
        setPlaylistNum={setPlaylistNum}
      />
    </div>
  );
};

export default AudioPlayerComponent;
