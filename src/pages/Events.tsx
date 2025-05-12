import "./Events.css";

const Events = () => {
  return (
    <div className="Events">
      <video className="background-video" autoPlay loop muted playsInline>
        <source
          src="/vecteezy_rose-petals-falling-loop-animation-background-video-for_40176148.mp4"
          type="video/mp4"
        />
      </video>

      <div className="events-content">
        <h2 className="events-text">Love Paradox Release Show</h2>
        <a
          className="ticket-button"
          href="https://www.eventbrite.com/e/love-paradox-album-release-show-tickets-1319600754379?aff=oddtdtcreator"
          target="_blank"
          rel="noopener noreferrer"
        >
          Buy Tickets
        </a>
        <img
          className="timia-album-cover"
          src="/Black and White Minimalist Photocentric Rose Hip-Hop Album Cover.png"
          alt=""
        />
        <p>Live performances by Mia More and Prince Monarch</p>
        <p>$10 tickets in advanced, 15 at the door</p>
        <p>May 23</p>
        <p>Doors open at 7pm</p>
        <p>At 215 W in Ferndale</p>
        <iframe
          className="event-map"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2939.40280524087!2d-83.13900534114481!3d42.46035766308939!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8824cfecc20dc2f3%3A0xf7ab2533c5b28c42!2s215%20West%20Ferndale!5e0!3m2!1sen!2sus!4v1744256384740!5m2!1sen!2sus"
          width="100%"
          height="300"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
};

export default Events;
