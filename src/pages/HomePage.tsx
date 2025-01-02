import AudioPlayerComponent from "../Player/AudioPlayerComponent";
import "./HomePage.css";

const HomePage = () => {
  return (
    <div className="HomePage">
      <h1>Vizion Gallery</h1>
      {/* {!user ? (
            <>
              {logInForm ? <AuthForm /> : <></>}
              <button onClick={logInToggle}>Log In</button>
    
              <button onClick={signUpToggle}>Sign Up</button>
              {showSignUpForm ? <SignUpForm /> : <></>}
            </>
          ) : (
            <>
              <AudioPlayerComponent />
              <FeaturedArtists />
            </>
          )} */}
      <AudioPlayerComponent />
    </div>
  );
};

export default HomePage;
