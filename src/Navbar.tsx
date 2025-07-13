import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { signOut, getAuth } from "firebase/auth";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { MusicContext } from "./Player/MusicContext";
import PlaylistPortal from "./pages/PlaylistPortal";
import { useNotification } from "./NotificationContext";
import "./NavBar.css";

const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const { dominantColor, contrastColor } = useContext(MusicContext);
  const { user } = useAuth();
  const { unreadCount } = useNotification();

  const [vizionaryName, setVizionaryName] = useState<string | null>(null);
  const [isVizionary, setIsVizionary] = useState<boolean>(false);
  const [showPlaylistPortal, setShowPlaylistPortal] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribeUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setVizionaryName(snap.data().vizionaryName || null);
        setIsVizionary(snap.data().isVizionary || false);
      }
    });

    return unsubscribeUser;
  }, [user]);

  useEffect(() => {
    console.log("NavBar unreadCount:", unreadCount);
  }, [unreadCount]);

  const handleLogout = async () => {
    await signOut(getAuth());
    navigate("/");
    console.log("Logged out successfully.");
  };

  const handleOpenPlaylistPortal = () => {
    if (!showPlaylistPortal) {
      setShowPlaylistPortal(true);
    }
  };

  return (
    <>
      <nav className="nav-bar" style={{ backgroundColor: dominantColor }}>
        <div className="nav-container">
          {/* SECTION 1: General Navigation */}
          <section className="nav-section left">
            <Link
              to="/"
              className="nav-button"
              style={{ color: contrastColor }}
            >
              Home
            </Link>
          </section>

          {/* SECTION 2: User Actions */}
          <section className="nav-section right">
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
                {vizionaryName ? (
                  <>
                    <Link
                      to="/vizionary-portal"
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
                ) : isVizionary ? (
                  <Link
                    to="/vizionary-onboarding"
                    className="nav-button"
                    style={{ color: contrastColor }}
                  >
                    Vizionary Onboarding
                  </Link>
                ) : null}

                {/* Chat Link with Notification Bubble */}
                <div className="chat-link-wrapper">
                  <Link
                    to="/chat"
                    className="nav-button"
                    style={{ color: contrastColor }}
                  >
                    Chat
                  </Link>
                  {unreadCount > 0 && <div className="notification-bubble" />}
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
          </section>
        </div>
      </nav>

      {/* Playlist Portal (Ensures only one instance is open) */}
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
