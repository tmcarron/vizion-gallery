import React, { useState, useEffect } from "react";
import { storage, db } from "./firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  getDocs,
  where,
  onSnapshot,
  doc,
} from "firebase/firestore";
import { useAuth } from "./AuthContext";
import "./MusicUpload.css";

const MusicUpload: React.FC = () => {
  const { user } = useAuth();
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [numSongs, setNumSongs] = useState(1);
  const [songs, setSongs] = useState([
    { title: "", audio: null as File | null },
  ]);
  const [albumTitle, setAlbumTitle] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [vizionaryName, setVizionaryName] = useState<string>("");

  // ✅ Fetch Vizionary Name on component mount
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        setVizionaryName(snap.data().vizionaryName || "Anonymous");
      }
    });

    return unsubscribe;
  }, [user]);

  const handleNumSongsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    setNumSongs(num);
    setSongs(
      Array.from(
        { length: num },
        (_, i) => songs[i] || { title: "", audio: null }
      )
    );
  };

  const handleSongChange = (
    index: number,
    key: "title" | "audio",
    value: any
  ) => {
    setSongs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };

  const uploadFileWithProgress = (file: File, storagePath: string) => {
    return new Promise<string>((resolve, reject) => {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const percent =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(percent));
        },
        reject,
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  };

  const handleUpload = async () => {
    if (!user) {
      setError("You must be logged in.");
      return;
    }
    if (!coverArt || songs.some((s) => !s.title || !s.audio)) {
      setError("All fields are required.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    try {
      // ✅ Upload cover art
      const coverArtURL = await uploadFileWithProgress(
        coverArt,
        `coverArt/${user.uid}/${coverArt.name}`
      );

      // ✅ Create album if necessary
      let albumId: string | null = null;
      if (numSongs > 1) {
        const albumDoc = await addDoc(collection(db, "albums"), {
          title: albumTitle,
          coverArt: coverArtURL,
          vizionaries: [vizionaryName],
          createdAt: serverTimestamp(),
        });
        albumId = albumDoc.id;
      }

      // ✅ Upload each song
      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        const audioURL = await uploadFileWithProgress(
          song.audio!,
          `songs/${user.uid}/${song.audio!.name}`
        );

        await addDoc(collection(db, "songs"), {
          title: song.title,
          audio: audioURL,
          coverArt: coverArtURL,
          order: i + 1,
          albumId: albumId,
          vizionaries: [vizionaryName], // ✅ Correct vizionaryName used here
          createdAt: serverTimestamp(),
        });
      }

      setSuccess("Music uploaded successfully!");
      setSongs([{ title: "", audio: null }]);
      setCoverArt(null);
      setAlbumTitle("");
      setNumSongs(1);
      setUploadProgress(0);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="music-upload">
      <h1>Upload Your Music</h1>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <label>Cover Art:</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setCoverArt(e.target.files?.[0] || null)}
      />

      <label>Number of Songs:</label>
      <input
        type="number"
        min="1"
        value={numSongs}
        onChange={handleNumSongsChange}
      />

      {numSongs > 1 && (
        <>
          <label>Album Title:</label>
          <input
            type="text"
            value={albumTitle}
            onChange={(e) => setAlbumTitle(e.target.value)}
          />
        </>
      )}

      {songs.map((song, index) => (
        <div key={index}>
          <label>Song {index + 1} Title:</label>
          <input
            type="text"
            value={song.title}
            onChange={(e) => handleSongChange(index, "title", e.target.value)}
          />
          <label>Audio File:</label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) =>
              handleSongChange(index, "audio", e.target.files?.[0] || null)
            }
          />
        </div>
      ))}

      {uploading && (
        <div className="progress-bar-container">
          <progress value={uploadProgress} max="100" />
          <span>{uploadProgress}%</span>
        </div>
      )}

      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? "Uploading..." : "Upload Music"}
      </button>
    </div>
  );
};

export default MusicUpload;
