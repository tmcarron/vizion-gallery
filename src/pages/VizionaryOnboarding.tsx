import React, { useEffect, useState, useContext } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { MusicContext } from "../Player/MusicContext"; // 🎨 Dynamic Colors
import "./VizionaryOnboarding.css";

const VizionaryOnboarding: React.FC = () => {
  const { user } = useAuth();
  const { dominantColor, contrastColor } = useContext(MusicContext); // 🎨 Get colors
  const [vizionaryName, setVizionaryName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [typingEffect, setTypingEffect] = useState("");

  useEffect(() => {
    if (!user) return;

    const checkVizionary = async () => {
      try {
        const userSnap = await getDocs(
          query(collection(db, "users"), where("id", "==", user.uid))
        );

        if (!userSnap.empty) {
          const userData = userSnap.docs[0].data();
          if (userData.isVizionary && userData.vizionaryName) {
            setVizionaryName(userData.vizionaryName);
            setIsFirstTime(false);
          }
        }
      } catch (err) {
        console.error(" Error checking Vizionary status:", err);
      }
    };

    checkVizionary();
  }, [user]);

  // **Typing effect for introduction**
  useEffect(() => {
    const text = "What is your name, Vizionary?";
    let index = 0;
    const interval = setInterval(() => {
      setTypingEffect(text.slice(0, index));
      index++;
      if (index > text.length) clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const handleVizionarySubmit = async () => {
    if (!vizionaryName.trim()) {
      setError("A name must be chosen, traveler.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 🔍 Check if the Vizionary name is already taken
      const vizQuery = query(
        collection(db, "vizionaries"),
        where("name", "==", vizionaryName)
      );
      const snapshot = await getDocs(vizQuery);

      if (!snapshot.empty) {
        setError("Name Taken");
        setLoading(false);
        return;
      }

      // ✅ Assign Vizionary status
      const userRef = doc(db, "users", user!.uid);
      await updateDoc(userRef, {
        vizionaryName: vizionaryName,
        username: vizionaryName,
        isVizionary: true,
      });

      // ✅ Create Vizionary entry
      const vizRef = doc(db, "vizionaries", user!.uid);
      await setDoc(vizRef, {
        id: user!.uid,
        name: vizionaryName,
        userId: user!.uid,
      });

      console.log(
        `🎨 Vizionary name "${vizionaryName}" assigned to ${user!.uid}`
      );
      setIsFirstTime(false);
      setSuccess("Go on and create.");
    } catch (err) {
      console.error("Error assigning Vizionary name:", err);
      setError("A great disturbance... please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="vizionary-onboarding">
      {isFirstTime ? (
        <h2 className="typing-text" style={{ color: contrastColor }}>
          {typingEffect}
        </h2>
      ) : (
        <h2 style={{ color: contrastColor }}>
          Welcome, <span className="vizionary-name">{vizionaryName}</span>
        </h2>
      )}

      <div className="onboarding-container">
        <input
          type="text"
          value={vizionaryName}
          onChange={(e) => setVizionaryName(e.target.value)}
          placeholder="Enter your Vizionary name..."
          className={`vizionary-input ${error ? "shake" : ""}`}
          style={{
            borderColor: contrastColor,
            color: contrastColor,
          }}
          required
        />

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        <button
          onClick={handleVizionarySubmit}
          disabled={loading}
          className={`confirm-button ${loading ? "loading" : ""}`}
          style={{
            backgroundColor: contrastColor,
            color: dominantColor,
            boxShadow: `0 0 15px ${contrastColor}`,
          }}
        >
          {loading ? "Loading" : "Confirm Vizionary Name"}
        </button>
      </div>
    </div>
  );
};

export default VizionaryOnboarding;
