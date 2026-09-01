const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');

const app = express();
const PUERTO = process.env.PORT || 3000;

const RUTA_DATOS = path.join(__dirname, 'productos.json');
const RUTA_IMAGENES = path.join(__dirname, 'Imagenes');
const RUTA_INDEX = path.join(__dirname, 'index.html');

if (!fs.existsSync(RUTA_IMAGENES)) {
    fs.mkdirSync(RUTA_IMAGENES, { recursive: true });
}

function leerProductos() {
    try {
        const datos = fs.readFileSync(RUTA_DATOS, 'utf8');
        return JSON.parse(datos);
    } catch (e) {
        return [];
    }
}

function guardarProductos(productos) {
    fs.writeFileSync(RUTA_DATOS, JSON.stringify(productos, null, 2), 'utf8');
}

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

app.get('/api/productos', function (req, res) {
    res.json(leerProductos());
});

app.get('/api/productos/:id', function (req, res) {
    const productos = leerProductos();
    const producto = productos[Number(req.params.id)];
    if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(producto);
});

app.post('/api/productos', upload.single('imagen'), function (req, res) {
    const { nombre, descripcion, precio } = req.body;

    if (!nombre || !descripcion || !precio) {
        return res.status(400).json({ error: 'Faltan nombre, descripcion o precio' });
    }

    const imagen = req.file ? '/Imagenes/' + req.file.filename : '';

    const productos = leerProductos();
    productos.push({ nombre: nombre, descripcion: descripcion, precio: precio, imagen: imagen });
    guardarProductos(productos);

    res.status(201).json({ ok: true, producto: productos[productos.length - 1] });
});

app.get('/', function (req, res) {
    res.sendFile(RUTA_INDEX);
});

app.listen(PUERTO, function () {
    console.log('Servidor corriendo en http://localhost:' + PUERTO);
});