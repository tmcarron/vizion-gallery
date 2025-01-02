export default interface Song {
  id: string;
  audio: string;
  title: string;
  coverArt: string;
  vizionaries: [string];
  vizionaryLinks: [string];
  viewsThisMonth: number;
  viewsAllTime: number;
}
