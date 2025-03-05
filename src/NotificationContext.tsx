// NotificationContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

export interface Notification {
  id: string;
  chatId: string;
  read: boolean;
  to: string;
  from?: string;
  message?: string;
  timestamp?: any;
}

interface NotificationContextProps {
  notifications: Notification[];
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error("useNotification must be within NotificationProvider");
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;

    const chatsRef = collection(db, "chats");
    const chatsQuery = query(
      chatsRef,
      where("participants", "array-contains", user.uid)
    );

    const unsubChats = onSnapshot(chatsQuery, (chatsSnap) => {
      const messageUnsubs: (() => void)[] = [];
      const notificationsMap: Record<string, Notification[]> = {};

      chatsSnap.docs.forEach((chatDoc) => {
        const messagesRef = collection(db, "chats", chatDoc.id, "messages");
        const unreadMessagesQuery = query(
          messagesRef,
          where("to", "==", user.uid),
          where("read", "==", false)
        );

        const unsubMessages = onSnapshot(unreadMessagesQuery, (msgSnap) => {
          notificationsMap[chatDoc.id] = msgSnap.docs.map((doc) => ({
            ...(doc.data() as Notification),
          }));

          // Aggregate all notifications across chats
          const allNotifications = Object.values(notificationsMap).flat();
          setNotifications(allNotifications);
          setUnreadCount(allNotifications.length);
        });

        messageUnsubs.push(unsubMessages);
      });

      // Proper cleanup of listeners
      return () => messageUnsubs.forEach((unsub) => unsub());
    });

    return unsubChats;
  }, [user]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
