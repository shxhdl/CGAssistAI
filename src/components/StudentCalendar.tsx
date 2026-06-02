import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Assignment } from "@/types/assignment";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StudentCalendarProps {
  assignments: Assignment[];
  large?: boolean;
}

export function StudentCalendar({ assignments }: StudentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const navigate = useNavigate();

  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentMonth)),
      end: endOfWeek(endOfMonth(currentMonth)),
    });
  }, [currentMonth]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  const getAssignmentsForDay = (day: Date) => {
    return assignments.filter((a) => isSameDay(new Date(a.due_date), day));
  };

  const selectedAssignments = selectedDate ? getAssignmentsForDay(selectedDate) : [];

  const getAssignmentStyle = (status: string) => {
    if (status === "completed") {
      return "bg-green-100 text-green-700 border-green-300";
    }

    if (status === "overdue") {
      return "bg-red-100 text-red-700 border-red-300";
    }

    return "bg-blue-100 text-blue-700 border-blue-300";
  };

  const getStatusDot = (status: string) => {
    if (status === "completed") return "bg-green-500";
    if (status === "overdue") return "bg-red-500";
    return "bg-blue-500";
  };

  return (
    <Card className="border-border bg-card/60 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <h3 className="text-xl font-bold">
            {format(currentMonth, "MMMM yyyy")}
          </h3>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-3 mb-3 text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-sm font-semibold text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {weeks.map((week, weekIndex) => {
            const selectedInThisWeek =
              selectedDate && week.some((day) => isSameDay(day, selectedDate));

            return (
              <div key={weekIndex} className="space-y-3">
                <div className="grid grid-cols-7 gap-3">
                  {week.map((day) => {
                    const dayAssignments = getAssignmentsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`min-h-[120px] rounded-xl border p-3 transition-all cursor-pointer ${
                          isSameMonth(day, currentMonth)
                            ? "bg-background border-border"
                            : "bg-muted/30 border-border/50 text-muted-foreground"
                        } ${isToday ? "ring-2 ring-primary" : ""} ${
                          isSelected ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-bold ${isToday ? "text-primary" : ""}`}>
                            {format(day, "d")}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {dayAssignments.slice(0, 3).map((assignment) => (
                            <Badge
                              key={assignment.id}
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/student/assignments?assignment=${assignment.id}`);
                              }}
                              className={`w-full justify-start truncate text-[10px] px-2 py-1 border cursor-pointer ${getAssignmentStyle(
                                assignment.status
                              )}`}
                            >
                              {assignment.subject || assignment.title}
                            </Badge>
                          ))}

                          {dayAssignments.length > 3 && (
                            <p className="text-[10px] text-muted-foreground">
                              +{dayAssignments.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedInThisWeek && selectedAssignments.length > 0 && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <h4 className="font-semibold mb-3">
                      Assignments on {format(selectedDate!, "PPPP")}
                    </h4>

                    <div className="space-y-3">
                      {selectedAssignments.map((a) => (
                        <div
                          key={a.id}
                          onClick={() => navigate(`/student/assignments?assignment=${a.id}`)}
                          className="p-4 rounded-xl bg-white border border-border/50 flex items-start gap-3 cursor-pointer hover:border-primary/40 transition-all"
                        >
                          <span className={`w-3 h-3 rounded-full mt-1 ${getStatusDot(a.status)}`} />

                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{a.title}</p>
                            <p className="text-sm text-muted-foreground">{a.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              Due: {format(new Date(a.due_date), "PPP")}
                            </p>

                            <Badge
                              variant="outline"
                              className={`mt-2 text-xs border ${getAssignmentStyle(a.status)}`}
                            >
                              {a.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedInThisWeek && selectedAssignments.length === 0 && (
                  <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground italic">
                    No assignments on {format(selectedDate!, "PPPP")}.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}