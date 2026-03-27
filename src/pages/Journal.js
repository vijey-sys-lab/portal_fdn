// src/pages/Journal.js
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { db } from "../firebase";
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { MdAdd, MdClose, MdLink, MdBook, MdCalendarToday, MdBeachAccess } from "react-icons/md";
import { format } from "date-fns";

export default function Journal() {
  const { userData } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const todayDisplay = format(new Date(), "EEEE, dd MMMM yyyy");

  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [form, setForm] = useState({ content: "", driveLink: "", tasksDone: "" });
  const [leaveForm, setLeaveForm] = useState({ fromDate: today, toDate: today, reason: "", type: "sick" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userData && userData.uid) {
      fetchJournals();
    }
  }, [userData]);

  async function fetchJournals() {
    if (!userData || !userData.uid) return;
    try {
      const snap = await getDocs(query(
        collection(db, "journals"),
        where("internId", "==", userData.uid),
        orderBy("date", "desc")
      ));
      setJournals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Journals fetch error:", e);
    }
    setLoading(false);
  }

  const alreadySubmittedToday = journals.some(j => j.date === today);

  async function handleSubmit() {
    if (!userData || !userData.uid) { toast.error("User not loaded yet"); return; }
    if (!form.content) { toast.error("Please write your journal content"); return; }
    if (alreadySubmittedToday) { toast.error("Already submitted today!"); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, "journals"), {
        internId: userData.uid,
        internName: userData.name || "Intern",
        internTeam: userData.team || "General",
        date: today,
        content: form.content,
        driveLink: form.driveLink || "",
        tasksDone: form.tasksDone || "",
        status: "pending",
        adminRemark: null,
        superadminRemark: null,
        createdAt: serverTimestamp(),
      });
      toast.success("Journal submitted!");
      setShowModal(false);
      setForm({ content: "", driveLink: "", tasksDone: "" });
      fetchJournals();
    } catch (e) {
      console.error(e);
      toast.error("Error submitting journal");
    }
    setSaving(false);
  }

  async function handleLeaveApply() {
    if (!userData || !userData.uid) { toast.error("User not loaded yet"); return; }
    if (!leaveForm.reason.trim()) { toast.error("Please enter leave reason"); return; }
    if (leaveForm.fromDate > leaveForm.toDate) { toast.error("From date cannot be after To date"); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, "leaves"), {
        internId: userData.uid,
        internName: userData.name || "Intern",
        internTeam: userData.team || "General",
        fromDate: leaveForm.fromDate,
        toDate: leaveForm.toDate,
        reason: leaveForm.reason,
        type: leaveForm.type,
        status: "pending",
        adminRemark: null,
        createdAt: serverTimestamp(),
      });
      toast.success("Leave application submitted!");
      setShowLeaveModal(false);
      setLeaveForm({ fromDate: today, toDate: today, reason: "", type: "sick" });
    } catch (e) {
      console.error(e);
      toast.error("Error applying leave");
    }
    setSaving(false);
  }

  if (!userData) {
    return <Layout title="Daily Journal"><div className="loading-center"><div className="spinner spinner-lg" /></div></Layout>;
  }

  return (
    <Layout title="Daily Journal" subtitle="Your internship journal entries">
      <div className="page-header">
        <div>
          <h2>My Daily Journal</h2>
          <p>Today: <strong style={{ color: "var(--accent)" }}>{todayDisplay}</strong></p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowLeaveModal(true)}>
            <MdBeachAccess /> Apply Leave
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={alreadySubmittedToday}>
            <MdAdd /> {alreadySubmittedToday ? "Already Submitted Today" : "Add Today's Journal"}
          </button>
        </div>
      </div>

      {alreadySubmittedToday && (
        <div className="alert alert-success" style={{ marginBottom: 20 }}>
          ✅ Journal submitted for today ({todayDisplay})
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner spinner-lg" /></div>
      ) : journals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📔</div>
          <h3>No Journal Entries Yet</h3>
          <p>Start documenting your internship journey</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
            <MdAdd /> Add First Entry
          </button>
        </div>
      ) : (
        journals.map(j => (
          <div className="dj-card" key={j.id}>
            <div className="dj-card-header">
              <div>
                <div className="dj-date" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MdCalendarToday style={{ color: "var(--accent)", fontSize: 15 }} />
                  {j.date}
                  {j.date === today && <span className="badge badge-success" style={{ fontSize: 10 }}>Today</span>}
                </div>
                <div className="dj-meta">
                  {j.createdAt?.toDate ? format(j.createdAt.toDate(), "dd MMM yyyy, hh:mm a") : "—"}
                </div>
              </div>
              <span className={`badge badge-${j.status === "approved" ? "success" : j.status === "rejected" ? "danger" : "warning"}`}>
                {j.status || "Pending"}
              </span>
            </div>

            {j.tasksDone && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Tasks Completed</div>
                <div style={{ fontSize: 13, color: "var(--accent)" }}>{j.tasksDone}</div>
              </div>
            )}

            <div className="dj-content">{j.content}</div>

            {j.driveLink && (
              <a href={j.driveLink} target="_blank" rel="noreferrer" className="dj-link">
                <MdLink /> View Work (Drive)
              </a>
            )}

            {j.adminRemark && (
              <div className="remark-box approved" style={{ marginTop: 10 }}>
                <div className="remark-label">Admin Remark</div>
                <div className="remark-text">{j.adminRemark.text || j.adminRemark}</div>
                {j.adminRemark.byName && <div className="remark-by">— {j.adminRemark.byName}</div>}
              </div>
            )}

            {j.superadminRemark && (
              <div className="remark-box" style={{ marginTop: 8, borderLeftColor: "var(--purple)" }}>
                <div className="remark-label" style={{ color: "var(--purple)" }}>Super Admin Remark</div>
                <div className="remark-text">{j.superadminRemark.text || j.superadminRemark}</div>
                {j.superadminRemark.byName && <div className="remark-by">— {j.superadminRemark.byName}</div>}
              </div>
            )}
          </div>
        ))
      )}

      {/* Journal Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">Today's Journal</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--accent)", fontWeight: 600 }}>
                <MdCalendarToday /> {todayDisplay}
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400, marginLeft: 4 }}>(auto-filled)</span>
              </div>
              <div className="form-group">
                <label className="form-label">Tasks Completed Today</label>
                <input className="form-input" value={form.tasksDone} onChange={e => setForm({...form, tasksDone: e.target.value})} placeholder="e.g., Completed UI design, Fixed bug..." />
              </div>
              <div className="form-group">
                <label className="form-label">Journal Content *</label>
                <textarea className="form-textarea" style={{ minHeight: 160 }} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="What did you work on today? What did you learn?" />
              </div>
              <div className="form-group">
                <label className="form-label">Work Drive Link</label>
                <div style={{ position: "relative" }}>
                  <MdLink style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input className="form-input" style={{ paddingLeft: 36 }} value={form.driveLink} onChange={e => setForm({...form, driveLink: e.target.value})} placeholder="https://drive.google.com/..." />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}} /> Submitting...</> : <><MdBook /> Submit</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowLeaveModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Apply for Leave</span>
              <button className="modal-close" onClick={() => setShowLeaveModal(false)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Leave Type</label>
                <select className="form-select" value={leaveForm.type} onChange={e => setLeaveForm({...leaveForm, type: e.target.value})}>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="emergency">Emergency Leave</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">From Date *</label>
                  <input className="form-input" type="date" value={leaveForm.fromDate} onChange={e => setLeaveForm({...leaveForm, fromDate: e.target.value})} min={today} />
                </div>
                <div className="form-group">
                  <label className="form-label">To Date *</label>
                  <input className="form-input" type="date" value={leaveForm.toDate} onChange={e => setLeaveForm({...leaveForm, toDate: e.target.value})} min={leaveForm.fromDate} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Reason *</label>
                <textarea className="form-textarea" value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} placeholder="Explain your reason for leave..." />
              </div>
              <div className="alert alert-warning">Leave applications will be reviewed by your admin.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowLeaveModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleLeaveApply} disabled={saving}>
                {saving ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}} /> Submitting...</> : <><MdBeachAccess /> Apply Leave</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
