import { Timestamp } from "firebase/firestore";
import Album from "./Album";
import Song from "./Song";

export default interface Vizionary {
  id: string;
  vizionaryName: string;
  albums: Album[];
  songs: Song[];
  link: string;
  lastInteracted?: { [userId: string]: Timestamp };
  bio: string;
  profilePic: string;
}
