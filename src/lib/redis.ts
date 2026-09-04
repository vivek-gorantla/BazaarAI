import { Redis } from "ioredis";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../../.env") });

if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL environment variable is missing.");
}

const client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3, // Prevent infinite retries/hanging
});

client.on('error', (err) => {
    console.error('[ioredis] Redis Client Error:', err);
});

export default client;