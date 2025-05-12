import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import "./ChatWindow.css";
import { useAuth } from "./AuthContext";

interface ChatWindowProps {
  receiverId: string;
  receiverUsername: string;
  senderId: string;
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  receiverId,
  receiverUsername,
  senderId,
  onClose,
}) => {
  const { user } = useAuth();
  const actualSenderId = user?.uid ?? senderId;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const conversationId = [actualSenderId, receiverId].sort().join("_");
  const messagesRef = chatId
    ? collection(db, "chats", chatId, "messages")
    : null;
  const createOrGetChat = async () => {
    if (!receiverId) return;

    // Thread key everyone agrees on:

    // Keep it in state so the listener fires
    setChatId(conversationId);

    // Ensure the parent doc exists / update timestamp
    await setDoc(
      doc(db, "chats", conversationId),
      {
        participants: [actualSenderId, receiverId],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  useEffect(() => {
    createOrGetChat();
  }, [receiverId]);

  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[]
      );
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    });
    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || !user || !chatId) return;
    try {
      const messagesRef = collection(db, "chats", chatId, "messages");
      await addDoc(messagesRef, {
        from: user.uid,
        to: receiverId,
        text: message,
        createdAt: serverTimestamp(),
        read: false,
      });
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  const handleAcceptRequest = async (songRequestId: string, msgId: string) => {
    try {
      // 1) Mark the song request doc as accepted
      await updateDoc(doc(db, "songRequests", songRequestId), {
        status: "accepted",
        acceptedAt: serverTimestamp(),
      });

      // 2) Send a confirmation message back to the sender
      await addDoc(messagesRef!, {
        from: senderId,
        to: receiverId,
        text: "✅ Collaboration request accepted!",
        createdAt: serverTimestamp(),
      });

      // 3) Flag the original chat message so the button disappears
      await updateDoc(doc(messagesRef!, msgId), { accepted: true });
    } catch (err) {
      console.error("Error accepting request:", err);
      alert("Couldn’t accept—check console for details.");
    }
  };
  return (
    <div className="chat-window">
      <div className="chat-header">
        <span>Chat with @{receiverUsername}</span>
        <button className="close-button" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message ${
              msg.from === user?.uid ? "sent" : "received"
            }`}
          >
            <span>{msg.text}</span>
            {msg.type === "collab_request" &&
              msg.to === actualSenderId &&
              !msg.accepted && (
                <button
                  className="accept-btn"
                  onClick={() =>
                    handleAcceptRequest(
                      msg.songRequestId as string,
                      msg.id as string
                    )
                  }
                >
                  Accept
                </button>
              )}
            <span className="timestamp">
              {msg.createdAt?.toDate().toLocaleTimeString()}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default ChatWindow;
