import { useState } from "react";
import { useAssignments } from "@/hooks/useAssignments";
import { getStats } from "@/lib/assignments";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, AlertTriangle, BookOpen, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { StudentCalendar } from "@/components/StudentCalendar";
import { Status } from "@/types/assignment";

export default function StudentDashboard() {
  const { assignments, loading } = useAssignments();
  const [filter, setFilter] = useState<Status | "total" | null>(null);

  const stats = getStats(assignments);

  const statCards = [
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      iconBg: "bg-primary",
      circleBg: "bg-primary/10",
      status: "todo" as Status,
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle,
      iconBg: "bg-teal-400",
      circleBg: "bg-teal-400/10",
      status: "completed" as Status,
    },
    {
      label: "Overdue",
      value: stats.overdue,
      icon: AlertTriangle,
      iconBg: "bg-orange-400",
      circleBg: "bg-orange-400/10",
      status: "overdue" as Status,
    },
    {
      label: "Total",
      value: stats.total,
      icon: BookOpen,
      iconBg: "bg-primary",
      circleBg: "bg-primary/10",
      status: "total" as const,
    },
  ];

  return (
    <DashboardLayout
      title="Dashboard Overview"
      subtitle="Welcome back! Here's your study progress for today."
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setFilter(stat.status === filter ? null : stat.status)}
              className="cursor-pointer"
            >
              <Card
                className={`relative overflow-hidden border-border hover:shadow-md transition-all ${
                  filter === stat.status ? "ring-2 ring-primary" : ""
                }`}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl ${stat.iconBg} flex items-center justify-center z-10`}>
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>

                  <div className="z-10">
                    <h3 className="text-3xl font-bold text-foreground">
                      {loading ? "..." : stat.value}
                    </h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {stat.label}
                    </p>
                  </div>

                  <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full ${stat.circleBg}`} />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="border-border overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between bg-secondary/20 border-b border-border/50">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Academic Calendar
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6">
            <StudentCalendar assignments={assignments} large />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}