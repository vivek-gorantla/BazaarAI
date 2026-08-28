import { Router } from "express";
import { asyncHandler } from "../middleware/errors.js";
import { requireMerchant } from "../middleware/auth.js";
import {
  getPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder
} from "../controllers/purchaseOrders.js";

const router = Router();

router.get("/:storeId/purchase-orders", requireMerchant, asyncHandler(getPurchaseOrders));
router.post("/:storeId/purchase-orders", requireMerchant, asyncHandler(createPurchaseOrder));
router.patch("/:storeId/purchase-orders/:poId/receive", requireMerchant, asyncHandler(receivePurchaseOrder));

export default router;
