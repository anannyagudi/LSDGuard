import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC5uAW-Ah28oPMtHpSdxkTc_b-R8bm3ARQ",
  authDomain: "lsdguard-98400.firebaseapp.com",
  projectId: "lsdguard-98400",
  storageBucket: "lsdguard-98400.appspot.com",
  messagingSenderId: "407292673007",
  appId: "1:407292673007:web:edca53c161fe9134d2d41a"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
