import AudioPlayerComponent from "../Player/AudioPlayerComponent";
import "./HomePage.css";

const HomePage = () => {
  return (
    <div className="HomePage">
      <h1>Vizion Gallery</h1>

      <AudioPlayerComponent />
      <section className="summary-section">
        <p>
          A digital music platform pushing to give artists creative freedom,
          flexibility, and ownership of their work. This website is in open
          development. Every donation will assist in funding future updates and
          tools for creators and users.
        </p>
      </section>
      <p>Vizion LLC</p>
      <p>Created by Tyler Carron</p>
    </div>
  );
};

export default HomePage;
