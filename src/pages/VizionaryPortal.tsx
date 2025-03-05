import { useState, useEffect, useCallback } from "react";
import { db, storage } from "../firebase";
import { useAuth } from "../AuthContext";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import "./VizionaryPortal.css";

const VizionaryPortal = () => {
  const { user } = useAuth();

  const [profilePic, setProfilePic] = useState("");
  const [bio, setBio] = useState("");
  const [vizionaryId, setVizionaryId] = useState("");
  const [showSongEditor, setShowSongEditor] = useState(false);

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

      <button onClick={() => setShowSongEditor((prev) => !prev)}>
        Edit Songs
      </button>

      {showSongEditor && (
        <div className="song-editor">
          <input
            type="text"
            placeholder="Search songs..."
            className="search-bar"
          />
          {/* Additional song editing functionality here */}
        </div>
      )}
    </div>
  );
};

export default VizionaryPortal;
