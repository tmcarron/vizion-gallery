import SongDisplay from "../SongDisplay";
import "./HomePage.css";

const HomePage = () => {
  return (
    <div className="HomePage">
      <h1>Vizion Gallery</h1>

      <SongDisplay />

      <section className="summary-section">
        <p>
          A digital music platform pushing to give artists creative freedom,
          flexibility, and ownership of their work. This website is in open
          development.
        </p>
      </section>

      <p>Vizion LLC</p>
      <p>Created by Tyler Carron</p>
    </div>
  );
};

export default HomePage;
