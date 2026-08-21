import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { StudentDashboard } from "./pages/StudentDashboard";
import { TeacherDashboard } from "./pages/TeacherDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { PendingNotice } from "./pages/PendingNotice";

// Role & Status Protected Route Wrappers
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { userProfile, role, status } = useAuth();

  if (!userProfile) {
    return <Navigate to="/login" replace />;
  }

  if (status === "pending") {
    return <Navigate to="/pending" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to proper role dashboard
    if (role === "admin") return <Navigate to="/admin" replace />;
    if (role === "teacher") return <Navigate to="/teacher" replace />;
    if (role === "student") return <Navigate to="/student" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Root Redirect Component
const HomeRedirect = () => {
  const { userProfile, role, status } = useAuth();
  if (!userProfile) return <Navigate to="/login" replace />;
  if (status === "pending") return <Navigate to="/pending" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "teacher") return <Navigate to="/teacher" replace />;
  if (role === "student") return <Navigate to="/student" replace />;
  return <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/pending" element={<PendingNotice />} />

              {/* Protected Role Routes */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher"
                element={
                  <ProtectedRoute allowedRoles={["teacher"]}>
                    <TeacherDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Default Fallback */}
              <Route path="*" element={<HomeRedirect />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
