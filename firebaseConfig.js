// Configuracion de Firebase para el frontend (funciona en GitHub Pages)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, where, runTransaction, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

// Cualquiera puede ver los productos (lectura publica). Para escribir
// (productos) o gestionar pedidos hace falta ser admin. La gente externa
// puede registrarse con email/contraseña, ver los productos y dejar pedidos.
//
// Esta promesa resuelve con el usuario logueado (o null). Si queda una sesion
// anonima de una version vieja de la app, la cierra y resuelve con null, para
// que nadie pueda escribir sin cuenta real.
const usuarioActual = new Promise(function (resolver) {
  onAuthStateChanged(auth, function (user) {
    if (user && user.isAnonymous) {
      signOut(auth);
      resolver(null);
    } else {
      resolver(user);
    }
  });
});

// Recarga los datos del usuario en Firebase (para ver emailVerified actualizado).
// Los clientes solo pueden pedir cartas o proxies con el email verificado, asi
// las reglas de Firestore (firestore.rules) frenan el spam de cuentas.
async function recargarUsuario(user) {
  if (user && !user.isAnonymous) {
    try {
      await user.reload();
    } catch (error) {
      console.warn('No se pudo refrescar la sesion:', error.code || error.message);
    }
  }
  return user;
}

// Envia el correo de verificacion de Firebase. Devuelve true si el email ya
// estaba verificado o si el correo se pudo enviar.
async function enviarCorreoVerificacion(user) {
  if (!user || user.isAnonymous) return false;
  if (user.emailVerified) return true;
  try {
    await sendEmailVerification(user);
    return true;
  } catch (error) {
    console.warn('No se pudo enviar el correo de verificacion:', error.code || error.message);
    return false;
  }
}

// Devuelve true si el usuario logueado figura en la coleccion "admins".
// Los admins se dan de alta con scripts/agregar_admin.js o en la consola.
async function obtenerEsAdmin() {
  const user = await usuarioActual;
  if (!user || user.isAnonymous) return false;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch (error) {
    console.warn('No se pudo verificar el rol de admin:', error.code || error.message);
    return false;
  }
}

// Notificacion no intrusiva (toast) que aparece flotando y desaparece sola.
// tipo: 'exito' (por defecto), 'error' o 'info'.
function mostrarNotificacion(mensaje, tipo) {
  let tostadora = document.getElementById('tostadora');
  if (!tostadora) {
    tostadora = document.createElement('div');
    tostadora.id = 'tostadora';
    document.body.appendChild(tostadora);
  }
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + (tipo === 'error' ? 'error' : tipo === 'info' ? 'info' : 'exito');
  toast.textContent = mensaje;
  tostadora.appendChild(toast);
  setTimeout(function () {
    toast.classList.add('toast-salida');
    setTimeout(function () { toast.remove(); }, 300);
  }, 3200);
}

export { db, productosRef, collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, where, runTransaction, arrayUnion, onSnapshot, auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, usuarioActual, obtenerEsAdmin, recargarUsuario, enviarCorreoVerificacion, mostrarNotificacion };