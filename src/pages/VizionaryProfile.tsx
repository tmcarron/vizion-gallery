import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import "./VizionaryProfile.css";
import SongDisplay from "../SongDisplay";

const VizionaryProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [vizionaryName, setVizionaryName] = useState<string>("");
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
          // Use the field "vizionaryName" if it exists, otherwise "name"
          const name =
            rawData?.vizionaryName || rawData?.name || "Unnamed Vizionary";
          setVizionaryName(name);
        } else {
          console.warn("Vizionary not found:", id);
          setVizionaryName("Unknown Vizionary");
        }
      } catch (error) {
        console.error("Error fetching vizionary data:", error);
        setVizionaryName("Error Loading Vizionary");
      } finally {
        setLoading(false);
      }
    };

    fetchVizionaryData();
  }, [id]);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="vizionary-profile">
      <div className="vizionary-header">
        <h1 className="vizionary-name">{vizionaryName}</h1>
      </div>
      <SongDisplay vizionaryId={id!} />
    </div>
  );
};

export default VizionaryProfile;
