import express from "express";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

// Hello World endpoint
app.get("/", (_req, res) => {
    res.send("Hello World!");
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});