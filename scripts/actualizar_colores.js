// Completa el campo "colores" en los productos existentes que no lo tienen,
// consultando Scryfall por el nombre de la carta.
// Uso: node scripts/actualizar_colores.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('../serviceAccountKey.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const productosRef = db.collection('productos');

function coloresDeCarta(carta) {
  if (carta.card_faces && carta.card_faces.length > 0) {
    const colores = [];
    carta.card_faces.forEach(function (cara) {
      (cara.colors || []).forEach(function (c) {
        if (colores.indexOf(c) === -1) colores.push(c);
      });
    });
    return colores;
  }
  return (carta.colors || []).slice();
}

const esperar = function (ms) { return new Promise(function (res) { setTimeout(res, ms); }); };

async function buscarColores(nombre) {
  const url = 'https://api.scryfall.com/cards/named?exact=' + encodeURIComponent(String(nombre).trim());
  const respuesta = await fetch(url, {
    headers: { 'User-Agent': 'carton-pintado/1.0 (backfill colores)' }
  });
  if (!respuesta.ok) {
    throw new Error('Scryfall ' + respuesta.status + ' para "' + nombre + '"');
  }
  const datos = await respuesta.json();
  return coloresDeCarta(datos);
}

async function actualizar() {
  const snapshot = await productosRef.get();
  console.log('Procesando ' + snapshot.size + ' productos...');
  let actualizados = 0;
  let conColores = 0;
  let errores = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const nombre = String(data.nombre || '').trim();

    if (!nombre) {
      console.log('  - Documento sin nombre (' + doc.id + '), se omite.');
      continue;
    }

    if (Array.isArray(data.colores)) {
      conColores++;
      continue;
    }

    try {
      const colores = await buscarColores(nombre);
      await doc.ref.update({ colores: colores });
      console.log('  - ' + nombre + ': ' + JSON.stringify(colores));
      actualizados++;
    } catch (error) {
      console.log('  - ERROR ' + nombre + ': ' + error.message);
      errores++;
    }

    await esperar(150);
  }

  console.log('Proceso completado.');
  console.log('  Actualizados: ' + actualizados);
  console.log('  Ya tenian colores: ' + conColores);
  console.log('  Errores: ' + errores);
  process.exit(0);
}

actualizar().catch(function (err) {
  console.error('Error:', err.message);
  process.exit(1);
});