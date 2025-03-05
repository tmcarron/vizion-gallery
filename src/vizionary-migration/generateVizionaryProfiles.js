import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import serviceAccount from "../credentials/serviceAccountKey.json" assert { type: "json" };

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

/**
 * Process a single song document.
 * Expects the song document to have a "vizionary" field that is either a string
 * or an array of strings identifying the associated vizionaries.
 */
async function processSong(doc) {
  const songData = doc.data();
  const songId = doc.id;

  // Determine which vizionary (or vizionaries) this song belongs to.
  let vizionaries = [];
  if (Array.isArray(songData.vizionaries)) {
    vizionaries = songData.vizionaries;
  } else if (songData.vizionaries) {
    vizionaries = [songData.vizionaries];
  } else {
    // Skip this song if there's no vizionary field.
    return;
  }

  // Process each vizionary attached to this song.
  for (const vizionaryIdentifier of vizionaries) {
    // Reference the vizionary document in the "vizionaries" collection.
    // We're using the vizionary identifier as the document ID.
    const vizionaryRef = db.collection("vizionaries").doc(vizionaryIdentifier);

    await db.runTransaction(async (transaction) => {
      const docSnapshot = await transaction.get(vizionaryRef);
      let vizionaryDoc;

      if (docSnapshot.exists) {
        // If the document exists, use its data.
        vizionaryDoc = docSnapshot.data();
        if (!Array.isArray(vizionaryDoc.songs)) {
          vizionaryDoc.songs = [];
        }
        if (!Array.isArray(vizionaryDoc.albums)) {
          vizionaryDoc.albums = [];
        }
      } else {
        // Create a new vizionary document matching your model.
        vizionaryDoc = {
          id: vizionaryIdentifier,
          artistName: vizionaryIdentifier,
          albums: [], // Start with an empty array.
          songs: [], // Start with an empty array.
          link: "", // Initialize as empty.
        };
      }

      // Create a song entry that fits your Song model.
      // Adjust properties below if your Song model includes additional fields.
      const songEntry = {
        id: songId,
        title: songData.title || "Untitled",
      };

      // Avoid duplicates by checking if the song is already in the list.
      const alreadyAdded = vizionaryDoc.songs.some((s) => s.id === songId);
      if (!alreadyAdded) {
        vizionaryDoc.songs.push(songEntry);
      }

      // Optionally, update a timestamp for tracking updates.
      vizionaryDoc.updatedAt = FieldValue.serverTimestamp();

      // Save or merge the document with the updated data.
      transaction.set(vizionaryRef, vizionaryDoc, { merge: true });
    });

    console.log(`Updated vizionary ${vizionaryIdentifier} with song ${songId}`);
  }
}

/**
 * Generate or update vizionary profiles by processing songs.
 * This function queries the "songs" collection for documents with a non-null
 * "vizionary" field and processes each song.
 */
async function generateVizionaryProfiles() {
  try {
    // Query songs that have a non-null "vizionary" field.
    const songsSnapshot = await db
      .collection("songs")
      .where("vizionaries", "!=", null)
      .get();

    if (songsSnapshot.empty) {
      console.log("No songs found with a vizionary attached.");
      return;
    }

    // Process each song document concurrently.
    const processPromises = [];
    songsSnapshot.forEach((doc) => {
      processPromises.push(processSong(doc));
    });
    await Promise.all(processPromises);

    console.log("Vizionary profiles generation complete.");
  } catch (error) {
    console.error("Error generating vizionary profiles:", error);
  }
}

// Execute the script.
generateVizionaryProfiles();
