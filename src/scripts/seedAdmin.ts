import { connectDB, closeDB } from "../config/database";
import { ensureAdminUser } from "../modules/auth/adminProvisioning.service";

const requiredSeedValue = (name: string): string => {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Falta la variable de provisioning requerida: ${name}`);
    }
    return value;
};

const main = async (): Promise<void> => {
    const name = requiredSeedValue("SEED_ADMIN_NAME");
    const email = requiredSeedValue("SEED_ADMIN_EMAIL");
    const password = requiredSeedValue("SEED_ADMIN_PASSWORD");

    await connectDB();
    const result = await ensureAdminUser({ name, email, password });
    console.log(result.created ? `ADMIN creado correctamente: ${email}` : "Ya existe un ADMIN activo; no se realizaron cambios");
};

main()
    .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Error desconocido";
        console.error(`No fue posible crear el ADMIN: ${message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await closeDB();
    });
