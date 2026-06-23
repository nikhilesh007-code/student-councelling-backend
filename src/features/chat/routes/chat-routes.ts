import { Router } from "express";
import { handleChat } from "../controllers/chat-controller";

const chatRouter: Router = Router();

chatRouter.post("/", handleChat);

export { chatRouter };
