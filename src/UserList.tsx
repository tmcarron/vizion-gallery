import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import ChatWindow from "./ChatWindow";
import "./UserList.css";

interface User {
  id: string;
  username: string;
  lastMessageTime?: number;
  lastResponseTime?: number;
}

const UserList: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [neverRespondedUsers, setNeverRespondedUsers] = useState<User[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ✅ Fetch All Users & Sort By Interaction
  useEffect(() => {
    if (!user) return;

    console.log("📡 Fetching users and sorting by interaction...");

    const fetchUsersWithMessages = async () => {
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);

      const chatsRef = collection(db, "chats");
      const chatQuery = query(
        chatsRef,
        where("participants", "array-contains", user.uid)
      );
      const chatSnapshot = await getDocs(chatQuery);

      const userMap: { [id: string]: User } = {};
      const neverRespondedMap: { [id: string]: User } = {};
      const inactiveUserMap: { [id: string]: User } = {};

      // 📨 **Process Chat Messages**
      const messagePromises = chatSnapshot.docs.map(async (chatDoc) => {
        const chatId = chatDoc.id;
        const messagesRef = collection(db, "chats", chatId, "messages");
        const messagesSnapshot = await getDocs(
          query(messagesRef, orderBy("createdAt", "desc"))
        );

        if (messagesSnapshot.empty) return;

        let lastMessageTime = 0;
        let lastResponseTime = 0;
        let senderId = "";
        let receiverId = "";

        messagesSnapshot.docs.forEach((msgDoc) => {
          const msg = msgDoc.data();
          const messageTime = msg.createdAt?.toMillis?.() || 0;

          if (messageTime > lastMessageTime) {
            lastMessageTime = messageTime;
            senderId = msg.from;
            receiverId = msg.to;
          }

          if (msg.from === user.uid) {
            lastResponseTime = messageTime;
          }
        });

        const otherUserId = senderId === user.uid ? receiverId : senderId;

        if (!userMap[otherUserId] && !neverRespondedMap[otherUserId]) {
          const userDoc = await getDocs(
            query(usersRef, where("id", "==", otherUserId))
          );
          const username = userDoc.docs[0]?.data()?.username || "Unknown";

          if (lastResponseTime > 0) {
            userMap[otherUserId] = {
              id: otherUserId,
              username,
              lastMessageTime,
              lastResponseTime,
            };
          } else {
            neverRespondedMap[otherUserId] = {
              id: otherUserId,
              username,
              lastMessageTime,
            };
          }
        }
      });

      await Promise.all(messagePromises);

      // 🛑 **Find Inactive Users**
      usersSnapshot.docs.forEach((docSnap) => {
        const userId = docSnap.id;
        const username = docSnap.data().username || "Unknown";

        if (
          !userMap[userId] &&
          !neverRespondedMap[userId] &&
          userId !== user.uid
        ) {
          inactiveUserMap[userId] = { id: userId, username };
        }
      });

      // **Sorting Logic**
      const sortedUsers = Object.values(userMap).sort((a, b) => {
        if (a.lastMessageTime !== b.lastMessageTime) {
          return b.lastMessageTime! - a.lastMessageTime!;
        }
        return (b.lastResponseTime || 0) - (a.lastResponseTime || 0);
      });

      const sortedNeverRespondedUsers = Object.values(neverRespondedMap).sort(
        (a, b) => b.lastMessageTime! - a.lastMessageTime!
      );

      console.log("✅ Sorted users:", sortedUsers);
      console.log("✅ Never responded users:", sortedNeverRespondedUsers);
      console.log("✅ Inactive users (never messaged):", inactiveUserMap);

      setUsers(sortedUsers);
      setNeverRespondedUsers(sortedNeverRespondedUsers);
      setInactiveUsers(Object.values(inactiveUserMap));
    };

    fetchUsersWithMessages();
  }, [user]);

  // ✅ Listen for Unread Messages
  useEffect(() => {
    if (!user) return;

    console.log("📡 Listening for unread messages...");

    const chatsRef = collection(db, "chats");
    const chatQuery = query(
      chatsRef,
      where("participants", "array-contains", user.uid)
    );

    const unsubscribeChats = onSnapshot(chatQuery, async (chatSnapshot) => {
      const newUnreadCounts: { [key: string]: number } = {};

      const chatPromises = chatSnapshot.docs.map(async (chatDoc) => {
        const chatId = chatDoc.id;
        const messagesRef = collection(db, "chats", chatId, "messages");
        const unreadMessagesQuery = query(
          messagesRef,
          where("to", "==", user.uid),
          where("read", "==", false)
        );

        const unreadMessagesSnapshot = await getDocs(unreadMessagesQuery);

        unreadMessagesSnapshot.forEach((msgDoc) => {
          const senderId = msgDoc.data().from;
          newUnreadCounts[senderId] = (newUnreadCounts[senderId] || 0) + 1;
        });
      });

      await Promise.all(chatPromises);

      console.log("📩 Updated unread counts:", newUnreadCounts);
      setUnreadCounts(newUnreadCounts);
    });

    return () => unsubscribeChats();
  }, [user]);

  // ✅ Open Chat & Reset Unread Count
  const handleUserClick = async (u: User) => {
    setSelectedUser(null); // Temporarily reset chat
    setTimeout(() => {
      setSelectedUser(u); // Reopen chat
    }, 0);

    // ✅ Mark messages as read in Firestore
    const chatsRef = collection(db, "chats");
    const chatQuery = query(
      chatsRef,
      where("participants", "array-contains", user?.uid)
    );

    const chatSnapshot = await getDocs(chatQuery);
    chatSnapshot.docs.forEach(async (chatDoc) => {
      const messagesRef = collection(db, "chats", chatDoc.id, "messages");
      const unreadMessagesQuery = query(
        messagesRef,
        where("to", "==", user?.uid),
        where("read", "==", false)
      );

      const unreadMessagesSnapshot = await getDocs(unreadMessagesQuery);
      unreadMessagesSnapshot.forEach(async (msgDoc) => {
        await updateDoc(doc(db, "chats", chatDoc.id, "messages", msgDoc.id), {
          read: true,
        });
      });
    });

    // ✅ Clear unread count in UI
    setUnreadCounts((prev) => ({
      ...prev,
      [u.id]: 0,
    }));
  };

  // ✅ Filter Users Based on Search
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNeverRespondedUsers = neverRespondedUsers.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInactiveUsers = inactiveUsers.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="chat-list-container">
      <h2>Start a Chat</h2>

      {/* 🔍 Search Bar */}
      <input
        type="text"
        placeholder="Search users..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="user-search"
      />

      {/* 📌 Recent Conversations */}
      {filteredUsers.length > 0 && (
        <>
          <h3>Recent Conversations</h3>
          <ul className="user-list">
            {filteredUsers.map((u) => (
              <li
                key={u.id}
                onClick={() => handleUserClick(u)}
                className="user-item"
              >
                @{u.username}
                {unreadCounts[u.id] > 0 && (
                  <span className="notification-bubble"></span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* 📌 New Messages */}
      {filteredNeverRespondedUsers.length > 0 && (
        <>
          <h3>New Messages</h3>
          <ul className="user-list">
            {filteredNeverRespondedUsers.map((u) => (
              <li
                key={u.id}
                onClick={() => handleUserClick(u)}
                className="user-item"
              >
                @{u.username}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* 📌 Inactive Users */}
      {filteredInactiveUsers.length > 0 && (
        <>
          <h3>Other Users</h3>
          <ul className="user-list">
            {filteredInactiveUsers.map((u) => (
              <li
                key={u.id}
                onClick={() => handleUserClick(u)}
                className="user-item"
              >
                @{u.username}
              </li>
            ))}
          </ul>
        </>
      )}

      {selectedUser && (
        <ChatWindow
          receiverId={selectedUser.id}
          receiverUsername={selectedUser.username}
          senderId={user!.uid}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};

export default UserList;
