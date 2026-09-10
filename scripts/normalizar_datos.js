const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Normaliza los productos existentes en Firestore:
//  - precio: de string ("15000") a numero (15000) para poder ordenar/filtrar.
//  - stock: agrega el campo si no existe (default 0) para respetar el modelo nuevo.
// Uso: node scripts/normalizar_datos.js
const serviceAccount = require('../serviceAccountKey.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const productosRef = db.collection('productos');

async function normalizar() {
  const snapshot = await productosRef.get();
  console.log('Procesando ' + snapshot.size + ' productos...');
  let actualizados = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const cambios = {};

    const precio = Number(data.precio);
    if (!Number.isFinite(precio) || precio < 0) {
      cambios.precio = 0;
    } else if (typeof data.precio !== 'number') {
      cambios.precio = precio;
    }

    if (data.stock === undefined || data.stock === null || !Number.isInteger(Number(data.stock))) {
      cambios.stock = 0;
    } else {
      const stock = Number(data.stock);
      if (stock !== data.stock) {
        cambios.stock = stock;
      }
    }

    if (Object.keys(cambios).length > 0) {
      await doc.ref.update(cambios);
      console.log('  - ' + (data.nombre || doc.id) + ': ' + JSON.stringify(cambios));
      actualizados++;
    }
  }

  console.log('Proceso completado. ' + actualizados + ' productos normalizados.');
  process.exit(0);
}

normalizar().catch(function (err) {
  console.error('Error:', err.message);
  process.exit(1);
});