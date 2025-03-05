import Song from "./Song";

// models/Playlist.ts
export interface Playlist {
  id: string; // Optional Firestore document ID
  createdBy?: string;
  name: string;
  songIds: string[]; // Array of song IDs only
  createdAt?: any; // Optional timestamp
  songs?: Song[];
}
