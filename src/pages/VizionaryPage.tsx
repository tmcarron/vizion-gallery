// VizionaryPage.tsx
import React, { useState, useEffect, FormEvent } from "react";
import { signInWithEmailAndPassword, User } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import "./VizionaryPage.css";
import SongUpload from "../SongUpload";
import Song from "../models/Song";

const VizionaryPage: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [vizionaryName, setVizionaryName] = useState<string>("");
  const [nameSubmitted, setNameSubmitted] = useState<boolean>(false);
  const [isFetchingName, setIsFetchingName] = useState<boolean>(false);
  const [songs, setSongs] = useState<Song[]>([]);

  // Login handler
  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      setUser(userCredential.user);
      console.log("Logged in:", userCredential.user);
    } catch (err: any) {
      setError(err.message);
      console.error("Login error:", err);
    }
  };

  // Fetch vizionary name from Firestore after login
  useEffect(() => {
    const fetchVizionaryName = async () => {
      if (user) {
        setIsFetchingName(true);
        try {
          const docRef = doc(db, "vizionaries", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.name) {
              setVizionaryName(data.name);
              setNameSubmitted(true);
            }
          }
        } catch (err) {
          console.error("Error fetching vizionary name:", err);
        }
        setIsFetchingName(false);
      }
    };

    fetchVizionaryName();
  }, [user]);

  // Handle submission of vizionary name
  const handleNameSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (user) {
        await setDoc(
          doc(db, "vizionaries", user.uid),
          { name: vizionaryName, email: user.email, updatedAt: new Date() },
          { merge: true }
        );
        console.log("Vizionary's name saved:", vizionaryName);
        setNameSubmitted(true);
      }
    } catch (err) {
      console.error("Error saving name:", err);
    }
  };

  useEffect(() => {
    const fetchSongs = async () => {
      if (user && nameSubmitted) {
        try {
          const songsRef = collection(db, "songs");
          // Query songs where the artistId matches the user's uid
          const q = query(
            songsRef,
            where("vizionaries", "array-contains", vizionaryName)
          );

          const querySnapshot = await getDocs(q);
          const songsList: Song[] = querySnapshot.docs.map((doc) => {
            const data = doc.data() as DocumentData;
            return {
              id: doc.id,
              title: data.title || "Untitled",
              audio: data.audio || "", // default to an empty string if missing
              coverArt: data.coverArt || "", // default to an empty string if missing
              vizionaries: data.vizionaries || [], // default to an empty array if missing
            };
          });
          setSongs(songsList);
        } catch (err) {
          console.error("Error fetching songs:", err);
        }
      }
    };

    fetchSongs();
  }, [user, nameSubmitted]);
  if (user && isFetchingName) {
    return (
      <div className="VizionaryPage">
        <p>Loading...</p>
      </div>
    );
  }
  // If logged in but name not submitted
  if (user && !nameSubmitted) {
    return (
      <div className="VizionaryPage">
        <h2>What is your name, Vizionary?</h2>
        <form onSubmit={handleNameSubmit}>
          <input
            type="text"
            placeholder="Enter your artist name"
            value={vizionaryName}
            onChange={(e) => setVizionaryName(e.target.value)}
            required
          />
          <button type="submit">Submit</button>
        </form>
      </div>
    );
  }
  // If logged in and name submitted, show welcome message and song upload feature
  if (user && nameSubmitted) {
    return (
      <div className="VizionaryPage">
        <h2>Welcome, {vizionaryName}!</h2>
        <SongUpload user={user} vizionaryName={vizionaryName} />
        {/* Display the list of songs */}
        <div className="song-list">
          <h3>Your Songs</h3>
          {songs.length > 0 ? (
            <ul>
              {songs.map((song) => (
                <li key={song.id}>
                  <strong>{song.title}</strong>
                  {/* Add more song details if needed */}
                </li>
              ))}
            </ul>
          ) : (
            <p>You haven't uploaded any songs yet.</p>
          )}
        </div>
      </div>
    );
  }

  // Login form if not logged in
  return (
    <div className="VizionaryPage">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default VizionaryPage;
