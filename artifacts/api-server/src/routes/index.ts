import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import specialistsRouter from "./specialists";
import evaluationsRouter from "./evaluations";
import criteriaRouter from "./criteria";
import dashboardRouter from "./dashboard";
import tasksRouter from "./tasks";
import notificationsRouter from "./notifications";
import evaluatoriRouter from "./evaluatori";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(specialistsRouter);
router.use(evaluationsRouter);
router.use(criteriaRouter);
router.use(dashboardRouter);
router.use(tasksRouter);
router.use(notificationsRouter);
router.use(evaluatoriRouter);

export default router;
