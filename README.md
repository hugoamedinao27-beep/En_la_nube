# En la nube - Carton Pintado

Pagina para registrar y ver cartas de Magic. Los datos se guardan en la nube (Firestore de Firebase) y la pagina se publica con GitHub Pages.

## Paginas

- `index.html` - inicio (con estado de sesion)
- `login.html` - iniciar / cerrar sesion de administrador
- `ver_productos.html` - ver cartas (con buscador, orden y filtro de stock)
- `registrar_producto.html` - cargar una carta (requiere sesion)
- `editar_producto.html` - modificar una carta (requiere sesion)
- `detalle_producto.html` - ver una carta

## Login

La parte de escribir (registrar, editar, eliminar) esta protegida con login de
Firebase Auth por email/contraseña. Ver las cartas no requiere sesion.

Para que ande:

1. En la consola de Firebase: **Authentication > Sign-in method > Email/Password > Enable**.
2. Agrega los administradores en **Authentication > Users > Add user** (email + contraseña).
3. Publica las reglas del archivo `firestore.rules` (permiten escribir solo a cuentas
   con email/contraseña).

Cualquier visitante ve la tienda; el boton "Registrar Producto" y las acciones
Modificar/Eliminar solo aparecen con sesion iniciada.

## Datos

Una carta tiene: nombre, descripcion, precio, stock, imagen y fecha. El ID lo genera Firestore.

## Abrir en local

Necesitas Node.js. Dentro de la carpeta:

```
npm install
npm start
```

Despues abris http://localhost:3000

Nota: si no tenes la clave de Firebase (`serviceAccountKey.json`), el servidor funciona pero no puede tocar los datos. Esa clave NO se sube a GitHub.

## Git y seguridad

- `serviceAccountKey.json` esta en `.gitignore` (nunca se sube).
- `firestore.rules` permite leer a todos y escribir solo a cuentas con email/contraseña.

## Scripts (opcionales)

- `node scripts/normalizar_datos.js` - pasa los precios a numero y agrega stock a los datos viejos.
- `node scripts/migrar_a_firestore.js` - carga `datos/productos.json` a Firestore.