import { createContext, useContext, useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { AuthContext, AuthContextType } from "./AuthContext";

// Define a simple Notification type.
// Extend this interface as needed.
export interface Notification {
  id: string;
  read: boolean;
  from: string;
  // Additional fields (e.g., message, timestamp) can be added here.
  chatId?: string;
}

interface NotificationContextProps {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
}

export const NotificationContext = createContext<
  NotificationContextProps | undefined
>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Use the AuthContext and cast it to your AuthContextType.
  const auth = useContext(AuthContext) as AuthContextType;
  const userId = auth.user?.uid;

  useEffect(() => {
    if (!userId) return;

    console.log("📡 Listening for unread messages for user:", userId);

    // Reference the "chats" collection.
    const chatsRef = collection(db, "chats");
    // Query chats where the user is a participant.
    const chatQuery = query(
      chatsRef,
      where("participants", "array-contains", userId)
    );

    // We'll store unsubscribe functions per chat.
    const unsubscribes: Record<string, () => void> = {};
    // We'll use a map to store notifications across all chats.
    const notificationsMap: Record<string, Notification> = {};

    const unsubscribeChats = onSnapshot(chatQuery, (chatSnapshot) => {
      // For each chat where the user is a participant...
      chatSnapshot.docs.forEach((chatDoc) => {
        const chatId = chatDoc.id;
        console.log(`📝 Checking chat: ${chatId}`);

        const messagesRef = collection(db, "chats", chatId, "messages");
        // Query for unread messages where the recipient is the current user.
        const unreadQuery = query(
          messagesRef,
          where("to", "==", userId),
          where("read", "==", false)
        );

        // Set up the listener only once per chat.
        if (!unsubscribes[chatId]) {
          unsubscribes[chatId] = onSnapshot(unreadQuery, (messageSnapshot) => {
            // For each unread message in this chat, update our notificationsMap.
            messageSnapshot.docs.forEach((msgDoc) => {
              const msgData = msgDoc.data() as Notification;
              notificationsMap[msgDoc.id] = {
                ...msgData,
                id: msgDoc.id,
                chatId,
              };
            });

            // Optionally, remove notifications that are no longer in this snapshot.
            // (This simple approach assumes that when the snapshot updates,
            // notificationsMap remains correct for documents that still exist.)

            // Update the notifications state.
            const allNotifications = Object.values(notificationsMap);
            setNotifications(allNotifications);

            // Instead of summing counts per chat, count unique senders.
            const uniqueSenders = new Set<string>();
            allNotifications.forEach((notif) => {
              if (notif.from) {
                uniqueSenders.add(notif.from);
              }
            });
            const uniqueSenderCount = uniqueSenders.size;
            console.log(`Unique sender count: ${uniqueSenderCount}`);
            setUnreadCount(uniqueSenderCount);
          });
        }
      });

      // Clean up listeners for chats that are no longer present.
      const currentChatIds = chatSnapshot.docs.map((doc) => doc.id);
      Object.keys(unsubscribes).forEach((chatId) => {
        if (!currentChatIds.includes(chatId)) {
          unsubscribes[chatId]();
          delete unsubscribes[chatId];
          // Remove notifications for that chat.
          Object.keys(notificationsMap).forEach((msgId) => {
            if (notificationsMap[msgId].chatId === chatId) {
              delete notificationsMap[msgId];
            }
          });
          // Recompute unique sender count.
          const allNotifications = Object.values(notificationsMap);
          const uniqueSenders = new Set<string>();
          allNotifications.forEach((notif) => {
            if (notif.from) uniqueSenders.add(notif.from);
          });
          setUnreadCount(uniqueSenders.size);
        }
      });
    });

    return () => {
      unsubscribeChats();
      Object.values(unsubscribes).forEach((unsubscribe) => unsubscribe());
    };
  }, [userId]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, setNotifications, setUnreadCount }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
