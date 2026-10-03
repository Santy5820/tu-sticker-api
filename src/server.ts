import { app } from "./app";
import { env } from "./config/env";
import { connectDB } from "./config/database";
import { ensureAdminUser } from "./modules/auth/adminProvisioning.service";

const bootstrap = async (): Promise<void> => {
    await connectDB();

    if (env.adminBootstrapEnabled) {
        const result = await ensureAdminUser(
            env.adminBootstrapName && env.adminBootstrapEmail && env.adminBootstrapPassword
                ? {
                      name: env.adminBootstrapName,
                      email: env.adminBootstrapEmail,
                      password: env.adminBootstrapPassword,
                  }
                : undefined
        );

        console.log(
            result.created
                ? `Usuario ADMIN inicial creado: ${env.adminBootstrapEmail}`
                : "Ya existe un ADMIN activo; no se ejecutó el provisioning inicial"
        );
    } else {
        console.log("Provisioning automático de ADMIN deshabilitado");
    }

    app.listen(env.port, () => {
        console.log(`Servidor corriendo en el puerto ${env.port} [${env.nodeEnv}]`);
    });
};

bootstrap().catch((error) => {
    console.error("Error al iniciar la aplicación:", error);
    process.exit(1);
});
