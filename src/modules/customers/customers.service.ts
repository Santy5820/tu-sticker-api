import { ObjectId } from "mongodb";
import { Customer, CustomerCreateInput, CustomerUpdateInput } from "./customers.model";
import { CustomersRepository } from "./customers.repository";
import { BadRequestError, NotFoundError } from "../../shared/errors/AppError";

export class CustomersService {
    private readonly customersRepository = new CustomersRepository();

    async create(data: CustomerCreateInput): Promise<Customer> {
        const firstName = this.requireString(data.firstName, "firstName");
        const lastName = this.requireString(data.lastName, "lastName");
        const email = this.requireEmail(data.email);
        const phone = this.normalizeOptionalString(data.phone, "phone");
        const addresses = this.normalizeAddresses(data.addresses);
        const userId = data.userId ? this.toObjectId(data.userId) : undefined;

        const existingCustomer = await this.customersRepository.findByEmail(email, true);
        if (existingCustomer) {
            throw new BadRequestError("Ya existe un cliente con ese correo electrónico");
        }

        if (userId) {
            const customerByUser = await this.customersRepository.findByUserId(userId);
            if (customerByUser) {
                throw new BadRequestError("Este usuario ya está asociado a un cliente activo");
            }
        }

        const now = new Date();
        return this.customersRepository.create({
            userId,
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`.trim(),
            email,
            phone,
            addresses,
            isActive: data.isActive ?? true,
            createdAt: now,
            updatedAt: now,
        });
    }

    async findAll(): Promise<Customer[]> {
        return this.customersRepository.findAll();
    }

    async findByStatus(isActive: boolean): Promise<Customer[]> {
        return this.customersRepository.findByStatus(isActive);
    }

    async findById(id: string): Promise<Customer> {
        const customer = await this.customersRepository.findById(this.toObjectId(id));
        if (!customer) {
            throw new NotFoundError("Cliente no encontrado");
        }
        return customer;
    }

    async findByUserId(userId: string): Promise<Customer> {
        const customer = await this.customersRepository.findByUserId(this.toObjectId(userId));
        if (!customer) {
            throw new NotFoundError("No existe un cliente asociado a ese usuario");
        }
        return customer;
    }

    async update(id: string, data: CustomerUpdateInput): Promise<Customer> {
        const objectId = this.toObjectId(id);
        const changes: Partial<Customer> = {};

        if (data.userId !== undefined) {
            changes.userId = this.toObjectId(data.userId);
        }

        if (data.firstName !== undefined) changes.firstName = this.requireString(data.firstName, "firstName");
        if (data.lastName !== undefined) changes.lastName = this.requireString(data.lastName, "lastName");
        if (data.email !== undefined) {
            changes.email = this.requireEmail(data.email);
            const existingCustomer = await this.customersRepository.findByEmail(changes.email, true);
            if (existingCustomer && !existingCustomer._id?.equals(objectId)) {
                throw new BadRequestError("Ya existe un cliente con ese correo electrónico");
            }
        }
        if (data.phone !== undefined) {
            changes.phone = this.normalizeOptionalString(data.phone, "phone");
        }
        if (data.addresses !== undefined) {
            changes.addresses = this.normalizeAddresses(data.addresses);
        }
        if (data.isActive !== undefined) {
            if (typeof data.isActive !== "boolean") {
                throw new BadRequestError("El campo 'isActive' debe ser booleano");
            }
            changes.isActive = data.isActive;
        }

        if (changes.firstName && changes.lastName) {
            changes.fullName = `${changes.firstName} ${changes.lastName}`.trim();
        }

        if (changes.userId) {
            const customerByUser = await this.customersRepository.findByUserId(changes.userId);
            if (customerByUser && !customerByUser._id?.equals(objectId)) {
                throw new BadRequestError("Este usuario ya está asociado a otro cliente activo");
            }
        }

        if (Object.keys(changes).length === 0) {
            throw new BadRequestError("No se enviaron campos para actualizar");
        }

        const updatedCustomer = await this.customersRepository.update(objectId, changes);
        if (!updatedCustomer) {
            throw new NotFoundError("Cliente no encontrado");
        }
        return updatedCustomer;
    }

    async delete(id: string): Promise<void> {
        const objectId = this.toObjectId(id);
        const customer = await this.customersRepository.findById(objectId);
        if (!customer) {
            throw new NotFoundError("Cliente no encontrado");
        }
        if (!customer.isActive) {
            throw new BadRequestError("El cliente ya está inactivo");
        }

        const deleted = await this.customersRepository.delete(objectId);
        if (!deleted) {
            throw new NotFoundError("Cliente no encontrado");
        }
    }

    private normalizeAddresses(addresses: unknown): Customer["addresses"] {
        if (!Array.isArray(addresses)) {
            throw new BadRequestError("El campo 'addresses' debe ser un arreglo");
        }

        return addresses.map((address, index) => {
            if (!address || typeof address !== "object") {
                throw new BadRequestError(`La dirección en la posición ${index} no es válida`);
            }

            const normalizedAddress = address as Record<string, unknown>;
            const street = this.requireString(normalizedAddress.street, `addresses[${index}].street`);
            const city = this.requireString(normalizedAddress.city, `addresses[${index}].city`);
            const state = this.requireString(normalizedAddress.state, `addresses[${index}].state`);
            const country = this.requireString(normalizedAddress.country, `addresses[${index}].country`);

            return {
                alias: typeof normalizedAddress.alias === "string" ? normalizedAddress.alias.trim() : undefined,
                street,
                city,
                state,
                postalCode: typeof normalizedAddress.postalCode === "string" ? normalizedAddress.postalCode.trim() : undefined,
                country,
                isDefault: typeof normalizedAddress.isDefault === "boolean" ? normalizedAddress.isDefault : undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        });
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== "string" || value.trim() === "") {
            throw new BadRequestError(`El campo '${field}' es obligatorio y debe ser texto no vacío`);
        }
        return value.trim();
    }

    private normalizeOptionalString(value: unknown, field: string): string | undefined {
        if (value === undefined || value === null || value === "") {
            return undefined;
        }
        if (typeof value !== "string") {
            throw new BadRequestError(`El campo '${field}' debe ser texto`);
        }
        const normalized = value.trim();
        return normalized === "" ? undefined : normalized;
    }

    private requireEmail(value: unknown): string {
        const email = this.requireString(value as string, "email");
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regex.test(email)) {
            throw new BadRequestError("El correo electrónico no tiene un formato válido");
        }
        return email.toLowerCase();
    }

    private toObjectId(id: string): ObjectId {
        if (!ObjectId.isValid(id)) {
            throw new BadRequestError(`Identificador inválido: ${id}`);
        }
        return new ObjectId(id);
    }
}
