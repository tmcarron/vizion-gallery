import "./App.css";

// import { useEffect, useState } from "react";
import AudioPlayerComponent from "./Player/AudioPlayerComponent";
// import { getAuth, onAuthStateChanged } from "firebase/auth";
// import FeaturedArtists from "./FeaturedArtists";
// import AuthForm from "./AuthForm";
// import SignUpForm from "./SignUp";

const App = () => {
  // const [user, setUser] = useState(null); // State to hold user data
  // const [showSignUpForm, setShowSignUpForm] = useState(false);
  // const [logInForm, setLogInForm] = useState(false);
  // const signUpToggle = () => {
  //   setShowSignUpForm(true);
  //   if (logInForm) {
  //     setLogInForm(false);
  //   }
  // };
  // const logInToggle = () => {
  //   setLogInForm(true);
  //   if (showSignUpForm) {
  //     setShowSignUpForm(false);
  //   }
  // };
  // useEffect(() => {
  //   const auth = getAuth();
  //   const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
  //     if (currentUser) {
  //       console.log("User signed in");
  //       setUser(currentUser);
  //     } else {
  //       console.log("User signed out");
  //       setUser(null);
  //     }
  //   });
  //   return () => {
  //     unsubscribe();
  //   };
  // }, []);
  return (
    <div className="App">
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
export default App;
