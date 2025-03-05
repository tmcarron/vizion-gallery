// App.tsx
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AudioPlayerProvider } from "react-use-audio-player";
import HomePage from "./pages/HomePage";
import DataFetching from "./DataFetching";
import VizionaryProfile from "./pages/VizionaryProfile";
import VizionaryList from "./VizionaryList";
import Navbar from "./Navbar";
import MusicContextProvider from "./Player/MusicContext";
import VizionaryPortal from "./pages/VizionaryPortal";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import AudioPlayerComponent from "./Player/AudioPlayerComponent";
import { SongsProvider } from "./Player/GlobalSongContext";
import { AuthProvider, useAuth } from "./AuthContext";
import UserList from "./UserList";
import { NotificationProvider } from "./NotificationContext";
import MusicUpload from "./MusicUpload";
import PlaylistPortal from "./pages/PlaylistPortal";
import ChatWindow from "./ChatWindow"; // ✅ Import Chat Window
import VizionaryOnboarding from "./pages/VizionaryOnboarding";

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const userId = user ? user.uid : "";

  // ✅ Track open chat user
  const [chatUser, setChatUser] = useState<{
    id: string;
    username: string;
    playlistId?: string;
  } | null>(null);

  // ✅ Function to open chat when playlist is sent

  return (
    <>
      <DataFetching />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/vizionary-onboarding" element={<VizionaryOnboarding />} />
        <Route path="/vizionary-portal" element={<VizionaryPortal />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/dashboard"
          element={
            <PlaylistPortal
              currentUserId={userId}
              openMode={"play"}
              onClose={() => console.log("Playlist portal closed")}
            />
          }
        />
        <Route path="/chat" element={<UserList />} />
        <Route path="/vizionary/:id" element={<VizionaryProfile />} />
        <Route path="/vizionaries" element={<VizionaryList />} />
        <Route path="/music-upload" element={<MusicUpload />} />
      </Routes>

      {/* ✅ Open Chat Window when chatUser is set */}
      {chatUser && (
        <ChatWindow
          receiverId={chatUser.id}
          receiverUsername={chatUser.username}
          senderId={userId}
          onClose={() => setChatUser(null)} // ✅ Close when needed
        />
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <SongsProvider>
          <MusicContextProvider>
            <AudioPlayerProvider>
              <Router>
                <div className="app-container">
                  <header>
                    <Navbar />
                  </header>
                  <main>
                    <AppContent />
                  </main>
                  <footer>
                    <AudioPlayerComponent />
                  </footer>
                </div>
              </Router>
            </AudioPlayerProvider>
          </MusicContextProvider>
        </SongsProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
