import { Router } from "express";
import { asyncHandler } from "../middleware/errors.js";
import {
  getHomeData,
  getStoresByDistance,
  getStoreDetail,
  getDiscoverData,
  getSearchData,
  getProductDetail,
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getProfile,
  saveProfileAddress,
  postOrder,
  getCustomerOrders
} from "../controllers/customer.js";

const router = Router();

router.get("/home", asyncHandler(getHomeData));
router.get("/stores", asyncHandler(getStoresByDistance));
router.get("/stores/:storeId", asyncHandler(getStoreDetail));
router.get("/products/:id", asyncHandler(getProductDetail));
router.get("/discover", asyncHandler(getDiscoverData));
router.get("/search", asyncHandler(getSearchData));

// Cart Endpoints
router.get("/cart", asyncHandler(getCart));
router.post("/cart", asyncHandler(addToCart));
router.put("/cart/:id", asyncHandler(updateCartQuantity));
router.delete("/cart/:id", asyncHandler(removeFromCart));

// Wishlist Endpoints
router.get("/wishlist", asyncHandler(getWishlist));
router.post("/wishlist", asyncHandler(addToWishlist));
router.delete("/wishlist/:id", asyncHandler(removeFromWishlist));

// Profile & Address Endpoints
router.get("/profile", asyncHandler(getProfile));
router.post("/profile", asyncHandler(saveProfileAddress));

// Orders Endpoints
router.post("/orders", asyncHandler(postOrder));
router.get("/orders", asyncHandler(getCustomerOrders));

export default router;
