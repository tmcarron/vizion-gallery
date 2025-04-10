import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  orderBy,
  where,
  getDocs,
  serverTimestamp,
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

  const createOrGetChat = async () => {
    if (!receiverId) return;
    try {
      const chatRef = collection(db, "chats");
      const q = query(chatRef, where("conversationId", "==", conversationId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setChatId(querySnapshot.docs[0].id);
      } else {
        const newChatRef = await addDoc(chatRef, {
          conversationId,
          from: actualSenderId,
          to: receiverId,
          participants: [actualSenderId, receiverId],
          lastMessage: "",
          createdAt: serverTimestamp(),
        });
        setChatId(newChatRef.id);
      }
    } catch (error) {
      console.error("Error creating chat:", error);
    }
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
