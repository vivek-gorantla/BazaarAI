import { Router } from "express";
import multer from "multer";
import { requireMerchant } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { getImage, getVoice, postImage, postImageConfirmation, postVoice, postVoiceConfirmation } from "../controllers/onboarding.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();
router.use(requireMerchant);
router.post("/voice", upload.single("audio"), asyncHandler(postVoice));
router.get("/voice/:captureId", asyncHandler(getVoice));
router.post("/voice/:captureId/confirm", asyncHandler(postVoiceConfirmation));
router.post("/image", upload.single("image"), asyncHandler(postImage));
router.get("/image/:captureId", asyncHandler(getImage));
router.post("/image/:captureId/confirm", asyncHandler(postImageConfirmation));
export default router;
