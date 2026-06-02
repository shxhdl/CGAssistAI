import { ReactNode, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { NotificationBell } from "@/components/NotificationBell";
import { SmartChatbot } from "@/components/SmartChatbot";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function DashboardLayout({
  children,
  title,
  subtitle,
  actions,
}: DashboardLayoutProps) {
  const [showProfile, setShowProfile] = useState(false);
  const { user } = useAuth();
  useEffect(() => {
  const syncProfile = async () => {
    if (!user) return;

    await supabase
      .from("profiles" as any)
      .update({
        full_name: user.user_metadata?.full_name,
        specialization: user.user_metadata?.specialization,
        level: user.user_metadata?.level,
        semester: user.user_metadata?.semester || user.user_metadata?.block,
        student_id:
          user.user_metadata?.student_id || user.email?.split("@")[0],
      })
      .eq("user_id", user.id);
  };

  syncProfile();
}, [user]);

  const isTeacher = window.location.pathname.startsWith("/teacher");

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4 md:hidden">
              <img
                src="https://res.cloudinary.com/dfajjqglx/image/upload/v1776504606/image_817_ogrwjm.png"
                className="w-24"
                alt="Gulf College Logo"
              />
            </div>

            <div className="hidden md:flex flex-1" />

            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/60"
                >
                  <GraduationCap className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    {user?.user_metadata?.full_name ||
                      (isTeacher ? "Teacher Account" : "Student Account")}
                  </span>
                </button>

                {showProfile && (
                  <div className="absolute right-0 mt-2 w-[760px] bg-white border rounded-xl shadow-lg p-6 z-50">
                    <h3 className="text-lg font-semibold mb-6 border-b pb-3">
                      {isTeacher ? "Teacher Profile" : "Student Profile"}
                    </h3>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <label className="text-muted-foreground">
                          {isTeacher ? "Teacher ID" : "Student ID"}
                        </label>
                        <div className="bg-gray-100 border rounded-md px-3 py-2">
                          {user?.user_metadata?.teacher_id ||
                            user?.user_metadata?.student_id ||
                            user?.email?.split("@")[0] ||
                            "-"}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <label className="text-muted-foreground">
                          {isTeacher ? "Teacher Name" : "Student Name"}
                        </label>
                        <div className="bg-gray-100 border rounded-md px-3 py-2">
                          {user?.user_metadata?.full_name || "-"}
                        </div>
                      </div>

                      <div className="col-span-3">
                        <label className="text-muted-foreground">
                          Email ID
                        </label>
                        <div className="bg-gray-100 border rounded-md px-3 py-2">
                          {user?.email || "-"}
                        </div>
                      </div>

                      {!isTeacher && (
                        <>
                          <div>
                            <label className="text-muted-foreground">
                              Level
                            </label>
                            <div className="bg-gray-100 border rounded-md px-3 py-2">
                              Level {user?.user_metadata?.level || "-"}
                            </div>
                          </div>

                          <div>
                            <label className="text-muted-foreground">
                              Semester
                            </label>
                            <div className="bg-gray-100 border rounded-md px-3 py-2">
                              {user?.user_metadata?.semester ||
                                user?.user_metadata?.block ||
                                "-"}
                            </div>
                          </div>

                          <div className="col-span-3">
                            <label className="text-muted-foreground">
                              Programme
                            </label>
                            <div className="bg-gray-100 border rounded-md px-3 py-2">
                              {user?.user_metadata?.specialization || "-"}
                            </div>
                          </div>
                        </>
                      )}

                      <div className="col-span-3 flex justify-end mt-4">
                        <button
                          onClick={() => setShowProfile(false)}
                          className="px-4 py-2 rounded-lg bg-primary text-white"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <NotificationBell />
            </div>
          </div>
        </header>

        <div className="bg-card/40 border-b border-border/50">
          <div className="px-8 py-6">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
            >
              <div>
                <h2 className="font-display text-3xl font-bold text-foreground tracking-tight">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {subtitle}
                  </p>
                )}
              </div>

              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </motion.div>
          </div>
        </div>

        <main className="flex-1 px-8 py-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      <SmartChatbot />
    </div>
  );
}