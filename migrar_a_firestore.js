const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('./serviceAccountKey.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const productosRef = db.collection('productos');

async function migrar() {
  const datos = JSON.parse(fs.readFileSync(path.join(__dirname, 'productos.json'), 'utf8'));
  console.log('Migrando ' + datos.length + ' productos a Firestore...');

  for (const p of datos) {
    await productosRef.add({
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      imagen: p.imagen || '',
      createdAt: FieldValue.serverTimestamp()
    });
    console.log('  - ' + p.nombre);
  }

  console.log('Migracion completada.');
  process.exit(0);
}

migrar().catch(function (err) {
  console.error('Error durante la migracion:', err);
  process.exit(1);
});
