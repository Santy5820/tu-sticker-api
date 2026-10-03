# tu-sticker-api

API REST para la gestión de usuarios, autenticación, clientes, productos y registros de demostración de **Tu Sticker**.

Está construida con Node.js, Express 5, TypeScript y MongoDB. El código está organizado por módulos y sigue una arquitectura por capas:

```text
ruta → controlador → servicio → repositorio → MongoDB
```

## Requisitos

- Node.js 18 o superior.
- npm.
- Una instancia accesible de MongoDB.

## Instalación y configuración

```bash
npm install
cp .env.example .env
```

Configura las siguientes variables en `.env`:

| Variable | Requerida | Descripción | Valor por defecto |
| --- | --- | --- | --- |
| `PORT` | No | Puerto HTTP de la API. | `3000` |
| `NODE_ENV` | No | Entorno de ejecución. | `development` |
| `MONGO_URI` | Sí | Cadena de conexión a MongoDB. | — |
| `MONGO_DB_NAME` | No | Nombre de la base de datos. | `app` |
| `JWT_SECRET` | Sí | Secreto usado para firmar tokens JWT. | — |

No subas `.env` ni credenciales reales al repositorio.

## Ejecución

```bash
# Desarrollo, con recarga automática
npm run dev

# Compilar y ejecutar en producción
npm run build
npm start
```

Cuando el servidor inicia correctamente, se conecta a MongoDB y escucha en `http://localhost:3000` (o en el puerto definido en `PORT`).

## URL base

```text
http://localhost:3000
```

Los recursos versionados usan el prefijo `/api/v1`. La API acepta y devuelve JSON. Para las solicitudes con cuerpo se debe enviar `Content-Type: application/json`.

## Autenticación

`POST /api/v1/auth/register` y `POST /api/v1/auth/login` devuelven un token JWT con una vigencia de 7 días.

Para `GET /api/v1/auth/me`, envía el token así:

```http
Authorization: Bearer <token>
```

Actualmente solo `/api/v1/auth/me` aplica el middleware de autenticación. Los endpoints de `users`, `customers`, `products` y `demo` están registrados sin una restricción JWT en las rutas actuales.

## Endpoints

### Health check

| Método | Endpoint | Respuesta |
| --- | --- | --- |
| `GET` | `/health` | `200` con `{ "status": "ok", "uptime": number }`. |

### Autenticación — `/api/v1/auth`

#### Registrar usuario — `POST /register`

Crea un usuario, devuelve sus datos sin contraseña y un token. `role` acepta `CUSTOMER`, `ADMIN`, `SALES`, `DESIGNER` o `PRODUCTION`. Si el rol es `CUSTOMER`, se crea o reutiliza un cliente asociado por correo electrónico; también se puede enviar `customerId`.

```json
{
  "name": "Ana Pérez",
  "email": "ana@example.com",
  "password": "secreto123",
  "role": "CUSTOMER",
  "phone": "+57 300 000 0000",
  "address": {
    "street": "Calle 10 # 20-30",
    "city": "Bogotá",
    "state": "Cundinamarca",
    "postalCode": "110111",
    "country": "Colombia"
  }
}
```

Respuesta: `201` con `{ "user": {...}, "token": "..." }`.

#### Iniciar sesión — `POST /login`

```json
{
  "email": "ana@example.com",
  "password": "secreto123"
}
```

Respuesta: `200` con `{ "user": {...}, "token": "..." }`.

#### Cerrar sesión — `POST /logout`

No requiere cuerpo ni token. Responde `200` con `{ "message": "Sesión cerrada correctamente" }`. El cierre es informativo: la API no mantiene una lista de revocación de tokens.

#### Usuario autenticado — `GET /me`

Requiere `Authorization: Bearer <token>`. Responde `200` con el usuario autenticado sin el campo `password`.

### Usuarios — `/api/v1/users`

El borrado es lógico: cambia `isActive` a `false` y responde `204` sin cuerpo.

| Método | Endpoint | Descripción | Éxito |
| --- | --- | --- | --- |
| `POST` | `/` | Crea un usuario. | `201` |
| `GET` | `/` | Lista usuarios, ordenados del más reciente al más antiguo. | `200` |
| `GET` | `/:id` | Obtiene un usuario por ObjectId de MongoDB. | `200` |
| `PATCH` | `/:id` | Actualiza parcialmente un usuario. | `200` |
| `DELETE` | `/:id` | Desactiva un usuario. | `204` |

Cuerpo para `POST /`:

```json
{
  "name": "Carlos Gómez",
  "email": "carlos@example.com",
  "password": "secreto123",
  "role": "ADMIN",
  "isActive": true
}
```

Para un usuario `CUSTOMER`, `customerId` es obligatorio. En `PATCH /:id` todos los campos son opcionales: `name`, `email`, `password`, `role`, `customerId` e `isActive`. No se permite enviar un cuerpo vacío.

Nota: los endpoints CRUD de `users` devuelven actualmente el documento persistido, que puede incluir el hash del campo `password`. Los endpoints de autenticación sí omiten ese campo en sus respuestas.

### Clientes — `/api/v1/customers`

| Método | Endpoint | Descripción | Éxito |
| --- | --- | --- | --- |
| `POST` | `/` | Crea un cliente. | `201` |
| `GET` | `/` | Lista todos los clientes. | `200` |
| `GET` | `/active` | Lista clientes activos. | `200` |
| `GET` | `/inactive` | Lista clientes inactivos. | `200` |
| `GET` | `/:id` | Obtiene un cliente por ObjectId. | `200` |
| `PATCH` | `/:id` | Actualiza parcialmente un cliente. | `200` |
| `DELETE` | `/:id` | Desactiva un cliente. | `204` |

Cuerpo para `POST /`:

```json
{
  "firstName": "Ana",
  "lastName": "Pérez",
  "email": "ana@example.com",
  "phone": "+57 300 000 0000",
  "userId": "665f1a2b3c4d5e6f78901234",
  "addresses": [
    {
      "alias": "Principal",
      "street": "Calle 10 # 20-30",
      "city": "Bogotá",
      "state": "Cundinamarca",
      "postalCode": "110111",
      "country": "Colombia",
      "isDefault": true
    }
  ],
  "isActive": true
}
```

`firstName`, `lastName`, `email` y `addresses` (arreglo) son obligatorios. Cada dirección debe incluir `street`, `city`, `state` y `country`; `alias`, `postalCode` e `isDefault` son opcionales. En `PATCH /:id` se aceptan parcialmente `userId`, `firstName`, `lastName`, `email`, `phone`, `addresses` e `isActive`.

### Productos — `/api/v1/products`

| Método | Endpoint | Descripción | Éxito |
| --- | --- | --- | --- |
| `POST` | `/` | Crea un producto. | `201` |
| `GET` | `/` | Lista productos, ordenados por fecha de creación descendente. | `200` |
| `GET` | `/category/:category` | Filtra productos por categoría. | `200` |
| `GET` | `/:id` | Obtiene un producto por ObjectId. | `200` |
| `PATCH` | `/:id` | Actualiza parcialmente un producto. | `200` |
| `DELETE` | `/:id` | Desactiva un producto. | `204` |

Cuerpo para `POST /`:

```json
{
  "name": "Sticker personalizado",
  "description": "Sticker resistente al agua",
  "price": 15000,
  "category": "Decoración",
  "images": ["https://example.com/sticker.png"],
  "isActive": true,
  "isCustomizable": true,
  "inventoryManaged": true,
  "stock": 100,
  "stockAlertThreshold": 10,
  "requiresSupplierFallback": false
}
```

`name`, `description`, `price` (mayor que cero) y `category` son obligatorios. `images` debe ser un arreglo. Los valores por defecto son `images: []`, `isActive: true`, `isCustomizable: false`, `inventoryManaged: false` y `requiresSupplierFallback: false`. `stock` y `stockAlertThreshold`, si se envían, deben ser números mayores o iguales a cero. La API genera `slug` a partir de `name` y normaliza `category` a minúsculas.

En `PATCH /:id` se aceptan parcialmente todos los campos anteriores salvo `slug`, `createdAt` y `updatedAt`.

### Demo — `/api/v1/demo`

Este módulo sirve como recurso CRUD de ejemplo. A diferencia de productos, clientes y usuarios, `DELETE` elimina físicamente el documento.

| Método | Endpoint | Descripción | Éxito |
| --- | --- | --- | --- |
| `POST` | `/` | Crea un registro demo. | `201` |
| `GET` | `/` | Lista registros demo. | `200` |
| `GET` | `/:id` | Obtiene un registro por ObjectId. | `200` |
| `PUT` | `/:id` | Actualiza un registro. | `200` |
| `DELETE` | `/:id` | Elimina un registro. | `204` |

Cuerpo para `POST /`:

```json
{
  "name": "Registro de prueba",
  "description": "Datos para validar la API",
  "active": true
}
```

`name` y `description` son obligatorios. `active` es opcional y por defecto vale `true`. Aunque el endpoint usa `PUT`, la implementación acepta campos parciales (`name`, `description` y `active`) y rechaza el cuerpo vacío.

## Formato de errores

Los errores de aplicación se devuelven como JSON:

```json
{
  "status": "error",
  "message": "El campo 'email' es obligatorio y debe ser texto no vacío"
}
```

| Código | Cuándo ocurre |
| --- | --- |
| `400` | Datos inválidos, ObjectId inválido, credenciales inválidas o token ausente/inválido. |
| `404` | Recurso o ruta no encontrada. |
| `204` | Operación de desactivación/eliminación completada sin cuerpo. |
| `500` | Error interno. En `development` puede incluir `stack`. |

Las rutas inexistentes responden `404` con un mensaje que incluye método y URL solicitada.

## Ejemplo rápido con cURL

```bash
# Health check
curl http://localhost:3000/health

# Crear un producto
curl -X POST http://localhost:3000/api/v1/products \\
  -H 'Content-Type: application/json' \\
  -d '{
    "name": "Sticker personalizado",
    "description": "Sticker resistente al agua",
    "price": 15000,
    "category": "decoracion"
  }'

# Consultar productos por categoría
curl http://localhost:3000/api/v1/products/category/decoracion
```

## Estructura del proyecto

```text
src/
├── app.ts                         # Configuración de Express y middlewares
├── server.ts                      # Arranque, conexión a MongoDB y listener HTTP
├── api/v1/index.ts                # Registro de rutas versionadas
├── config/                        # Variables de entorno y conexión a MongoDB
├── modules/
│   ├── auth/                      # Registro, login, logout y usuario actual
│   ├── users/                     # CRUD de usuarios
│   ├── customers/                 # CRUD y filtros de clientes
│   ├── products/                  # CRUD y filtro por categoría
│   └── demo/                      # CRUD de ejemplo
└── shared/
    ├── errors/                    # Errores HTTP de aplicación
    └── middlewares/               # Auth, errores y async handlers
```

## Licencia

El proyecto declara licencia `ISC` en `package.json`.
