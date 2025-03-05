import React, { useState, useContext } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { MusicContext } from "../Player/MusicContext"; // ✅ Import MusicContext
import "./Signup.css";

const Signup: React.FC = () => {
  const { complementaryColor } = useContext(MusicContext); // ✅ Get complementary color
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const checkUsernameExists = async (username: string) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      setError("Please enter a username.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const usernameTaken = await checkUsernameExists(username);
      if (usernameTaken) {
        setError("Username is already taken. Try another one.");
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await updateProfile(user, { displayName: username });

      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        username,
        email,
        isVizionary: false,
      });

      console.log("✅ User signed up:", user.uid);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("❌ Error signing up:", err.message);
      setError("Failed to create an account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="signup-domain">
      <div
        className="signup-container"
        style={{ borderColor: complementaryColor }}
      >
        <h2 style={{ color: complementaryColor }}>Sign Up</h2>{" "}
        {/* ✅ Apply complementary color */}
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSignup}>
          <input
            type="text"
            placeholder="Choose a unique username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
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
          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: complementaryColor }}
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
        <p style={{ color: complementaryColor }}>
          Already have an account? <a href="/login">Log in</a>
        </p>
      </div>
    </section>
  );
};

export default Signup;
