// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import MeetingNotification from "./components/MeetingNotification";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admins from "./pages/Admins";
import Interns from "./pages/Interns";
import Tasks from "./pages/Tasks";
import Journal from "./pages/Journal";
import Journals from "./pages/Journals";
import MyTasks from "./pages/MyTasks";
import Profile from "./pages/Profile";
import WeeklyReview from "./pages/WeeklyReview";
import Leaves from "./pages/Leaves";
import Meetings from "./pages/Meetings";
import MeetingRequests from "./pages/MeetingRequests";
import Teams from "./pages/Teams";
import Pending from "./pages/Pending";

function LoadingScreen() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"var(--bg-primary)", flexDirection:"column", gap:16 }}>
      <div className="spinner spinner-lg" />
      <p style={{ color:"var(--text-muted)", fontSize:14, fontFamily:"'DM Sans', sans-serif" }}>Loading...</p>
    </div>
  );
}

// Shown to interns whose account exists but hasn't been approved yet
function InternPendingScreen() {
  const { userData, logout } = useAuth();
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg-primary)", padding:24 }}>
      <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border-light)", borderRadius:20, padding:"48px 40px", maxWidth:440, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:56, marginBottom:16 }}>⏳</div>
        <h2 style={{ fontFamily:"'Syne', sans-serif", fontSize:22, fontWeight:800, marginBottom:10, color:"var(--text-primary)" }}>
          Awaiting Approval
        </h2>
        <p style={{ fontSize:14, color:"var(--text-secondary)", lineHeight:1.8, marginBottom:24 }}>
          Welcome, <strong style={{ color:"var(--text-primary)" }}>{userData?.name}</strong>!<br />
          Your account has been created. Please wait for your admin or Super Admin to approve your profile before you can access the portal.
        </p>
        <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:10, padding:16, marginBottom:24, textAlign:"left" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:12, color:"var(--text-muted)" }}>NIN</span>
            <span className="badge badge-accent">{userData?.nin}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:12, color:"var(--text-muted)" }}>Team</span>
            <span className="badge badge-purple">{userData?.team}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, color:"var(--text-muted)" }}>Status</span>
            <span className="badge badge-warning">Pending Approval</span>
          </div>
        </div>
        <button
          onClick={logout}
          style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8, padding:"10px 24px", color:"#ef4444", fontFamily:"'DM Sans', sans-serif", fontWeight:600, cursor:"pointer", fontSize:14 }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userRole, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (userRole === "pending" || userRole === "pending_admin") return <Pending />;
  if (userRole === "intern_pending") return <InternPendingScreen />;
  if (userRole === "cancelled") return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg-primary)" }}>
      <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:16, padding:"40px 32px", maxWidth:400, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🚫</div>
        <h2 style={{ color:"var(--danger)", fontFamily:"'Syne', sans-serif", marginBottom:8 }}>Internship Cancelled</h2>
        <p style={{ color:"var(--text-secondary)", fontSize:14 }}>Your internship has been cancelled. Contact your admin for more details.</p>
      </div>
    </div>
  );
  if (allowedRoles && !allowedRoles.includes(userRole)) return <Navigate to="/dashboard" replace />;
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function AppRoutes() {
  const { currentUser, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <>
      {currentUser && <MeetingNotification />}
      <Routes>
        <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admins" element={<ProtectedRoute allowedRoles={["superadmin"]}><Admins /></ProtectedRoute>} />
        <Route path="/meeting-requests" element={<ProtectedRoute allowedRoles={["superadmin"]}><MeetingRequests /></ProtectedRoute>} />
        <Route path="/interns" element={<ProtectedRoute allowedRoles={["superadmin","admin"]}><Interns /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute allowedRoles={["superadmin","admin"]}><Tasks /></ProtectedRoute>} />
        <Route path="/journals" element={<ProtectedRoute allowedRoles={["superadmin","admin"]}><Journals /></ProtectedRoute>} />
        <Route path="/weekly-review" element={<ProtectedRoute allowedRoles={["superadmin","admin","intern"]}><WeeklyReview /></ProtectedRoute>} />
        <Route path="/leaves" element={<ProtectedRoute allowedRoles={["superadmin","admin"]}><Leaves /></ProtectedRoute>} />
        <Route path="/meetings" element={<ProtectedRoute allowedRoles={["superadmin","admin","intern"]}><Meetings /></ProtectedRoute>} />
        <Route path="/teams" element={<ProtectedRoute allowedRoles={["superadmin","admin"]}><Teams /></ProtectedRoute>} />
        <Route path="/journal" element={<ProtectedRoute allowedRoles={["intern"]}><Journal /></ProtectedRoute>} />
        <Route path="/my-tasks" element={<ProtectedRoute allowedRoles={["intern"]}><MyTasks /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute allowedRoles={["intern"]}><Profile /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
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
              style: { background:"var(--bg-card)", color:"var(--text-primary)", border:"1px solid var(--border-light)", fontFamily:"'DM Sans', sans-serif", fontSize:13 },
              success: { iconTheme: { primary:"#22c55e", secondary:"#000" } },
              error: { iconTheme: { primary:"#ef4444", secondary:"#fff" } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
