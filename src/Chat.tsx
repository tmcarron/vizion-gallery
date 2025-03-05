import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { signOut, getAuth } from "firebase/auth";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { MusicContext } from "./Player/MusicContext";
import NotificationBubble from "./NotificationBubble";
import PlaylistPortal from "./pages/PlaylistPortal";
import "./NavBar.css";

const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const { dominantColor, contrastColor } = useContext(MusicContext);
  const { user } = useAuth();

  const [vizionaryName, setVizionaryName] = useState<string | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [showPlaylistPortal, setShowPlaylistPortal] = useState(false);

  // Get Vizionary status
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setVizionaryName(data.vizionaryName || null);
      }
    });

    return () => unsubscribeUser();
  }, [user]);

  // Check unread messages
  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const unsubscribeChats = onSnapshot(chatsQuery, async (chatSnapshot) => {
      let unreadExists = false;

      for (const chatDoc of chatSnapshot.docs) {
        const messagesRef = collection(db, `chats/${chatDoc.id}/messages`);
        const unreadMessagesQuery = query(
          messagesRef,
          where("to", "==", user.uid),
          where("read", "==", false)
        );

        const unreadMessagesSnapshot = await getDocs(unreadMessagesQuery);
        if (!unreadMessagesSnapshot.empty) {
          unreadExists = true;
          break;
        }
      }

      setHasUnreadMessages(unreadExists);
    });

    return () => unsubscribeChats();
  }, [user]);

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
              {hasUnreadMessages && <NotificationBubble />}
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
          openMode={"play"}
        />
      )}
    </>
  );
};

export default NavBar;
