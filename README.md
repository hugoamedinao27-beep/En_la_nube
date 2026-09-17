# En la nube - Carton Pintado

Pagina para registrar y ver cartas de Magic. Los datos se guardan en la nube (Firestore de Firebase) y la pagina se publica con GitHub Pages.

## Paginas

- `index.html` - inicio (con estado de sesion y roles)
- `login.html` - iniciar sesion
- `registro.html` - crear cuenta de cliente (puede ver y pedir cartas)
- `ver_productos.html` - ver y pedir cartas (con buscador, orden y filtro de stock)
- `registrar_producto.html` - cargar una carta (solo administrador)
- `editar_producto.html` - modificar una carta (solo administrador)
- `ver_pedidos.html` - gestionar pedidos de clientes (solo administrador)
- `detalle_producto.html` - ver una carta

## Cuentas y roles

- **Cualquier visitante** puede ver las cartas sin registrarse.
- **Clientes** (se registran en `registro.html` con email/contraseña): ven las
  cartas y pueden dejar pedidos desde la ficha de cada carta.
- **Administradores**: ademas, registran/editan/eliminan cartas y gestionan los
  pedidos (`ver_pedidos.html`).

Para configurar los roles desde cero:

1. En la consola de Firebase: **Authentication > Sign-in method > Email/Password > Enable**.
2. Crea tu cuenta de administrador en **Authentication > Users > Add user** (email + contraseña).
3. Mark as admin en la consola de Firebase:
   - Data de alta con el script (necesita `serviceAccountKey.json`):
     `node scripts/agregar_admin.js tu@email.com`
   - O a mano en **Firestore > Data**, crea la coleccion `admins` con un documento
     cuyo **ID sea el UID** de ese usuario (lo encontras en Authentication > Users).

Las cuentas de clientes se crean solas desde la web; no hacen falta en la consola.

Publica las reglas del archivo `firestore.rules` (permite leer a todos, escribir
productos solo a admins y crear/ver pedidos a clientes registrados).

## Datos

Una carta tiene: nombre, descripcion, precio, stock, imagen y fecha. El ID lo genera Firestore.

Un pedido tiene: producto, cantidad, usuario (email/UID), estado (`pendiente`, `entregado` o `cancelado`) y fecha.

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
- `firestore.rules` permite leer a todos, escribir productos solo a admins y crear/ver pedidos a clientes registrados.

## Scripts (opcionales)

- `node scripts/normalizar_datos.js` - pasa los precios a numero y agrega stock a los datos viejos.
- `node scripts/migrar_a_firestore.js` - carga `datos/productos.json` a Firestore.
- `node scripts/agregar_admin.js usuario@email.com` - da de alta a un usuario como administrador.