import { Router } from "express";
import { requireMerchant } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { getDashboard, getOrders } from "../controllers/orders.js";

const router = Router();
router.use(requireMerchant);
router.get("/:storeId/orders", asyncHandler(getOrders));
router.get("/:storeId/dashboard", asyncHandler(getDashboard));

export default router;
