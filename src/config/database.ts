import { MongoClient, Db } from "mongodb";
import { env } from "./env";

let client: MongoClient | undefined;
let db: Db | undefined;

export const connectDB = async (): Promise<void> => {
    client = new MongoClient(env.mongoUri);
    await client.connect();
    db = client.db(env.mongoDBName);
    console.log(`Conectado a MongoDB (db: ${env.mongoDBName})`);
};

export const getDb = (): Db => {
    if (!db) {
        throw new Error("La base de datos no ha sido inicializada");
    }
    return db;
};

export const closeDB = async (): Promise<void> => {
    if (client) {
        await client.close();
        client = undefined;
        db = undefined;
    }
};
