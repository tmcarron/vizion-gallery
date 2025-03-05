import React, { useEffect, useState, useContext } from "react";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../AuthContext";
import { MusicContext } from "../Player/MusicContext";
import "./VizionaryPortal.css";

interface Song {
  id: string;
  title: string;
  audio: string;
  coverArt: string;
  albumId?: string;
  vizionaries: string[];
}

interface Album {
  id: string;
  title: string;
  coverArt: string;
}

const VizionaryPortal: React.FC = () => {
  const { user } = useAuth();

  const [vizionaryId, setVizionaryId] = useState("");
  const [vizionaryName, setVizionaryName] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);

  const getValidUrl = async (url: string) => {
    if (url.startsWith("gs://")) {
      const path = url.replace("gs://vizion-gallery.appspot.com/", "");
      return getDownloadURL(ref(storage, path));
    }
    return url;
  };

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setVizionaryId(data.vizionaryID || user.uid);
        setVizionaryName(data.vizionaryName || "Vizionary");
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (!vizionaryId) return;

    const unsubSongs = onSnapshot(
      query(
        collection(db, "songs"),
        where("vizionaries", "array-contains", vizionaryId)
      ),
      async (snapshot) => {
        const loadedSongs = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              title: data.title,
              audio: await getValidUrl(data.audio),
              coverArt: await getValidUrl(data.coverArt),
              albumId: data.albumId,
              vizionaries: data.vizionaries || [],
            } as Song;
          })
        );
        setSongs(loadedSongs);
      }
    );

    const unsubAlbums = onSnapshot(
      query(
        collection(db, "albums"),
        where("vizionaries", "array-contains", vizionaryId)
      ),
      async (snapshot) => {
        const loadedAlbums = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              title: data.title,
              coverArt: await getValidUrl(data.coverArt),
            } as Album;
          })
        );
        setAlbums(loadedAlbums);
      }
    );

    return () => {
      unsubSongs();
      unsubAlbums();
    };
  }, [vizionaryId]);

  const handleDelete = async (type: "songs" | "albums", id: string) => {
    if (window.confirm(`Delete this ${type.slice(0, -1)} permanently?`)) {
      await deleteDoc(doc(db, type, id));
      alert(`${type.slice(0, -1)} deleted.`);
    }
  };

  const handleUpdateTitle = async (
    type: "songs" | "albums",
    id: string,
    newTitle: string
  ) => {
    await updateDoc(doc(db, type, id), { title: newTitle });
    alert(`${type.slice(0, -1)} title updated successfully!`);
  };

  const handleFileChange = async (
    type: "songs" | "albums",
    id: string,
    field: "audio" | "coverArt",
    file: File
  ) => {
    const fileRef = ref(storage, `${type}/${vizionaryId}/${file.name}`);
    await uploadBytes(fileRef, file);
    const newUrl = await getDownloadURL(fileRef);

    await updateDoc(doc(db, type, id), { [field]: newUrl });
    alert(`${field === "audio" ? "Audio file" : "Cover art"} updated!`);
  };

  return (
    <div className="vizionary-portal">
      <h1>{vizionaryName}'s Portal </h1>

      <section>
        <h2>Your Songs 🎵</h2>
        {songs.map((song) => (
          <div key={song.id} className="song-card">
            <img
              src={song.coverArt}
              alt={song.title}
              className="cover-art-preview"
            />

            <div className="song-info">
              <label>Song Title:</label>
              <input
                type="text"
                value={song.title}
                onChange={(e) =>
                  setSongs((prev) =>
                    prev.map((s) =>
                      s.id === song.id ? { ...s, title: e.target.value } : s
                    )
                  )
                }
              />
              <button
                onClick={() => handleUpdateTitle("songs", song.id, song.title)}
              >
                Save Title
              </button>

              <label>Replace Audio File:</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileChange(
                      "songs",
                      song.id,
                      "audio",
                      e.target.files[0]
                    );
                  }
                }}
              />

              <label>Replace Cover Art:</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileChange(
                      "songs",
                      song.id,
                      "coverArt",
                      e.target.files[0]
                    );
                  }
                }}
              />

              <button onClick={() => handleDelete("songs", song.id)}>
                Delete Song
              </button>
            </div>
          </div>
        ))}

        <h2>Your Albums</h2>
        {albums.map((album) => (
          <div key={album.id} className="album-item">
            <img
              src={album.coverArt}
              alt={album.title}
              className="cover-art-preview"
            />
            <label>Album Title:</label>
            <input
              type="text"
              value={album.title}
              onChange={(e) =>
                setAlbums((prev) =>
                  prev.map((alb) =>
                    alb.id === album.id
                      ? { ...alb, title: e.target.value }
                      : alb
                  )
                )
              }
            />
            <button
              onClick={() => handleUpdateTitle("albums", album.id, album.title)}
            >
              Save Title
            </button>

            <label>Replace Album Cover Art:</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileChange(
                    "albums",
                    album.id,
                    "coverArt",
                    e.target.files[0]
                  );
                }
              }}
            />

            <button onClick={() => handleDelete("albums", album.id)}>
              Delete Album
            </button>
          </div>
        ))}
      </section>
    </div>
  );
};

export default VizionaryPortal;
