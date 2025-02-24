import "./SongUpload.css";

import React, { useState, FormEvent } from "react";
import { storage, db } from "./firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { User } from "firebase/auth";

interface SongUploadProps {
  user: User;
  vizionaryName: string;
}

const SongUpload: React.FC<SongUploadProps> = ({ user, vizionaryName }) => {
  const [songTitle, setSongTitle] = useState<string>("");
  const [songFile, setSongFile] = useState<File | null>(null);
  const [coverArtFile, setCoverArtFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleSongFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSongFile(e.target.files[0]);
    }
  };

  const handleCoverArtFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverArtFile(e.target.files[0]);
    }
  };

  const handleSongUpload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadError("");
    if (!songFile) {
      setUploadError("Please select an audio file.");
      return;
    }
    if (!coverArtFile) {
      setUploadError("Please select a cover art image (square image).");
      return;
    }

    try {
      // Upload cover art image first
      const coverArtRef = ref(
        storage,
        `coverArt/${user.uid}/${coverArtFile.name}`
      );
      const coverArtUploadTask = uploadBytesResumable(
        coverArtRef,
        coverArtFile
      );

      const coverArtUrl: string = await new Promise((resolve, reject) => {
        coverArtUploadTask.on(
          "state_changed",
          null,
          (error) => {
            reject(error);
          },
          async () => {
            const url = await getDownloadURL(coverArtUploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      // Now upload the audio file
      const songRef = ref(storage, `songs/${user.uid}/${songFile.name}`);
      const songUploadTask = uploadBytesResumable(songRef, songFile);

      const songUrl: string = await new Promise((resolve, reject) => {
        songUploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
            console.log(`Song upload is ${progress}% done`);
          },
          (error) => {
            reject(error);
          },
          async () => {
            const url = await getDownloadURL(songUploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      // Save song metadata to Firestore using your Song model
      await addDoc(collection(db, "songs"), {
        title: songTitle,
        audio: songUrl,
        coverArt: coverArtUrl,
        vizionaries: [vizionaryName],
        createdAt: new Date(),
      });

      // Reset form fields on successful upload
      setSongTitle("");
      setSongFile(null);
      setCoverArtFile(null);
      setUploadProgress(0);
      console.log("Song uploaded successfully");
    } catch (err: any) {
      setUploadError(err.message);
      console.error("Upload error:", err);
    }
  };

  return (
    <div>
      <h3>Upload a New Song</h3>
      <form onSubmit={handleSongUpload}>
        <label>
          Song Title :
          <input
            type="text"
            placeholder="Song Title"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            required
          />
        </label>
        <label>
          {" "}
          Audio File :
          <input
            type="file"
            accept="audio/*"
            onChange={handleSongFileChange}
            required
          />{" "}
        </label>
        <label>
          Cover Art :
          <input
            type="file"
            accept="image/*"
            onChange={handleCoverArtFileChange}
            required
          />
        </label>
        <button type="submit">Upload Song</button>
      </form>
      {uploadProgress > 0 && (
        <p>Upload Progress: {Math.round(uploadProgress)}%</p>
      )}
      {uploadError && <p style={{ color: "red" }}>{uploadError}</p>}
    </div>
  );
};

export default SongUpload;
