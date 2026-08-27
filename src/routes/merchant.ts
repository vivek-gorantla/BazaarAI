import { Router } from "express";
import { requireMerchant } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import {
  getProfile,
  getStoreById,
  getStores,
  patchProfile,
  patchStore,
  getStoreSettings,
  patchStoreSettings,
  postStore,
  postStaff,
  getStaff,
  deleteStaff,
  getStoreDashboard
} from "../controllers/merchant.js";

const merchantRouter = Router();

merchantRouter.use(requireMerchant);
merchantRouter.get("/profile", asyncHandler(getProfile));
merchantRouter.patch("/profile", asyncHandler(patchProfile));
merchantRouter.post("/stores", asyncHandler(postStore));
merchantRouter.get("/stores", asyncHandler(getStores));
merchantRouter.get("/stores/:storeId", asyncHandler(getStoreById));
merchantRouter.patch("/stores/:storeId", asyncHandler(patchStore));
merchantRouter.get("/stores/:storeId/settings", asyncHandler(getStoreSettings));
merchantRouter.patch("/stores/:storeId/settings", asyncHandler(patchStoreSettings));
merchantRouter.post("/stores/:storeId/staff", asyncHandler(postStaff));
merchantRouter.get("/stores/:storeId/staff", asyncHandler(getStaff));
merchantRouter.delete("/stores/:storeId/staff/:staffId", asyncHandler(deleteStaff));
merchantRouter.get("/stores/:storeId/dashboard", asyncHandler(getStoreDashboard));

export default merchantRouter;
