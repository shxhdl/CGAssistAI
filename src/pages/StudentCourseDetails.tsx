import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText } from "lucide-react";

type Course = {
  id: string;
  code: string;
  name: string;
};

type Material = {
  id: string;
  title: string;
  file_url: string;
  material_type: string;
};

export default function StudentCourseDetails() {
  const { courseId } = useParams();

  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!courseId) return;

      setLoading(true);

      const { data: courseData } = await supabase
        .from("courses" as any)
        .select("*")
        .eq("id", courseId)
        .single();

      const { data: materialsData } = await supabase
        .from("course_materials" as any)
        .select("*")
        .eq("course_id", courseId);

      setCourse(courseData as any);
      setMaterials((materialsData as any) || []);

      setLoading(false);
    };

    loadData();
  }, [courseId]);

  return (
    <DashboardLayout
      title={course?.name || "Course Materials"}
      subtitle="Course files, summaries and assignments"
    >
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-6">

          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-primary p-10">
              <div className="flex items-center gap-4">
                <BookOpen className="h-10 w-10 text-white" />

                <div>
                  <h1 className="text-4xl font-bold text-white">
                    {course?.name}
                  </h1>

                  <p className="text-white/90 text-lg mt-2">
                    {course?.code}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {materials.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                No materials uploaded yet.
              </CardContent>
            </Card>
          ) : (
            materials.map((material) => (
              <Card key={material.id}>
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-primary" />

                    <div>
                      <h3 className="font-bold text-lg">
                        {material.title}
                      </h3>

                      <p className="text-muted-foreground">
                        {material.material_type}
                      </p>
                    </div>
                  </div>

                  <Button
  variant="outline"
  onClick={() => {
    const link = document.createElement("a");
    link.href = material.file_url;
    link.download = material.title + ".pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }}
>
  Download
</Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </DashboardLayout>
  );
}