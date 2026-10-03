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
| `ADMIN_BOOTSTRAP_ENABLED` | No | Activa el provisioning automático durante el arranque. | `true` |
| `ADMIN_BOOTSTRAP_NAME` | Condicional | Nombre del primer administrador. | — |
| `ADMIN_BOOTSTRAP_EMAIL` | Condicional | Correo del primer administrador. | — |
| `ADMIN_BOOTSTRAP_PASSWORD` | Condicional | Contraseña inicial, mínimo 12 caracteres. | — |
| `WOMPI_ENABLED` | No | Activa la integración de pagos. | `false` en `.env.example` |
| `WOMPI_ENVIRONMENT` | Condicional | Entorno de Wompi: `sandbox` o `production`. | `sandbox` |
| `WOMPI_PUBLIC_KEY` | Condicional | Llave pública usada por Web Checkout. | — |
| `WOMPI_INTEGRITY_SECRET` | Condicional | Secreto para firmar el monto y la referencia. | — |
| `WOMPI_EVENTS_SECRET` | Condicional | Secreto para validar webhooks de Wompi. | — |
| `WOMPI_REDIRECT_URL` | No | URL opcional de retorno después del checkout. | — |

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

Las operaciones administrativas requieren un JWT válido y un rol autorizado. El catálogo de productos mantiene sus operaciones de lectura públicas.

| Área | Roles autorizados |
| --- | --- |
| Gestión de usuarios | `ADMIN` |
| Gestión de clientes | `ADMIN`, `SALES` |
| Crear, actualizar o desactivar productos | `ADMIN`, `DESIGNER`, `PRODUCTION` |
| Consultar productos | Público |
| Módulo demo | `ADMIN` |

El registro público solo permite crear usuarios `CUSTOMER`; esto evita que cualquier persona se asigne privilegios administrativos.

### Provisionar el primer administrador

Durante el arranque (`npm run dev` o `npm start`), el backend verifica si existe un `ADMIN` activo. Si no existe, crea uno usando `ADMIN_BOOTSTRAP_NAME`, `ADMIN_BOOTSTRAP_EMAIL` y `ADMIN_BOOTSTRAP_PASSWORD`. En el primer despliegue, estas variables deben configurarse como secretos del proveedor de hosting. No se utilizan valores por defecto.

Si ya existe un `ADMIN` activo, el arranque no lo modifica y no vuelve a crear otro. Si `ADMIN_BOOTSTRAP_ENABLED=false`, el provisioning automático queda deshabilitado.

También existe un seed local que no está expuesto como endpoint HTTP. Es útil para crear el administrador antes de iniciar el servidor o en entornos donde el provisioning de arranque está deshabilitado:

```bash
SEED_ADMIN_NAME="Administrador Tu Sticker" \\
SEED_ADMIN_EMAIL="admin@tu-sticker.com" \\
SEED_ADMIN_PASSWORD="cambia-esta-clave-por-una-segura" \\
npm run seed:admin
```

El seed:

- exige nombre, correo válido y una contraseña de mínimo 12 caracteres;
- almacena la contraseña con `bcrypt` y nunca la imprime;
- crea únicamente un `ADMIN` activo si no existe otro;
- no eleva automáticamente un usuario existente ni reactiva administradores inactivos;
- es idempotente si el administrador indicado ya existe activo.

Para no dejar secretos persistentes, utiliza las variables solo durante el comando o elimínalas del entorno después de la ejecución. El seed no reemplaza un proceso de recuperación o rotación de credenciales.

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

Requiere `Authorization: Bearer <token>` y no requiere cuerpo. Responde `200` con `{ "message": "Sesión cerrada correctamente" }`. El cierre es informativo: la API no mantiene una lista de revocación de tokens.

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
| `GET` | `/me` | Obtiene el cliente y direcciones del usuario autenticado. | `200` |
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

### Categorías — `/api/v1/categories`

Las consultas de categorías activas son públicas. La creación, actualización, consulta completa y desactivación requieren un token con rol `ADMIN`.

| Método | Endpoint | Descripción | Acceso |
| --- | --- | --- | --- |
| `POST` | `/` | Crea una categoría y genera su `slug`. | `ADMIN` |
| `GET` | `/` | Lista categorías activas. | Público |
| `GET` | `/slug/:slug` | Obtiene una categoría activa por slug. | Público |
| `GET` | `/all` | Lista categorías activas e inactivas. | `ADMIN` |
| `GET` | `/:id` | Obtiene una categoría activa por ObjectId. | Público |
| `PATCH` | `/:id` | Actualiza nombre, descripción o estado. | `ADMIN` |
| `DELETE` | `/:id` | Desactiva una categoría. | `ADMIN` |

Cuerpo para `POST /`:

```json
{
  "name": "Decoración",
  "description": "Stickers para decoración y espacios personales",
  "isActive": true
}
```

`name` es obligatorio. `description` e `isActive` son opcionales; `isActive` vale `true` por defecto. El slug generado para el ejemplo será `decoracion`. El borrado es lógico y puede revertirse mediante `PATCH /:id` enviando `{"isActive": true}`.

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
  "stockAlertThreshold": 10,
  "requiresSupplierFallback": false
}
```

`name`, `description`, `price` (mayor que cero) y `category` son obligatorios. `category` debe corresponder al nombre o `slug` de una categoría activa; internamente se almacena el slug normalizado. `images` debe ser un arreglo de textos. Los valores por defecto son `images: []`, `isActive: true`, `isCustomizable: false`, `inventoryManaged: false` y `requiresSupplierFallback: false`. `stock` no se modifica desde productos: se registra mediante el módulo de inventario. `stockAlertThreshold`, si se envía, debe ser un número mayor o igual a cero. La API genera `slug` a partir de `name`.

En `PATCH /:id` se aceptan parcialmente todos los campos anteriores salvo `slug`, `createdAt` y `updatedAt`.

### Inventario — `/api/v1/inventory`

La consulta y modificación de inventario requiere un JWT con rol `ADMIN` o `PRODUCTION`. El stock se administra mediante movimientos para conservar trazabilidad.

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/` | Lista el estado de inventario de todos los productos. |
| `GET` | `/:productId` | Consulta el estado de un producto. |
| `GET` | `/:productId/movements` | Consulta el historial de movimientos. |
| `POST` | `/:productId/adjust` | Registra una entrada, salida o ajuste. |

Antes de registrar movimientos, el producto debe tener `inventoryManaged: true`. Cuerpo para una entrada:

```json
{
  "type": "IN",
  "quantity": 50,
  "reason": "Compra de materia prima",
  "reference": "OC-0001"
}
```

Tipos disponibles:

- `IN`: suma la cantidad al stock.
- `OUT`: resta la cantidad y nunca permite stock negativo.
- `ADJUSTMENT`: establece `quantity` como el stock final.

Cada movimiento guarda producto, tipo, cantidad, stock anterior, stock nuevo, motivo, referencia opcional, usuario y fecha. El stock aún no se descuenta al agregar productos al carrito; esa reserva o salida se implementará al crear pedidos.

### Carrito — `/api/v1/cart`

El carrito puede utilizarse como visitante o como usuario autenticado. El total representa el subtotal de productos; impuestos, envío, descuentos, dirección y checkout se incorporarán en el módulo de pedidos.

| Método | Endpoint | Descripción | Éxito |
| --- | --- | --- | --- |
| `GET` | `/` | Obtiene el carrito del usuario. Si no existe, devuelve uno vacío. | `200` |
| `POST` | `/items` | Agrega un producto o incrementa su cantidad. | `200` |
| `PATCH` | `/items/:productId` | Define la cantidad de un producto existente. | `200` |
| `DELETE` | `/items/:productId` | Quita un producto del carrito. | `200` |
| `DELETE` | `/` | Vacía el carrito. | `200` |
| `POST` | `/claim` | Asocia un carrito de visitante a un usuario autenticado. | `200` |

Para un visitante, la primera operación de carrito genera el encabezado `X-Cart-Id`. El cliente debe conservarlo y enviarlo en las siguientes solicitudes:

```http
X-Cart-Id: <uuid-del-carrito>
```

Las operaciones de carrito no requieren autenticación. `POST /claim` sí requiere `Authorization: Bearer <token-de-un-CUSTOMER>` y el mismo `X-Cart-Id`; se utiliza después de que el visitante se registra o inicia sesión para transferir sus productos a su cuenta.

Para agregar un producto:

```json
{
  "productId": "665f1a2b3c4d5e6f78901234",
  "quantity": 2
}
```

La cantidad debe ser un entero mayor que cero. El producto debe existir y estar activo. Si tiene `inventoryManaged: true` y stock definido, la cantidad acumulada no puede superar el stock disponible. El precio vigente se guarda en el item del carrito al agregarlo o actualizarlo.

### Pedidos — `/api/v1/orders`

Crear un pedido requiere un usuario autenticado con rol `CUSTOMER`. Si el carrito pertenece a un visitante, primero se debe registrar/iniciar sesión y llamar a `POST /api/v1/cart/claim` para asociarlo a la cuenta.

| Método | Endpoint | Descripción | Acceso |
| --- | --- | --- | --- |
| `POST` | `/` | Crea un pedido desde el carrito y lo vacía. | `CUSTOMER` |
| `GET` | `/` | Lista los pedidos propios. | `CUSTOMER` |
| `GET` | `/admin` | Lista todos los pedidos; acepta `?status=...`. | `ADMIN`, `SALES`, `PRODUCTION` |
| `GET` | `/:id` | Consulta un pedido propio o administrativo. | Usuario autenticado |
| `PATCH` | `/:id/status` | Cambia el estado del pedido. | `ADMIN`, `SALES`, `PRODUCTION` |
| `POST` | `/:id/cancel` | Cancela un pedido permitido y reintegra stock administrado. | Cliente o personal autorizado |

Para usar una dirección guardada, envía su posición (comenzando en `0`):

```json
{
  "addressIndex": 0
}
```

Para enviar una dirección nueva y decidir si se conserva para futuros pedidos:

```json
{
  "address": {
    "alias": "Oficina",
    "street": "Calle 10 # 20-30",
    "city": "Bogotá",
    "state": "Cundinamarca",
    "postalCode": "110111",
    "country": "Colombia"
  },
  "saveAddress": true
}
```

El pedido guarda una copia de la dirección seleccionada, de modo que cambios posteriores en el perfil del cliente no alteren pedidos históricos. Los estados disponibles son `PENDING_PAYMENT`, `CONFIRMED`, `IN_PRODUCTION`, `READY`, `DELIVERED` y `CANCELLED`. Todo pedido inicia con `paymentStatus: PENDING` y queda listo para iniciar el checkout de Wompi.

### Pagos con Wompi — `/api/v1/payments`

La integración usa **Wompi Web Checkout**: la API genera una referencia única, firma de integridad y los campos que el frontend debe enviar al checkout. La API nunca recibe ni almacena datos de tarjetas.

| Método | Endpoint | Descripción | Acceso |
| --- | --- | --- | --- |
| `POST` | `/orders/:orderId/checkout` | Genera una sesión de pago Wompi para un pedido pendiente. | `CUSTOMER` |
| `GET` | `/orders/:orderId` | Consulta los intentos de pago del pedido. | `CUSTOMER`, `ADMIN`, `SALES` |
| `POST` | `/webhooks/wompi` | Recibe y valida actualizaciones de transacciones de Wompi. | Wompi |

#### Configuración

Activa el módulo y configura las credenciales en `.env`. Las llaves de Sandbox y Producción son diferentes:

```env
WOMPI_ENABLED=true
WOMPI_ENVIRONMENT=sandbox
WOMPI_PUBLIC_KEY=pub_test_xxx
WOMPI_INTEGRITY_SECRET=integrity_test_xxx
WOMPI_EVENTS_SECRET=events_test_xxx
WOMPI_REDIRECT_URL=https://tu-frontend.com/pagos/resultado
```

En el panel de Wompi configura el webhook apuntando a:

```text
https://tu-dominio.com/api/v1/payments/webhooks/wompi
```

El webhook es la fuente de verdad para marcar el pedido como pagado. La URL de redirección solo sirve para devolver al comprador a la interfaz; el frontend debe consultar el pedido o sus pagos para mostrar el resultado definitivo.

#### Flujo desde el frontend

1. Crear el pedido con `POST /api/v1/orders`.
2. Solicitar el checkout con `POST /api/v1/payments/orders/:orderId/checkout` usando el JWT del cliente.
3. Construir un formulario `GET` hacia `checkout.url` con cada par clave/valor recibido en `checkout.fields`.
4. Esperar el webhook de Wompi y consultar `GET /api/v1/payments/orders/:orderId` o el pedido para mostrar el estado actualizado.

Ejemplo de respuesta resumida de `POST /api/v1/payments/orders/:orderId/checkout`:

```json
{
  "payment": {
    "reference": "TS-20261003-AB12CD34EF56",
    "amountInCents": 59000,
    "currency": "COP",
    "status": "PENDING"
  },
  "checkout": {
    "url": "https://checkout.wompi.co/p/",
    "method": "GET",
    "fields": {
      "public-key": "pub_test_xxx",
      "currency": "COP",
      "amount-in-cents": "59000",
      "reference": "TS-20261003-AB12CD34EF56",
      "signature:integrity": "..."
    }
  }
}
```

La firma de integridad y la firma de eventos se calculan únicamente en el backend. Consulta la [documentación oficial de transacciones de Wompi](https://docs.wompi.co/docs/colombia/transacciones/), el [Web Checkout](https://docs.wompi.co/docs/colombia/widget-checkout-web/) y los [eventos/webhooks](https://docs.wompi.co/docs/colombia/eventos/) para obtener las credenciales y configurar el comercio.

### Producción — `/api/v1/production`

El módulo convierte cada línea de un pedido en un trabajo de producción. La creación de trabajos requiere `ADMIN` o `PRODUCTION`; la operación de la cola permite `ADMIN`, `PRODUCTION` y `DESIGNER`.

| Método | Endpoint | Descripción | Acceso |
| --- | --- | --- | --- |
| `POST` | `/orders/:orderId/jobs` | Genera trabajos para las líneas del pedido. Es idempotente. | `ADMIN`, `PRODUCTION` |
| `GET` | `/orders/:orderId` | Lista los trabajos de un pedido. | `ADMIN`, `PRODUCTION`, `DESIGNER` |
| `GET` | `/queue` | Consulta la cola; acepta `?status` y `?priority`. | `ADMIN`, `PRODUCTION`, `DESIGNER` |
| `GET` | `/jobs/:jobId` | Consulta un trabajo. | `ADMIN`, `PRODUCTION`, `DESIGNER` |
| `PATCH` | `/jobs/:jobId/status` | Cambia el estado del trabajo. | `ADMIN`, `PRODUCTION`, `DESIGNER` |
| `PATCH` | `/jobs/:jobId/assign` | Asigna o desasigna un responsable. | `ADMIN`, `PRODUCTION` |
| `PATCH` | `/jobs/:jobId/notes` | Actualiza las notas de producción. | `ADMIN`, `PRODUCTION`, `DESIGNER` |

Estados de producción:

```text
PENDING → DESIGN → READY_FOR_PRODUCTION → IN_PRODUCTION
                                      ↓               ↓
                                  CANCELLED      QUALITY_CHECK → COMPLETED
                                                       ↓
                                                  IN_PRODUCTION
```

Prioridades disponibles: `LOW`, `NORMAL`, `HIGH` y `URGENT`. Cuando un trabajo pasa a producción, el pedido puede avanzar a `IN_PRODUCTION`; cuando todos los trabajos están `COMPLETED`, el pedido avanza a `READY`.

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
| `400` | Datos inválidos, ObjectId inválido o claves JSON no permitidas. |
| `401` | Token ausente, inválido o expirado. |
| `403` | Token válido, pero rol insuficiente; también se usa si el registro público intenta crear un rol privilegiado. |
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
│   ├── categories/                # Categorías activas y administración
│   ├── cart/                      # Carrito de usuarios y visitantes
│   ├── inventory/                  # Movimientos y stock trazable
│   ├── products/                  # CRUD y filtro por categoría
│   ├── orders/                    # Pedidos, direcciones y stock reservado
│   ├── payments/                  # Integración con Wompi y webhooks
│   ├── production/                # Cola y trabajos de producción
│   └── demo/                      # CRUD de ejemplo
└── shared/
    ├── errors/                    # Errores HTTP de aplicación
    └── middlewares/               # Auth, errores y async handlers
```

## Licencia

El proyecto declara licencia `ISC` en `package.json`.
