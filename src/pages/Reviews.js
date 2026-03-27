// src/pages/Reviews.js
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { db } from "../firebase";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { MdAdd, MdClose, MdRateReview, MdSearch, MdCheck, MdPending } from "react-icons/md";
import { format, getISOWeek, getYear } from "date-fns";

function getCurrentWeek() {
  const now = new Date();
  return `${getYear(now)}-W${String(getISOWeek(now)).padStart(2, "0")}`;
}

function getWeekLabel(weekStr) {
  if (!weekStr) return "";
  try {
    const [year, w] = weekStr.split("-W");
    const jan4 = new Date(Number(year), 0, 4);
    const startDay = new Date(jan4);
    startDay.setDate(jan4.getDate() - jan4.getDay() + 1 + (Number(w) - 1) * 7);
    const endDay = new Date(startDay);
    endDay.setDate(startDay.getDate() + 6);
    return `${format(startDay, "dd MMM")} – ${format(endDay, "dd MMM yyyy")}`;
  } catch { return weekStr; }
}

export default function Reviews() {
  const { userRole, userData } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [superRemarkModal, setSuperRemarkModal] = useState(null);
  const [superRemark, setSuperRemark] = useState("");
  const [superStatus, setSuperStatus] = useState("approved");
  const [search, setSearch] = useState("");
  const [weekFilter, setWeekFilter] = useState(getCurrentWeek());
  const [form, setForm] = useState({ internId: "", week: getCurrentWeek(), performance: "good", comments: "", rating: 4 });
  const [saving, setSaving] = useState(false);

  const currentWeek = getCurrentWeek();

  useEffect(() => { fetchData(); }, [weekFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const [reviewsSnap, internsSnap] = await Promise.all([
        getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "interns"), where("status", "==", "approved"))),
      ]);
      let reviewsData = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (weekFilter !== "all") reviewsData = reviewsData.filter(r => r.week === weekFilter);
      if (userRole === "admin") {
        const myUids = internsSnap.docs.filter(d => d.data().assignedAdmin === userData.uid).map(d => d.data().uid);
        reviewsData = reviewsData.filter(r => myUids.includes(r.internId));
      }
      setReviews(reviewsData);
      setInterns(internsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); toast.error("Error loading reviews"); }
    setLoading(false);
  }

  async function handleSave() {
    if (!form.internId || !form.week || !form.comments) { toast.error("Fill all required fields"); return; }
    const exists = reviews.find(r => r.internId === form.internId && r.week === form.week);
    if (exists) { toast.error("Review already exists for this intern this week!"); return; }
    setSaving(true);
    const intern = interns.find(i => i.uid === form.internId);
    try {
      await addDoc(collection(db, "reviews"), {
        ...form,
        internName: intern?.name,
        internTeam: intern?.team,
        reviewerName: userData?.name || "Admin",
        reviewerRole: userRole,
        superadminRemark: null,
        superadminStatus: "pending",
        createdAt: serverTimestamp(),
      });
      toast.success("Review submitted — awaiting Super Admin review");
      setShowModal(false);
      setForm({ internId: "", week: getCurrentWeek(), performance: "good", comments: "", rating: 4 });
      fetchData();
    } catch (e) { toast.error("Error saving review"); }
    setSaving(false);
  }

  async function handleSuperRemark() {
    if (!superRemark.trim()) { toast.error("Enter a remark"); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, "reviews", superRemarkModal.id), {
        superadminRemark: superRemark,
        superadminStatus: superStatus,
        superadminReviewedBy: userData?.name,
        superadminReviewedAt: serverTimestamp(),
      });
      toast.success("Super Admin remark added!");
      setSuperRemarkModal(null);
      setSuperRemark("");
      fetchData();
    } catch { toast.error("Error"); }
    setSaving(false);
  }

  const filtered = reviews.filter(r =>
    r.internName?.toLowerCase().includes(search.toLowerCase()) ||
    r.internTeam?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = reviews.filter(r => r.superadminStatus === "pending").length;
  const performanceColors = { excellent: "success", good: "info", average: "warning", poor: "danger" };

  const weekOptions = [];
  for (let i = 0; i < 8; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const key = `${getYear(d)}-W${String(getISOWeek(d)).padStart(2, "0")}`;
    if (!weekOptions.find(x => x.key === key)) weekOptions.push({ key, label: `${key} (${getWeekLabel(key)})` });
  }

  return (
    <Layout title="Weekly Reviews" subtitle="Manage intern weekly performance reviews">
      <div className="page-header">
        <div>
          <h2>Weekly Reviews</h2>
          <p>Current week: <strong style={{ color: "var(--accent)" }}>{currentWeek}</strong> · {getWeekLabel(currentWeek)}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {userRole === "superadmin" && pendingCount > 0 && (
            <div style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "var(--warning)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <MdPending /> {pendingCount} pending your review
            </div>
          )}
          {userRole !== "superadmin" && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}><MdAdd /> Add Review</button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <select className="form-select" style={{ width: "auto", minWidth: 280 }} value={weekFilter} onChange={e => setWeekFilter(e.target.value)}>
          <option value="all">All Weeks</option>
          {weekOptions.map(w => <option key={w.key} value={w.key}>{w.key === currentWeek ? `📍 ${w.label} (Current)` : w.label}</option>)}
        </select>
        <div className="search-bar" style={{ flex: 1, maxWidth: 300 }}>
          <MdSearch />
          <input placeholder="Search by intern name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner spinner-lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><MdRateReview /></div>
          <h3>No Reviews This Week</h3>
          <p>{weekFilter === currentWeek ? "No reviews submitted yet for the current week" : "No reviews found for the selected week"}</p>
          {userRole !== "superadmin" && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}><MdAdd /> Add Review</button>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(r => (
            <div key={r.id} className="card" style={{ borderLeft: `4px solid ${r.superadminStatus === "approved" ? "var(--success)" : r.superadminStatus === "rejected" ? "var(--danger)" : "var(--warning)"}` }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent-glow)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--accent)", fontSize: 14 }}>{r.internName?.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{r.internName}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.internTeam} · Week {r.week}</div>
                    </div>
                    <span className={`badge badge-${performanceColors[r.performance] || "accent"}`}>{r.performance}</span>
                  </div>
                  <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>
                    {[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= r.rating ? "var(--accent)" : "var(--border)", fontSize: 18 }}>★</span>)}
                    <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 6, alignSelf: "center" }}>{r.rating}/5</span>
                  </div>
                  <div style={{ background: "var(--bg-primary)", borderRadius: 8, padding: "10px 14px", marginBottom: 10, borderLeft: "3px solid var(--info)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Admin Comment</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{r.comments}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>— {r.reviewerName} ({r.reviewerRole})</div>
                  </div>
                  {r.superadminRemark ? (
                    <div style={{ background: "var(--bg-primary)", borderRadius: 8, padding: "10px 14px", borderLeft: `3px solid ${r.superadminStatus === "approved" ? "var(--success)" : "var(--danger)"}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--purple)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>⭐ Super Admin Remark</div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{r.superadminRemark}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>— {r.superadminReviewedBy}</div>
                    </div>
                  ) : (
                    <div style={{ background: "rgba(245,158,11,0.05)", borderRadius: 8, padding: "8px 14px", borderLeft: "3px solid var(--warning)", fontSize: 12, color: "var(--warning)" }}>⏳ Awaiting Super Admin review</div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <span className={`badge badge-${r.superadminStatus === "approved" ? "success" : r.superadminStatus === "rejected" ? "danger" : "warning"}`}>
                    {r.superadminStatus === "approved" ? "✓ Approved" : r.superadminStatus === "rejected" ? "✗ Rejected" : "⏳ Pending SA"}
                  </span>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.week}</div>
                  {userRole === "superadmin" && (
                    <button className="btn btn-secondary btn-sm" onClick={() => { setSuperRemarkModal(r); setSuperRemark(r.superadminRemark || ""); setSuperStatus(r.superadminStatus || "approved"); }}>
                      <MdRateReview /> {r.superadminRemark ? "Edit Remark" : "Add Remark"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Add Weekly Review</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info" style={{ marginBottom: 16 }}>Submitting review for week: <strong>{form.week}</strong> · {getWeekLabel(form.week)}</div>
              <div className="form-group">
                <label className="form-label">Intern *</label>
                <select className="form-select" value={form.internId} onChange={e => setForm({...form, internId: e.target.value})}>
                  <option value="">Select Intern</option>
                  {interns.map(i => <option key={i.uid} value={i.uid}>{i.name} ({i.team})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Week *</label>
                <select className="form-select" value={form.week} onChange={e => setForm({...form, week: e.target.value})}>
                  {weekOptions.map(w => <option key={w.key} value={w.key}>{w.key === currentWeek ? `${w.key} (Current Week)` : w.key}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Performance</label>
                <select className="form-select" value={form.performance} onChange={e => setForm({...form, performance: e.target.value})}>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="average">Average</option>
                  <option value="poor">Needs Improvement</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Rating</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[1,2,3,4,5].map(s => (
                    <button key={s} type="button" onClick={() => setForm({...form, rating: s})} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 32, color: s <= form.rating ? "var(--accent)" : "var(--border)", transition: "color 0.2s" }}>★</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Comments *</label>
                <textarea className="form-textarea" value={form.comments} onChange={e => setForm({...form, comments: e.target.value})} placeholder="Detailed weekly feedback..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}} /> Saving...</> : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {superRemarkModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSuperRemarkModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Super Admin Remark</span>
              <button className="modal-close" onClick={() => setSuperRemarkModal(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{superRemarkModal.internName}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{superRemarkModal.internTeam} · {superRemarkModal.week}</div>
              </div>
              <div style={{ background: "var(--bg-primary)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, borderLeft: "3px solid var(--info)", fontSize: 13, color: "var(--text-secondary)" }}>
                <strong style={{ display: "block", marginBottom: 4, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Admin's Comment</strong>
                {superRemarkModal.comments}
              </div>
              <div className="form-group">
                <label className="form-label">Decision</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" className={`btn btn-sm ${superStatus === "approved" ? "btn-success" : "btn-secondary"}`} onClick={() => setSuperStatus("approved")}><MdCheck /> Approve</button>
                  <button type="button" className={`btn btn-sm ${superStatus === "rejected" ? "btn-danger" : "btn-secondary"}`} onClick={() => setSuperStatus("rejected")}><MdClose /> Reject</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Your Remark *</label>
                <textarea className="form-textarea" value={superRemark} onChange={e => setSuperRemark(e.target.value)} placeholder="Add your remark on this weekly review..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSuperRemarkModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSuperRemark} disabled={saving}>
                {saving ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}} /> Saving...</> : "Submit Remark"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
