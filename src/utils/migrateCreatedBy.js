import admin from "firebase-admin";

// ✅ Initialize Firebase Admin SDK
import serviceAccount from "/Users/tylercarron/Desktop/CodingProjects/vizion-gallery/vizion-gallery/serviceAccount.json" assert { type: "json" };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue; // ✅ Correctly import `deleteField()`

const renameCreatedByToVizionaries = async () => {
  try {
    const songsCollection = db.collection("songs"); // ✅ Fetch songs collection
    const snapshot = await songsCollection.get();

    if (snapshot.empty) {
      console.warn("⚠️ No songs found in Firestore.");
      return;
    }

    let updatedCount = 0;

    for (const songDoc of snapshot.docs) {
      const songData = songDoc.data();
      const songRef = songsCollection.doc(songDoc.id); // ✅ Correctly reference the document

      if (!songData.createdBy || !Array.isArray(songData.createdBy)) {
        console.log(
          `🔍 Skipping ${
            songData.title || "Untitled Song"
          }, no valid createdBy field.`
        );
        continue;
      }

      await songRef.update({
        vizionaries: songData.createdBy, // ✅ Move data back to `vizionaries`
        createdBy: FieldValue.delete(), // ✅ Delete the `createdBy` field
      });

      console.log(
        `✅ Renamed "createdBy" back to "vizionaries" for ${
          songData.title || "Untitled Song"
        } (ID: ${songDoc.id})`
      );
      updatedCount++;
    }

    console.log(
      `🎉 Successfully reverted field names for ${updatedCount} songs!`
    );
  } catch (error) {
    console.error("❌ Error renaming field:", error);
  }
};

// Run the migration function
renameCreatedByToVizionaries();
