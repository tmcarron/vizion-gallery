import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { signOut, getAuth } from "firebase/auth";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { MusicContext } from "./Player/MusicContext";
import PlaylistPortal from "./pages/PlaylistPortal";
import NotificationBubble from "./NotificationBubble";
import { useNotification } from "./NotificationContext";
import "./NavBar.css";

const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const { dominantColor, contrastColor } = useContext(MusicContext);
  const { user } = useAuth();
  const { unreadCount } = useNotification();

  const [vizionaryName, setVizionaryName] = useState<string | null>(null);
  const [showPlaylistPortal, setShowPlaylistPortal] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribeUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setVizionaryName(snap.data().vizionaryName || null);
      }
    });

    return unsubscribeUser;
  }, [user]);

  useEffect(() => {
    console.log("🔥 NavBar unreadCount:", unreadCount);
  }, [unreadCount]);

  const handleLogout = async () => {
    await signOut(getAuth());
    navigate("/");
    console.log("Logged out successfully.");
  };

  return (
    <>
      <nav className="nav-bar" style={{ backgroundColor: dominantColor }}>
        <Link to="/" className="nav-button" style={{ color: contrastColor }}>
          Home
        </Link>

        {!user ? (
          <Link
            to="/login"
            className="nav-button"
            style={{ color: contrastColor }}
          >
            Login
          </Link>
        ) : (
          <>
            <button
              className="nav-button"
              style={{ color: contrastColor }}
              onClick={() => setShowPlaylistPortal(true)}
            >
              Playlists
            </button>

            {vizionaryName && (
              <>
                <Link
                  to="/vizionaryportal"
                  className="nav-button"
                  style={{ color: contrastColor }}
                >
                  Vizionary Portal
                </Link>
                <Link
                  to="/music-upload"
                  className="nav-button"
                  style={{ color: contrastColor }}
                >
                  Music Upload
                </Link>
              </>
            )}

            <div className="chat-link-wrapper" style={{ position: "relative" }}>
              <Link
                to="/chat"
                className="nav-button"
                style={{ color: contrastColor }}
              >
                Chat
              </Link>
              {unreadCount > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "8px",
                    height: "8px",
                    backgroundColor: "red",
                    borderRadius: "50%",
                    color: "white",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "10px",
                    fontWeight: "bold",
                    zIndex: 1000,
                  }}
                ></div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="nav-button"
              style={{ color: contrastColor }}
            >
              Logout
            </button>
          </>
        )}
      </nav>

      {showPlaylistPortal && user && (
        <PlaylistPortal
          currentUserId={user.uid}
          onClose={() => setShowPlaylistPortal(false)}
          openMode="play"
        />
      )}
    </>
  );
};

export default NavBar;
