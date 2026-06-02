import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { sendNotificationBulk } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Users,
  ClipboardCheck,
  FileText,
  Search,
  CalendarDays,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  due_date: string;
  priority: string;
  assign_to_all: boolean;
  created_at: string;
  course_id?: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  file_url: string | null;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
}

interface StudentProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  specialization?: string;
  level?: string;
  semester?: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  specialization: string;
  level: string;
  semester: string;
  teacher_email: string;
}

export default function TeacherDashboard() {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [courseStudents, setCourseStudents] = useState<StudentProfile[]>([]);
  const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [openedAssignmentId, setOpenedAssignmentId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [assignmentType, setAssignmentType] = useState("assignment");
  const [dueDate, setDueDate] = useState("");
  const [assignToAll, setAssignToAll] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const displayedAssignments = activeCourseId
    ? assignments.filter((assignment) => assignment.course_id === activeCourseId)
    : assignments;

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    fetchData();
  }, [user]);

  useEffect(() => {
    if (!selectedCourseId) {
      setCourseStudents([]);
      setSelectedStudents([]);
      return;
    }

    const selectedCourse = teacherCourses.find(
      (course) => course.id === selectedCourseId
    );

    if (!selectedCourse) {
      setCourseStudents([]);
      setSelectedStudents([]);
      return;
    }

    const filtered = students.filter(
      (student) =>
        String(student.specialization).trim().toLowerCase() ===
          String(selectedCourse.specialization).trim().toLowerCase() &&
        String(student.level).trim() === String(selectedCourse.level).trim() &&
        String(student.semester).trim() ===
          String(selectedCourse.semester).trim()
    );

    setCourseStudents(filtered);
    setSelectedStudents([]);
  }, [selectedCourseId, teacherCourses, students]);

  const fetchData = async () => {
    if (!user?.id) return;

    setIsLoading(true);

    try {
      const teacherEmail = String(user.email || "").trim().toLowerCase();

      const { data: coursesData, error: coursesError } = await supabase
        .from("courses" as any)
        .select("*")
        .eq("teacher_email", teacherEmail);

      if (coursesError) throw coursesError;

      setTeacherCourses((coursesData ?? []) as unknown as Course[]);

      const teacherCourseIds = (coursesData ?? []).map((course: any) => course.id);

let teacherAssignments: any[] = [];

if (teacherCourseIds.length > 0) {
  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from("assignments" as any)
    .select("*")
    .in("course_id", teacherCourseIds)
    .order("created_at", { ascending: false });

  if (assignmentsError) throw assignmentsError;

  teacherAssignments = assignmentsData || [];
}

setAssignments(teacherAssignments as Assignment[]);

const assignmentIds = teacherAssignments.map((a: any) => a.id);

if (assignmentIds.length > 0) {
  const { data: submissionsData, error: submissionsError } = await supabase
    .from("submissions")
    .select("*")
    .in("assignment_id", assignmentIds);

  if (submissionsError) throw submissionsError;

  setSubmissions(submissionsData || []);
} else {
  setSubmissions([]);
}

      const [profilesRes, studentRolesRes] = await Promise.all([
        supabase
          .from("profiles" as any)
          .select("id, user_id, full_name, email, specialization, level, semester"),
        supabase.from("user_roles").select("user_id").eq("role", "student"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (studentRolesRes.error) throw studentRolesRes.error;

      const studentIds = new Set(
        (studentRolesRes.data || []).map((r: any) => r.user_id)
      );

      const studentList = (profilesRes.data || [])
        .filter((p: any) => studentIds.has(p.user_id))
        .map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          full_name: p.full_name || p.email?.split("@")[0] || "Unnamed Student",
          email: p.email || "",
          specialization: p.specialization || "",
          level: String(p.level || ""),
          semester: String(p.semester || ""),
        }));

      setStudents(studentList);
    } catch (error: any) {
      console.error("TeacherDashboard Fetch Error:", error);
      toast.error(error.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setSelectedCourseId("");
    setAssignmentType("assignment");
    setDueDate("");
    setAssignToAll(true);
    setSelectedStudents([]);
    setCourseStudents([]);
  };

  const handleCreate = async () => {
    if (!title || !dueDate || !selectedCourseId) {
      toast.error("Title, course, and due date are required.");
      return;
    }

    if (!assignToAll && selectedStudents.length === 0) {
      toast.error("Please select at least one student.");
      return;
    }

    if (courseStudents.length === 0) {
      toast.error("No students found for this course.");
      return;
    }

    const selectedCourse = teacherCourses.find(
      (course) => course.id === selectedCourseId
    );

    if (!selectedCourse) {
      toast.error("Selected course not found.");
      return;
    }

    setCreating(true);

    const { data: assignment, error } = await supabase
      .from("assignments" as any)
      .insert({
        title,
        description,
        subject: `${selectedCourse.code} - ${selectedCourse.name}`,
        due_date: new Date(dueDate).toISOString(),
        priority: assignmentType,
        course_id: selectedCourseId,
        created_by: user!.id,
        assign_to_all: assignToAll,
      })
      .select("id")
      .single();

    const createdAssignment: any = assignment;

    if (error) {
      toast.error(error.message);
      setCreating(false);
      return;
    }

    if (!assignToAll && createdAssignment?.id) {
      const rows = selectedStudents.map((studentId) => ({
        assignment_id: createdAssignment.id,
        student_id: studentId,
      }));

      const { error: junctionError } = await supabase
        .from("assignment_students")
        .insert(rows);

      if (junctionError) {
        toast.error(
          "Assignment created but failed to assign students: " +
            junctionError.message
        );
      } else {
        await sendNotificationBulk(
          selectedStudents,
          `New ${assignmentType}: "${title}"`,
          "assignment",
          createdAssignment.id
        );
      }
    } else if (assignToAll && createdAssignment?.id) {
      const allStudentIds = courseStudents.map((student) => student.user_id);

      await sendNotificationBulk(
        allStudentIds,
        `New ${assignmentType}: "${title}"`,
        "assignment",
        createdAssignment.id
      );
    }

    toast.success("Assignment created!");
    resetCreateForm();
    setCreateOpen(false);
    fetchData();
    setCreating(false);
  };

  const getStudent = (userId: string) =>
    students.find((student) => student.user_id === userId);

  const getAssignmentSubmissions = (assignmentId: string) =>
    submissions.filter(
      (submission) => submission.assignment_id === assignmentId
    );

  const toggleStudentSelection = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id)
        ? prev.filter((studentId) => studentId !== id)
        : [...prev, id]
    );
  };

  const stats = {
    needsGrading: submissions.filter((submission) => submission.grade === null)
      .length,
  };

  const filteredSubmissions = submissions.filter((submission) => {
    if (!searchQuery) return true;

    const assignment = assignments.find(
      (a) => a.id === submission.assignment_id
    );
    const student = getStudent(submission.student_id);
    const q = searchQuery.toLowerCase();

    return (
      assignment?.title.toLowerCase().includes(q) ||
      student?.full_name?.toLowerCase().includes(q) ||
      student?.email?.toLowerCase().includes(q)
    );
  });

  const getCourseStudentsForAssignment = (assignment: Assignment) => {
  const course = teacherCourses.find((c) => c.id === assignment.course_id);

  if (!course) return [];

  return students.filter(
    (student) =>
      String(student.specialization).trim().toLowerCase() ===
        String(course.specialization).trim().toLowerCase() &&
      String(student.level).trim() === String(course.level).trim() &&
      String(student.semester).trim() === String(course.semester).trim()
  );
};

  return (
    <DashboardLayout
      title="Teacher Dashboard"
      subtitle={`${assignments.length} assignment${
        assignments.length !== 1 ? "s" : ""
      } · ${stats.needsGrading} pending grading`}
      actions={
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) resetCreateForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4 mr-2" />
              Create Assignment
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">
                Create New Assignment
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div>
                <Label>Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Assignment title"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instructions for students..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Course *</Label>
                  <Select
                    value={selectedCourseId}
                    onValueChange={setSelectedCourseId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>

                    <SelectContent>
                      {teacherCourses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} - {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Type</Label>
                  <Select
                    value={assignmentType}
                    onValueChange={setAssignmentType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="presentation">Presentation</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Due Date *</Label>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label>Assign To</Label>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignToAll(true);
                      setSelectedStudents([]);
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                      assignToAll
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    All Students
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignToAll(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                      !assignToAll
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Select Students
                  </button>
                </div>

                {!assignToAll && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <ScrollArea className="h-[160px] border border-border rounded-xl p-3">
                      {!selectedCourseId ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Please select a course first.
                        </p>
                      ) : courseStudents.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No students registered for this course.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {courseStudents.map((student) => (
                            <label
                              key={student.user_id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors"
                            >
                              <Checkbox
                                checked={selectedStudents.includes(
                                  student.user_id
                                )}
                                onCheckedChange={() =>
                                  toggleStudentSelection(student.user_id)
                                }
                              />

                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {student.full_name || "Unnamed"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {student.email}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </motion.div>
                )}
              </div>

              <Button
                onClick={handleCreate}
                disabled={creating}
                className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
              >
                {creating ? "Creating..." : "Create Assignment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-5 flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : teacherCourses.length === 0 ? (
          <Card className="border-dashed col-span-full">
            <CardContent className="p-10 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No courses assigned yet.</p>
            </CardContent>
          </Card>
        ) : (
          teacherCourses.map((course) => (
            <Card
              key={course.id}
              onClick={() =>
                setActiveCourseId(
                  activeCourseId === course.id ? null : course.id
                )
              }
              className={`border-border cursor-pointer hover:shadow-glow hover:-translate-y-1 transition-all duration-300 bg-card/40 backdrop-blur-md overflow-hidden group ${
                activeCourseId === course.id
                  ? "ring-2 ring-primary bg-primary/5"
                  : ""
              }`}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                  <BookOpen className="w-6 h-6 text-primary-foreground" />
                </div>

                <div>
                  <p className="text-2xl font-display font-bold text-foreground">
                    {course.code}
                  </p>

                  <p className="text-sm text-muted-foreground font-medium">
                    {course.name}
                  </p>

                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.1em] mt-1">
                    Level {course.level} / Block {course.semester}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Tabs defaultValue="assignments" className="space-y-6">
        <TabsList className="bg-secondary/60">
          <TabsTrigger value="assignments" className="gap-2">
            <FileText className="w-4 h-4" />
            Assignments
          </TabsTrigger>

          <TabsTrigger value="students" className="gap-2">
            <Users className="w-4 h-4" />
            Students
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          {displayedAssignments.length === 0 ? (
            <Card className="bg-card/40 backdrop-blur-sm border-dashed">
              <CardContent className="p-16 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-foreground font-medium">
                  No assignments yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            displayedAssignments.map((assignment) => {
              const subs = getAssignmentSubmissions(assignment.id);

              return (
                <Card
  key={assignment.id}
  className="border-border hover:shadow-elevated transition-all duration-200 cursor-pointer"
  onClick={() =>
    setOpenedAssignmentId(
      openedAssignmentId === assignment.id ? null : assignment.id
    )
  }
>
  <CardContent className="p-5">
    <div className="flex items-center gap-2 flex-wrap mb-2">
      <h3 className="font-display font-semibold text-foreground">
        {assignment.title}
      </h3>

      <Badge variant="outline" className="text-xs">
        {assignment.subject}
      </Badge>

      <Badge variant="outline" className="text-xs capitalize">
        {assignment.priority}
      </Badge>
    </div>

    <p className="text-sm text-muted-foreground mb-2">
      {assignment.description}
    </p>

    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <CalendarDays className="w-3.5 h-3.5" />
        Due: {format(new Date(assignment.due_date), "PPP 'at' p")}
      </span>

      <span>
        {getAssignmentSubmissions(assignment.id).length} submission
        {getAssignmentSubmissions(assignment.id).length !== 1 ? "s" : ""}
      </span>
    </div>

    {openedAssignmentId === assignment.id && (
      <div className="mt-5 border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              <th className="text-left px-4 py-3">Student Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Submitted At</th>
            </tr>
          </thead>

          <tbody>
            {getCourseStudentsForAssignment(assignment).map((student) => {
              const submission = submissions.find(
                (s) =>
                  s.assignment_id === assignment.id &&
                  s.student_id === student.user_id
              );

              return (
                <tr key={student.user_id} className="border-t">
                  <td className="px-4 py-3 font-medium">
                    {student.full_name}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {student.email}
                  </td>

                  <td className="px-4 py-3">
                    {submission ? (
                      <Badge className="bg-green-100 text-green-700">
                        Submitted
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        Not Submitted
                      </Badge>
                    )}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {submission?.submitted_at
                      ? format(new Date(submission.submitted_at), "PPP 'at' p")
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </CardContent>
</Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/40 text-[10px] uppercase font-bold tracking-widest text-muted-foreground border-b border-border/50">
                    <tr>
                      <th className="px-6 py-4">Student Name</th>
                      <th className="px-6 py-4">Specialization</th>
                      <th className="px-6 py-4">Level</th>
                      <th className="px-6 py-4">Email</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border/50">
                    {students.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-10 text-center text-muted-foreground italic"
                        >
                          No students found.
                        </td>
                      </tr>
                    ) : (
                      students.map((student) => (
                        <tr
                          key={student.user_id}
                          className="hover:bg-secondary/20 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-foreground">
                            {student.full_name || "Unnamed"}
                          </td>

                          <td className="px-6 py-4">
                            <Badge variant="secondary" className="text-[10px]">
                              {student.specialization || "N/A"}
                            </Badge>
                          </td>

                          <td className="px-6 py-4">
                            <Badge variant="outline" className="text-[10px]">
                              {student.level || "N/A"}
                            </Badge>
                          </td>

                          <td className="px-6 py-4 text-muted-foreground">
                            {student.email}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}