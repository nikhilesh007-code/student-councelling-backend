import { Router } from "express";
import express from "express";
import { forgotPassword, resetPassword } from "../controllers/auth-controller";

export const customAuthRoutes = Router();

customAuthRoutes.use(express.json());
customAuthRoutes.post("/forgot-password", forgotPassword);
customAuthRoutes.post("/reset-password", resetPassword);
