import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAN1JxitWiiw9Az7hgo-N-tl_w52Jra87U",
  authDomain: "cristianosenaccion-71a36.firebaseapp.com",
  projectId: "cristianosenaccion-71a36",
  storageBucket: "cristianosenaccion-71a36.firebasestorage.app",
  messagingSenderId: "245438909726",
  appId: "1:245438909726:web:6c3209d9153c602da6460f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
