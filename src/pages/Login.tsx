import React, { useEffect, useState, useContext } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, storage } from "../firebase";
import { getDownloadURL, ref } from "firebase/storage";
import "./Login.css";
import { MusicContext } from "../Player/MusicContext";
import { useNavigate } from "react-router-dom";
import { getBaseContrastAndComplementaryColor } from "../Player/ColorMatrix";
import { useAuth } from "../AuthContext";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { selectedSong } = useContext(MusicContext);
  const { user } = useAuth();

  // If user is already logged in, redirect them to the root.
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchImageAndSetColors = async () => {
      if (!selectedSong?.coverArt) return;

      try {
        console.log("🎵 Fetching cover art:", selectedSong.coverArt);

        // Convert gs:// URL to HTTPS URL if needed.
        const imageUrl = selectedSong.coverArt.startsWith("gs://")
          ? await getDownloadURL(ref(storage, selectedSong.coverArt))
          : selectedSong.coverArt;

        console.log("🖼 Converted image URL:", imageUrl);

        // Extract colors including complementary color.
        const { base, contrast, complementary } =
          await getBaseContrastAndComplementaryColor(imageUrl);

        console.log("🎨 Base Color:", base);
        console.log("⚖️ Contrast Color:", contrast);
        console.log("🔄 Complementary Color:", complementary);

        // Apply extracted colors to CSS variables.
        document.documentElement.style.setProperty("--dominantColor", base);
        document.documentElement.style.setProperty("--contrastColor", contrast);
        document.documentElement.style.setProperty(
          "--complementaryColor",
          complementary
        );
      } catch (err) {
        console.error("❌ Color matrix error:", err);
      }
    };

    fetchImageAndSetColors();
  }, [selectedSong]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ User logged in:", auth.currentUser);
      navigate("/"); // Redirect to the root after successful login.
    } catch (err: any) {
      console.error("❌ Login failed:", err.message);
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-section">
      <div className="login-container">
        <h2>Login</h2>
        {error && <p className="error-message">{error}</p>}
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
          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p>
          Don't have an account? <a href="/signup">Sign up here</a>
        </p>
      </div>
    </section>
  );
};

export default Login;
