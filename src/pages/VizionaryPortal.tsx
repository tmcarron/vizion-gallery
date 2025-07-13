import { useState, useEffect, useCallback } from "react";
import { db, storage } from "../firebase";
import { useAuth } from "../AuthContext";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  doc,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import "./VizionaryPortal.css";
import SongDisplay from "../SongDisplay";
import Album from "../models/Album";
import AlbumDisplay from "../AlbumDisplay";
import Song from "../models/Song";

const VizionaryPortal = () => {
  const { user } = useAuth();

  const [songs, setSongs] = useState<Song[]>([]);
  const [profilePic, setProfilePic] = useState("");
  const [bio, setBio] = useState("");
  const [vizionaryId, setVizionaryId] = useState("");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumSongIds, setAlbumSongIds] = useState<Set<string>>(new Set());

  // ────────────────────────────────────────────
  // FETCH SONGS THAT BELONG TO THIS VIZIONARY
  // ────────────────────────────────────────────
  const fetchSongs = async () => {
    if (!vizionaryId) return;
    try {
      const songQuery = query(
        collection(db, "songs"),
        where("vizionaries", "array-contains", vizionaryId)
      );
      const songSnapshots = await getDocs(songQuery);
      const songList = songSnapshots.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Song[];
      setSongs(songList);
    } catch (error) {
      console.error("Error fetching songs:", error);
    }
  };

  // ────────────────────────────────────────────
  // REMOVE A SINGLE SONG
  // ────────────────────────────────────────────
  const handleRemoveSong = async (songId: string) => {
    try {
      await deleteDoc(doc(db, "songs", songId));
      await fetchSongs(); // refresh list
      await fetchAlbums(); // in case albums referenced it
    } catch (error) {
      console.error("Error removing song:", error);
      alert("Failed to remove song.");
    }
  };

  // ────────────────────────────────────────────
  // REMOVE AN ALBUM (and its songs)
  // ────────────────────────────────────────────
  const handleRemoveAlbum = async (albumId: string) => {
    try {
      const albumSnap = await getDoc(doc(db, "albums", albumId));
      if (albumSnap.exists()) {
        const albumData = albumSnap.data() as Album;
        if (albumData.songIds?.length) {
          // delete each song in the album
          await Promise.all(
            albumData.songIds.map((id) => deleteDoc(doc(db, "songs", id)))
          );
        }
      }
      await deleteDoc(doc(db, "albums", albumId));
      await fetchAlbums();
      await fetchSongs();
    } catch (error) {
      console.error("Error removing album:", error);
      alert("Failed to remove album.");
    }
  };

  // ────────────────────────────────────────────
  // SONGS DISPLAYED = ALL SONGS – SONGS IN ALBUMS
  // ────────────────────────────────────────────
  const displayedSongs = songs.filter((song) => !albumSongIds.has(song.id));

  // ────────────────────────────────────────────
  // FETCH USER PROFILE DATA
  // ────────────────────────────────────────────
  const fetchUserData = useCallback(async () => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      setProfilePic(data.profilePic || "");
      setBio(data.bio || "");
      setVizionaryId(data.vizionaryID || user.uid);
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // ────────────────────────────────────────────
  // FETCH ALBUMS FOR THIS VIZIONARY
  // ────────────────────────────────────────────
  const fetchAlbums = useCallback(async () => {
    if (!vizionaryId) return;

    try {
      const albumQuery = query(
        collection(db, "albums"),
        where("vizionaries", "array-contains", vizionaryId)
      );
      const albumSnapshots = await getDocs(albumQuery);
      const albumList = albumSnapshots.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Album[];

      setAlbums(albumList);

      // gather song IDs already in albums
      const ids = new Set<string>();
      albumList.forEach((album) =>
        album.songIds?.forEach((id: string) => ids.add(id))
      );
      setAlbumSongIds(ids);
    } catch (error) {
      console.error("Error fetching albums:", error);
    }
  }, [vizionaryId]);

  useEffect(() => {
    if (vizionaryId) {
      fetchAlbums();
      fetchSongs();
    }
  }, [vizionaryId, fetchAlbums]);

  // ────────────────────────────────────────────
  // PROFILE PIC HANDLER
  // ────────────────────────────────────────────
  const handleProfilePicChange = async (file: File) => {
    if (!user || !vizionaryId) return;

    const fileRef = ref(storage, `profilePics/${vizionaryId}/${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    await updateDoc(doc(db, "users", user.uid), { profilePic: url });
    await updateDoc(doc(db, "vizionaries", vizionaryId), { profilePic: url });

    fetchUserData();
  };

  // ────────────────────────────────────────────
  // BIO SUBMIT HANDLER
  // ────────────────────────────────────────────
  const handleBioSubmit = async () => {
    if (!user || !vizionaryId) return;

    await updateDoc(doc(db, "users", user.uid), { bio });
    await updateDoc(doc(db, "vizionaries", vizionaryId), { bio });

    alert("Bio updated successfully!");
    fetchUserData();
  };

  // ────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────
  return (
    <div className="vizionary-profile">
      {/* profile picture */}
      <div className="profile-pic-container">
        <img
          src={profilePic || "/default-profile.png"}
          alt="Profile"
          className="profile-pic"
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            e.target.files?.[0] && handleProfilePicChange(e.target.files[0])
          }
        />
      </div>

      {/* bio */}
      <div className="bio-container">
        <textarea
          placeholder="Write your bio here..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <button onClick={handleBioSubmit}>Submit Bio</button>
      </div>

      {/* albums */}
      {albums.length ? (
        <AlbumDisplay albums={albums} onAlbumRemove={handleRemoveAlbum} />
      ) : (
        <p>No albums available.</p>
      )}

      {/* songs */}
      <SongDisplay
        vizionaryId={vizionaryId}
        songs={displayedSongs}
        onRemoveSong={handleRemoveSong}
      />
    </div>
  );
};

export default VizionaryPortal;
