import Song from "./Song";

export default interface Artist {
  id: string;
  albumName: string;
  vizionaries: string[];
  songs: Song[];
}
