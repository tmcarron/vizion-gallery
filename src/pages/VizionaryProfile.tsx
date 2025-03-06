import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import "./VizionaryProfile.css";
import SongDisplay from "../SongDisplay";
import Album from "../models/Album";
import AlbumDisplay from "../AbumDisplay";

const VizionaryProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [vizionaryName, setVizionaryName] = useState<string | null>(null);
  const [profilePic, setProfilePic] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) {
      console.error("No Vizionary ID provided.");
      setVizionaryName("Unknown Vizionary");
      setLoading(false);
      return;
    }

    const fetchVizionaryData = async () => {
      setLoading(true);
      try {
        const vizDocRef = doc(db, "vizionaries", id);
        const vizDocSnap = await getDoc(vizDocRef);

        if (vizDocSnap.exists()) {
          const rawData = vizDocSnap.data();
          const name =
            rawData?.vizionaryName || rawData?.name || "Unnamed Vizionary";

          console.log("📄 Vizionary Name Found:", name);
          setVizionaryName(name);
          setProfilePic(rawData?.profilePic || "/default-profile.png");
          setBio(rawData?.bio || "This vizionary has not written a bio yet.");
        } else {
          console.warn("⚠️ Vizionary not found:", id);
          setVizionaryName(null);
          setProfilePic("/default-profile.png");
          setBio("Bio not available.");
        }
      } catch (error) {
        console.error("❌ Error fetching vizionary data:", error);
        setVizionaryName(null);
      } finally {
        setLoading(false);
      }
    };

    fetchVizionaryData();
  }, [id]);

  // ✅ Move fetchAlbums outside of useEffect so it can be called properly
  const fetchAlbums = async (name: string) => {
    if (!name) {
      console.warn("⚠️ Skipping album fetch: vizionaryName is null");
      return;
    }

    try {
      console.log("📡 Fetching albums where vizionaries contains =", name);

      const albumsQuery = query(
        collection(db, "albums"),
        where("vizionaries", "array-contains", name) // ✅ Matches if vizionaryName is in the array
      );
      const albumSnapshots = await getDocs(albumsQuery);

      if (albumSnapshots.empty) {
        console.warn("⚠️ No albums found for Vizionary:", name);
      }

      const albumsList = albumSnapshots.docs.map((doc) => {
        console.log("📀 Found album:", doc.id, doc.data());
        return { id: doc.id, ...doc.data() } as Album;
      });

      setAlbums(albumsList);
    } catch (error) {
      console.error("❌ Error fetching albums:", error);
    }
  };
  // ✅ Now fetchAlbums is properly called after vizionaryName is set
  useEffect(() => {
    if (vizionaryName) {
      fetchAlbums(vizionaryName);
    }
  }, [vizionaryName]);

  // const handleAlbumSelect = (album: Album) => {
  //   console.log("Selected Album:", album);
  //   // You can expand this to show album details or filter songs
  // };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="vizionary-profile">
      <div className="vizionary-header">
        {/* ✅ Only render the image if there's a profile picture */}
        {profilePic && profilePic !== "/default-profile.png" && (
          <img src={profilePic} alt="Profile" className="profile-pic" />
        )}

        <h1 className="vizionary-name">
          {vizionaryName || "Unknown Vizionary"}
        </h1>

        {/* ✅ Only render bio if it’s not empty */}
        {bio && bio !== "This vizionary has not written a bio yet." && (
          <p className="vizionary-bio">{bio}</p>
        )}
      </div>

      {/* Display Albums Using AlbumDisplay Component */}
      {albums.length > 0 ? (
        <AlbumDisplay albums={albums} />
      ) : (
        <p>No albums available for this Vizionary.</p>
      )}

      {/* Display Songs */}
      <SongDisplay vizionaryId={id!} />
    </div>
  );
};

export default VizionaryProfile;
