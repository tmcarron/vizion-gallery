import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import "./VizionaryList.css";
import Vizionary from "./models/Vizionary";

// ✅ TypeScript Interface for Vizionaries

const VizionaryList: React.FC = () => {
  const { user } = useAuth();
  const [vizionaries, setVizionaries] = useState<Vizionary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 🔍 Convert Firestore timestamps into milliseconds
  const getTimestampValue = (val: any): number => {
    if (!val) return 0;
    return val.toMillis ? val.toMillis() : Number(val?.seconds * 1000) || 0;
  };

  useEffect(() => {
    if (!user) return;

    console.log("📡 Listening for Vizionary list updates...");
    const vizRef = collection(db, "vizionaries");

    const unsubscribe = onSnapshot(vizRef, (snapshot) => {
      let list = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Omit<Vizionary, "id">; // ✅ Ensure we exclude `id` from Firestore data
        return {
          id: docSnap.id, // ✅ Manually assign Firestore document ID
          ...data, // ✅ Spread only Firestore fields
        };
      });

      console.log("✅ Raw Firestore Data:", list);

      // 🔄 Sort Vizionaries by lastInteracted timestamp (most recent first)
      list = list.sort((a, b) => {
        const aTime = getTimestampValue(a.lastInteracted?.[user.uid]);
        const bTime = getTimestampValue(b.lastInteracted?.[user.uid]);
        return bTime - aTime;
      });

      console.log("🔥 Sorted Vizionaries:", list);
      setVizionaries(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // ✅ Update lastInteracted when a Vizionary is clicked
  const handleVizionaryClick = async (vizionaryId: string) => {
    if (!user) return;

    try {
      console.log(`🕒 Updating lastInteracted for Vizionary: ${vizionaryId}`);
      await updateDoc(doc(db, "vizionaries", vizionaryId), {
        [`lastInteracted.${user.uid}`]: serverTimestamp(),
      });
    } catch (error) {
      console.error("❌ Error updating lastInteracted:", error);
    }
  };

  if (loading) return <p>Loading Vizionaries...</p>;

  return (
    <div className="vizionary-list">
      <h1>Vizionaries</h1>
      {vizionaries.length > 0 ? (
        <ul>
          {vizionaries.map((viz) => (
            <li key={viz.id}>
              <Link
                to={`/vizionary/${viz.id}`}
                onClick={() => handleVizionaryClick(viz.id)}
              >
                {viz.vizionaryName}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No Vizionaries found.</p>
      )}
    </div>
  );
};

export default VizionaryList;
