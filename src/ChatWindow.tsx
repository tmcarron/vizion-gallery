import React, { useState, useEffect, useContext, useRef } from "react";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
  where,
  getDocs,
} from "firebase/firestore";
import { Rnd } from "react-rnd";
import { db } from "./firebase";
import "./ChatWindow.css";
import { useAuth } from "./AuthContext";
import { MusicContext } from "./Player/MusicContext";
import { Playlist } from "./models/Playlist";

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
  const { setArmedPlaylist } = useContext(MusicContext);
  const actualSenderId = user?.uid ?? senderId;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{
      attachmentType: string;
      attachment: any;
      id: string;
      from: string;
      to: string;
      text: string;
      createdAt: any;
      read: boolean;
      type?: string;
      buttonType?: string;
    }>
  >([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [availablePlaylists, setAvailablePlaylists] = useState<Playlist[]>([]);

  const conversationId = [actualSenderId, receiverId].sort().join("_");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Create or retrieve chat
  const createOrGetChat = async () => {
    if (!receiverId) {
      console.error("❌ receiverId is undefined! Cannot create chat.");
      return;
    }
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
      console.error("❌ Error creating chat:", error);
    }
  };

  useEffect(() => {
    createOrGetChat();
  }, [receiverId]);

  // Listen for messages
  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as any[]
      );
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    });
    return () => unsubscribe();
  }, [chatId]);

  // Mark unread messages as read
  useEffect(() => {
    if (!chatId || !user || messages.length === 0) return;
    messages.forEach(async (msg) => {
      if (msg.to === user.uid && !msg.read) {
        try {
          const msgRef = doc(db, "chats", chatId, "messages", msg.id);
          await updateDoc(msgRef, { read: true });
        } catch (error) {
          console.error("❌ Error marking message as read:", error);
        }
      }
    });
  }, [chatId, messages, user]);

  // Send text message
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
      console.error("❌ Error sending message:", error);
    }
  };

  // Open the playlist selection modal by fetching the user's playlists
  const handleOpenPlaylistModal = async () => {
    if (!user) return;
    try {
      const playlistsQuery = query(
        collection(db, "playlists"),
        where("createdBy", "==", user.uid)
      );
      const querySnapshot = await getDocs(playlistsQuery);
      // Incorporate fix: Merge document id with data
      const playlists: Playlist[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Playlist, "id">),
      }));
      setAvailablePlaylists(playlists);
      setShowPlaylistModal(true);
    } catch (error) {
      console.error("❌ Error fetching playlists:", error);
    }
  };

  // Send the playlist button message with the selected playlist
  const sendPlaylistButton = async (playlist: Playlist) => {
    if (!user || !chatId) return;
    try {
      const messagesRef = collection(db, "chats", chatId, "messages");
      const buttonMarkup = `<button class="chat-playlist-button" data-playlist-id="${playlist.id}" data-playlist-name="${playlist.name}" style="padding: 10px; background-color: #007BFF; color: white; border-radius: 5px; cursor: pointer;">Playlist: ${playlist.name}</button>`;
      await addDoc(messagesRef, {
        from: user.uid,
        to: receiverId,
        text: buttonMarkup,
        createdAt: serverTimestamp(),
        read: false,
        type: "button",
        buttonType: "add-to-playlist",
      });
      setShowPlaylistModal(false);
    } catch (error) {
      console.error("❌ Error sending playlist button:", error);
    }
  };

  // Send "Request Collaboration" button message
  const sendCollaborationButton = async () => {
    if (!user || !chatId) return;
    try {
      const messagesRef = collection(db, "chats", chatId, "messages");
      const buttonMarkup = `<button class="chat-button" style="padding: 10px; background-color: #28a745; color: white; border-radius: 5px; cursor: pointer;">Request Collaboration</button>`;
      await addDoc(messagesRef, {
        from: user.uid,
        to: receiverId,
        text: buttonMarkup,
        createdAt: serverTimestamp(),
        read: false,
        type: "button",
        buttonType: "request-collaboration",
      });
    } catch (error) {
      console.error("❌ Error sending collaboration button:", error);
    }
  };

  // Handle clicks on messages to detect playlist button clicks and arm the playlist.
  const handleMessageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("chat-playlist-button")) {
      const playlistId = target.dataset.playlistId;
      const playlistName = target.dataset.playlistName;
      if (playlistId && playlistName) {
        setArmedPlaylist({
          id: playlistId,
          name: playlistName,
          createdBy: "unknown", // using user's username
          songIds: [],
        });
      }
    }
  };

  return (
    <Rnd
      default={{ x: 100, y: 100, width: 320, height: 480 }}
      minWidth={250}
      minHeight={300}
      bounds="window"
      dragHandleClassName="chat-header"
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      }}
      style={{ zIndex: 1000 }}
    >
      <div className="chat-window">
        <div className="chat-header">
          <span>Chat with @{receiverUsername}</span>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="pre-made-buttons">
          <button onClick={handleOpenPlaylistModal}>Send Playlist</button>
        </div>

        <div className="chat-messages" onClick={handleMessageClick}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message ${
                msg.from === user?.uid ? "sent" : "received"
              }`}
            >
              {msg.text && <span>{msg.text}</span>}

              {msg.attachmentType === "song" && msg.attachment && (
                <button
                  className="chat-song-button"
                  data-song-id={msg.attachment.id}
                  data-song-title={msg.attachment.title}
                  data-song-audio={msg.attachment.audio}
                  data-song-cover={msg.attachment.coverArt}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#4CAF50",
                    color: "white",
                    borderRadius: "5px",
                    cursor: "pointer",
                    marginLeft: "8px",
                  }}
                >
                  🎵 Play: {msg.attachment.title}
                </button>
              )}

              <span className="timestamp">
                {msg.createdAt?.toDate().toLocaleTimeString()}
              </span>
            </div>
          ))}
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

        {showPlaylistModal && (
          <div className="playlist-modal">
            <div className="modal-content">
              <h3>Select a Playlist</h3>
              <ul>
                {availablePlaylists.map((playlist) => (
                  <li key={playlist.id}>
                    <button onClick={() => sendPlaylistButton(playlist)}>
                      {playlist.name}
                    </button>
                  </li>
                ))}
              </ul>
              <button onClick={() => setShowPlaylistModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </Rnd>
  );
};

export default ChatWindow;
