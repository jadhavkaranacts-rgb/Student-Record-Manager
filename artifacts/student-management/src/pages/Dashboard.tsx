import { useGetStudentAnalytics, useListActivityLogs } from "@workspace/api-client-react";
import { Users, GraduationCap, Calendar, Activity, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { data: analytics, isLoading: analyticsLoading } = useGetStudentAnalytics();
  const { data: logsResponse, isLoading: logsLoading } = useListActivityLogs({ pageSize: 10 });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">Key metrics and recent activity across all student records.</p>
      </div>

      {analyticsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <h3 className="text-3xl font-display font-bold mt-1">{analytics.totalStudents.toLocaleString()}</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-chart-2/10 flex items-center justify-center text-chart-2">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Top Course</p>
                  <h3 className="text-xl font-display font-bold mt-1">
                    {analytics.byCourse.length > 0 ? analytics.byCourse[0].label : "N/A"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.byCourse.length > 0 ? `${analytics.byCourse[0].count} students` : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-chart-3/10 flex items-center justify-center text-chart-3">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Largest Year</p>
                  <h3 className="text-xl font-display font-bold mt-1">
                    {analytics.byYear.length > 0 ? `Year ${analytics.byYear[0].label}` : "N/A"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.byYear.length > 0 ? `${analytics.byYear[0].count} students` : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

           <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-chart-4/10 flex items-center justify-center text-chart-4">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Gender Split</p>
                  <h3 className="text-xl font-display font-bold mt-1">
                    {analytics.byGender.length > 0 ? analytics.byGender[0].label : "N/A"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.byGender.map(g => `${g.label.charAt(0)}:${g.count}`).join(' / ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts/Breakdowns Area */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Course Distribution</CardTitle>
            <CardDescription>Number of active students enrolled per course</CardDescription>
          </CardHeader>
          <CardContent>
             {analyticsLoading ? (
               <Skeleton className="h-[300px] w-full" />
             ) : analytics?.byCourse && analytics.byCourse.length > 0 ? (
               <div className="space-y-4">
                 {analytics.byCourse.slice(0, 6).map((course, i) => (
                   <div key={course.label} className="flex items-center gap-4">
                     <div className="w-32 text-sm font-medium truncate" title={course.label}>
                       {course.label}
                     </div>
                     <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" 
                         style={{ width: `${Math.max(1, (course.count / analytics.totalStudents) * 100)}%` }}
                       />
                     </div>
                     <div className="w-12 text-sm text-right text-muted-foreground tabular-nums">
                       {course.count}
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                 No data available
               </div>
             )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="shadow-sm flex flex-col h-[500px]">
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Recent changes to records</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto pr-4 space-y-6">
            {logsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="w-2 h-2 mt-2 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : logsResponse?.data && logsResponse.data.length > 0 ? (
              <div className="relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted before:to-transparent">
                {logsResponse.data.map((log) => (
                  <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-6 last:mb-0">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-background bg-muted text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 absolute left-0 md:left-1/2 -translate-x-1/2">
                      <div className={`w-2 h-2 rounded-full ${
                        log.action === 'CREATE' ? 'bg-primary' : 
                        log.action === 'UPDATE' ? 'bg-chart-2' : 
                        log.action === 'DELETE' ? 'bg-destructive' : 'bg-muted-foreground'
                      }`} />
                    </div>
                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] pl-4 md:pl-0 md:group-odd:pr-4 md:group-even:pl-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-foreground">{log.description}</span>
                        <span className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-2">
                <Activity className="w-8 h-8 opacity-20" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
