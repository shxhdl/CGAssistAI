import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User, Mail, BadgeIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function TeacherProfile() {
  const { user, profile } = useAuth();

  return (
    <DashboardLayout
      title="Teacher Profile"
      subtitle="View your account information"
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-border bg-card">
            <CardContent className="p-8 space-y-6">
              <h2 className="text-2xl font-bold">
                Teacher Profile
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-muted-foreground">
                    Teacher ID
                  </Label>

                  <div className="mt-2 flex items-center gap-3 border rounded-lg p-3">
                    <BadgeIcon className="w-5 h-5 text-primary" />
                    <span>
                      {profile?.student_id || "Not Available"}
                    </span>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">
                    Teacher Name
                  </Label>

                  <div className="mt-2 flex items-center gap-3 border rounded-lg p-3">
                    <User className="w-5 h-5 text-primary" />
                    <span>
                      {profile?.full_name || "Not Available"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">
                  Email Address
                </Label>

                <div className="mt-2 flex items-center gap-3 border rounded-lg p-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <span>
                    {user?.email || "Not Available"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}