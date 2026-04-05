import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import menuItemsRouter from "./menu-items";
import customersRouter from "./customers";
import ordersRouter from "./orders";
import ingredientsRouter from "./ingredients";
import recipesRouter from "./recipes";
import billsRouter from "./bills";
import scheduledOrdersRouter from "./scheduled-orders";
import reportsRouter from "./reports";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(menuItemsRouter);
router.use(customersRouter);
router.use(ordersRouter);
router.use(ingredientsRouter);
router.use(recipesRouter);
router.use(billsRouter);
router.use(scheduledOrdersRouter);
router.use(reportsRouter);
router.use(settingsRouter);

export default router;
