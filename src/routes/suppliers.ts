import { Router } from "express";
import { asyncHandler } from "../middleware/errors.js";
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  addSupplierProduct
} from "../controllers/suppliers.js";

const router = Router();

router.get("/", asyncHandler(getSuppliers));
router.post("/", asyncHandler(createSupplier));
router.get("/:id", asyncHandler(getSupplierById));
router.post("/:id/products", asyncHandler(addSupplierProduct));

export default router;
