import mongoose from "mongoose";

declare const process: {
  env: Record<string, string | undefined>;
};

export async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined");
  }

  if (mongoose.connection.readyState === 1) return;

  await mongoose.connect(mongoUri);

  console.log("Connected to MongoDB");
}