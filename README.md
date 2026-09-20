# En la nube - Carton Pintado

Pagina para registrar y ver cartas de Magic. Los datos se guardan en la nube (Firestore de Firebase) y la pagina se publica con GitHub Pages.

## Paginas

- `index.html` - inicio (con estado de sesion y roles)
- `login.html` - iniciar sesion
- `registro.html` - crear cuenta de cliente (puede ver y pedir cartas)
- `ver_productos.html` - ver cartas, armar un carrito y finalizar el pedido (PDF)
- `registrar_producto.html` - cargar una carta (solo administrador)
- `editar_producto.html` - modificar una carta (solo administrador)
- `ver_pedidos.html` - gestionar pedidos de clientes (solo administrador)
- `pedidos_pendientes.html` - ver pedidos pendientes y marcarlos listos para despacho (solo administrador)
- `detalle_producto.html` - ver una carta

## Cuentas y roles

- **Cualquier visitante** puede ver las cartas sin registrarse.
- **Clientes** (se registran en `registro.html` con email/contraseña): ven las
  cartas y pueden dejar pedidos desde la ficha de cada carta. Para pedir cartas
  o solicitar proxies el email debe estar **verificado** (al registrarte llega
  un correo de Firebase para verificar la cuenta). Esto frena el spam de
  cuentas y pedidos falsos.
- **Administradores**: ademas, registran/editan/eliminan cartas, gestionan los
  pedidos (`ver_pedidos.html`) y pueden ajustar el stock directo desde la ficha
  de cada carta en `ver_productos.html`. Los admins no necesitan verificar el
  email.

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

Una carta tiene: nombre, descripcion, precio, stock, imagen, categoría y fecha. El ID lo genera Firestore.

### Categorias

Cada producto se guarda con el campo `categoria` para armar secciones en la web:

- `mtg` - cartas de Magic: The Gathering (por defecto, por ejemplo al cargar listas de Scryfall).
- `one_piece` - cartas del TCG de One Piece (seccion propia en `index.html`).
- `promocion` - promociones y ofertas.
- `deck` - decks completos de distintos TCG.

Se elige al registrar/editar un producto, y `ver_productos.html` permite filtrar por
categoría (tambien acepta `?categoria=one_piece` para pre-filtrar desde un link).

### Buscadores de cartas

En `registrar_producto.html` hay dos buscadores:

- **Scryfall** (Magic): busca cartas de MTG por nombre y descarga la imagen.
- **OPTCG API** (`registrar_producto.html`): `https://optcgapi.com/api/sets/filtered/?card_name=...`
  busca cartas de One Piece por nombre (sin clave y con CORS abierto), llena el
  formulario y deja la categoría en `one_piece`. La referencia de precio proviene
  de `market_price`. Si la imagen no se puede bajar por CORS, se guarda la URL
  directa de la API en el campo `imagen`.

Un pedido tiene: lista de cartas (`items` con nombre, precio y cantidad), `total`,
usuario (email/UID), estado (`pendiente`, `listo_para_despacho`, `entregado` o
`cancelado`) y fecha.

## Avisos por correo (EmailJS)

Cuando el admin marca un pedido como **listo para despacho** o **entregado**, se le
envia un correo al cliente con el detalle del pedido. Se usa [EmailJS](https://www.emailjs.com)
desde el navegador (no hace falta backend). El codigo esta en `emailPedido.js`.

Para activarlo:

1. Crear una cuenta en https://www.emailjs.com (el plan gratis alcanza para una tienda chica).
2. En **Email Services**, conectar una casilla (por ejemplo el Gmail de la tienda).
3. En **Email Templates**, crear una plantilla con:
   - **To Email**: `{{to_email}}`
   - **Subject**: `{{asunto}}`
   - **Body**: `Hola {{cliente}}` + `{{titulo}}` + `{{mensaje}}` + `{{detalle}}` +
     `Total: {{total}}` + `Pedido: {{pedidoId}}`
4. Copiar **Service ID**, **Template ID** y **Public Key** dentro de `EMAILJS` en `emailPedido.js`.
5. En **Account > Security**, agregar los origenes permitidos:
   `https://hugoamedinao27-beep.github.io` y `http://localhost:3000`.

Mientras `EMAILJS` este vacio, la app funciona igual: solo avisa por consola que no
se pudo enviar el correo. La **Public Key** queda visible en el HTML (es normal en
EmailJS); nunca pongas ahi una clave privada.

## Carrito y PDF

En `ver_productos.html`, cualquier persona puede ir agregando cartas a un carrito
(se guarda en el navegador). Al **Finalizar pedido**:

1. Si no hay sesion, pide iniciar sesion o crear cuenta.
2. Guarda el pedido completo en Firestore (lo ve el admin en `ver_pedidos.html`).
3. Descuenta del **stock** de cada carta la cantidad pedida (en una transaccion:
   si no hay stock suficiente, el pedido no se registra).
4. Genera y descarga un **PDF** (`pedido_carton_pintado.pdf`) con la lista de
   cartas (con su foto), cantidades, precios y el total.

Tambien hay un boton **Descargar PDF** para bajar el detalle del carrito sin
guardarlo como pedido.

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
- `firestore.rules` permite leer a todos, escribir productos solo a admins,
  crear/ver pedidos y proxies solo a clientes registrados y **con el email
  verificado** (los admins quedan exentos), y a los clientes descontar stock
  (solo el campo `stock` y solo hacia abajo) cuando pagan un pedido.
- `server.js` (solo para desarrollo local) esta endurecido:
  - Las rutas que escriben (`POST/PUT/DELETE /api/productos`) exigen un **token
    de sesion de un admin** (Bearer token verificado contra Firebase). Sin
    token o sin rol admin devuelven 401/403.
  - Los archivos estaticos se filtran: **`serviceAccountKey.json`, `server.js`,
    `package.json`, `firestore.rules`, `.env`, `scripts/`, `datos/`,
    `node_modules/`, etc. nunca se sirven por HTTP** (responden 404).
  - La subida de imagenes acepta **solo JPG/PNG/WEBP/GIF de hasta 5MB**; la
    extension del archivo guardado se genera en el servidor segun el tipo MIME
    (no se puede subir HTML/JS disfrazado de imagen).
  - No lo expongas a internet: el frontend publicado con GitHub Pages usa
    Firestore directo, este servidor es solo una ayuda para desarrollo.

## Scripts (opcionales)

- `node scripts/normalizar_datos.js` - pasa los precios a numero y agrega stock a los datos viejos.
- `node scripts/migrar_a_firestore.js` - carga `datos/productos.json` a Firestore.
- `node scripts/agregar_admin.js usuario@email.com` - da de alta a un usuario como administrador.