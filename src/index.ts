import express from "express";
import "dotenv/config";
import authRouter from "./routes/auth.js";
import merchantRouter from "./routes/merchant.js";
import catalogRouter from "./routes/catalog.js";
import inventoryRouter from "./routes/inventory.js";
import onboardingRouter from "./routes/onboarding.js";
import ordersRouter from "./routes/orders.js";
import { errorHandler } from "./middleware/errors.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/merchant", merchantRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/merchant", ordersRouter);

// Health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

// Hello World endpoint
app.get("/", (_req, res) => {
    res.send("Hello World!");
});

app.use(errorHandler);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});