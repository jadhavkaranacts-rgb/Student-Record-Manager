import { Router, type IRouter } from "express";
import { count, desc } from "drizzle-orm";
import { db, activityLogsTable } from "@workspace/db";
import { ListActivityLogsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/activity-logs", async (req, res) => {
  const parsed = ListActivityLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const { page, pageSize } = parsed.data;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(activityLogsTable)
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(activityLogsTable),
  ]);

  res.json({
    data: rows,
    total: totalResult[0]?.value ?? 0,
    page,
    pageSize,
  });
});

export default router;
