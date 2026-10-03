import dotenv from "dotenv";

dotenv.config();

const required = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Falta la variable de entorno requerida: ${name}`);
    }
    return value;
};

export const env = {
    port: Number(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || "development",
    mongoUri: required("MONGO_URI"),
    mongoDBName: process.env.MONGO_DB_NAME || "app",
    jwtSecret: required("JWT_SECRET"),
    adminBootstrapEnabled: process.env.ADMIN_BOOTSTRAP_ENABLED !== "false",
    adminBootstrapName: process.env.ADMIN_BOOTSTRAP_NAME,
    adminBootstrapEmail: process.env.ADMIN_BOOTSTRAP_EMAIL,
    adminBootstrapPassword: process.env.ADMIN_BOOTSTRAP_PASSWORD,
    wompiEnabled: process.env.WOMPI_ENABLED === "true",
    wompiEnvironment: process.env.WOMPI_ENVIRONMENT || "sandbox",
    wompiPublicKey: process.env.WOMPI_PUBLIC_KEY,
    wompiIntegritySecret: process.env.WOMPI_INTEGRITY_SECRET,
    wompiEventsSecret: process.env.WOMPI_EVENTS_SECRET,
    wompiRedirectUrl: process.env.WOMPI_REDIRECT_URL,
};
