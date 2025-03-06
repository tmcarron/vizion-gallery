export default interface Song {
  id: string;
  title: string;
  audio: string; // ✅ Required
  coverArt: string;
  albumId?: string;
  album?: string;
  vizionaries: string[]; // ✅ Required
  lastInteracted?: { [userId: string]: number };
}
