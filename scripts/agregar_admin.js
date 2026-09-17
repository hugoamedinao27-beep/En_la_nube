// Agrega un administrador existente a la coleccion "admins".
// Uso: node scripts/agregar_admin.js usuario@email.com
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const email = process.argv[2];
if (!email) {
  console.error('Uso: node scripts/agregar_admin.js usuario@email.com');
  process.exit(1);
}

const serviceAccount = require('../serviceAccountKey.json');
initializeApp({ credential: cert(serviceAccount) });

(async function () {
  try {
    const user = await getAuth().getUserByEmail(email);
    await getFirestore().collection('admins').doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      rol: 'admin'
    });
    console.log('Admin agregado correctamente:', user.email, '(' + user.uid + ')');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();