// src/pages/WeeklyReview.js
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { db } from "../firebase";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { MdAdd, MdClose, MdRateReview, MdCheck, MdPending } from "react-icons/md";
import { getISOWeek, getYear } from "date-fns";

function getCurrentWeek() {
  const now = new Date();
  return `${getYear(now)}-W${String(getISOWeek(now)).padStart(2, "0")}`;
}

export default function WeeklyReview() {
  const { userRole, userData } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [remarkModal, setRemarkModal] = useState(null);
  const [remarkText, setRemarkText] = useState("");
  const [remarkStatus, setRemarkStatus] = useState("approved");
  const [form, setForm] = useState({ week: getCurrentWeek(), tasksDone: "", learnings: "", selfRating: 4, challenges: "" });
  const [saving, setSaving] = useState(false);
  const [weekFilter, setWeekFilter] = useState(getCurrentWeek());

  const currentWeek = getCurrentWeek();

  useEffect(() => { fetchReviews(); }, [weekFilter]);

  async function fetchReviews() {
    setLoading(true);
    try {
      let q;
      if (userRole === "superadmin") {
        q = weekFilter === "all"
          ? query(collection(db, "weeklyReviews"), orderBy("createdAt", "desc"))
          : query(collection(db, "weeklyReviews"), where("week", "==", weekFilter), orderBy("createdAt", "desc"));
      } else {
        q = query(collection(db, "weeklyReviews"), where("submittedById", "==", userData.uid), orderBy("createdAt", "desc"));
      }
      const snap = await getDocs(q);
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleSubmit() {
    if (!form.tasksDone || !form.learnings) { toast.error("Fill required fields"); return; }
    const exists = reviews.find(r => r.week === form.week && r.submittedById === userData.uid);
    if (exists) { toast.error("Already submitted for this week!"); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, "weeklyReviews"), {
        week: form.week, tasksDone: form.tasksDone, learnings: form.learnings,
        selfRating: form.selfRating, challenges: form.challenges,
        submittedById: userData.uid, submittedByName: userData.name,
        submittedByRole: userRole === "admin" ? "admin" : "intern",
        submittedByTeam: userData.team || "",
        saStatus: "pending", saRemark: null, createdAt: serverTimestamp(),
      });
      toast.success("Weekly review submitted!");
      setShowModal(false);
      setForm({ week: getCurrentWeek(), tasksDone: "", learnings: "", selfRating: 4, challenges: "" });
      fetchReviews();
    } catch (e) { toast.error("Error submitting"); }
    setSaving(false);
  }

  async function handleSARemark() {
    if (!remarkText.trim()) { toast.error("Enter a remark"); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, "weeklyReviews", remarkModal.id), {
        saStatus: remarkStatus, saRemark: remarkText,
        saReviewedBy: userData.name, saReviewedAt: serverTimestamp(),
      });
      toast.success("Remark added!");
      setRemarkModal(null); setRemarkText(""); fetchReviews();
    } catch { toast.error("Error"); }
    setSaving(false);
  }

  const pendingCount = reviews.filter(r => r.saStatus === "pending").length;
  const weekOptions = [];
  for (let i = 0; i < 10; i++) {
    const d = new Date(); d.setDate(d.getDate() - i * 7);
    const key = `${getYear(d)}-W${String(getISOWeek(d)).padStart(2, "0")}`;
    if (!weekOptions.find(x => x.key === key)) weekOptions.push({ key });
  }

  return (
    <Layout title="Weekly Review" subtitle="Weekly knowledge and task review">
      <div className="page-header">
        <div><h2>Weekly Review</h2><p>Submit your weekly learnings and self-assessment</p></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {userRole === "superadmin" && pendingCount > 0 && (
            <div style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "var(--warning)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <MdPending /> {pendingCount} pending
            </div>
          )}
          {(userRole === "intern" || userRole === "admin") && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}><MdAdd /> Submit This Week</button>
          )}
        </div>
      </div>

      {userRole === "superadmin" && (
        <div style={{ marginBottom: 16 }}>
          <select className="form-select" style={{ width: "auto", minWidth: 200 }} value={weekFilter} onChange={e => setWeekFilter(e.target.value)}>
            <option value="all">All Weeks</option>
            {weekOptions.map(w => <option key={w.key} value={w.key}>{w.key === currentWeek ? `${w.key} (Current)` : w.key}</option>)}
          </select>
        </div>
      )}

      {loading ? <div className="loading-center"><div className="spinner" /></div>
      : reviews.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon"><MdRateReview /></div><h3>No Reviews Yet</h3></div>
      ) : reviews.map(r => (
        <div key={r.id} className="card" style={{ marginBottom: 12, borderLeft: `4px solid var(--${r.saStatus === "approved" ? "success" : r.saStatus === "rejected" ? "danger" : "warning"})` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-glow)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--accent)", fontSize: 13 }}>{r.submittedByName?.charAt(0)}</div>
                <div><div style={{ fontWeight: 700 }}>{r.submittedByName}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.submittedByRole} · {r.week}</div></div>
                <div style={{ display: "flex", gap: 2 }}>{[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= r.selfRating ? "var(--accent)" : "var(--border)", fontSize: 16 }}>★</span>)}</div>
                <span className={`badge badge-${r.saStatus === "approved" ? "success" : r.saStatus === "rejected" ? "danger" : "warning"}`}>{r.saStatus}</span>
              </div>
              <div style={{ background: "var(--bg-primary)", borderRadius: 8, padding: "10px 14px", marginBottom: 8, borderLeft: "3px solid var(--info)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Tasks Done</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{r.tasksDone}</div>
              </div>
              <div style={{ background: "var(--bg-primary)", borderRadius: 8, padding: "10px 14px", marginBottom: 8, borderLeft: "3px solid var(--purple)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Learnings</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{r.learnings}</div>
              </div>
              {r.saRemark && (
                <div style={{ background: "var(--bg-primary)", borderRadius: 8, padding: "10px 14px", borderLeft: "3px solid var(--success)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--purple)", textTransform: "uppercase", marginBottom: 4 }}>⭐ SA Remark</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{r.saRemark}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>— {r.saReviewedBy}</div>
                </div>
              )}
            </div>
            {userRole === "superadmin" && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setRemarkModal(r); setRemarkText(r.saRemark || ""); setRemarkStatus(r.saStatus || "approved"); }}>
                <MdRateReview /> {r.saRemark ? "Edit" : "Remark"}
              </button>
            )}
          </div>
        </div>
      ))}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header"><span className="modal-title">Submit Weekly Review</span><button className="modal-close" onClick={() => setShowModal(false)}><MdClose /></button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Week *</label><select className="form-select" value={form.week} onChange={e => setForm({...form, week: e.target.value})}>{weekOptions.map(w => <option key={w.key} value={w.key}>{w.key === currentWeek ? `${w.key} (Current)` : w.key}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Tasks Completed This Week *</label><textarea className="form-textarea" value={form.tasksDone} onChange={e => setForm({...form, tasksDone: e.target.value})} placeholder="List tasks completed..." /></div>
              <div className="form-group"><label className="form-label">Key Learnings *</label><textarea className="form-textarea" value={form.learnings} onChange={e => setForm({...form, learnings: e.target.value})} placeholder="What did you learn?" /></div>
              <div className="form-group"><label className="form-label">Challenges Faced</label><textarea className="form-textarea" style={{ minHeight: 80 }} value={form.challenges} onChange={e => setForm({...form, challenges: e.target.value})} placeholder="Any blockers?" /></div>
              <div className="form-group">
                <label className="form-label">Self Rating</label>
                <div style={{ display: "flex", gap: 8 }}>{[1,2,3,4,5].map(s => <button key={s} type="button" onClick={() => setForm({...form, selfRating: s})} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 32, color: s <= form.selfRating ? "var(--accent)" : "var(--border)" }}>★</button>)}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? "Submitting..." : "Submit Review"}</button>
            </div>
          </div>
        </div>
      )}

      {remarkModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRemarkModal(null)}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">SA Remark</span><button className="modal-close" onClick={() => setRemarkModal(null)}><MdClose /></button></div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}><div style={{ fontWeight: 700 }}>{remarkModal.submittedByName}</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{remarkModal.week}</div></div>
              <div className="form-group">
                <label className="form-label">Decision</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" className={`btn btn-sm ${remarkStatus === "approved" ? "btn-success" : "btn-secondary"}`} onClick={() => setRemarkStatus("approved")}><MdCheck /> Approve</button>
                  <button type="button" className={`btn btn-sm ${remarkStatus === "rejected" ? "btn-danger" : "btn-secondary"}`} onClick={() => setRemarkStatus("rejected")}><MdClose /> Reject</button>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Remark *</label><textarea className="form-textarea" value={remarkText} onChange={e => setRemarkText(e.target.value)} placeholder="Your feedback..." /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRemarkModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSARemark} disabled={saving}>{saving ? "Saving..." : "Submit"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
