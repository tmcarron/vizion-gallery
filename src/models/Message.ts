import Album from "./Album";
import { Playlist } from "./Playlist";
import Song from "./Song";

export interface Message {
  from: string | undefined;
  id?: string;
  song?: Song;
  playlist?: Playlist;
  album?: Album;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: any;
}
