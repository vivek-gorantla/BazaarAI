import { Router } from "express";
import { requireMerchant } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { deleteProduct, getCatalog, getCatalogProduct, getSearch, patchProduct, postProduct } from "../controllers/catalog.js";

const router = Router();
router.get("/search", asyncHandler(getSearch));
router.use(requireMerchant);
router.get("/:storeId", asyncHandler(getCatalog));
router.post("/:storeId/products", asyncHandler(postProduct));
router.get("/:storeId/products/:productId", asyncHandler(getCatalogProduct));
router.patch("/products/:productId", asyncHandler(patchProduct));
router.delete("/products/:productId", asyncHandler(deleteProduct));
export default router;
