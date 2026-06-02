import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Assignment } from "@/types/assignment";
import { format } from "date-fns";
import { FileText, Send, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { useAssignments } from "@/hooks/useAssignments";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AssignmentDetailsModalProps {
  assignment: Assignment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignmentDetailsModal({
  assignment,
  open,
  onOpenChange,
}: AssignmentDetailsModalProps) {
  const { submitAssignment } = useAssignments();

  const [content, setContent] = useState(assignment.submission?.content || "");
  const [fileUrl, setFileUrl] = useState(assignment.submission?.file_url || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const isCompleted = assignment.status === "completed";
  const isOverdue = assignment.status === "overdue";
  const isGraded = isCompleted && assignment.submission?.grade !== null;

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please enter a title for your submission.");
      return;
    }

    if (!selectedFile && !fileUrl) {
      toast.error("Please upload a document file.");
      return;
    }

    const finalFileValue = selectedFile ? selectedFile.name : fileUrl;

    setSubmitting(true);
    const { error } = await submitAssignment(assignment.id, content, finalFileValue);
    setSubmitting(false);

    if (!error) {
      toast.success("Work submitted successfully!");
      setSubmittedSuccess(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              {assignment.subject}
            </Badge>

            <Badge
              className={cn(
                "text-[10px] uppercase tracking-wider",
                assignment.priority === "urgent"
                  ? "bg-red-500/10 text-red-500"
                  : assignment.priority === "high"
                  ? "bg-orange-500/10 text-orange-500"
                  : "bg-blue-500/10 text-blue-500"
              )}
            >
              {assignment.priority}
            </Badge>
          </div>

          <DialogTitle className="text-2xl font-display font-bold">
            {assignment.title}
          </DialogTitle>

          <DialogDescription className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Due: {format(new Date(assignment.due_date), "PPP")}
            </span>

            <span className="flex items-center gap-1.5">
              {isCompleted ? (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Submitted
                </Badge>
              ) : isOverdue ? (
                <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Overdue
                </Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </span>
          </DialogDescription>
        </DialogHeader>

        {submittedSuccess ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-32 h-32 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-20 h-20 text-green-600" />
            </div>

            <h2 className="text-3xl font-bold text-green-600 mt-6">
              Submitted Successfully
            </h2>

            <p className="text-muted-foreground mt-2">
              Your document has been submitted successfully.
            </p>

            <Button className="mt-6" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-6 mt-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed bg-secondary/30 p-4 rounded-xl border border-border/50">
                  {assignment.description || "No description provided."}
                </p>
              </div>

              {isCompleted && assignment.submission && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl space-y-2">
                  <h4 className="font-semibold text-green-700 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Submitted Work
                  </h4>

                  <p className="text-sm">
                    <b>Title:</b> {assignment.submission.content || "-"}
                  </p>

                  <p className="text-sm">
                    <b>Uploaded Document:</b>{" "}
                    {assignment.submission.file_url || "-"}
                  </p>

                  {assignment.submission.grade !== null && (
                    <p className="text-sm">
                      <b>Grade:</b> {assignment.submission.grade}/100
                    </p>
                  )}

                  {assignment.submission.feedback && (
                    <p className="text-sm italic">
                      <b>Feedback:</b> "{assignment.submission.feedback}"
                    </p>
                  )}
                </div>
              )}

              <div className="border-t border-border pt-6 space-y-4">
                <h4 className="text-lg font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Upload Document File
                </h4>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="content">Title</Label>
                    <Input
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Enter submission title"
                      disabled={isGraded}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file">Upload Document</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setSelectedFile(e.target.files[0]);
                          setFileUrl(e.target.files[0].name);
                        }
                      }}
                      disabled={isGraded}
                    />

                    {(selectedFile || fileUrl) && (
                      <p className="text-sm text-green-600">
                        Selected file: {selectedFile?.name || fileUrl}
                      </p>
                    )}

                    <p className="text-[10px] text-muted-foreground">
                      Students can upload PDF, Word, PowerPoint, Excel, or ZIP files.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>

              <Button
                className="bg-gradient-primary text-primary-foreground shadow-glow"
                onClick={handleSubmit}
                disabled={submitting || isGraded}
              >
                {submitting ? "Submitting..." : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {isCompleted ? "Update Submission" : "Submit Work"}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}