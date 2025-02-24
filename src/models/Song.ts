import Album from "./Album";

export default interface Song {
  id: string;
  audio: string;
  title: string;
  coverArt: string;
  album?: Album;
  vizionaries: string[];
  // vizionaryLinks: [string];
  // viewsThisMonth: number;
  // viewsAllTime: number;
}
