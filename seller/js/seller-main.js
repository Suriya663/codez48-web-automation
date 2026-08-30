import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-analytics.js";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, increment, onSnapshot, query, where, getDocs, orderBy, addDoc, runTransaction } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

// Firebase Configuration
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
const db = getFirestore(app);
const auth = getAuth(app);

// ... Remaining Logic from seller/index.html ...
// (I will migrate the functions here and expose them to window if needed)

window.toggleCart = () => {
    const modal = document.getElementById('cart-modal');
    const panel = document.getElementById('cart-panel');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        setTimeout(() => panel.classList.remove('translate-x-full'), 10);
    } else {
        panel.classList.add('translate-x-full');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

window.toggleMobileMenu = () => {
    const menu = document.getElementById('mobile-menu');
    if(menu) menu.classList.toggle('hidden');
};
