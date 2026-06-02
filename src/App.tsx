import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GuestRoute } from "@/components/GuestRoute";
import { AuthProvider } from "@/contexts/AuthContext";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import Assignments from "./pages/Assignments";
import StudentProfile from "./pages/StudentProfile";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherProfile from "./pages/TeacherProfile";
import TeacherTasks from "./pages/TeacherTasks";
import TeacherSettings from "./pages/TeacherSettings";
import StudentSettings from "./pages/StudentSettings";
import NotFound from "./pages/NotFound";
import StudentCourses from "./pages/StudentCourses";
import StudentCourseDetails from "./pages/StudentCourseDetails";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />

            <Routes>
              <Route path="/" element={<Index />} />

              <Route
                path="/auth"
                element={
                  <GuestRoute>
                    <Auth />
                  </GuestRoute>
                }
              />

              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute allowedRole="student">
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/assignments"
                element={
                  <ProtectedRoute allowedRole="student">
                    <Assignments />
                  </ProtectedRoute>
                }
              />
              <Route
  path="/student/courses"
  element={
    <ProtectedRoute allowedRole="student">
      <StudentCourses />
    </ProtectedRoute>
  }
/>
<Route
  path="/student/courses/:courseId"
  element={
    <ProtectedRoute allowedRole="student">
      <StudentCourseDetails />
    </ProtectedRoute>
  }
/>

              <Route
                path="/student/profile"
                element={
                  <ProtectedRoute allowedRole="student">
                    <StudentProfile />
                  </ProtectedRoute>
                }
              />
              <Route
  path="/student/settings"
  element={
    <ProtectedRoute allowedRole="student">
      <StudentSettings />
    </ProtectedRoute>
  }
/>

              <Route
                path="/teacher/dashboard"
                element={
                  <ProtectedRoute allowedRole="teacher">
                    <TeacherDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/teacher/tasks"
                element={
                  <ProtectedRoute allowedRole="teacher">
                    <TeacherTasks />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/teacher/settings"
                element={
                  <ProtectedRoute allowedRole="teacher">
                    <TeacherSettings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/teacher/profile"
                element={
                  <ProtectedRoute allowedRole="teacher">
                    <TeacherProfile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student"
                element={<Navigate to="/student/dashboard" replace />}
              />

              <Route
                path="/teacher"
                element={<Navigate to="/teacher/dashboard" replace />}
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;