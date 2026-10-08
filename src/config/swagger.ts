import { Express, Request, Response } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { env } from "./env";

const serverUrl = process.env.API_BASE_URL || process.env.APP_URL || `http://localhost:${env.port}`;

const userRoles = ["CUSTOMER", "ADMIN", "SALES", "DESIGNER", "PRODUCTION"] as const;
const orderStatuses = ["PENDING_PAYMENT", "CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED", "CANCELLED"] as const;
const paymentStatuses = ["PENDING", "APPROVED", "DECLINED", "VOIDED", "ERROR"] as const;
const inventoryMovementTypes = ["IN", "OUT", "ADJUSTMENT"] as const;
const productionStatuses = [
    "PENDING",
    "DESIGN",
    "READY_FOR_PRODUCTION",
    "IN_PRODUCTION",
    "QUALITY_CHECK",
    "COMPLETED",
    "CANCELLED",
] as const;

const errorResponse = {
    description: "Error de validación, autorización o recurso no encontrado",
    content: {
        "application/json": {
            schema: {
                $ref: "#/components/schemas/Error",
            },
        },
    },
};

const userPublicSchema = {
    type: "object",
    required: ["_id", "name", "email", "role", "isActive", "createdAt", "updatedAt"],
    properties: {
        _id: { type: "string", description: "ObjectId de MongoDB" },
        name: { type: "string" },
        email: { type: "string", format: "email" },
        role: { type: "string", enum: userRoles },
        customerId: { type: "string", description: "ObjectId del cliente asociado cuando el rol es CUSTOMER" },
        isActive: { type: "boolean" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
    },
    example: {
        _id: "66d7b31c5f4d0d8d9773f0bd",
        name: "Ana Pérez",
        email: "ana@example.com",
        role: "CUSTOMER",
        customerId: "66d7b3b25f4d0d8d9773f0c1",
        isActive: true,
        createdAt: "2026-10-07T10:30:00.000Z",
        updatedAt: "2026-10-07T10:30:00.000Z",
    },
};

const authTokenResponse = {
    type: "object",
    required: ["user", "token"],
    properties: {
        user: { $ref: "#/components/schemas/UserPublic" },
        token: { type: "string", description: "JWT firmado con la sesión del usuario" },
    },
};

export const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: "3.0.3",
        info: {
            title: "Tu Sticker API",
            version: "1.0.0",
            description:
                "API REST para gestión de usuarios, clientes, productos, pedidos, pagos, inventario y producción de Tu Sticker.",
        },
        servers: [{ url: serverUrl, description: "Servidor actual de la API" }],
        tags: [
            { name: "Authentication", description: "Registro, login, perfil y cierre de sesión" },
            { name: "Users", description: "Administración de usuarios" },
            { name: "Customers", description: "Administración de clientes" },
            { name: "Categories", description: "Catálogo de categorías" },
            { name: "Products", description: "Catálogo de productos" },
            { name: "Inventory", description: "Control de stock y movimientos" },
            { name: "Cart", description: "Carrito de compra" },
            { name: "Orders", description: "Pedidos y flujo de compra" },
            { name: "Payments", description: "Checkout y webhooks de Wompi" },
            { name: "Production", description: "Trabajos y cola de producción" },
            { name: "Demo", description: "Módulo demo CRUD" },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "JWT del usuario autenticado. Ejemplo: Bearer <token>",
                },
            },
            schemas: {
                Error: {
                    type: "object",
                    required: ["status", "message"],
                    properties: {
                        status: { type: "string", example: "error" },
                        message: { type: "string", example: "Solicitud inválida" },
                        stack: { type: "string", description: "Solo disponible en entorno no productivo para errores del servidor" },
                    },
                },
                UserPublic: userPublicSchema,
                RegisterRequest: {
                    type: "object",
                    required: ["name", "email", "password"],
                    properties: {
                        name: { type: "string" },
                        email: { type: "string", format: "email" },
                        password: { type: "string", format: "password", description: "Se envía en texto plano en la solicitud y se almacena como hash en el backend" },
                        role: { type: "string", enum: userRoles, default: "CUSTOMER" },
                        customerId: { type: "string", description: "ObjectId del cliente asociado; obligatorio para CUSTOMER" },
                        phone: { type: "string" },
                        address: {
                            type: "object",
                            additionalProperties: true,
                            description: "Dirección opcional para crear el cliente asociado",
                        },
                    },
                    example: {
                        name: "Ana Pérez",
                        email: "ana@example.com",
                        password: "Secreto123!",
                        role: "CUSTOMER",
                        phone: "+57 300 000 0000",
                        address: {
                            street: "Calle 10 # 20-30",
                            city: "Bogotá",
                            state: "Cundinamarca",
                            postalCode: "110111",
                            country: "Colombia"
                        }
                    },
                },
                LoginRequest: {
                    type: "object",
                    required: ["email", "password"],
                    properties: {
                        email: { type: "string", format: "email" },
                        password: { type: "string", format: "password" },
                    },
                    example: {
                        email: "ana@example.com",
                        password: "Secreto123!"
                    },
                },
                AuthResponse: {
                    ...authTokenResponse,
                    example: {
                        user: {
                            _id: "66d7b31c5f4d0d8d9773f0bd",
                            name: "Ana Pérez",
                            email: "ana@example.com",
                            role: "CUSTOMER",
                            customerId: "66d7b3b25f4d0d8d9773f0c1",
                            isActive: true,
                            createdAt: "2026-10-07T10:30:00.000Z",
                            updatedAt: "2026-10-07T10:30:00.000Z"
                        },
                        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6IkNDTU9NVEVSIiwiaWF0IjoxNzYwMDAwMDAwLCJleHAiOjE3NjAwMDAwMDAwfQ.sampleToken"
                    },
                },
                UserCreateRequest: {
                    type: "object",
                    required: ["name", "email", "password", "role"],
                    properties: {
                        name: { type: "string" },
                        email: { type: "string", format: "email" },
                        password: { type: "string", format: "password" },
                        role: { type: "string", enum: userRoles },
                        customerId: { type: "string", description: "Obligatorio cuando role = CUSTOMER" },
                        isActive: { type: "boolean", default: true },
                    },
                },
                UserUpdateRequest: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        email: { type: "string", format: "email" },
                        password: { type: "string", format: "password" },
                        role: { type: "string", enum: userRoles },
                        customerId: { type: "string" },
                        isActive: { type: "boolean" },
                    },
                },
                CustomerAddress: {
                    type: "object",
                    required: ["street", "city", "state", "country"],
                    properties: {
                        alias: { type: "string" },
                        street: { type: "string" },
                        city: { type: "string" },
                        state: { type: "string" },
                        postalCode: { type: "string" },
                        country: { type: "string" },
                        isDefault: { type: "boolean" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                Customer: {
                    type: "object",
                    required: ["_id", "firstName", "lastName", "email", "addresses", "isActive", "createdAt", "updatedAt"],
                    properties: {
                        _id: { type: "string", description: "ObjectId de MongoDB" },
                        userId: { type: "string", description: "ObjectId del usuario asociado" },
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                        fullName: { type: "string" },
                        email: { type: "string", format: "email" },
                        phone: { type: "string" },
                        addresses: {
                            type: "array",
                            items: { $ref: "#/components/schemas/CustomerAddress" },
                        },
                        isActive: { type: "boolean" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                CustomerCreateRequest: {
                    type: "object",
                    required: ["firstName", "lastName", "email", "addresses"],
                    properties: {
                        userId: { type: "string" },
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                        email: { type: "string", format: "email" },
                        phone: { type: "string" },
                        addresses: {
                            type: "array",
                            items: { $ref: "#/components/schemas/CustomerAddress" },
                        },
                        isActive: { type: "boolean", default: true },
                    },
                    example: {
                        userId: "66d7b31c5f4d0d8d9773f0bd",
                        firstName: "Ana",
                        lastName: "Pérez",
                        email: "ana@example.com",
                        phone: "+57 300 000 0000",
                        addresses: [
                            {
                                alias: "Casa",
                                street: "Calle 10 # 20-30",
                                city: "Bogotá",
                                state: "Cundinamarca",
                                postalCode: "110111",
                                country: "Colombia",
                                isDefault: true
                            }
                        ],
                        isActive: true
                    },
                },
                CustomerUpdateRequest: {
                    type: "object",
                    properties: {
                        userId: { type: "string" },
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                        email: { type: "string", format: "email" },
                        phone: { type: "string" },
                        addresses: {
                            type: "array",
                            items: { $ref: "#/components/schemas/CustomerAddress" },
                        },
                        isActive: { type: "boolean" },
                    },
                },
                Category: {
                    type: "object",
                    required: ["_id", "name", "slug", "isActive", "createdAt", "updatedAt"],
                    properties: {
                        _id: { type: "string" },
                        name: { type: "string" },
                        slug: { type: "string" },
                        description: { type: "string" },
                        isActive: { type: "boolean" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                CategoryCreateRequest: {
                    type: "object",
                    required: ["name"],
                    properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        isActive: { type: "boolean", default: true },
                    },
                },
                CategoryUpdateRequest: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        isActive: { type: "boolean" },
                    },
                },
                Product: {
                    type: "object",
                    required: ["_id", "name", "slug", "description", "price", "category", "images", "isActive", "isCustomizable", "createdAt", "updatedAt"],
                    properties: {
                        _id: { type: "string" },
                        name: { type: "string" },
                        slug: { type: "string" },
                        description: { type: "string" },
                        price: { type: "number", format: "double" },
                        category: { type: "string" },
                        images: { type: "array", items: { type: "string" } },
                        isActive: { type: "boolean" },
                        isCustomizable: { type: "boolean" },
                        inventoryManaged: { type: "boolean" },
                        stock: { type: "number", nullable: true },
                        stockAlertThreshold: { type: "number" },
                        requiresSupplierFallback: { type: "boolean" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                ProductCreateRequest: {
                    type: "object",
                    required: ["name", "description", "price", "category"],
                    properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        price: { type: "number", minimum: 0 },
                        category: { type: "string" },
                        images: { type: "array", items: { type: "string" } },
                        isActive: { type: "boolean", default: true },
                        isCustomizable: { type: "boolean", default: false },
                        inventoryManaged: { type: "boolean", default: false },
                        stock: { type: "number" },
                        stockAlertThreshold: { type: "number", minimum: 0 },
                        requiresSupplierFallback: { type: "boolean", default: false },
                    },
                    example: {
                        name: "Pegatina 10x10",
                        description: "Pegatina de vinilo para vidrio con acabado mate",
                        price: 18000,
                        category: "stickers",
                        images: [
                            "https://cdn.example.com/images/sticker-10x10-1.jpg",
                            "https://cdn.example.com/images/sticker-10x10-2.jpg"
                        ],
                        isActive: true,
                        isCustomizable: true,
                        inventoryManaged: true,
                        stock: 42,
                        stockAlertThreshold: 10,
                        requiresSupplierFallback: false
                    },
                },
                ProductUpdateRequest: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        price: { type: "number", minimum: 0 },
                        category: { type: "string" },
                        images: { type: "array", items: { type: "string" } },
                        isActive: { type: "boolean" },
                        isCustomizable: { type: "boolean" },
                        inventoryManaged: { type: "boolean" },
                        stock: { type: "number" },
                        stockAlertThreshold: { type: "number", minimum: 0 },
                        requiresSupplierFallback: { type: "boolean" },
                    },
                },
                InventoryMovement: {
                    type: "object",
                    required: ["_id", "productId", "type", "quantity", "previousStock", "newStock", "reason", "createdBy", "createdAt"],
                    properties: {
                        _id: { type: "string" },
                        productId: { type: "string" },
                        type: { type: "string", enum: inventoryMovementTypes },
                        quantity: { type: "number" },
                        previousStock: { type: "number" },
                        newStock: { type: "number" },
                        reason: { type: "string" },
                        reference: { type: "string" },
                        createdBy: { type: "string" },
                        createdAt: { type: "string", format: "date-time" },
                    },
                },
                InventoryAdjustmentRequest: {
                    type: "object",
                    required: ["type", "quantity", "reason"],
                    properties: {
                        type: { type: "string", enum: inventoryMovementTypes },
                        quantity: { type: "number", minimum: 1 },
                        reason: { type: "string" },
                        reference: { type: "string" },
                    },
                },
                InventoryItem: {
                    type: "object",
                    required: ["productId", "name", "slug", "category", "inventoryManaged", "stock", "status", "updatedAt"],
                    properties: {
                        productId: { type: "string" },
                        name: { type: "string" },
                        slug: { type: "string" },
                        category: { type: "string" },
                        inventoryManaged: { type: "boolean" },
                        stock: { type: ["number", "null"] },
                        stockAlertThreshold: { type: "number" },
                        status: {
                            type: "string",
                            enum: ["NOT_MANAGED", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"],
                        },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                CartItem: {
                    type: "object",
                    required: ["productId", "productName", "productSlug", "quantity", "unitPrice", "subtotal"],
                    properties: {
                        productId: { type: "string" },
                        productName: { type: "string" },
                        productSlug: { type: "string" },
                        quantity: { type: "integer", minimum: 1 },
                        unitPrice: { type: "number" },
                        subtotal: { type: "number" },
                    },
                },
                Cart: {
                    type: "object",
                    required: ["_id", "items", "subtotal", "total", "createdAt", "updatedAt"],
                    properties: {
                        _id: { type: "string" },
                        userId: { type: "string" },
                        guestId: { type: "string" },
                        items: { type: "array", items: { $ref: "#/components/schemas/CartItem" } },
                        subtotal: { type: "number" },
                        total: { type: "number" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                AddCartItemRequest: {
                    type: "object",
                    required: ["productId", "quantity"],
                    properties: {
                        productId: { type: "string" },
                        quantity: { type: "integer", minimum: 1 },
                    },
                    example: {
                        productId: "66d7b31c5f4d0d8d9773f0ae",
                        quantity: 2
                    },
                },
                UpdateCartItemRequest: {
                    type: "object",
                    required: ["quantity"],
                    properties: {
                        quantity: { type: "integer", minimum: 1 },
                    },
                },
                OrderAddress: {
                    type: "object",
                    required: ["firstName", "lastName", "email", "street", "city", "state", "country"],
                    properties: {
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                        email: { type: "string", format: "email" },
                        phone: { type: "string" },
                        alias: { type: "string" },
                        street: { type: "string" },
                        city: { type: "string" },
                        state: { type: "string" },
                        postalCode: { type: "string" },
                        country: { type: "string" },
                    },
                },
                OrderItem: {
                    type: "object",
                    required: ["productId", "productName", "productSlug", "quantity", "unitPrice", "subtotal"],
                    properties: {
                        productId: { type: "string" },
                        productName: { type: "string" },
                        productSlug: { type: "string" },
                        quantity: { type: "integer", minimum: 1 },
                        unitPrice: { type: "number" },
                        subtotal: { type: "number" },
                    },
                },
                Order: {
                    type: "object",
                    required: ["_id", "orderNumber", "userId", "customerId", "items", "address", "subtotal", "total", "status", "paymentStatus", "createdAt", "updatedAt"],
                    properties: {
                        _id: { type: "string" },
                        orderNumber: { type: "string" },
                        userId: { type: "string" },
                        customerId: { type: "string" },
                        items: { type: "array", items: { $ref: "#/components/schemas/OrderItem" } },
                        address: { $ref: "#/components/schemas/OrderAddress" },
                        subtotal: { type: "number" },
                        total: { type: "number" },
                        status: { type: "string", enum: orderStatuses },
                        paymentStatus: { type: "string", enum: paymentStatuses },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                OrderCreateRequest: {
                    type: "object",
                    properties: {
                        addressIndex: { type: "integer", minimum: 0 },
                        address: { $ref: "#/components/schemas/OrderAddress" },
                        saveAddress: { type: "boolean" },
                    },
                    example: {
                        address: {
                            firstName: "Ana",
                            lastName: "Pérez",
                            email: "ana@example.com",
                            phone: "+57 300 000 0000",
                            alias: "Casa",
                            street: "Calle 10 # 20-30",
                            city: "Bogotá",
                            state: "Cundinamarca",
                            postalCode: "110111",
                            country: "Colombia"
                        },
                        saveAddress: true
                    },
                },
                OrderStatusUpdateRequest: {
                    type: "object",
                    properties: {
                        status: { type: "string", enum: orderStatuses },
                    },
                },
                Payment: {
                    type: "object",
                    required: ["_id", "orderId", "orderNumber", "userId", "provider", "reference", "amountInCents", "currency", "status", "environment", "createdAt", "updatedAt"],
                    properties: {
                        _id: { type: "string" },
                        orderId: { type: "string" },
                        orderNumber: { type: "string" },
                        userId: { type: "string" },
                        provider: { type: "string", enum: ["WOMPI"] },
                        reference: { type: "string" },
                        transactionId: { type: "string" },
                        amountInCents: { type: "integer" },
                        currency: { type: "string", enum: ["COP"] },
                        status: { type: "string", enum: paymentStatuses },
                        paymentMethodType: { type: "string" },
                        statusMessage: { type: "string" },
                        environment: { type: "string", enum: ["sandbox", "production"] },
                        ip: { type: "string" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                WompiWebhookPayload: {
                    type: "object",
                    properties: {
                        event: { type: "string" },
                        data: {
                            type: "object",
                            properties: {
                                transaction: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        reference: { type: "string" },
                                        amount_in_cents: { type: "integer" },
                                        currency: { type: "string" },
                                        status: { type: "string", enum: paymentStatuses },
                                        payment_method_type: { type: "string" },
                                        status_message: { type: "string" },
                                    },
                                },
                            },
                        },
                        environment: { type: "string", enum: ["sandbox", "production"] },
                        signature: {
                            type: "object",
                            properties: {
                                properties: { type: "array", items: { type: "string" } },
                                checksum: { type: "string" },
                            },
                        },
                        timestamp: { type: "integer" },
                    },
                },
                ProductionJob: {
                    type: "object",
                    required: ["_id", "jobNumber", "orderId", "orderNumber", "productId", "productName", "quantity", "status", "priority", "createdBy", "createdAt", "updatedAt"],
                    properties: {
                        _id: { type: "string" },
                        jobNumber: { type: "string" },
                        orderId: { type: "string" },
                        orderNumber: { type: "string" },
                        productId: { type: "string" },
                        productName: { type: "string" },
                        quantity: { type: "integer" },
                        status: { type: "string", enum: productionStatuses },
                        priority: { type: "string", enum: ["LOW", "NORMAL", "HIGH", "URGENT"] },
                        assignedTo: { type: "string" },
                        notes: { type: "string" },
                        createdBy: { type: "string" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                        startedAt: { type: "string", format: "date-time" },
                        completedAt: { type: "string", format: "date-time" },
                    },
                },
                ProductionCreateRequest: {
                    type: "object",
                    properties: {
                        priority: { type: "string", enum: ["LOW", "NORMAL", "HIGH", "URGENT"] },
                        notes: { type: "string" },
                    },
                    example: {
                        priority: "HIGH",
                        notes: "Necesita retoque de color según la referencia del cliente."
                    },
                },
                ProductionStatusUpdateRequest: {
                    type: "object",
                    properties: {
                        status: { type: "string", enum: productionStatuses },
                        notes: { type: "string" },
                    },
                },
                ProductionAssignmentRequest: {
                    type: "object",
                    properties: {
                        assignedTo: { type: ["string", "null"] },
                    },
                },
                ProductionNotesRequest: {
                    type: "object",
                    properties: {
                        notes: { type: "string" },
                    },
                },
                Demo: {
                    type: "object",
                    required: ["_id", "name", "description", "active", "createdAt", "updatedAt"],
                    properties: {
                        _id: { type: "string" },
                        name: { type: "string" },
                        description: { type: "string" },
                        active: { type: "boolean" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                    },
                },
                DemoRequest: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        active: { type: "boolean" },
                    },
                },
            },
        },
        paths: {
            "/api/v1/auth/register": {
                post: {
                    tags: ["Authentication"],
                    summary: "Registrar un usuario público",
                    description: "Crea un usuario con rol CUSTOMER o un usuario administrativo si el contexto lo permite. El registro público solo acepta CUSTOMER.",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/RegisterRequest" },
                            },
                        },
                    },
                    responses: {
                        "201": {
                            description: "Usuario creado correctamente",
                            content: {
                                "application/json": {
                                    schema: { $ref: "#/components/schemas/AuthResponse" },
                                },
                            },
                        },
                        "400": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/auth/login": {
                post: {
                    tags: ["Authentication"],
                    summary: "Iniciar sesión",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/LoginRequest" },
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Credenciales válidas",
                            content: {
                                "application/json": {
                                    schema: { $ref: "#/components/schemas/AuthResponse" },
                                },
                            },
                        },
                        "400": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/auth/logout": {
                post: {
                    tags: ["Authentication"],
                    summary: "Cerrar sesión",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        "200": {
                            description: "Sesión cerrada correctamente",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        required: ["message"],
                                        properties: {
                                            message: { type: "string", example: "Sesión cerrada correctamente" },
                                        },
                                    },
                                },
                            },
                        },
                        "401": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/auth/me": {
                get: {
                    tags: ["Authentication"],
                    summary: "Obtener el usuario autenticado",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        "200": {
                            description: "Usuario autenticado sin el campo password",
                            content: {
                                "application/json": {
                                    schema: { $ref: "#/components/schemas/UserPublic" },
                                },
                            },
                        },
                        "401": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/users": {
                get: {
                    tags: ["Users"],
                    summary: "Listar usuarios (ADMIN)",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN.",
                    responses: {
                        "200": {
                            description: "Lista de usuarios",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/UserPublic" },
                                    },
                                },
                            },
                        },
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
                post: {
                    tags: ["Users"],
                    summary: "Crear usuario (ADMIN)",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN.",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/UserCreateRequest" },
                            },
                        },
                    },
                    responses: {
                        "201": {
                            description: "Usuario creado",
                            content: {
                                "application/json": {
                                    schema: { $ref: "#/components/schemas/UserPublic" },
                                },
                            },
                        },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/users/{id}": {
                get: {
                    tags: ["Users"],
                    summary: "Obtener usuario por ID (ADMIN)",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN.",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId de MongoDB" }],
                    responses: {
                        "200": {
                            description: "Usuario encontrado",
                            content: { "application/json": { schema: { $ref: "#/components/schemas/UserPublic" } } },
                        },
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
                patch: {
                    tags: ["Users"],
                    summary: "Actualizar usuario (ADMIN)",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN.",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId de MongoDB" }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/UserUpdateRequest" },
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Usuario actualizado",
                            content: { "application/json": { schema: { $ref: "#/components/schemas/UserPublic" } } },
                        },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
                delete: {
                    tags: ["Users"],
                    summary: "Desactivar usuario (ADMIN)",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN. La eliminación es lógica y responde con 204.",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId de MongoDB" }],
                    responses: {
                        "204": { description: "Usuario desactivado" },
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/customers/me": {
                get: {
                    tags: ["Customers"],
                    summary: "Obtener el cliente autenticado",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol CUSTOMER.",
                    responses: {
                        "200": { description: "Cliente asociado al usuario autenticado", content: { "application/json": { schema: { $ref: "#/components/schemas/Customer" } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/customers": {
                get: {
                    tags: ["Customers"],
                    summary: "Listar clientes",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN o SALES.",
                    responses: {
                        "200": { description: "Lista de clientes", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Customer" } } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
                post: {
                    tags: ["Customers"],
                    summary: "Crear cliente",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN o SALES.",
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/CustomerCreateRequest" } } },
                    },
                    responses: {
                        "201": { description: "Cliente creado", content: { "application/json": { schema: { $ref: "#/components/schemas/Customer" } } } },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/customers/active": {
                get: {
                    tags: ["Customers"],
                    summary: "Listar clientes activos",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN o SALES.",
                    responses: {
                        "200": { description: "Clientes activos", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Customer" } } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/customers/inactive": {
                get: {
                    tags: ["Customers"],
                    summary: "Listar clientes inactivos",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN o SALES.",
                    responses: {
                        "200": { description: "Clientes inactivos", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Customer" } } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/customers/{id}": {
                get: {
                    tags: ["Customers"],
                    summary: "Obtener cliente por ID",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN o SALES.",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId de MongoDB" }],
                    responses: {
                        "200": { description: "Cliente encontrado", content: { "application/json": { schema: { $ref: "#/components/schemas/Customer" } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
                patch: {
                    tags: ["Customers"],
                    summary: "Actualizar cliente",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN o SALES.",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId de MongoDB" }],
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/CustomerUpdateRequest" } } },
                    },
                    responses: {
                        "200": { description: "Cliente actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Customer" } } } },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
                delete: {
                    tags: ["Customers"],
                    summary: "Desactivar cliente",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN o SALES. La eliminación es lógica y responde con 204.",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId de MongoDB" }],
                    responses: {
                        "204": { description: "Cliente desactivado" },
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/categories": {
                get: {
                    tags: ["Categories"],
                    summary: "Listar categorías activas",
                    responses: {
                        "200": { description: "Lista de categorías activas", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Category" } } } } },
                        "500": errorResponse,
                    },
                },
                post: {
                    tags: ["Categories"],
                    summary: "Crear categoría",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN.",
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/CategoryCreateRequest" } } },
                    },
                    responses: {
                        "201": { description: "Categoría creada", content: { "application/json": { schema: { $ref: "#/components/schemas/Category" } } } },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/categories/slug/{slug}": {
                get: {
                    tags: ["Categories"],
                    summary: "Buscar categoría por slug",
                    parameters: [{ in: "path", name: "slug", required: true, schema: { type: "string" }, description: "Slug de la categoría" }],
                    responses: {
                        "200": { description: "Categoría activa por slug", content: { "application/json": { schema: { $ref: "#/components/schemas/Category" } } } },
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/categories/all": {
                get: {
                    tags: ["Categories"],
                    summary: "Listar todas las categorías (ADMIN)",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN.",
                    responses: {
                        "200": { description: "Lista de categorías activas e inactivas", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Category" } } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/categories/{id}": {
                get: {
                    tags: ["Categories"],
                    summary: "Obtener categoría por ID",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId de MongoDB" }],
                    responses: {
                        "200": { description: "Categoría encontrada", content: { "application/json": { schema: { $ref: "#/components/schemas/Category" } } } },
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
                patch: {
                    tags: ["Categories"],
                    summary: "Actualizar categoría",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN.",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId de MongoDB" }],
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/CategoryUpdateRequest" } } },
                    },
                    responses: {
                        "200": { description: "Categoría actualizada", content: { "application/json": { schema: { $ref: "#/components/schemas/Category" } } } },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
                delete: {
                    tags: ["Categories"],
                    summary: "Desactivar categoría",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN. La eliminación es lógica y responde con 204.",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId de MongoDB" }],
                    responses: {
                        "204": { description: "Categoría desactivada" },
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/products": {
                get: {
                    tags: ["Products"],
                    summary: "Listar productos activos",
                    responses: {
                        "200": { description: "Lista de productos", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Product" } } } } },
                        "500": errorResponse,
                    },
                },
                post: {
                    tags: ["Products"],
                    summary: "Crear producto",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN, DESIGNER o PRODUCTION.",
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/ProductCreateRequest" } } },
                    },
                    responses: {
                        "201": { description: "Producto creado", content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } } },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/products/category/{category}": {
                get: {
                    tags: ["Products"],
                    summary: "Listar productos por categoría",
                    parameters: [{ in: "path", name: "category", required: true, schema: { type: "string" }, description: "Nombre o slug de la categoría" }],
                    responses: {
                        "200": { description: "Productos filtrados", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Product" } } } } },
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/products/{id}": {
                get: {
                    tags: ["Products"],
                    summary: "Obtener producto por ID",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId de MongoDB" }],
                    responses: {
                        "200": { description: "Producto encontrado", content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } } },
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
                patch: {
                    tags: ["Products"],
                    summary: "Actualizar producto",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN, DESIGNER o PRODUCTION.",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId de MongoDB" }],
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/ProductUpdateRequest" } } },
                    },
                    responses: {
                        "200": { description: "Producto actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } } },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
                delete: {
                    tags: ["Products"],
                    summary: "Desactivar producto",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN, DESIGNER o PRODUCTION. La eliminación es lógica y responde con 204.",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId de MongoDB" }],
                    responses: {
                        "204": { description: "Producto desactivado" },
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/inventory": {
                get: {
                    tags: ["Inventory"],
                    summary: "Listar inventario",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN o PRODUCTION.",
                    responses: {
                        "200": { description: "Estado del inventario de productos", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/InventoryItem" } } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/inventory/{productId}/movements": {
                get: {
                    tags: ["Inventory"],
                    summary: "Listar movimientos del producto",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN o PRODUCTION.",
                    parameters: [{ in: "path", name: "productId", required: true, schema: { type: "string" }, description: "ObjectId del producto" }],
                    responses: {
                        "200": { description: "Movimientos de inventario", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/InventoryMovement" } } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/inventory/{productId}": {
                get: {
                    tags: ["Inventory"],
                    summary: "Consultar stock de un producto",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN o PRODUCTION.",
                    parameters: [{ in: "path", name: "productId", required: true, schema: { type: "string" }, description: "ObjectId del producto" }],
                    responses: {
                        "200": { description: "Stock del producto", content: { "application/json": { schema: { $ref: "#/components/schemas/InventoryItem" } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/inventory/{productId}/adjust": {
                post: {
                    tags: ["Inventory"],
                    summary: "Registrar ajuste de inventario",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN o PRODUCTION. Tipos soportados: IN, OUT y ADJUSTMENT.",
                    parameters: [{ in: "path", name: "productId", required: true, schema: { type: "string" }, description: "ObjectId del producto" }],
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/InventoryAdjustmentRequest" } } },
                    },
                    responses: {
                        "200": { description: "Ajuste registrado", content: { "application/json": { schema: { $ref: "#/components/schemas/InventoryMovement" } } } },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/cart": {
                get: {
                    tags: ["Cart"],
                    summary: "Obtener el carrito del usuario o visitante",
                    responses: {
                        "200": { description: "Carrito actual", content: { "application/json": { schema: { $ref: "#/components/schemas/Cart" } } } },
                        "500": errorResponse,
                    },
                },
                delete: {
                    tags: ["Cart"],
                    summary: "Vaciar carrito",
                    responses: {
                        "200": { description: "Carrito vaciado", content: { "application/json": { schema: { $ref: "#/components/schemas/Cart" } } } },
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/cart/items": {
                post: {
                    tags: ["Cart"],
                    summary: "Agregar producto al carrito",
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/AddCartItemRequest" } } },
                    },
                    responses: {
                        "200": { description: "Carrito actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Cart" } } } },
                        "400": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/cart/items/{productId}": {
                patch: {
                    tags: ["Cart"],
                    summary: "Actualizar cantidad de un producto del carrito",
                    parameters: [{ in: "path", name: "productId", required: true, schema: { type: "string" }, description: "ObjectId del producto" }],
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateCartItemRequest" } } },
                    },
                    responses: {
                        "200": { description: "Cantidad actualizada", content: { "application/json": { schema: { $ref: "#/components/schemas/Cart" } } } },
                        "400": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
                delete: {
                    tags: ["Cart"],
                    summary: "Quitar producto del carrito",
                    parameters: [{ in: "path", name: "productId", required: true, schema: { type: "string" }, description: "ObjectId del producto" }],
                    responses: {
                        "200": { description: "Producto removido", content: { "application/json": { schema: { $ref: "#/components/schemas/Cart" } } } },
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/cart/claim": {
                post: {
                    tags: ["Cart"],
                    summary: "Asociar carrito de visitante a usuario autenticado",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol CUSTOMER.",
                    responses: {
                        "200": { description: "Carrito asociado al usuario autenticado", content: { "application/json": { schema: { $ref: "#/components/schemas/Cart" } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/orders": {
                post: {
                    tags: ["Orders"],
                    summary: "Crear pedido desde el carrito",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol CUSTOMER.",
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/OrderCreateRequest" } } },
                    },
                    responses: {
                        "201": { description: "Pedido creado", content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } } },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
                get: {
                    tags: ["Orders"],
                    summary: "Listar pedidos del cliente autenticado",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol CUSTOMER.",
                    responses: {
                        "200": { description: "Pedidos del cliente", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Order" } } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/orders/admin": {
                get: {
                    tags: ["Orders"],
                    summary: "Listar pedidos administrativos",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN, SALES o PRODUCTION.",
                    responses: {
                        "200": { description: "Listado administrativo de pedidos", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Order" } } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/orders/{id}": {
                get: {
                    tags: ["Orders"],
                    summary: "Consultar pedido por ID",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol CUSTOMER, ADMIN, SALES o PRODUCTION.",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId del pedido" }],
                    responses: {
                        "200": { description: "Pedido encontrado", content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/orders/{id}/status": {
                patch: {
                    tags: ["Orders"],
                    summary: "Actualizar estado del pedido",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN, SALES o PRODUCTION.",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId del pedido" }],
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/OrderStatusUpdateRequest" } } },
                    },
                    responses: {
                        "200": { description: "Estado actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } } },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/orders/{id}/cancel": {
                post: {
                    tags: ["Orders"],
                    summary: "Cancelar pedido",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol CUSTOMER, ADMIN, SALES o PRODUCTION.",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId del pedido" }],
                    responses: {
                        "200": { description: "Pedido cancelado", content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } } },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/payments/webhooks/wompi": {
                post: {
                    tags: ["Payments"],
                    summary: "Webhook de Wompi",
                    description: "Endpoint recibido por Wompi para actualizar pagos. No requiere JWT ni sesión del cliente.",
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/WompiWebhookPayload" } } },
                    },
                    responses: {
                        "200": { description: "Webhook procesado", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" } } } } } },
                        "400": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/payments/orders/{orderId}/checkout": {
                post: {
                    tags: ["Payments"],
                    summary: "Crear checkout de pago para un pedido",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol CUSTOMER.",
                    parameters: [{ in: "path", name: "orderId", required: true, schema: { type: "string" }, description: "ObjectId del pedido" }],
                    responses: {
                        "200": { description: "Checkout generado", content: { "application/json": { schema: { type: "object", properties: { payment: { $ref: "#/components/schemas/Payment" }, checkout: { type: "object", properties: { url: { type: "string" }, method: { type: "string" }, fields: { type: "object", additionalProperties: true } } } } } } } },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/payments/orders/{orderId}": {
                get: {
                    tags: ["Payments"],
                    summary: "Consultar pagos de un pedido",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol CUSTOMER, ADMIN o SALES.",
                    parameters: [{ in: "path", name: "orderId", required: true, schema: { type: "string" }, description: "ObjectId del pedido" }],
                    responses: {
                        "200": { description: "Pagos del pedido", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Payment" } } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/production/orders/{orderId}/jobs": {
                post: {
                    tags: ["Production"],
                    summary: "Generar trabajos de producción para un pedido",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN o PRODUCTION.",
                    parameters: [{ in: "path", name: "orderId", required: true, schema: { type: "string" }, description: "ObjectId del pedido" }],
                    requestBody: {
                        required: false,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/ProductionCreateRequest" } } },
                    },
                    responses: {
                        "201": { description: "Trabajos creados", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/ProductionJob" } } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/production/orders/{orderId}": {
                get: {
                    tags: ["Production"],
                    summary: "Listar trabajos de producción por pedido",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN, PRODUCTION o DESIGNER.",
                    parameters: [{ in: "path", name: "orderId", required: true, schema: { type: "string" }, description: "ObjectId del pedido" }],
                    responses: {
                        "200": { description: "Trabajos del pedido", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/ProductionJob" } } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/production/queue": {
                get: {
                    tags: ["Production"],
                    summary: "Consultar cola de producción",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN, PRODUCTION o DESIGNER.",
                    parameters: [
                        { in: "query", name: "status", required: false, schema: { type: "string", enum: productionStatuses }, description: "Filtra por estado" },
                        { in: "query", name: "priority", required: false, schema: { type: "string", enum: ["LOW", "NORMAL", "HIGH", "URGENT"] }, description: "Filtra por prioridad" },
                    ],
                    responses: {
                        "200": { description: "Cola de producción", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/ProductionJob" } } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/production/jobs/{jobId}": {
                get: {
                    tags: ["Production"],
                    summary: "Consultar trabajo de producción por ID",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN, PRODUCTION o DESIGNER.",
                    parameters: [{ in: "path", name: "jobId", required: true, schema: { type: "string" }, description: "ObjectId del trabajo" }],
                    responses: {
                        "200": { description: "Trabajo encontrado", content: { "application/json": { schema: { $ref: "#/components/schemas/ProductionJob" } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/production/jobs/{jobId}/status": {
                patch: {
                    tags: ["Production"],
                    summary: "Actualizar estado del trabajo de producción",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN, PRODUCTION o DESIGNER.",
                    parameters: [{ in: "path", name: "jobId", required: true, schema: { type: "string" }, description: "ObjectId del trabajo" }],
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/ProductionStatusUpdateRequest" } } },
                    },
                    responses: {
                        "200": { description: "Trabajo actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/ProductionJob" } } } },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/production/jobs/{jobId}/assign": {
                patch: {
                    tags: ["Production"],
                    summary: "Asignar o desasignar responsable de producción",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN o PRODUCTION.",
                    parameters: [{ in: "path", name: "jobId", required: true, schema: { type: "string" }, description: "ObjectId del trabajo" }],
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/ProductionAssignmentRequest" } } },
                    },
                    responses: {
                        "200": { description: "Asignación actualizada", content: { "application/json": { schema: { $ref: "#/components/schemas/ProductionJob" } } } },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/production/jobs/{jobId}/notes": {
                patch: {
                    tags: ["Production"],
                    summary: "Actualizar notas del trabajo",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN, PRODUCTION o DESIGNER.",
                    parameters: [{ in: "path", name: "jobId", required: true, schema: { type: "string" }, description: "ObjectId del trabajo" }],
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/ProductionNotesRequest" } } },
                    },
                    responses: {
                        "200": { description: "Notas actualizadas", content: { "application/json": { schema: { $ref: "#/components/schemas/ProductionJob" } } } },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/demo": {
                get: {
                    tags: ["Demo"],
                    summary: "Listar registros demo",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN.",
                    responses: {
                        "200": { description: "Registros demo", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Demo" } } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
                post: {
                    tags: ["Demo"],
                    summary: "Crear registro demo",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN.",
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/DemoRequest" } } },
                    },
                    responses: {
                        "201": { description: "Registro demo creado", content: { "application/json": { schema: { $ref: "#/components/schemas/Demo" } } } },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
            "/api/v1/demo/{id}": {
                get: {
                    tags: ["Demo"],
                    summary: "Obtener registro demo por ID",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN.",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId de MongoDB" }],
                    responses: {
                        "200": { description: "Registro demo encontrado", content: { "application/json": { schema: { $ref: "#/components/schemas/Demo" } } } },
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
                put: {
                    tags: ["Demo"],
                    summary: "Actualizar registro demo",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN.",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId de MongoDB" }],
                    requestBody: {
                        required: true,
                        content: { "application/json": { schema: { $ref: "#/components/schemas/DemoRequest" } } },
                    },
                    responses: {
                        "200": { description: "Registro demo actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Demo" } } } },
                        "400": errorResponse,
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
                delete: {
                    tags: ["Demo"],
                    summary: "Eliminar registro demo",
                    security: [{ bearerAuth: [] }],
                    description: "Requiere JWT con rol ADMIN. El borrado es físico.",
                    parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "ObjectId de MongoDB" }],
                    responses: {
                        "204": { description: "Registro eliminado" },
                        "401": errorResponse,
                        "403": errorResponse,
                        "404": errorResponse,
                        "500": errorResponse,
                    },
                },
            },
        },
    },
    apis: [],
});

export const setupSwagger = (app: Express): void => {
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customSiteTitle: "Tu Sticker API — Swagger UI",
        explorer: true,
        swaggerOptions: {
            persistAuthorization: true,
            docExpansion: "list",
            tagsSorter: "alpha",
            operationsSorter: "alpha",
        },
    }));

    app.get("/api/docs.json", (_req: Request, res: Response): void => {
        res.json(swaggerSpec);
    });
};
