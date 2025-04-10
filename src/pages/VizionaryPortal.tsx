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
} from "firebase/firestore";
import "./VizionaryPortal.css";
import SongDisplay from "../SongDisplay";
import Album from "../models/Album";
import AlbumDisplay from "../AbumDisplay";

const VizionaryPortal = () => {
  const { user } = useAuth();

  const [profilePic, setProfilePic] = useState("");
  const [bio, setBio] = useState("");
  const [vizionaryId, setVizionaryId] = useState("");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumSongIds, setAlbumSongIds] = useState<Set<string>>(new Set()); // ✅ Fixed state initialization

  console.log(albumSongIds);
  const fetchUserData = useCallback(async () => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      setProfilePic(userData.profilePic || "");
      setBio(userData.bio || "");
      setVizionaryId(userData.vizionaryID || user.uid);
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // ✅ Fetch albums for the logged-in Vizionary
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

      // ✅ Collect song IDs from albums
      const songIdsSet = new Set<string>();
      albumList.forEach((album) => {
        album.songIds?.forEach((songId) => songIdsSet.add(songId));
      });

      setAlbumSongIds(songIdsSet);
    } catch (error) {
      console.error("Error fetching albums:", error);
    }
  }, [vizionaryId]);

  useEffect(() => {
    if (vizionaryId) {
      fetchAlbums();
    }
  }, [vizionaryId, fetchAlbums]);

  const handleProfilePicChange = async (file: File) => {
    if (!user || !vizionaryId) return;

    const fileRef = ref(storage, `profilePics/${vizionaryId}/${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    await updateDoc(doc(db, "users", user.uid), { profilePic: url });
    await updateDoc(doc(db, "vizionaries", vizionaryId), { profilePic: url });

    fetchUserData(); // ✅ Update immediately after changes
  };

  const handleBioSubmit = async () => {
    if (!user || !vizionaryId) return;

    await updateDoc(doc(db, "users", user.uid), { bio });
    await updateDoc(doc(db, "vizionaries", vizionaryId), { bio });

    alert("Bio updated successfully!");

    fetchUserData(); // ✅ Immediately refresh after updating bio
  };

  return (
    <div className="vizionary-profile">
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

      <div className="bio-container">
        <textarea
          placeholder="Write your bio here..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <button onClick={handleBioSubmit}>Submit Bio</button>
      </div>

      {/* ✅ Display Albums */}
      {albums.length > 0 ? (
        <AlbumDisplay albums={albums} />
      ) : (
        <p>No albums available.</p>
      )}

      {/* ✅ Display Songs but exclude ones already in albums */}
      <SongDisplay vizionaryId={vizionaryId} />
    </div>
  );
};

export default VizionaryPortal;
