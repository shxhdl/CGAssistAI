import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { sendNotification } from "@/lib/notifications";

export interface AssignmentWithSubmission {
  id: string;
  title: string;
  description: string;
  subject: string;
  due_date: string;
  priority: string;
  assign_to_all: boolean;
  created_by: string;
  created_at: string;
  course_id?: string;
  submission?: {
    id: string;
    content: string;
    file_url: string | null;
    grade: number | null;
    feedback: string | null;
    submitted_at: string;
  };
  status: "todo" | "completed" | "overdue";
}

export function useAssignments() {
  const { user, initialized } = useAuth();

  const [assignments, setAssignments] = useState<AssignmentWithSubmission[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAssignments = useCallback(async () => {
    if (!user) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch assignments where assign_to_all = true
      const { data: allData, error: allError } = await supabase
        .from("assignments")
        .select("*")
        .eq("assign_to_all", true);

      if (allError) throw allError;

      // 2. Fetch assignments specifically assigned via junction table
      const { data: studentData, error: studentError } = await supabase
        .from("assignment_students")
        .select("assignment_id, assignments(*)")
        .eq("student_id", user.id);

      if (studentError) throw studentError;

      // Merge & deduplicate
      const assignmentsMap = new Map<string, any>();
      (allData || []).forEach((a: any) => assignmentsMap.set(a.id, a));
      (studentData || []).forEach((row: any) => {
        const a = row.assignments;
        if (a && !assignmentsMap.has(a.id)) assignmentsMap.set(a.id, a);
      });
      
      const assignmentsData = Array.from(assignmentsMap.values());

      const sortedAssignments = [...(assignmentsData || [])].sort(
        (a: any, b: any) =>
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      );

      if (sortedAssignments.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      const { data: subData, error: submissionsError } = await supabase
        .from("submissions")
        .select("id, assignment_id, content, file_url, grade, feedback, submitted_at")
        .eq("student_id", user.id);

      if (submissionsError) throw submissionsError;

      const submissionsData = subData || [];
      const now = new Date();

      const combined: AssignmentWithSubmission[] = sortedAssignments.map(
        (assignment: any) => {
          const submission = submissionsData.find(
            (s) => s.assignment_id === assignment.id
          );

          let status: "todo" | "completed" | "overdue" = "todo";

          if (submission) {
            status = "completed";
          } else if (new Date(assignment.due_date) < now) {
            status = "overdue";
          }

          return {
            ...assignment,
            submission,
            status,
          };
        }
      );

      setAssignments(combined);
    } catch (error: any) {
      console.error("[useAssignments] Error:", error);
      toast.error("Failed to load assignments");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!initialized) return;
    fetchAssignments();
  }, [initialized, fetchAssignments]);

  const submitAssignment = async (
    assignmentId: string,
    content: string,
    fileUrl?: string
  ) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("submissions").upsert({
      assignment_id: assignmentId,
      student_id: user.id,
      content,
      file_url: fileUrl ?? null,
      submitted_at: new Date().toISOString(),
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    // Send notification to the teacher who created the assignment
    try {
      const { data: assignmentData } = await supabase
        .from("assignments" as any)
        .select("title, created_by")
        .eq("id", assignmentId)
        .maybeSingle();

      const { data: profileData } = await supabase
        .from("profiles" as any)
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const studentName = profileData?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "A student";

      if (assignmentData?.created_by) {
        await sendNotification(
          assignmentData.created_by,
          `${studentName} submitted "${assignmentData.title}"`,
          "submission",
          assignmentId
        );
      }
    } catch (notifError) {
      console.error("Failed to send submission notification to teacher:", notifError);
    }

    toast.success("Assignment submitted successfully!");
    fetchAssignments();

    return { error: null };
  };

  return {
    assignments,
    loading,
    refresh: fetchAssignments,
    submitAssignment,
  };
}