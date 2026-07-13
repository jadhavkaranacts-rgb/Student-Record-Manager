import { db, activityLogsTable } from "@workspace/db";

export async function recordActivity(
  action: string,
  entityType: string,
  entityId: number | null,
  description: string,
) {
  await db.insert(activityLogsTable).values({
    action,
    entityType,
    entityId,
    description,
  });
}
