import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/errors.js";

export async function login(req: Request, res: Response) {
  const { phone, role } = req.body;
  if (!phone || typeof phone !== "string") {
    throw new ApiError(400, "INVALID_REQUEST", "Phone number is required");
  }

  const user = await prisma.user.findUnique({
    where: { phone },
  });

  if (!user) {
    throw new ApiError(401, "UNAUTHORIZED", "User not found. Please sign up.");
  }

  if (role && user.role !== role) {
    throw new ApiError(403, "FORBIDDEN", `Only ${role}s can login here.`);
  }

  // Return simple auth token (user id for now)
  res.json({
    success: true,
    data: {
      token: user.id,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
      },
    },
  });
}

export async function signup(req: Request, res: Response) {
  const { phone, name, role = "merchant", preferredLanguage = "en", translateContent = true } = req.body;
  
  if (!phone || typeof phone !== "string") {
    throw new ApiError(400, "INVALID_REQUEST", "Phone number is required");
  }
  
  if (!name || typeof name !== "string") {
    throw new ApiError(400, "INVALID_REQUEST", "Name is required");
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { phone },
  });

  if (existingUser) {
    throw new ApiError(409, "CONFLICT", "User with this phone number already exists.");
  }

  const finalLanguage = translateContent ? preferredLanguage : "en";

  // Create new user
  const user = await prisma.user.create({
    data: {
      phone,
      name,
      role,
      preferredLanguage: finalLanguage,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      token: user.id,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
      },
    },
  });
}
