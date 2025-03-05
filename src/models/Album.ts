import { Playlist } from "./Playlist";

export default interface Album extends Playlist {
  title: string;
  coverArt: string;
  vizionaries: string[];
  lastInteracted?: { [userId: string]: number };
}
