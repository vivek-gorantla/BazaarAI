import mongoose from "mongoose";
export async function connectDatabase() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error("MONGODB_URI is not defined");
    }
    if (mongoose.connection.readyState === 1)
        return;
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");
}
