import { Storage } from "@google-cloud/storage";
import corsConfiguration from "./cors.json" assert { type: "json" };

const projectId = "vizion-gallery";
const bucketName = "vizion-gallery.firebasestorage.app"; // Replace with your actual bucket name

// If you have a service account JSON file, specify its path here
const storage = new Storage({
  projectId,
  keyFilename: "serviceAccount.json", // Adjust the path as needed
});

async function setCors() {
  try {
    await storage.bucket(bucketName).setCorsConfiguration(corsConfiguration);
    console.log(`CORS configuration successfully set for bucket ${bucketName}`);
  } catch (error) {
    console.error("Error setting CORS configuration:", error);
  }
}

setCors();
