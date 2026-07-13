import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentsRouter from "./students";
import activityLogsRouter from "./activityLogs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studentsRouter);
router.use(activityLogsRouter);

export default router;
