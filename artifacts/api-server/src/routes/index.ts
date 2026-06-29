import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import specialistsRouter from "./specialists";
import evaluationsRouter from "./evaluations";
import criteriaRouter from "./criteria";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(specialistsRouter);
router.use(evaluationsRouter);
router.use(criteriaRouter);
router.use(dashboardRouter);

export default router;
