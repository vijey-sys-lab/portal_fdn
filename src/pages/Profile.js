// src/pages/Profile.js
import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { MdDownload, MdPerson, MdEmail, MdPhone, MdCalendarToday, MdSchool, MdGroup } from "react-icons/md";
import jsPDF from "jspdf";

function generateOfferLetter(intern) {
  const pdf = new jsPDF();
  const today = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(245, 166, 35);
  pdf.text("BOSS FOUNDATION", 105, 25, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Internship Management Portal", 105, 33, { align: "center" });

  pdf.setDrawColor(245, 166, 35);
  pdf.setLineWidth(0.8);
  pdf.line(20, 40, 190, 40);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(30, 30, 30);
  pdf.text("OFFER LETTER", 105, 55, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(60, 60, 60);
  pdf.text(`Date: ${today}`, 20, 70);
  pdf.text(`Ref No: BF/${new Date().getFullYear()}/${Math.random().toString(36).slice(2,7).toUpperCase()}`, 20, 78);

  pdf.setFont("helvetica", "bold");
  pdf.text("To,", 20, 92);
  pdf.text(`${intern.name}`, 20, 100);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Email: ${intern.email}`, 20, 108);
  if (intern.college) pdf.text(`College: ${intern.college}`, 20, 116);

  pdf.setLineWidth(0.3);
  pdf.setDrawColor(200, 200, 200);
  pdf.line(20, 122, 190, 122);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Subject: Internship Offer Letter", 20, 132);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  const body = `Dear ${intern.name},\n\nWe are pleased to offer you an internship position at BOSS Foundation in the ${intern.team} team.\n\nInternship Details:\n• Domain: ${intern.team}\n• Intern ID (NIN): ${intern.nin}\n• Duration: ${intern.startDate} to ${intern.endDate}\n\nExpectations:\n- Submit Daily Journals with work drive links\n- Complete assigned tasks within deadlines\n- Participate actively in team reviews\n- Maintain professional conduct\n\nWelcome to BOSS Foundation! We look forward to your contribution.`;

  const lines = pdf.splitTextToSize(body, 170);
  pdf.text(lines, 20, 145);

  pdf.setFont("helvetica", "bold");
  pdf.text("For BOSS Foundation,", 20, 240);
  pdf.setFont("helvetica", "normal");
  pdf.text("Authorized Signatory", 20, 250);

  pdf.save(`Offer_Letter_${intern.name.replace(/ /g,"_")}.pdf`);
}

export default function Profile() {
  const { userData, userRole } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [tasksSnap, journalsSnap] = await Promise.all([
        getDocs(query(collection(db, "tasks"), where("assignedTo", "array-contains", userData.uid))),
        getDocs(query(collection(db, "journals"), where("internId", "==", userData.uid))),
      ]);
      setTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setJournals(journalsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const startDate = userData?.startDate ? new Date(userData.startDate) : null;
  const canDownloadOffer = startDate && new Date() >= startDate;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const progress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Layout title="My Profile" subtitle="Your internship profile and progress">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          {userData?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2)}
        </div>
        <div className="profile-info" style={{ flex: 1 }}>
          <h2>{userData?.name}</h2>
          <p>{userData?.nin} · {userData?.team} Intern</p>
          <div className="profile-meta">
            <span className="profile-meta-item"><MdEmail />{userData?.email}</span>
            {userData?.phone && <span className="profile-meta-item"><MdPhone />{userData?.phone}</span>}
            {userData?.college && <span className="profile-meta-item"><MdSchool />{userData?.college}</span>}
            {userData?.startDate && <span className="profile-meta-item"><MdCalendarToday />Started: {userData.startDate}</span>}
            {userData?.endDate && <span className="profile-meta-item"><MdCalendarToday />Ends: {userData.endDate}</span>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {canDownloadOffer ? (
            <button className="btn btn-primary" onClick={() => generateOfferLetter(userData)}>
              <MdDownload /> Offer Letter
            </button>
          ) : (
            <button className="btn btn-secondary" disabled title="Available on tenure start date">
              <MdDownload /> Offer Letter
            </button>
          )}
          <span className={`badge badge-${userData?.status === "approved" ? "success" : userData?.status === "cancelled" ? "danger" : "warning"}`} style={{ textAlign: "center" }}>
            {userData?.status}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>📋</div>
          <div className="stat-content">
            <div className="stat-value">{totalTasks}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>✅</div>
          <div className="stat-content">
            <div className="stat-value">{completedTasks}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>📔</div>
          <div className="stat-content">
            <div className="stat-value">{journals.length}</div>
            <div className="stat-label">Journals</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(245,166,35,0.1)", color: "var(--accent)" }}>📈</div>
          <div className="stat-content">
            <div className="stat-value">{progress}%</div>
            <div className="stat-label">Progress</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Task Completion Progress</div>
        <div style={{ background: "var(--bg-primary)", borderRadius: 20, height: 10, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, var(--accent), #22c55e)`, borderRadius: 20, transition: "width 0.5s ease" }} />
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{completedTasks} of {totalTasks} tasks completed</div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn${activeTab === "tasks" ? " active" : ""}`} onClick={() => setActiveTab("tasks")}>Tasks ({totalTasks})</button>
        <button className={`tab-btn${activeTab === "journals" ? " active" : ""}`} onClick={() => setActiveTab("journals")}>Journals ({journals.length})</button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : activeTab === "tasks" ? (
        <div className="card">
          {tasks.length === 0 ? (
            <div className="empty-state" style={{ padding: "30px 0" }}><p>No tasks assigned yet</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Task</th><th>Team</th><th>Deadline</th><th>Status</th></tr></thead>
                <tbody>
                  {tasks.map(t => (
                    <tr key={t.id}>
                      <td><div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div></td>
                      <td><span className="badge badge-purple">{t.team}</span></td>
                      <td style={{ fontSize: 13 }}>{t.deadline || "—"}</td>
                      <td><span className={`badge badge-${t.status === "completed" ? "success" : t.status === "ongoing" ? "info" : "warning"}`}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div>
          {journals.length === 0 ? (
            <div className="empty-state"><p>No journals submitted yet</p></div>
          ) : journals.map(j => (
            <div className="dj-card" key={j.id}>
              <div className="dj-card-header">
                <div className="dj-date">{j.date}</div>
                <span className={`badge badge-${j.status === "approved" ? "success" : j.status === "rejected" ? "danger" : "warning"}`}>{j.status}</span>
              </div>
              <div className="dj-content">{j.content?.slice(0, 200)}{j.content?.length > 200 ? "..." : ""}</div>
              {j.adminRemark && (
                <div className="remark-box approved" style={{ marginTop: 8 }}>
                  <div className="remark-label">Admin Remark</div>
                  <div className="remark-text">{j.adminRemark.text}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
