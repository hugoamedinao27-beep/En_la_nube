// Configuracion de Firebase para el frontend (funciona en GitHub Pages)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBnmn0MMCg6nlH09gyXJvFMSGh-7y2UxGI",
  authDomain: "enlanube-7df60.firebaseapp.com",
  projectId: "enlanube-7df60",
  storageBucket: "enlanube-7df60.firebasestorage.app",
  messagingSenderId: "143511627395",
  appId: "1:143511627395:web:d680203e3a81ed31bf5db6",
  measurementId: "G-2QKBYPG9YV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productosRef = collection(db, 'productos');
const auth = getAuth(app);

// Las reglas de Firestore exigen sesion para escribir. Usamos login anonimo:
// cualquier visitante puede ver (lectura publica) y escribir desde el navegador,
// pero el acceso ya no es "escritura abierta" sin ninguna credencial.
// Esta promesa resuelve incluso si el login anonimo falla, para no romper UI.
const autenticacionAnonima = signInAnonymously(auth).catch(function (error) {
  console.warn('Login anonimo no disponible:', error.code);
  return null;
});

export { db, productosRef, collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, autenticacionAnonima };