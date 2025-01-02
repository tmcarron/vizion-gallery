import Album from "./Album";
import Song from "./Song";

export default interface Vizionary {
  id: string;
  artistName: string;
  albums: Album[];
  songs: Song[];
  link: string;
}
