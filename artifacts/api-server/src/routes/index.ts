import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentsRouter from "./students";
import activityLogsRouter from "./activityLogs";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studentsRouter);
router.use(activityLogsRouter);
router.use(storageRouter);

export default router;
