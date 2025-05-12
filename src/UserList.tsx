import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import ChatWindow from "./ChatWindow";
import "./UserList.css";

interface UiUser {
  id: string;
  username: string;
}

const UserList: React.FC = () => {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<UiUser[]>([]);
  const [unread, setUnread] = useState<{ [k: string]: number }>({});
  const [selected, setSelected] = useState<UiUser | null>(null);
  const [q, setQ] = useState("");

  /* 1️⃣  Load EVERY user once ----------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    (async () => {
      const snap = await getDocs(collection(db, "users"));
      const list: UiUser[] = [];
      snap.forEach((u) =>
        list.push({ id: u.id, username: u.data().username || "Unknown" })
      );
      setAllUsers(list.filter((u) => u.id !== user.uid));
    })();
  }, [user]);

  /* 2️⃣  Live unread counter ------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(
      query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid)
      ),
      async (snap) => {
        const counts: { [k: string]: number } = {};

        await Promise.all(
          snap.docs.map(async (c) => {
            const msgs = await getDocs(
              query(
                collection(db, "chats", c.id, "messages"),
                where("to", "==", user.uid),
                where("read", "==", false)
              )
            );
            msgs.forEach((m) => {
              const from = m.data().from as string;
              counts[from] = (counts[from] || 0) + 1;
            });
          })
        );

        setUnread(counts);
      }
    );

    return () => unsub();
  }, [user]);

  /* 3️⃣  Click user → ensure thread exists & mark msgs read ------------------ */
  const openChat = async (u: UiUser) => {
    if (!user) return;
    setSelected(u);

    const threadId =
      user.uid < u.id ? `${user.uid}_${u.id}` : `${u.id}_${user.uid}`;

    // ensure parent doc exists / update timestamp
    await setDoc(
      doc(db, "chats", threadId),
      { participants: [user.uid, u.id], updatedAt: serverTimestamp() },
      { merge: true }
    );

    // mark unread → read
    const unreadSnap = await getDocs(
      query(
        collection(db, "chats", threadId, "messages"),
        where("to", "==", user.uid),
        where("read", "==", false)
      )
    );
    await Promise.all(
      unreadSnap.docs.map((m) =>
        updateDoc(doc(db, "chats", threadId, "messages", m.id), { read: true })
      )
    );
    setUnread((p) => ({ ...p, [u.id]: 0 }));
  };

  const filtered = allUsers.filter((u) =>
    u.username.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="chat-list-container">
      <h2>Chat</h2>
      <input
        className="user-search"
        placeholder="Search users…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <ul className="user-list">
        {filtered.map((u) => (
          <li key={u.id} className="user-item" onClick={() => openChat(u)}>
            @{u.username}
            {unread[u.id] > 0 && <span className="notification-bubble" />}
          </li>
        ))}
      </ul>

      {selected && (
        <ChatWindow
          senderId={user!.uid}
          receiverId={selected.id}
          receiverUsername={selected.username}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

export default UserList;
