import http from "http";
import express from "express";
import "dotenv/config";
import authRouter from "./routes/auth.js";
import merchantRouter from "./routes/merchant.js";
import catalogRouter from "./routes/catalog.js";
import inventoryRouter from "./routes/inventory.js";
import onboardingRouter from "./routes/onboarding.js";
import ordersRouter from "./routes/orders.js";
import { errorHandler } from "./middleware/errors.js";
import { attachWebSocketServer } from "./websocket/agentSocket.js";

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

// Create HTTP server manually so we can attach the WebSocket server
const server = http.createServer(app);
attachWebSocketServer(server);

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`WebSocket agent available at ws://localhost:${port}/ws/agent`);
});