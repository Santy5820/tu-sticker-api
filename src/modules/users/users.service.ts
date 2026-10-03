import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { BadRequestError, NotFoundError } from "../../shared/errors/AppError";
import { User, UserCreateInput, UserRole, UserUpdateInput } from "./users.model";
import { UsersRepository } from "./users.repository";

export class UsersService {
    private readonly usersRepository = new UsersRepository();

    async create(data: UserCreateInput): Promise<User> {
        const name = this.requireString(data.name, "name");
        const email = this.requireEmail(data.email);
        const password = this.requireString(data.password, "password");
        const role = this.requireRole(data.role);

        if (role === "CUSTOMER") {
            if (!data.customerId || typeof data.customerId !== "string") {
                throw new BadRequestError("Los usuarios con rol CUSTOMER deben incluir customerId");
            }
        }

        if (role !== "CUSTOMER" && data.customerId) {
            throw new BadRequestError("Solo los usuarios con rol CUSTOMER pueden tener customerId");
        }

        const existingUser = await this.usersRepository.findByEmail(email);
        if (existingUser) {
            throw new BadRequestError("Ya existe un usuario con ese correo electrónico");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const now = new Date();

        return this.usersRepository.create({
            name,
            email,
            password: hashedPassword,
            role,
            customerId: role === "CUSTOMER" ? this.toObjectId(data.customerId as string) : undefined,
            isActive: data.isActive ?? true,
            createdAt: now,
            updatedAt: now,
        });
    }

    async findAll(): Promise<User[]> {
        return this.usersRepository.findAll();
    }

    async findById(id: string): Promise<User> {
        const user = await this.usersRepository.findById(this.toObjectId(id));
        if (!user) {
            throw new NotFoundError("Usuario no encontrado");
        }
        return user;
    }

    async update(id: string, data: UserUpdateInput): Promise<User> {
        const objectId = this.toObjectId(id);
        const changes: Partial<User> = {};

        if (data.name !== undefined) changes.name = this.requireString(data.name, "name");
        if (data.email !== undefined) {
            changes.email = this.requireEmail(data.email);
            const existingUser = await this.usersRepository.findByEmail(changes.email);
            if (existingUser && !existingUser._id?.equals(objectId)) {
                throw new BadRequestError("Ya existe un usuario con ese correo electrónico");
            }
        }
        if (data.password !== undefined) {
            changes.password = await bcrypt.hash(this.requireString(data.password, "password"), 10);
        }
        if (data.role !== undefined) {
            changes.role = this.requireRole(data.role);
        }
        if (data.customerId !== undefined) {
            if (changes.role && changes.role !== "CUSTOMER") {
                throw new BadRequestError("Solo los usuarios con rol CUSTOMER pueden tener customerId");
            }
            if (changes.role === "CUSTOMER" || (changes.role === undefined && (await this.usersRepository.findById(objectId))?.role === "CUSTOMER")) {
                if (!data.customerId || typeof data.customerId !== "string") {
                    throw new BadRequestError("Los usuarios con rol CUSTOMER deben incluir customerId");
                }
                changes.customerId = this.toObjectId(data.customerId);
            }
        }
        if (changes.role === "CUSTOMER" && !changes.customerId) {
            const currentUser = await this.usersRepository.findById(objectId);
            if (!currentUser?.customerId) {
                throw new BadRequestError("Los usuarios con rol CUSTOMER deben incluir customerId");
            }
            changes.customerId = currentUser.customerId;
        }
        if (changes.role && changes.role !== "CUSTOMER" && data.customerId !== undefined) {
            throw new BadRequestError("Solo los usuarios con rol CUSTOMER pueden tener customerId");
        }
        if (data.isActive !== undefined) {
            if (typeof data.isActive !== "boolean") {
                throw new BadRequestError("El campo 'isActive' debe ser booleano");
            }
            changes.isActive = data.isActive;
        }

        if (Object.keys(changes).length === 0) {
            throw new BadRequestError("No se enviaron campos para actualizar");
        }

        const updatedUser = await this.usersRepository.update(objectId, changes);
        if (!updatedUser) {
            throw new NotFoundError("Usuario no encontrado");
        }
        return updatedUser;
    }

    async delete(id: string): Promise<void> {
        const objectId = this.toObjectId(id);
        const user = await this.usersRepository.findById(objectId);
        if (!user) {
            throw new NotFoundError("Usuario no encontrado");
        }
        if (!user.isActive) {
            throw new BadRequestError("El usuario ya está inactivo");
        }

        const deleted = await this.usersRepository.delete(objectId);
        if (!deleted) {
            throw new NotFoundError("Usuario no encontrado");
        }
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
