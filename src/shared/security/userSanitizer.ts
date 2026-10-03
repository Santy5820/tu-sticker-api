export type UserWithPassword = {
    password: unknown;
};

export const sanitizeUser = <T extends UserWithPassword>(user: T): Omit<T, "password"> => {
    const { password: _password, ...safeUser } = user;
    return safeUser;
};

export const sanitizeUsers = <T extends UserWithPassword>(users: T[]): Omit<T, "password">[] =>
    users.map(sanitizeUser);
