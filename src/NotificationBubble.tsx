import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import "./NotificationBubble.css";

const NotificationBubble: React.FC = () => {
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Adjust the collection path as needed if your messages are in subcollections.
    const q = query(
      collection(db, "chats"),
      where("to", "==", user.uid),
      where("read", "==", false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasUnread(snapshot.size > 0);
    });
    return () => unsubscribe();
  }, [user]);

  // Only render the red bubble if there are unread messages.
  if (!hasUnread) return null;
  return <div className="notification-bubble"></div>;
};

export default NotificationBubble;
