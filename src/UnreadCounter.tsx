import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

interface UnreadCounterProps {
  otherUserId: string;
}

const UnreadCounter: React.FC<UnreadCounterProps> = ({ otherUserId }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;

    const conversationId = [user.uid, otherUserId].sort().join("_");

    // Listen for unread messages **from this specific sender**.
    const messagesRef = collection(db, "chats", conversationId, "messages");
    const unreadQuery = query(
      messagesRef,
      where("to", "==", user.uid),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(unreadQuery, (snapshot) => {
      const hasUnread = snapshot.size > 0; // **Only track if this sender has unread messages**
      setUnreadCount(hasUnread ? 1 : 0);
    });

    return () => unsubscribe();
  }, [user, otherUserId]);

  return unreadCount > 0 ? (
    <span className="notification-bubble">{unreadCount}</span>
  ) : null;
};

export default UnreadCounter;
