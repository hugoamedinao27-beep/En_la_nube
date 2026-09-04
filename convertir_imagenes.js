const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('./serviceAccountKey.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const productosRef = db.collection('productos');

async function convertImageToBase64(ruta) {
  if (!ruta) return '';
  const rutaLocal = path.join(__dirname, ruta.replace(/^\//, ''));
  if (!fs.existsSync(rutaLocal)) return '';
  const buf = fs.readFileSync(rutaLocal);
  return 'data:image/jpeg;base64,' + buf.toString('base64');
}

async function actualizar() {
  const snapshot = await productosRef.get();
  console.log('Procesando ' + snapshot.size + ' productos...');
  let actualizados = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const imagen = data.imagen || '';
    if (imagen.startsWith('/Imagenes/')) {
      const base64 = await convertImageToBase64(imagen);
      if (base64) {
        await doc.ref.update({ imagen: base64 });
        console.log('  - ' + data.nombre + ': imagen convertida a base64');
        actualizados++;
      } else {
        await doc.ref.update({ imagen: '' });
        console.log('  - ' + data.nombre + ': imagen no encontrada, se limpia');
        actualizados++;
      }
    } else {
      console.log('  - ' + data.nombre + ': sin ruta local (se deja igual)');
    }
  }

  console.log('Proceso completado. ' + actualizados + ' docs actualizados.');
  process.exit(0);
}

actualizar().catch(function (err) {
  console.error('Error:', err);
  process.exit(1);
});
