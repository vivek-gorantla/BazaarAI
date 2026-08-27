import type { Request, Response } from "express";
import { getMerchantProfile, updateMerchantProfile } from "../modules/merchant/profile.js";
import { createStore, getStore, listStores, updateStore } from "../modules/merchant/stores.js";
import { inviteStaff, listStaff, removeStaff } from "../modules/merchant/staff.js";
import { getDashboard } from "../modules/merchant/dashboard.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

function merchantId(request: Request): string {
  return (request as AuthenticatedRequest).user.id;
}

function storeId(request: Request): string {
  const value = request.params.storeId;
  return Array.isArray(value) ? value[0] : value;
}

export async function getProfile(request: Request, response: Response): Promise<void> {
  response.json({ success: true, data: await getMerchantProfile(merchantId(request)) });
}

export async function patchProfile(request: Request, response: Response): Promise<void> {
  response.json({ success: true, data: await updateMerchantProfile(merchantId(request), request.body) });
}

export async function postStore(request: Request, response: Response): Promise<void> {
  response.status(201).json({ success: true, data: await createStore(merchantId(request), request.body) });
}

export async function getStores(request: Request, response: Response): Promise<void> {
  response.json({ success: true, data: await listStores(merchantId(request)) });
}

export async function getStoreById(request: Request, response: Response): Promise<void> {
  response.json({ success: true, data: await getStore(storeId(request), merchantId(request)) });
}

export async function patchStore(request: Request, response: Response): Promise<void> {
  response.json({ success: true, data: await updateStore(storeId(request), merchantId(request), request.body) });
}

export async function getStoreSettings(request: Request, response: Response): Promise<void> {
  const store = await getStore(storeId(request), merchantId(request));
  response.json({ success: true, data: { storeId: store.id, settings: {} } });
}

export async function patchStoreSettings(request: Request, response: Response): Promise<void> {
  const store = await getStore(storeId(request), merchantId(request));
  if (request.body && Object.keys(request.body).length > 0) {
    response.status(400).json({ success: false, error: { code: "SETTINGS_UNAVAILABLE", message: "No configurable store settings exist in the current schema" } });
    return;
  }
  response.json({ success: true, data: { storeId: store.id, settings: {} } });
}

export async function postStaff(request: Request, response: Response): Promise<void> {
  response.status(201).json({ success: true, data: await inviteStaff(storeId(request), merchantId(request), request.body) });
}

export async function getStaff(request: Request, response: Response): Promise<void> {
  response.json({ success: true, data: await listStaff(storeId(request), merchantId(request)) });
}

export async function deleteStaff(request: Request, response: Response): Promise<void> {
  const staffId = Array.isArray(request.params.staffId) ? request.params.staffId[0] : request.params.staffId;
  response.json({ success: true, data: await removeStaff(storeId(request), staffId, merchantId(request)) });
}

export async function getStoreDashboard(request: Request, response: Response): Promise<void> {
  response.json({ success: true, data: await getDashboard(storeId(request), merchantId(request)) });
}

