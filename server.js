const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const app = express();
const PUERTO = process.env.PORT || 3000;

// ── Firebase Admin ──
const serviceAccount = require('./serviceAccountKey.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const productosRef = db.collection('productos');

// ── Rutas de archivos ──
const RUTA_IMAGENES = path.join(__dirname, 'Imagenes');
const RUTA_INDEX = path.join(__dirname, 'index.html');

if (!fs.existsSync(RUTA_IMAGENES)) {
  fs.mkdirSync(RUTA_IMAGENES, { recursive: true });
}

// ── Multer (subida de imágenes) ──
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, RUTA_IMAGENES);
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + extension);
  }
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

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

// ── API: Crear un producto ──
app.post('/api/productos', upload.single('imagen'), async function (req, res) {
  const { nombre, descripcion } = req.body;
  const validacion = validarCampos(nombre, descripcion, req.body.precio, req.body.stock);

  if (validacion.error) {
    return res.status(400).json({ error: validacion.error });
  }

  const imagen = req.file ? '/Imagenes/' + req.file.filename : '';

  try {
    const nuevoProducto = {
      nombre: nombre,
      descripcion: descripcion,
      precio: validacion.precio,
      stock: validacion.stock,
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

// ── API: Eliminar un producto ──
app.delete('/api/productos/:id', async function (req, res) {
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

// ── API: Actualizar un producto ──
app.put('/api/productos/:id', upload.single('imagen'), async function (req, res) {
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
      stock: validacion.stock
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

// ── Ruta principal ──
app.get('/', function (req, res) {
  res.sendFile(RUTA_INDEX);
});

app.listen(PUERTO, function () {
  console.log('Servidor corriendo en http://localhost:' + PUERTO);
});
