import Song from "./Song";

export default interface Artist {
  id: string;
  albumName: string;
  artist: Artist;
  songs: Song[];
}
