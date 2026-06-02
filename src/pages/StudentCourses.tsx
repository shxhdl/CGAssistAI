import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, BookOpen, Layers } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Course = {
  id: string;
  code: string;
  name: string;
  specialization: string;
  level: string;
  semester: string;
};

export default function StudentCourses() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const specialization =
    profile?.specialization || user?.user_metadata?.specialization;

  const level = profile?.level || user?.user_metadata?.level;
  const semester = profile?.semester || user?.user_metadata?.semester;

  useEffect(() => {
    const loadCourses = async () => {
      setLoading(true);

      if (!specialization || !level || !semester) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("courses" as any)
        .select("*")
        .ilike("specialization", specialization.trim())
        .eq("level", String(level).trim())
        .eq("semester", String(semester).trim());

      console.log("Returned Data:", data);
      console.log("Error:", error);
      console.log("specialization =", specialization);
console.log("level =", level);
console.log("semester =", semester);
console.log("Returned Data =", data);

      if (error) {
        setCourses([]);
      } else {
        setCourses((data ?? []) as unknown as Course[]);
      }

      setLoading(false);
    };

    loadCourses();
  }, [specialization, level, semester]);

  return (
    <DashboardLayout
      title="My Courses"
      subtitle="View your registered courses based on your programme, level, and block"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-5 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Programme</p>
              <h3 className="font-bold">
                {specialization || "Not specified"}
              </h3>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Academic Level
              </p>
              <h3 className="font-bold">
                {level && semester
                  ? `Level ${level} - Block ${semester}`
                  : "Not specified"}
              </h3>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <p>Loading courses...</p>
        ) : courses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center">
              <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-3" />

              <h3 className="font-bold text-lg">
                No courses found
              </h3>

              <p className="text-sm text-muted-foreground">
                No courses are registered for your programme,
                level, and block.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card
                key={course.id}
                onClick={() =>
                  navigate(`/student/courses/${course.id}`)
                }
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-all"
              >
                <div className="h-32 bg-gradient-primary relative">
                  <span className="absolute top-3 left-3 bg-white/90 text-primary px-3 py-1 rounded-lg text-sm font-bold">
                    Level {course.level} / Block {course.semester}
                  </span>
                </div>

                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <BookOpen className="w-5 h-5" />
                    <h3 className="font-bold text-lg">
                      {course.code}
                    </h3>
                  </div>

                  <p className="font-medium">
                    {course.name}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Layers className="w-4 h-4" />
                    {course.specialization}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}