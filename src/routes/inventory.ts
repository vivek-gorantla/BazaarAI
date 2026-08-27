import { Router } from "express";
import { requireMerchant } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { patchStock } from "../controllers/catalog.js";

const router = Router();
router.use(requireMerchant);
router.patch("/products/:productId/stock", asyncHandler(patchStock));
export default router;