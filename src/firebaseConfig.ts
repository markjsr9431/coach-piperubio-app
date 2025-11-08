import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAv7QQAaMAkIsLPXnwQc7TZRtutzYJU8tY",
  authDomain: "coachpiperubio-db723.firebaseapp.com",
  projectId: "coachpiperubio-db723",
  storageBucket: "coachpiperubio-db723.appspot.com",
  messagingSenderId: "365520962787",
  appId: "1:365520962787:web:3359c56a289ee81ed3b1d6",
  measurementId: "G-8VJH5E7E4B"
};

// Initialize Firebase solo si no hay ninguna instancia existente
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth - debe usar la app inicializada
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const provider = new GoogleAuthProvider();
// Configurar el provider para seleccionar cuenta
provider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore
export const db = getFirestore(app);
