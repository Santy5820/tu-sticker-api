import bcrypt from "bcryptjs";
import { getDb } from "../../config/database";
import { User } from "./auth.model";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 12;

const isDuplicateKeyError = (error: unknown): boolean =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000;

export interface AdminProvisioningInput {
    name: string;
    email: string;
    password: string;
}

const validateInput = (input: AdminProvisioningInput): AdminProvisioningInput => {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();

    if (!name) {
        throw new Error("El nombre del ADMIN no puede estar vacío");
    }

    if (!EMAIL_REGEX.test(email)) {
        throw new Error("El correo del ADMIN no tiene un formato válido");
    }

    if (input.password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`La contraseña del ADMIN debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
    }

    return { name, email, password: input.password };
};

/**
 * Provisiona el primer administrador durante el arranque o desde el seed CLI.
 * Nunca modifica un ADMIN existente ni eleva usuarios con otro rol.
 */
export const ensureAdminUser = async (
    input?: AdminProvisioningInput
): Promise<{ created: boolean; skipped: boolean }> => {
    const users = getDb().collection<User>("users");
    await users.createIndex({ email: 1 }, { unique: true, name: "users_email_unique" });
    const existingAdmin = await users.findOne({ role: "ADMIN", isActive: true });

    if (existingAdmin) {
        return { created: false, skipped: true };
    }

    if (!input) {
        throw new Error(
            "No existe un ADMIN activo. Configura ADMIN_BOOTSTRAP_NAME, ADMIN_BOOTSTRAP_EMAIL y ADMIN_BOOTSTRAP_PASSWORD"
        );
    }

    const adminInput = validateInput(input);
    const existingUser = await users.findOne({ email: adminInput.email });

    if (existingUser) {
        if (existingUser.role !== "ADMIN") {
            throw new Error("El correo de provisioning ya pertenece a un usuario que no es ADMIN; no se modificó");
        }

        throw new Error("El ADMIN indicado existe, pero está inactivo; no se reactivó automáticamente");
    }

    const now = new Date();
    const admin: Omit<User, "_id"> = {
        name: adminInput.name,
        email: adminInput.email,
        password: await bcrypt.hash(adminInput.password, 12),
        role: "ADMIN",
        isActive: true,
        createdAt: now,
        updatedAt: now,
    };

    try {
        await users.insertOne(admin);
        return { created: true, skipped: false };
    } catch (error: unknown) {
        if (isDuplicateKeyError(error)) {
            return { created: false, skipped: true };
        }
        throw error;
    }
};
