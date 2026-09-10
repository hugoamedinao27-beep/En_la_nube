# Carton Pintado - En la nube

Sistema web en la nube para registrar y visualizar un catalogo de cartas de
Magic: The Gathering (y otros TCG). Es el proyecto "En la nube": la interfaz se
publica con **GitHub Pages** y los datos viven en **Cloud Firestore (Firebase)**.

## Caracteristicas

- **CRUD completo**: crear, leer, actualizar y eliminar productos (cartas).
- **Filtros y orden**: busqueda por nombre/descripcion, orden por nombre o
  precio, y filtro "solo en stock".
- **Control de stock**: cada carta tiene una cantidad disponible que se muestra
  en las tarjetas y en la ficha de detalle.
- **Imagenes**: se comprimen en el navegador (canvas, max 800px, JPEG) y se
  guardan en Firestore como base64, por lo que no hacen falta archivos estaticos.
- **Publico y persistente**: los datos se comparten entre cualquier dispositivo
  porque estan en la nube (Firestore), no en el navegador.

## Arquitectura y flujo de datos

```
[ Navegador (GitHub Pages) ]
   firebaseConfig.js (Web SDK)
        |  lectura: getDocs / getDoc         (reglas: lectura publica)
        v
   [ Cloud Firestore ]  <-- base de datos en la nube de Google Firebase
        ^
        |  escritura: addDoc / updateDoc / deleteDoc  (reglas: requiere sesion
        |                                             anonima de Firebase Auth)
[ Navegador usuarios ]

[ Servidor Express (Opcional / para defensa) ]
   server.js + firebase-admin (Node.js, requiere serviceAccountKey.json)
   API REST: GET/POST/PUT/DELETE en /api/productos
```

### Datos en la nube vs localStorage

| | localStorage | Cloud Firestore |
|---|---|---|
| Donde viven los datos | Solo en un navegador/dispositivo | En servidores de Google (multi dispositivo) |
| Compartir entre equipos | No | Si, cualquier usuario ve lo mismo |
| Duracion | Se borra al limpiar el navegador | Persiste mientras exista el proyecto |
| Acceso desde la web | Solo ese navegador | Desde cualquier navegador con reglas |

El guardado local (`datos/productos.json`) fue solo una etapa previa con datos
de prueba; el sistema productivo ya usa Firestore (`scripts/migrar_a_firestore.js`).

## Modelo de datos

Coleccion `productos` en Firestore (una carta = un documento):

| Campo | Tipo | Ejemplo | Notas |
|---|---|---|---|
| `nombre` | string | "Black Lotus" | Obligatorio |
| `descripcion` | string | "Artefacto legendary..." | Obligatorio |
| `precio` | number | 15000 | >= 0, se valida como numero |
| `stock` | number (entero) | 10 | >= 0, se valida como entero |
| `imagen` | string (base64) | "data:image/jpeg;base64,..." | Vacio si no hay imagen |
| `createdAt` | timestamp (servidor) | 2026-09-09T... | Firmado por Firestore |

El identificador es el `docId` auto-generado de Firestore (estable y unico).

## Requisitos

- [Node.js](https://nodejs.org) 18 o superior (para el servidor Express y scripts).
- Clave de cuenta de servicio de Firebase (`serviceAccountKey.json`) — **solo
  para el servidor Express y los scripts**, nunca debe subirse al repositorio.
- Cuenta en [Firebase Console](https://console.firebase.google.com) con el
  proyecto **enlanube-7df60**.

## Como correr en local

### Opcion A: solo frontend (suficiente para ver la interfaz)

Publicar/abrir con cualquier servidor estatico. Por ejemplo:

```bash
npx http-server .
# abrir http://localhost:8080
```

### Opcion B: con el servidor Express (API REST + admin SDK)

1. Instala dependencias:

```bash
npm install
```

2. Coloca tu `serviceAccountKey.json` en la raiz (NO lo subas a git, esta en
   `.gitignore`).

3. Corre el servidor:

```bash
npm start
# Servidor corriendo en http://localhost:3000
```

4. Abre http://localhost:3000

## Como publicar en GitHub Pages

1. Sube este repo a GitHub (rama `main`).
2. En el repo: *Settings → Pages → Source*: `Deploy from a branch`, rama
   `main`, carpeta `/ (root)`. Guardar.
3. La web queda publica en:
   `https://<usuario>.github.io/En_la_nube/`
   (este proyecto: https://hugoamedinao27-beep.github.io/En_la_nube/)
4. El frontend usa Firestore directo, asi que la URL publica ya funciona sin
   servidor.

## Reglas de seguridad de Firestore

Archivo: `firestore.rules`

- `allow read`: publico — el catalogo es abierto (vitrina de la tienda).
- `allow create, update, delete: if request.auth != null` — escribir requiere
  sesion. El frontend obtiene una sesion **anonima** de Firebase Auth al cargar
  (`firebaseConfig.js`), asi el sitio funciona igual pero las escrituras ya no
  son abiertas a cualquiera sin credencial.

Para aplicar las reglas (solo una vez, con Firebase CLI):

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules -P enlanube-7df60
```

> Nota: si se despliegan estas reglas, el proyecto debe haber activado el
> **login anonimo** en *Firebase Console → Authentication → Sign-in method →
> Anonymous*.

### Como rotar la clave de servicio (paso obligatorio de seguridad)

La clave vieja se filtro en un commit publico del repo (ahora esta en
`.gitignore`, pero queda en el historial). Como cualquier clave expuesta, debe
inhabilitarse:

1. *Firebase Console → Ajustes del proyecto → Cuentas de servicio*.
2. En "cuentas de servicio Firebase Admin SDK", click en el menu (⋮) de
   `firebase-adminsdk-fbsvc@enlanube-7df60.iam.gserviceaccount.com` →
   **Administrar cuenta de servicio** (abre IAM de Google Cloud).
3. *Claves →* en la clave vieja: **Desactivar/Eliminar** (anula la clave
   filtrada).
4. En Firebase: **Generar nueva clave privada**, guardarla como
   `serviceAccountKey.json` en la raiz (no se sube a git).
5. Con la clave nueva activa, el servidor Express y los scripts vuelven a
   funcionar (hoy fallan con "invalid authentication credentials" porque la
   clave publica fue revocada).

## API REST (servidor Express)

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/productos` | Lista todos los productos (orden createdAt desc) |
| GET | `/api/productos/:id` | Detalle de un producto |
| POST | `/api/productos` | Crea producto. Body multipart: nombre, descripcion, precio, stock, imagen? |
| PUT | `/api/productos/:id` | Actualiza producto (mismos campos, imagen opcional) |
| DELETE | `/api/productos/:id` | Elimina producto |

Validaciones: `precio` numero >= 0, `stock` entero >= 0, `nombre` y
`descripcion` no vacios (400 con mensaje claro si fallan).

## Scripts

| Script | Que hace | Uso |
|---|---|---|
| `scripts/migrar_a_firestore.js` | Carga `datos/productos.json` a Firestore | `node scripts/migrar_a_firestore.js` |
| `scripts/normalizar_datos.js` | Convierte precios string a numero y agrega `stock` a docs existentes | `node scripts/normalizar_datos.js` |
| `scripts/convertir_imagenes.js` | Convierte rutas `/Imagenes/...` a base64 en Firestore | `node scripts/convertir_imagenes.js` |

## Estructura del repo

```
En_la_nube/
  index.html              landing
  ver_productos.html      lista + buscador + orden + stock + modal (editar/eliminar)
  registrar_producto.html formulario de alta
  editar_producto.html    formulario de edicion
  detalle_producto.html   ficha de detalle
  firebaseConfig.js       config Web SDK (Firestore + Auth anonimo)
  styles.css              estilos
  server.js               servidor Express (API REST, opcional)
  firestore.rules         reglas de seguridad de la base de datos
  .gitignore              excluye node_modules y serviceAccountKey.json
  scripts/                utilidades de migracion y normalizacion