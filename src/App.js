// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admins from "./pages/Admins";
import Interns from "./pages/Interns";
import Tasks from "./pages/Tasks";
import Journal from "./pages/Journal";
import Journals from "./pages/Journals";
import MyTasks from "./pages/MyTasks";
import Profile from "./pages/Profile";
import Reviews from "./pages/Reviews";
import Leaves from "./pages/Leaves";
import Pending from "./pages/Pending";

function LoadingScreen() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: "var(--bg-primary)", flexDirection: "column", gap: 16
    }}>
      <div className="spinner spinner-lg" />
      <p style={{ color: "var(--text-muted)", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Loading...</p>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (userRole === "pending") return <Pending />;
  if (allowedRoles && !allowedRoles.includes(userRole)) return <Navigate to="/dashboard" replace />;

  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function AppRoutes() {
  const { currentUser, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={
        !currentUser ? <Login /> : <Navigate to="/dashboard" replace />
      } />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/admins" element={<ProtectedRoute allowedRoles={["superadmin"]}><Admins /></ProtectedRoute>} />
      <Route path="/interns" element={<ProtectedRoute allowedRoles={["superadmin","admin"]}><Interns /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute allowedRoles={["superadmin","admin"]}><Tasks /></ProtectedRoute>} />
      <Route path="/journals" element={<ProtectedRoute allowedRoles={["superadmin","admin"]}><Journals /></ProtectedRoute>} />
      <Route path="/reviews" element={<ProtectedRoute allowedRoles={["superadmin","admin"]}><Reviews /></ProtectedRoute>} />
      <Route path="/leaves" element={<ProtectedRoute allowedRoles={["superadmin","admin"]}><Leaves /></ProtectedRoute>} />
      <Route path="/journal" element={<ProtectedRoute allowedRoles={["intern"]}><Journal /></ProtectedRoute>} />
      <Route path="/my-tasks" element={<ProtectedRoute allowedRoles={["intern"]}><MyTasks /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute allowedRoles={["intern"]}><Profile /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-light)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
              },
              success: { iconTheme: { primary: "#22c55e", secondary: "#000" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
