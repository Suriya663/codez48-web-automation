import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-functions.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging.js";

const firebaseConfig = {
    apiKey: "AIzaSyBJK-7By6I9xps518HCYc2Kow44vp9fDpY",
    authDomain: "nshandlooms-a19be.firebaseapp.com",
    databaseURL: "https://nshandlooms-a19be-default-rtdb.firebaseio.com",
    projectId: "nshandlooms-a19be",
    storageBucket: "nshandlooms-a19be.appspot.com",
    messagingSenderId: "711669261779",
    appId: "1:711669261779:web:d323a1e50b5404ec10fb26",
    measurementId: "G-BSHJ03ZGEZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
