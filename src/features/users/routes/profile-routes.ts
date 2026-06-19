import { Router } from "express";
import {
    createProfile,
    getProfile,
      updateProfile,
} from "../controllers/profile-controller";

export const profileRouter: Router = Router();

profileRouter.post("/", createProfile);
profileRouter.get("/:userId", getProfile);
profileRouter.put("/", updateProfile);