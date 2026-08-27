import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { ApiError } from "../middleware/errors.js";
import { confirmImageCapture, confirmVoiceCapture, createImageCapture, createVoiceCapture, getImageCapture, getVoiceCapture } from "../modules/onboarding/captures.js";

const owner = (request: Request) => (request as AuthenticatedRequest).user.id;
const param = (request: Request, name: string) => { const value = request.params[name]; return Array.isArray(value) ? value[0] : value; };
const storeId = (request: Request) => typeof request.body.storeId === "string" ? request.body.storeId : (() => { throw new ApiError(400, "INVALID_REQUEST", "storeId is required"); })();
const upload = (request: Request) => request.file?.originalname ?? (() => { throw new ApiError(400, "INVALID_REQUEST", "Uploaded file is required"); })();

export async function postVoice(request: Request, response: Response) { response.status(201).json({ success: true, data: await createVoiceCapture(owner(request), storeId(request), upload(request)) }); }
export async function postImage(request: Request, response: Response) { response.status(201).json({ success: true, data: await createImageCapture(owner(request), storeId(request), upload(request)) }); }
export async function getVoice(request: Request, response: Response) { response.json({ success: true, data: await getVoiceCapture(owner(request), param(request, "captureId")) }); }
export async function getImage(request: Request, response: Response) { response.json({ success: true, data: await getImageCapture(owner(request), param(request, "captureId")) }); }
export async function postVoiceConfirmation(request: Request, response: Response) { response.json({ success: true, data: await confirmVoiceCapture(owner(request), param(request, "captureId"), request.body.items) }); }
export async function postImageConfirmation(request: Request, response: Response) { response.json({ success: true, data: await confirmImageCapture(owner(request), param(request, "captureId"), request.body.items) }); }
