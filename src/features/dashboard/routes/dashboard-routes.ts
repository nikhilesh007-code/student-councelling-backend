import { Router, type Router as ExpressRouter } from "express";
import { dashboardController } from "../dashboard-controller";

export const dashboardRoutes: ExpressRouter = Router();

dashboardRoutes.get("/", dashboardController.getDashboard.bind(dashboardController));
