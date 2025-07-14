import React, { useState, useEffect, useContext } from "react";
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
import { MusicContext } from "../Player/MusicContext";
import "./VizionaryProfile.css";
import SongDisplay from "../SongDisplay";
import Album from "../models/Album";
import Song from "../models/Song";
import AlbumDisplay from "../AlbumDisplay";

const VizionaryProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [vizionaryName, setVizionaryName] = useState<string | null>(null);
  const [profilePic, setProfilePic] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumSongIds, setAlbumSongIds] = useState<Set<string>>(new Set()); // Store song IDs in albums
  const [loading, setLoading] = useState<boolean>(true);

  const { setArmedPlaylist } = useContext(MusicContext);

  // 🔊 Arm playlist with ALL songs by this vizionary and start playback
  const handlePlayVizionary = async () => {
    if (!vizionaryName || !setArmedPlaylist) return;

    try {
      // 1️⃣ Fetch every song where this vizionary appears
      const songsQuery = query(
        collection(db, "songs"),
        where("vizionaries", "array-contains", vizionaryName)
      );
      const snapshot = await getDocs(songsQuery);

      // 2️⃣ Order newest → oldest
      const toMillis = (d: any) =>
        d?.toMillis ? d.toMillis() : new Date(d ?? 0).getTime();
      const sortedSongs = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Song))
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

      const songIds = sortedSongs.map((s) => s.id);

      if (songIds.length === 0) {
        console.warn("No songs found for vizionary:", vizionaryName);
        return;
      }

      // 3️⃣ Tell the global MusicContext to arm & play
      await setArmedPlaylist({
        id: `viz_${vizionaryName}_all`,
        name: `${vizionaryName} – All Songs`,
        createdBy: "System",
        createdAt: new Date(),
        songIds,
      });
      // MusicContext will select the first track and start playback
    } catch (error) {
      console.error("Error arming vizionary playlist:", error);
    }
  };

  console.log(albumSongIds);
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
          // Resolve the vizionary's display name from several possible fields.
          const candidateName =
            rawData?.vizionaryName ??
            rawData?.name ??
            rawData?.displayName ??
            rawData?.artistName ??
            "";

          const resolvedName =
            candidateName.trim().length > 0
              ? candidateName
              : decodeURIComponent(id);

          console.log("📄 Vizionary Name Found (resolved):", resolvedName);
          setVizionaryName(resolvedName);
          setProfilePic(rawData?.profilePic || "/default-profile.png");
          setBio(rawData?.bio || "This vizionary has not written a bio yet.");
        } else {
          console.warn("⚠️ Vizionary not found:", id);
          setVizionaryName(decodeURIComponent(id));
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

  const fetchAlbums = async (name: string) => {
    if (!name) {
      console.warn("⚠️ Skipping album fetch: vizionaryName is null");
      return;
    }

    try {
      console.log("📡 Fetching albums where vizionaries contains =", name);

      const albumsQuery = query(
        collection(db, "albums"),
        where("vizionaries", "array-contains", name)
      );
      const albumSnapshots = await getDocs(albumsQuery);

      if (albumSnapshots.empty) {
        console.warn("⚠️ No albums found for Vizionary:", name);
      }

      const albumsList = albumSnapshots.docs.map((doc) => {
        console.log("📀 Found album:", doc.id, doc.data());
        return { id: doc.id, ...doc.data() } as Album;
      });
      // 🔄 Order albums from least‑recent (oldest) to most‑recent (newest)
      albumsList.sort((a, b) => {
        const toMillis = (d: any) =>
          d?.toMillis ? d.toMillis() : new Date(d ?? 0).getTime();
        const aDate = toMillis(a.createdAt ?? a.createdAt);
        const bDate = toMillis(b.createdAt ?? b.createdAt);
        return aDate - bDate; // ascending
      });

      setAlbums(albumsList);

      const songIdsSet = new Set<string>();
      albumsList.forEach((album) => {
        album.songIds?.forEach((songId) => songIdsSet.add(songId));
      });

      console.log("Songs in Albums:", songIdsSet);
      setAlbumSongIds(songIdsSet);
    } catch (error) {
      console.error("Error fetching albums:", error);
    }
  };

  useEffect(() => {
    if (vizionaryName) {
      fetchAlbums(vizionaryName);
    }
  }, [vizionaryName]);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="vizionary-profile">
      <div className="vizionary-header">
        {profilePic && profilePic !== "/default-profile.png" && (
          <img src={profilePic} alt="Profile" className="profile-pic" />
        )}

        <h1 className="vizionary-name">
          {vizionaryName || "Unknown Vizionary"}
        </h1>
        <button className="play-vizionary-btn" onClick={handlePlayVizionary}>
          Play {vizionaryName || "Vizionary"}
        </button>

        {bio && bio !== "This vizionary has not written a bio yet." && (
          <p className="vizionary-bio">{bio}</p>
        )}
      </div>

      {/* Display Albums */}
      {albums.length > 0 ? <AlbumDisplay albums={albums} /> : <></>}

      {/* Display Songs (Filtered to exclude album songs) */}
      <SongDisplay vizionaryId={id!} />
    </div>
  );
};

export default VizionaryProfile;
