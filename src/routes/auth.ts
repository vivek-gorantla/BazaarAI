import { Router } from "express";
import { login, signup } from "../controllers/auth.js";
import { asyncHandler } from "../middleware/errors.js";

const router = Router();

router.post("/login", asyncHandler(login));
router.post("/signup", asyncHandler(signup));

export default router;
