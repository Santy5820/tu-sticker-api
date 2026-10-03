import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../shared/errors/AppError";
import { getDb } from "../../config/database";
import { Customer } from "../customers/customers.model";
import { LoginInput, RegisterInput, User, UserRole } from "./auth.model";
import { AuthRepository } from "./auth.repository";

export class AuthService {
    private readonly authRepository = new AuthRepository();

    async register(data: RegisterInput): Promise<{ user: Omit<User, "password">; token: string }> {
        const name = this.requireString(data.name, "name");
        const email = this.requireEmail(data.email);
        const password = this.requireString(data.password, "password");
        const role = data.role === undefined ? "CUSTOMER" : this.requireRole(data.role);

        if (role !== "CUSTOMER") {
            throw new ForbiddenError("El registro público solo permite crear usuarios con rol CUSTOMER");
        }

        const existingUser = await this.authRepository.findByEmail(email);
        if (existingUser) {
            throw new BadRequestError("Ya existe un usuario con ese correo electrónico");
        }

        let customerId: ObjectId | undefined;
        if (role === "CUSTOMER") {
            customerId = await this.resolveCustomerId(email, name, data.customerId, data.phone, data.address);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const now = new Date();

        const user = await this.authRepository.create({
            name,
            email,
            password: hashedPassword,
            role,
            customerId,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        });

        if (customerId && user._id) {
            await getDb().collection<Customer>("customers").updateOne(
                { _id: customerId },
                { $set: { userId: user._id, updatedAt: new Date() } }
            );
        }

        const token = this.signToken({
            userId: String(user._id),
            email: user.email,
            role: user.role,
        });

        const { password: _password, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, token };
    }

    async login(data: LoginInput): Promise<{ user: Omit<User, "password">; token: string }> {
        const email = this.requireEmail(data.email);
        const password = this.requireString(data.password, "password");

        const user = await this.authRepository.findByEmail(email);
        if (!user) {
            throw new BadRequestError("Credenciales inválidas");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new BadRequestError("Credenciales inválidas");
        }

        if (!user.isActive) {
            throw new BadRequestError("Este usuario está inactivo");
        }

        const token = this.signToken({
            userId: String(user._id),
            email: user.email,
            role: user.role,
        });

        const { password: _password, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, token };
    }

    async me(userId: string): Promise<Omit<User, "password">> {
        const objectId = this.toObjectId(userId);
        const user = await this.authRepository.findById(objectId);
        if (!user) {
            throw new NotFoundError("Usuario no encontrado");
        }

        const { password: _password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    async logout(): Promise<{ message: string }> {
        return { message: "Sesión cerrada correctamente" };
    }

    private async resolveCustomerId(
        email: string,
        name: string,
        customerId?: string,
        phone?: string,
        address?: Record<string, unknown>
    ): Promise<ObjectId | undefined> {
        if (customerId) {
            return this.toObjectId(customerId);
        }

        const customerCollection = getDb().collection<Customer>("customers");
        const existingCustomer = await customerCollection.findOne({ email: email.toLowerCase() });
        if (existingCustomer?._id) {
            return existingCustomer._id;
        }

        const parts = name.trim().split(/\s+/);
        const firstName = parts[0] ?? "Cliente";
        const lastName = parts.slice(1).join(" ") || "";

        const createdCustomer = await customerCollection.insertOne({
            firstName,
            lastName,
            fullName: name.trim(),
            email: email.toLowerCase(),
            phone: phone?.trim() || undefined,
            addresses: address ? [this.normalizeAddress(address)] : [],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return createdCustomer.insertedId;
    }

    private normalizeAddress(address: Record<string, unknown>): {
        alias?: string;
        street: string;
        city: string;
        state: string;
        postalCode?: string;
        country: string;
        isDefault?: boolean;
        createdAt: Date;
        updatedAt: Date;
    } {
        return {
            alias: typeof address.alias === "string" ? address.alias : "Principal",
            street: typeof address.street === "string" ? address.street : "",
            city: typeof address.city === "string" ? address.city : "",
            state: typeof address.state === "string" ? address.state : "",
            postalCode: typeof address.postalCode === "string" ? address.postalCode : undefined,
            country: typeof address.country === "string" ? address.country : "Colombia",
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }

    private signToken(payload: Record<string, string>): string {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new BadRequestError("JWT_SECRET no está configurado");
        }

        return jwt.sign(payload, secret, { expiresIn: "7d" });
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== "string" || value.trim() === "") {
            throw new BadRequestError(`El campo '${field}' es obligatorio y debe ser texto no vacío`);
        }
        return value.trim();
    }

    private requireEmail(value: unknown): string {
        const email = this.requireString(value, "email");
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regex.test(email)) {
            throw new BadRequestError("El correo electrónico no tiene un formato válido");
        }
        return email.toLowerCase();
    }

    private requireRole(value: unknown): UserRole {
        const roles: UserRole[] = ["CUSTOMER", "ADMIN", "SALES", "DESIGNER", "PRODUCTION"];
        if (typeof value !== "string" || !roles.includes(value as UserRole)) {
            throw new BadRequestError("El rol no es válido");
        }
        return value as UserRole;
    }

    private toObjectId(id: string): ObjectId {
        if (!ObjectId.isValid(id)) {
            throw new BadRequestError(`Identificador inválido: ${id}`);
        }
        return new ObjectId(id);
    }
}
