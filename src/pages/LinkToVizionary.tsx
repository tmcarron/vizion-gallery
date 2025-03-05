import React, { useEffect } from "react";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../AuthContext";

const LinkToVizionary: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    const linkVizionary = async () => {
      if (!user) {
        console.error("No user logged in!");
        return;
      }

      const vizionaryIdToLink = "Prince Monarch"; // ✅ Replace with the actual vizionaryId you want

      try {
        await updateDoc(doc(db, "users", user.uid), {
          vizionaryID: vizionaryIdToLink,
        });
        console.log(
          `User ${user.uid} linked to Vizionary ${vizionaryIdToLink}`
        );
      } catch (err) {
        console.error("Failed to link Vizionary:", err);
      }
    };

    linkVizionary();
  }, [user]);

  return <div>Linking your account...</div>;
};

export default LinkToVizionary;
