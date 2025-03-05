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
import { MusicContext } from "../Player/MusicContext";
import "./VizionaryOnboarding.css";

const VizionaryOnboarding: React.FC = () => {
  const { user } = useAuth();
  const { dominantColor, contrastColor } = useContext(MusicContext);
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

      const vizionaryId = doc(collection(db, "vizionaries")).id;

      const userRef = doc(db, "users", user!.uid);
      await updateDoc(userRef, {
        vizionaryName: vizionaryName,
        username: vizionaryName,
        isVizionary: true,
        vizionaryId: vizionaryId,
      });

      const vizRef = doc(db, "vizionaries", vizionaryId);
      await setDoc(vizRef, {
        id: vizionaryId,
        name: vizionaryName,
        userId: user!.uid,
      });

      setIsFirstTime(false);
      setSuccess("Your Vizionary path begins!");
    } catch (err) {
      console.error("Error assigning Vizionary name:", err);
      setError("A great disturbance... please try again.");
    }

    setLoading(false);
  };

  return (
    <div
      className="vizionary-onboarding"
      style={{ backgroundColor: dominantColor, color: contrastColor }}
    >
      {isFirstTime ? (
        <h2 className="typing-text">{typingEffect}</h2>
      ) : (
        <h2>
          Welcome, <span className="vizionary-name">{vizionaryName}</span>
        </h2>
      )}

      <div className="onboarding-container">
        <input
          type="text"
          value={vizionaryName}
          onChange={(e) => setVizionaryName(e.target.value)}
          placeholder="Choose your Vizionary name"
          className="vizionary-input"
          style={{
            borderColor: contrastColor,
            color: contrastColor,
            backgroundColor: dominantColor,
          }}
          required
        />

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        <button
          onClick={handleVizionarySubmit}
          disabled={loading}
          className="confirm-button"
          style={{
            backgroundColor: contrastColor,
            color: dominantColor,
          }}
        >
          {loading ? "Awakening..." : "Claim Your Name"}
        </button>
      </div>
    </div>
  );
};

export default VizionaryOnboarding;
