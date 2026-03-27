// src/pages/Dashboard.js
import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { collection, query, getDocs, orderBy, limit, where } from "firebase/firestore";
import { MdPeople, MdAssignment, MdBook, MdCheckCircle, MdPending, MdWarning } from "react-icons/md";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { userRole, userData } = useAuth();
  const [stats, setStats] = useState({});
  const [recentJournals, setRecentJournals] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole && userData) {
      fetchDashboardData();
    }
  }, [userRole, userData]);

  async function fetchDashboardData() {
    try {
      if (userRole === "superadmin") {
        const [admins, interns, journals, tasks] = await Promise.allSettled([
          getDocs(collection(db, "admins")),
          getDocs(collection(db, "interns")),
          getDocs(query(collection(db, "journals"), orderBy("date", "desc"), limit(5))),
          getDocs(query(collection(db, "tasks"), orderBy("createdAt", "desc"), limit(5))),
        ]);

        const adminDocs = admins.status === "fulfilled" ? admins.value.docs : [];
        const internDocs = interns.status === "fulfilled" ? interns.value.docs : [];
        const journalDocs = journals.status === "fulfilled" ? journals.value.docs : [];
        const taskDocs = tasks.status === "fulfilled" ? tasks.value.docs : [];

        setStats({
          totalAdmins: adminDocs.length,
          pendingAdmins: adminDocs.filter(d => d.data().status === "pending").length,
          totalInterns: internDocs.length,
          activeInterns: internDocs.filter(d => d.data().status === "approved").length,
        });
        setRecentJournals(journalDocs.map(d => ({ id: d.id, ...d.data() })));
        setRecentTasks(taskDocs.map(d => ({ id: d.id, ...d.data() })));

      } else if (userRole === "admin" && userData?.uid) {
        const [interns, tasks] = await Promise.allSettled([
          getDocs(query(collection(db, "interns"), where("assignedAdmin", "==", userData.uid))),
          getDocs(query(collection(db, "tasks"), orderBy("createdAt", "desc"), limit(5))),
        ]);

        const internDocs = interns.status === "fulfilled" ? interns.value.docs : [];
        const taskDocs = tasks.status === "fulfilled" ? tasks.value.docs : [];

        setStats({
          myInterns: internDocs.length,
          pendingInterns: internDocs.filter(d => d.data().status === "pending").length,
        });
        setRecentTasks(taskDocs.map(d => ({ id: d.id, ...d.data() })));

      } else if (userRole === "intern" && userData?.uid) {
        const [journals] = await Promise.allSettled([
          getDocs(query(collection(db, "journals"), where("internId", "==", userData.uid), orderBy("date", "desc"), limit(5))),
        ]);

        const journalDocs = journals.status === "fulfilled" ? journals.value.docs : [];
        setStats({ totalJournals: journalDocs.length });
        setRecentJournals(journalDocs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (e) {
      console.error("Dashboard error:", e);
    }
    setLoading(false);
  }

  const statCards = {
    superadmin: [
      { label: "Total Admins", value: stats.totalAdmins || 0, color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", icon: <MdPeople /> },
      { label: "Pending Approvals", value: stats.pendingAdmins || 0, color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: <MdPending /> },
      { label: "Total Interns", value: stats.totalInterns || 0, color: "#3b82f6", bg: "rgba(59,130,246,0.1)", icon: <MdPeople /> },
      { label: "Active Interns", value: stats.activeInterns || 0, color: "#22c55e", bg: "rgba(34,197,94,0.1)", icon: <MdCheckCircle /> },
    ],
    admin: [
      { label: "My Interns", value: stats.myInterns || 0, color: "#3b82f6", bg: "rgba(59,130,246,0.1)", icon: <MdPeople /> },
      { label: "Pending Interns", value: stats.pendingInterns || 0, color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: <MdPending /> },
    ],
    intern: [
      { label: "Journals Submitted", value: stats.totalJournals || 0, color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", icon: <MdBook /> },
    ],
  };

  const cards = statCards[userRole] || [];

  return (
    <Layout title="Dashboard" subtitle={`Welcome back, ${userData?.name || "User"}`}>
      {loading ? (
        <div className="loading-center"><div className="spinner spinner-lg" /></div>
      ) : (
        <>
          {userRole === "intern" && userData?.endDate && (
            <div className="alert alert-warning" style={{ marginBottom: 24 }}>
              <MdWarning />
              <span>Your internship tenure ends on <strong>{userData.endDate}</strong>.</span>
            </div>
          )}

          <div className="stats-grid">
            {cards.map((card, i) => (
              <div className="stat-card" key={i}>
                <div className="stat-icon" style={{ background: card.bg, color: card.color }}>{card.icon}</div>
                <div className="stat-content">
                  <div className="stat-value">{card.value}</div>
                  <div className="stat-label">{card.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 8 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Recent Journals</span>
                <Link to={userRole === "intern" ? "/journal" : "/journals"} className="btn btn-secondary btn-sm">View All</Link>
              </div>
              {recentJournals.length === 0 ? (
                <div className="empty-state" style={{ padding: "30px 0" }}>
                  <div className="empty-state-icon">📔</div>
                  <p>No journals yet</p>
                </div>
              ) : recentJournals.map(j => (
                <div key={j.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{j.internName || "Intern"}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{j.date || "—"}</div>
                  </div>
                  <span className={`badge badge-${j.status === "approved" ? "success" : j.status === "rejected" ? "danger" : "warning"}`}>
                    {j.status || "Pending"}
                  </span>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Recent Tasks</span>
                <Link to={userRole === "intern" ? "/my-tasks" : "/tasks"} className="btn btn-secondary btn-sm">View All</Link>
              </div>
              {recentTasks.length === 0 ? (
                <div className="empty-state" style={{ padding: "30px 0" }}>
                  <div className="empty-state-icon">📋</div>
                  <p>No tasks yet</p>
                </div>
              ) : recentTasks.map(t => (
                <div key={t.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.team || "All"}</div>
                  </div>
                  <span className={`badge badge-${t.status === "completed" ? "success" : t.status === "ongoing" ? "info" : "warning"}`}>
                    {t.status || "Assigned"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
