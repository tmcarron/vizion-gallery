// // src/auth.js
// import {
//   createUserWithEmailAndPassword,
//   signInWithEmailAndPassword,
// } from "firebase/auth";
// import { auth } from "./firebase";

// export const signUp = async (email: any, password: any) => {
//   try {
//     const userCredential = await createUserWithEmailAndPassword(
//       auth,
//       email,
//       password
//     );
//     console.log("User signed up:", userCredential.user);
//   } catch (error: any) {
//     console.error("Error signing up:", error.message);
//   }
// };

// export const logIn = async (email: any, password: any) => {
//   try {
//     const userCredential = await signInWithEmailAndPassword(
//       auth,
//       email,
//       password
//     );
//     console.log("User logged in:", userCredential.user);
//   } catch (error: any) {
//     console.error("Error logging in:", error.message);
//   }
// };
