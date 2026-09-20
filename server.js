const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const app = express();
const PUERTO = process.env.PORT || 3000;

// ── Firebase Admin ──
const serviceAccount = require('./serviceAccountKey.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const auth = getAuth();
const productosRef = db.collection('productos');

// ── Rutas de archivos ──
const RUTA_IMAGENES = path.join(__dirname, 'Imagenes');
const RUTA_INDEX = path.join(__dirname, 'index.html');

if (!fs.existsSync(RUTA_IMAGENES)) {
  fs.mkdirSync(RUTA_IMAGENES, { recursive: true });
}

// ── Archivos que NUNCA se sirven por HTTP ──
// `serviceAccountKey.json` es la clave de administrador de Firebase: si cae a
// internet se pierde todo. Tambien se ocultan la config, el codigo fuente y
// las carpetas de trabajo para no filtrar informacion.
const BLOQUEADOS_POR_NOMBRE = new Set([
  'serviceAccountKey.json',
  'server.js',
  'package.json',
  'package-lock.json',
  'firebase.json',
  'firestore.rules',
  'firestore.indexes.json',
  '.firebaserc',
  '.gitignore',
  '.env'
]);
const BLOQUEADOS_POR_PREFIJO = [
  '/.git/',
  '/node_modules/',
  '/scripts/',
  '/datos/',
  '/dataconnect/',
  '/.firebase/'
];
const EXTENSIONES_SERVIDAS = new Set([
  '.html', '.css', '.js', '.mjs',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
  '.woff', '.woff2', '.ttf'
]);

// ── Multer (subida de imágenes) ──
// Solo se aceptan imagenes JPG/PNG/WEBP/GIF de hasta 5MB. El nombre del archivo
// se genera en el servidor y la extension sale del tipo MIME, no del nombre que
// manda el navegador (asi no se pueden subir HTML/JS con otra extension).
const TIPOS_IMAGEN = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};
const EXTENSION_IMAGEN = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, RUTA_IMAGENES);
  },
  filename: function (req, file, cb) {
    const ext = TIPOS_IMAGEN[file.mimetype] || '.jpg';
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + ext);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!TIPOS_IMAGEN[file.mimetype] || !EXTENSION_IMAGEN.has(ext)) {
      return cb(new Error('Solo se permiten imagenes JPG, PNG, WEBP o GIF de hasta 5MB.'));
    }
    cb(null, true);
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Filtro de archivos estáticos ──
// Antes de servir cualquier archivo se verifica que no sea sensible.
app.use(function (req, res, next) {
  const ruta = (req.path || '/').replace(/\\/g, '/');
  if (ruta === '/' || ruta.startsWith('/api')) return next();

  const nombre = path.posix.basename(ruta);
  if (BLOQUEADOS_POR_NOMBRE.has(nombre) || nombre.endsWith('.log')) {
    return res.status(404).end();
  }
  if (BLOQUEADOS_POR_PREFIJO.some(function (p) { return ruta === p || ruta.startsWith(p); })) {
    return res.status(404).end();
  }
  if (nombre.includes('.')) {
    const ext = path.posix.extname(nombre).toLowerCase();
    if (!EXTENSIONES_SERVIDAS.has(ext)) return res.status(404).end();
  } else if (nombre !== '') {
    // Archivos sin extension (.env, .firebaserc...) nunca se sirven.
    return res.status(404).end();
  }
  next();
});

app.use(express.static(__dirname, { index: 'index.html' }));

// ── Autenticacion de las rutas que escriben ──
// El SDK de Firebase Admin saltea las reglas de Firestore, asi que aca se exige
// un token de sesion valido Y que el usuario sea admin, o todo lo que pasaba
// antes podia hacer cualquiera.
async function requereAdmin(req, res, next) {
  const cabecera = req.headers.authorization || '';
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ error: 'Falta el token de sesion. Inicia sesion como administrador.' });
  }
  try {
    const decodificado = await auth.verifyIdToken(token);
    const docAdmin = await db.collection('admins').doc(decodificado.uid).get();
    if (!docAdmin.exists) {
      return res.status(403).json({ error: 'No tenes permisos de administrador.' });
    }
    req.usuario = { uid: decodificado.uid };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Sesion invalida o vencida.' });
  }
}

// ── API: Obtener todos los productos ──
app.get('/api/productos', async function (req, res) {
  try {
    const snapshot = await productosRef.orderBy('createdAt', 'desc').get();
    const productos = [];
    snapshot.forEach(function (doc) {
      productos.push({ id: doc.id, ...doc.data() });
    });
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// ── API: Obtener un producto por ID ──
app.get('/api/productos/:id', async function (req, res) {
  try {
    const doc = await productosRef.doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// ── Validacion de campos ──
function validarCampos(nombre, descripcion, precio, stock) {
  const texto = function (v) { return v !== undefined && v !== null && String(v).trim() !== ''; };

  if (!texto(nombre) || !texto(descripcion)) {
    return { error: 'Faltan nombre o descripcion' };
  }

  const precioNum = Number(precio);
  if (!texto(precio) || !Number.isFinite(precioNum) || precioNum < 0) {
    return { error: 'El precio debe ser un numero mayor o igual a 0' };
  }

  const stockNum = Number(stock);
  if (!texto(stock) || !Number.isInteger(stockNum) || stockNum < 0) {
    return { error: 'El stock debe ser un numero entero mayor o igual a 0' };
  }

  return { precio: precioNum, stock: stockNum };
}

// ── API: Crear un producto (solo admin) ──
app.post('/api/productos', requereAdmin, upload.single('imagen'), async function (req, res) {
  const { nombre, descripcion } = req.body;
  const validacion = validarCampos(nombre, descripcion, req.body.precio, req.body.stock);

  if (validacion.error) {
    return res.status(400).json({ error: validacion.error });
  }

  const imagen = req.file ? '/Imagenes/' + req.file.filename : '';
  const categoria = req.body.categoria || 'mtg';

  try {
    const nuevoProducto = {
      nombre: nombre,
      descripcion: descripcion,
      precio: validacion.precio,
      stock: validacion.stock,
      categoria: categoria,
      imagen: imagen,
      createdAt: FieldValue.serverTimestamp()
    };
    const docRef = await productosRef.add(nuevoProducto);
    res.status(201).json({ ok: true, producto: { id: docRef.id, ...nuevoProducto } });
  } catch (error) {
    console.error('Error al guardar producto:', error);
    res.status(500).json({ error: 'Error al guardar producto' });
  }
});

// ── API: Eliminar un producto (solo admin) ──
app.delete('/api/productos/:id', requereAdmin, async function (req, res) {
  try {
    const doc = await productosRef.doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    await productosRef.doc(req.params.id).delete();
    res.json({ ok: true, mensaje: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// ── API: Actualizar un producto (solo admin) ──
app.put('/api/productos/:id', requereAdmin, upload.single('imagen'), async function (req, res) {
  const { nombre, descripcion } = req.body;
  const validacion = validarCampos(nombre, descripcion, req.body.precio, req.body.stock);

  if (validacion.error) {
    return res.status(400).json({ error: validacion.error });
  }

  try {
    const doc = await productosRef.doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const datosActualizados = {
      nombre: nombre,
      descripcion: descripcion,
      precio: validacion.precio,
      stock: validacion.stock,
      categoria: req.body.categoria || 'mtg'
    };

    if (req.file) {
      datosActualizados.imagen = '/Imagenes/' + req.file.filename;
    }

    await productosRef.doc(req.params.id).update(datosActualizados);
    res.json({ ok: true, mensaje: 'Producto actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// ── Manejo de errores de subida ──
app.use(function (err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'La imagen supera el tamaño maximo de 5MB.' });
    }
    return res.status(400).json({ error: 'Error al subir la imagen: ' + err.message });
  }
  if (err && err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// ── Ruta principal ──
app.get('/', function (req, res) {
  res.sendFile(RUTA_INDEX);
});

app.listen(PUERTO, function () {
  console.log('Servidor corriendo en http://localhost:' + PUERTO);
});