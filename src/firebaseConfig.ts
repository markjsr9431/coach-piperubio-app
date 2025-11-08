import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAv7QQAaMAkIsLPXnwQc7TZRtutzYJU8tY",
  authDomain: "coachpiperubio-db723.firebaseapp.com",
  projectId: "coachpiperubio-db723",
  storageBucket: "coachpiperubio-db723.firebasestorage.app",
  messagingSenderId: "365520962787",
  appId: "1:365520962787:web:3359c56a289ee81ed3b1d6",
  measurementId: "G-8VJH5E7E4B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
