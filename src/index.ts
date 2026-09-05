import http from "http";
import express from "express";
import "dotenv/config";
import authRouter from "./routes/auth.js";
import merchantRouter from "./routes/merchant.js";
import catalogRouter from "./routes/catalog.js";
import inventoryRouter from "./routes/inventory.js";
import onboardingRouter from "./routes/onboarding.js";
import ordersRouter from "./routes/orders.js";
import suppliersRouter from "./routes/suppliers.js";
import purchaseOrdersRouter from "./routes/purchaseOrders.js";
import parserRouter from "./routes/parserTest.js";
import agentRouter from "./routes/agent.js";
import customerRouter from "./routes/customer.js";
import customerChatRouter from "./customer/customer.route.js";
import { errorHandler } from "./middleware/errors.js";
import { attachWebSocketServer } from "./websocket/agentSocket.js";
import { systemAuditMiddleware } from "./middleware/system-audit.js";
import auditRouter from "./routes/audit.routes.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.text({ limit: "50mb", type: ["text/*", "application/json"] }));

// Apply system audit middleware to log API requests
app.use(systemAuditMiddleware);

app.use("/api/auth", authRouter);

app.use("/api/customer", customerRouter);
app.use("/api/customer", customerChatRouter);
app.use("/api/merchant", merchantRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/merchant", ordersRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/merchant", purchaseOrdersRouter);
app.use("/api/parse", parserRouter);
app.use("/api/agent", agentRouter);
app.use("/api/audit", auditRouter);


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