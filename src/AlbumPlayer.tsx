import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import SongDisplay from "./SongDisplay";
import "./AlbumPlayer.css";

interface AlbumDoc {
  title: string;
  coverArt?: string;
  vizionaries?: string[];
  /* songIds are pulled by SongDisplay via albumId prop */
}

interface AlbumPlayerProps {
  /** Firestore ID of the album to play */
  albumId: string;
}

const AlbumPlayer: React.FC<AlbumPlayerProps> = ({ albumId }) => {
  const navigate = useNavigate();
  const [album, setAlbum] = useState<AlbumDoc | null>(null);
  const [loading, setLoading] = useState(true);

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

      {/* List songs in this album */}
      <SongDisplay albumId={albumId} />
    </div>
  );
};

export default AlbumPlayer;
