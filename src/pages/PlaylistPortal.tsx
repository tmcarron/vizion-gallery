import React, { useState, useEffect, useContext } from "react";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  where,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  deleteDoc, // ✅ clearly added
} from "firebase/firestore";
import { Rnd } from "react-rnd";
import "./PlaylistPortal.css";
import { db } from "../firebase";
import { Playlist } from "../models/Playlist";
import Song from "../models/Song";
import { useAuth } from "../AuthContext";
import { MusicContext } from "../Player/MusicContext";

export interface PlaylistPortalProps {
  currentUserId: string;
  openMode: "play" | "add";
  songToAdd?: Song;
  onClose: () => void;
}

const PlaylistPortal: React.FC<PlaylistPortalProps> = ({
  currentUserId,
  openMode,
  songToAdd,
  onClose,
}) => {
  const { user } = useAuth();
  const { setArmedPlaylist, setSelectedSong } = useContext(MusicContext);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPlaylists, setFilteredPlaylists] = useState<Playlist[]>([]);
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(
    new Set()
  );
  const [setShareLink] = useState<string | null>(null); // State to hold the shareable link

  // Fetch playlists
  useEffect(() => {
    if (!currentUserId) return;

    const playlistsQuery = query(
      collection(db, "playlists"),
      where("createdBy", "==", currentUserId)
    );

    const unsubscribe = onSnapshot(playlistsQuery, async (snapshot) => {
      const playlistsData: Playlist[] = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const songIds: string[] = data.songs || [];

          const songs: Song[] = (
            await Promise.all(
              songIds.map(async (songId) => {
                const songDoc = await getDoc(doc(db, "songs", songId));
                return songDoc.exists()
                  ? { id: songDoc.id, ...(songDoc.data() as Omit<Song, "id">) }
                  : null;
              })
            )
          ).filter(Boolean) as Song[];

          return {
            id: docSnap.id,
            name: data.name,
            createdBy: data.createdBy,
            createdAt: data.createdAt,
            songIds,
            songs,
          };
        })
      );

      setPlaylists(playlistsData);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  // Filter playlists
  useEffect(() => {
    setFilteredPlaylists(
      playlists.filter((pl) =>
        pl.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, playlists]);

  // Create playlist
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !user) return;
    try {
      await addDoc(collection(db, "playlists"), {
        name: newPlaylistName,
        createdBy: user.uid,
        songs: [],
        createdAt: serverTimestamp(),
      });
      setNewPlaylistName("");
      setCreatingPlaylist(false);
    } catch (error) {
      console.error("Error creating playlist:", error);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!window.confirm("Are you sure you want to delete this playlist?"))
      return;
    try {
      await deleteDoc(doc(db, "playlists", playlistId));
      console.log("Playlist deleted successfully");
    } catch (error) {
      console.error(" Error deleting playlist:", error);
    }
  };

  // Select playlist
  const handlePlaylistSelect = async (playlist: Playlist) => {
    if (openMode === "play") {
      const fetchedSongs: Song[] = await Promise.all(
        playlist.songIds.map(async (songId) => {
          const songDoc = await getDoc(doc(db, "songs", songId));
          return songDoc.exists()
            ? { id: songDoc.id, ...(songDoc.data() as Omit<Song, "id">) }
            : null;
        })
      ).then((songs) => songs.filter(Boolean) as Song[]);

      const fullyPopulatedPlaylist: Playlist = {
        id: playlist.id,
        name: playlist.name,
        createdBy: playlist.createdBy,
        createdAt: playlist.createdAt,
        songs: fetchedSongs,
        songIds: playlist.songIds,
      };

      setArmedPlaylist(fullyPopulatedPlaylist);
      setSelectedSong(fetchedSongs[0]);
      onClose();
    } else if (openMode === "add" && songToAdd) {
      const playlistRef = doc(db, "playlists", playlist.id);
      const updatedSongIds = [...playlist.songIds, songToAdd.id];
      await updateDoc(playlistRef, { songs: updatedSongIds });
      alert(` "${songToAdd.title}" added to "${playlist.name}"`);
      onClose();
    }
  };

  // Toggle playlist expansion
  const toggleExpandPlaylist = (playlistId: string) => {
    setExpandedPlaylists((prev) => {
      const newSet = new Set(prev);
      newSet.has(playlistId)
        ? newSet.delete(playlistId)
        : newSet.add(playlistId);
      return newSet;
    });
  };

  return (
    <div className="playlist-portal-wrapper">
      <Rnd
        default={{
          x: window.innerWidth / 2 - 175,
          y: window.innerHeight / 2 - 250,
          width: 350,
          height: 500,
        }}
        bounds="window"
        enableResizing={false}
        dragHandleClassName="drag-handle"
      >
        <div className="playlist-portal-container">
          <div className="header-container">
            <h3>
              {openMode === "play" ? "Your Playlists" : "Add to Playlist"}
            </h3>
            <button className="close-button" onClick={onClose}>
              ✖
            </button>
          </div>

          {/* Create Playlist Section */}
          <div className="create-playlist-section">
            {creatingPlaylist ? (
              <div className="create-playlist-form">
                <input
                  type="text"
                  placeholder="Playlist Name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                />
                <button onClick={handleCreatePlaylist}>Create</button>
                <button onClick={() => setCreatingPlaylist(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setCreatingPlaylist(true)}>
                Create Playlist
              </button>
            )}
          </div>

          {/* Search Section */}
          <div className="search-section">
            <input
              type="text"
              placeholder="Search playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Playlist List */}
          <ul className="playlist-list">
            {filteredPlaylists.map((playlist) => (
              <li key={playlist.id} className="playlist-item">
                <div className="playlist-item-header">
                  <span
                    className="playlist-name expandable"
                    onClick={() => toggleExpandPlaylist(playlist.id)}
                  >
                    {expandedPlaylists.has(playlist.id) ? "▼" : "▶"}{" "}
                    {playlist.name}
                  </span>
                  <div>
                    <button
                      className="action-button"
                      onClick={() => handlePlaylistSelect(playlist)}
                    >
                      {openMode === "play" ? "Play" : "Add Song"}
                    </button>
                    {/* ✅ Added Delete Button */}
                    <button
                      className="delete-button"
                      onClick={() => handleDeletePlaylist(playlist.id)}
                    >
                      Delete Playlist
                    </button>
                    <button className="share-button">Share</button>
                  </div>
                </div>

                {expandedPlaylists.has(playlist.id) && (
                  <ul className="song-list">
                    {playlist.songIds.length ? (
                      playlist.songs?.map((song) => (
                        <li
                          key={song.id}
                          className="song-item"
                          onClick={() => setSelectedSong(song)}
                          style={{ cursor: "pointer" }}
                        >
                          🎵 {song.title}
                        </li>
                      ))
                    ) : (
                      <li className="song-item empty">No songs yet.</li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Rnd>
    </div>
  );
};

export default PlaylistPortal;
