import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { MusicContext } from "./Player/MusicContext";
import SongDisplay from "./SongDisplay";
import "./AlbumPlayer.css";

interface AlbumDoc {
  title: string;
  coverArt?: string;
  vizionaries?: string[];
  songIds?: string[];
}

interface AlbumPlayerProps {
  /** Firestore ID of the album to play */
  albumId: string;
}

const AlbumPlayer: React.FC<AlbumPlayerProps> = ({ albumId }) => {
  const navigate = useNavigate();
  const [album, setAlbum] = useState<AlbumDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const { allSongs, setArmedPlaylist, setSelectedSong } =
    useContext(MusicContext);

  const handlePlayAlbum = () => {
    if (!album?.songIds?.length) return;

    // Arm entire album as playlist
    setArmedPlaylist({
      id: albumId,
      songIds: album.songIds,
      name: album.title,
    });

    // Start playback with the first track
    const firstSong = allSongs.find((s) => s.id === album.songIds![0]);
    if (firstSong) setSelectedSong(firstSong);
  };

  // Sync URL
  useEffect(() => {
    if (albumId) {
      navigate(`/album/${albumId}`, { replace: false });
    }
  }, [albumId, navigate]);

  // Fetch album document once
  useEffect(() => {
    if (!albumId) return;

    const fetchAlbum = async () => {
      try {
        const snap = await getDoc(doc(db, "albums", albumId));
        if (snap.exists()) {
          setAlbum(snap.data() as AlbumDoc);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAlbum();
  }, [albumId]);

  if (loading) return <p className="AlbumPlayer">Loading…</p>;
  if (!album) return <p className="AlbumPlayer">Album not found.</p>;

  return (
    <div className="AlbumPlayer">
      <div className="album-header">
        {album.coverArt ? (
          <img src={album.coverArt} alt={album.title} className="album-cover" />
        ) : (
          <div className="album-cover placeholder" />
        )}
        <h2 className="album-title">{album.title}</h2>
      </div>

      <button className="play-album-button" onClick={handlePlayAlbum}>
        Play Album
      </button>

      {/* List songs in this album */}
      <SongDisplay albumId={albumId} />
    </div>
  );
};

export default AlbumPlayer;
