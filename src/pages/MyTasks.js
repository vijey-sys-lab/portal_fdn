// src/pages/MyTasks.js
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { MdAssignment, MdCheckCircle, MdPlayArrow, MdPause } from "react-icons/md";
import { format } from "date-fns";

export default function MyTasks() {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (userData && userData.uid) {
      fetchTasks();
    }
  }, [userData]);

  async function fetchTasks() {
    if (!userData || !userData.uid) return;
    try {
      const results = await Promise.allSettled([
        getDocs(query(collection(db, "tasks"), where("assignedTo", "array-contains", userData.uid))),
        userData.team ? getDocs(query(collection(db, "tasks"), where("team", "==", userData.team), where("assignType", "==", "team"))) : Promise.resolve({ docs: [] }),
        getDocs(query(collection(db, "tasks"), where("team", "==", "All Interns"), where("assignType", "==", "team"))),
      ]);

      const seen = new Set();
      const all = [];
      results.forEach(result => {
        if (result.status === "fulfilled") {
          const docs = result.value.docs || [];
          docs.forEach(d => {
            if (!seen.has(d.id)) {
              seen.add(d.id);
              all.push({ id: d.id, ...d.data() });
            }
          });
        }
      });

      all.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTasks(all);
    } catch (e) {
      console.error("Tasks error:", e);
    }
    setLoading(false);
  }

  async function updateStatus(task, status) {
    try {
      await updateDoc(doc(db, "tasks", task.id), { status, updatedAt: new Date() });
      toast.success(`Task marked as ${status}`);
      fetchTasks();
    } catch {
      toast.error("Error updating task");
    }
  }

  const statusColors = {
    completed: "success", ongoing: "info", assigned: "accent", paused: "warning"
  };

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  const counts = {
    all: tasks.length,
    assigned: tasks.filter(t => t.status === "assigned").length,
    ongoing: tasks.filter(t => t.status === "ongoing").length,
    completed: tasks.filter(t => t.status === "completed").length,
    paused: tasks.filter(t => t.status === "paused").length,
  };

  const tabs = [
    { key: "all", label: "All Tasks" },
    { key: "assigned", label: "New" },
    { key: "ongoing", label: "Ongoing" },
    { key: "completed", label: "Completed" },
    { key: "paused", label: "Paused" },
  ];

  if (!userData) {
    return <Layout title="My Tasks"><div className="loading-center"><div className="spinner spinner-lg" /></div></Layout>;
  }

  return (
    <Layout title="My Tasks" subtitle="View and update your assigned tasks">
      <div className="page-header">
        <div>
          <h2>My Tasks</h2>
          <p>Tasks assigned to you — including team-wide and individual assignments</p>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 16px", fontSize: 13, color: "var(--text-secondary)" }}>
          Team: <strong style={{ color: "var(--accent)" }}>{userData?.team || "—"}</strong>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}><MdAssignment /></div>
          <div className="stat-content"><div className="stat-value">{counts.all}</div><div className="stat-label">Total</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(245,166,35,0.1)", color: "var(--accent)" }}><MdPlayArrow /></div>
          <div className="stat-content"><div className="stat-value">{counts.ongoing}</div><div className="stat-label">Ongoing</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}><MdCheckCircle /></div>
          <div className="stat-content"><div className="stat-value">{counts.completed}</div><div className="stat-label">Completed</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}><MdPause /></div>
          <div className="stat-content"><div className="stat-value">{counts.paused}</div><div className="stat-label">Paused</div></div>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.key} className={`tab-btn${filter === t.key ? " active" : ""}`} onClick={() => setFilter(t.key)}>
            {t.label} <span style={{ opacity: 0.7, marginLeft: 4 }}>({counts[t.key]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner spinner-lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><MdAssignment /></div>
          <h3>{filter === "all" ? "No Tasks Assigned Yet" : `No ${filter} tasks`}</h3>
          <p>{filter === "all" ? "Tasks assigned by your admin will appear here" : "No tasks in this category"}</p>
        </div>
      ) : (
        filtered.map(task => (
          <div className="card" key={task.id} style={{
            marginBottom: 12,
            borderLeft: `4px solid var(--${task.status === "completed" ? "success" : task.status === "ongoing" ? "info" : task.status === "paused" ? "warning" : "accent"})`
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>{task.title}</h3>
                  <span className={`badge badge-${statusColors[task.status] || "accent"}`}>{task.status}</span>
                  {task.assignType === "team" && <span className="badge badge-purple" style={{ fontSize: 10 }}>Team Task</span>}
                  {task.assignType === "specific" && <span className="badge badge-info" style={{ fontSize: 10 }}>Assigned to You</span>}
                </div>
                {task.description && (
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 10 }}>{task.description}</p>
                )}
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Team: <span style={{ color: "var(--text-secondary)" }}>{task.team}</span></span>
                  {task.deadline ? (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Deadline: <span style={{
                        color: task.status !== "completed" && task.deadline < today ? "var(--danger)" : "var(--text-secondary)",
                        fontWeight: task.status !== "completed" && task.deadline < today ? 700 : 400
                      }}>
                        {task.deadline}{task.status !== "completed" && task.deadline < today && " ⚠️ Overdue"}
                      </span>
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No deadline</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                {task.status === "assigned" && <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(task, "ongoing")}><MdPlayArrow /> Start</button>}
                {task.status === "ongoing" && <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(task, "paused")}><MdPause /> Pause</button>}
                {task.status === "paused" && <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(task, "ongoing")}><MdPlayArrow /> Resume</button>}
                {task.status !== "completed" && <button className="btn btn-success btn-sm" onClick={() => updateStatus(task, "completed")}><MdCheckCircle /> Complete</button>}
                {task.status === "completed" && <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>✓ Done</span>}
              </div>
            </div>
          </div>
        ))
      )}
    </Layout>
  );
}
