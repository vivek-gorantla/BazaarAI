import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export type AuthenticatedRequest = Request & {
  user: {
    id: string;
    role: "merchant";
  };
};

export async function requireMerchant(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  const userId = request.header("x-user-id");

  if (!userId) {
    response.status(401).json({
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Authentication required" },
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== "merchant") {
    response.status(401).json({
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Merchant authentication required" },
    });
    return;
  }

  (request as AuthenticatedRequest).user = { id: user.id, role: "merchant" };
  next();
}
