import { customerController } from "./customer.controller.js";
import { Router } from "express";
const router = Router();
router.post("/chat", customerController.chat.bind(customerController));
export default router;

