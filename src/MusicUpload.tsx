import React, { useState, useEffect } from "react";
import { storage, db } from "./firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
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

  // Helper function to add debug messages

  // Fetch Vizionary Name on component mount
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
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (error) {
            console.error("Error getting download URL:", error);
            reject(error);
          }
        }
      );
    });
  };

  const handleUpload = async () => {
    if (!user) {
      setError("You must be logged in.");
      return;
    }

    // Album title required check
    if (numSongs > 1 && !albumTitle.trim()) {
      setError("Album title is required for multiple songs.");
      return;
    }

    // Validation check with detailed error
    if (!coverArt) {
      setError("Cover art is required.");
      return;
    }

    // Check each song individually
    for (let i = 0; i < songs.length; i++) {
      if (!songs[i].title.trim()) {
        setError(`Song ${i + 1} is missing a title.`);
        return;
      }
      if (!songs[i].audio) {
        setError(`Song ${i + 1} is missing an audio file.`);
        return;
      }
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    try {
      // Upload cover art

      // Create album if necessary
      let albumId: string | null = null;
      let songIds: string[] = [];

      if (numSongs > 1) {
        try {
          const albumDoc = await addDoc(collection(db, "albums"), {
            title: albumTitle,
            coverArt: coverArt,
            vizionaries: [vizionaryName],
            createdAt: serverTimestamp(),
            uploader: user.uid,
            songIds: [], // Initialize with empty array
          });
          albumId = albumDoc.id;

          // Verify album was created correctly
          const albumCheck = await getDoc(doc(db, "albums", albumId));

          if (albumCheck.exists()) {
          }
        } catch (albumError) {}
      }

      // Upload each song
      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];

        try {
          const audioURL = await uploadFileWithProgress(
            song.audio!,
            `songs/${user.uid}/${Date.now()}_${song.audio!.name}`
          );

          // Add song document to Firestore
          const songDoc = await addDoc(collection(db, "songs"), {
            title: song.title,
            audio: audioURL,
            coverArt: coverArt,
            order: i + 1,
            albumId: albumId, // Associate with album if part of one
            vizionaries: [vizionaryName],
            uploader: user.uid,
            createdAt: serverTimestamp(),
          });

          // Store song ID for album update
          songIds.push(songDoc.id);
        } catch (songError) {}
      }

      // Update the album with song IDs
      if (albumId && songIds.length > 0) {
        try {
          const albumRef = doc(db, "albums", albumId);
          await updateDoc(albumRef, {
            songIds: songIds,
          });

          // Verify the update was successful
          const updatedAlbum = await getDoc(albumRef);
          if (updatedAlbum.exists()) {
            const albumData = updatedAlbum.data();

            if (albumData.songIds && albumData.songIds.length > 0) {
            } else {
            }
          } else {
          }
        } catch (updateError) {
          throw updateError;
        }
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
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          setCoverArt(file);
        }}
      />
      {coverArt && <p className="file-selected">Selected: {coverArt.name}</p>}

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
            placeholder="Required for multiple songs"
          />
        </>
      )}

      {songs.map((song, index) => (
        <div key={index} className="song-entry">
          <h3>Song {index + 1}</h3>
          <label>Title:</label>
          <input
            type="text"
            value={song.title}
            onChange={(e) => handleSongChange(index, "title", e.target.value)}
            placeholder="Enter song title"
          />
          <label>Audio File:</label>
          <input
            type="file"
            accept=".mp3, .wav, .flac, .aac, .m4a, .ogg"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              handleSongChange(index, "audio", file);
            }}
          />
          {song.audio && (
            <p className="file-selected">Selected: {song.audio.name}</p>
          )}
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
