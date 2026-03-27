// src/pages/Leaves.js
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc, query, orderBy, where, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { MdSearch, MdCheck, MdClose, MdBeachAccess } from "react-icons/md";
import { differenceInCalendarDays } from "date-fns";

export default function Leaves() {
  const { userRole, userData } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("pending");
  const [remarkModal, setRemarkModal] = useState(null);
  const [remark, setRemark] = useState("");
  const [decision, setDecision] = useState("approved");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchLeaves(); }, [filter]);

  async function fetchLeaves() {
    setLoading(true);
    try {
      let q = filter === "all"
        ? query(collection(db, "leaves"), orderBy("createdAt", "desc"))
        : query(collection(db, "leaves"), where("status", "==", filter), orderBy("createdAt", "desc"));

      let data = (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }));

      if (userRole === "admin") {
        const internsSnap = await getDocs(query(collection(db, "interns"), where("assignedAdmin", "==", userData.uid)));
        const myUids = internsSnap.docs.map(d => d.data().uid);
        data = data.filter(l => myUids.includes(l.internId));
      }

      setLeaves(data);
    } catch (e) { console.error(e); toast.error("Error loading leaves"); }
    setLoading(false);
  }

  async function handleDecision() {
    setSaving(true);
    try {
      await updateDoc(doc(db, "leaves", remarkModal.id), {
        status: decision,
        adminRemark: remark,
        reviewedBy: userData?.name,
        reviewedAt: serverTimestamp(),
      });
      toast.success(`Leave ${decision}`);
      setRemarkModal(null);
      setRemark("");
      fetchLeaves();
    } catch { toast.error("Error"); }
    setSaving(false);
  }

  function getDays(from, to) {
    try { return differenceInCalendarDays(new Date(to), new Date(from)) + 1; }
    catch { return 1; }
  }

  const typeColors = { sick: "danger", personal: "info", emergency: "warning", other: "purple" };

  const filtered = leaves.filter(l =>
    l.internName?.toLowerCase().includes(search.toLowerCase()) ||
    l.type?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All" },
  ];

  return (
    <Layout title="Leave Applications" subtitle="Review intern leave requests">
      <div className="page-header">
        <div><h2>Leave Applications</h2><p>Review and approve intern leave requests</p></div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div className="tabs" style={{ margin: 0 }}>
          {tabs.map(t => (
            <button key={t.key} className={`tab-btn${filter === t.key ? " active" : ""}`} onClick={() => setFilter(t.key)}>
              {t.label} <span style={{ opacity: 0.7, marginLeft: 4 }}>({leaves.filter(l => t.key === "all" ? true : l.status === t.key).length})</span>
            </button>
          ))}
        </div>
        <div className="search-bar">
          <MdSearch />
          <input placeholder="Search by intern name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner spinner-lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><MdBeachAccess /></div>
          <h3>No Leave Applications</h3>
          <p>No leave requests in this category</p>
        </div>
      ) : (
        filtered.map(leave => (
          <div className="card" key={leave.id} style={{ marginBottom: 12, borderLeft: `4px solid var(--${leave.status === "approved" ? "success" : leave.status === "rejected" ? "danger" : "warning"})` }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-glow)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--accent)", fontSize: 13 }}>
                    {leave.internName?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{leave.internName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{leave.internTeam}</div>
                  </div>
                  <span className={`badge badge-${typeColors[leave.type] || "accent"}`}>{leave.type} leave</span>
                  <span className={`badge badge-${leave.status === "approved" ? "success" : leave.status === "rejected" ? "danger" : "warning"}`}>{leave.status}</span>
                </div>
                <div style={{ display: "flex", gap: 20, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>📅 <strong>{leave.fromDate}</strong> → <strong>{leave.toDate}</strong></span>
                  <span className="badge badge-accent">{getDays(leave.fromDate, leave.toDate)} day(s)</span>
                </div>
                <div style={{ background: "var(--bg-primary)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--text-secondary)", borderLeft: "3px solid var(--border-light)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Reason</div>
                  {leave.reason}
                </div>
                {leave.adminRemark && (
                  <div style={{ marginTop: 10, background: "var(--bg-primary)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--text-secondary)", borderLeft: `3px solid var(--${leave.status === "approved" ? "success" : "danger"})` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Admin Remark</div>
                    {leave.adminRemark}
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>— {leave.reviewedBy}</div>
                  </div>
                )}
              </div>
              {leave.status === "pending" && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setRemarkModal(leave); setRemark(""); setDecision("approved"); }}>Review</button>
              )}
            </div>
          </div>
        ))
      )}

      {remarkModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRemarkModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Review Leave Request</span>
              <button className="modal-close" onClick={() => setRemarkModal(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700 }}>{remarkModal.internName}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{remarkModal.type} leave · {remarkModal.fromDate} → {remarkModal.toDate} ({getDays(remarkModal.fromDate, remarkModal.toDate)} days)</div>
                <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-secondary)" }}>{remarkModal.reason}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Decision</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" className={`btn btn-sm ${decision === "approved" ? "btn-success" : "btn-secondary"}`} onClick={() => setDecision("approved")}><MdCheck /> Approve</button>
                  <button type="button" className={`btn btn-sm ${decision === "rejected" ? "btn-danger" : "btn-secondary"}`} onClick={() => setDecision("rejected")}><MdClose /> Reject</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Remark (optional)</label>
                <textarea className="form-textarea" value={remark} onChange={e => setRemark(e.target.value)} placeholder="Add a note for the intern..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRemarkModal(null)}>Cancel</button>
              <button className={`btn ${decision === "approved" ? "btn-success" : "btn-danger"}`} onClick={handleDecision} disabled={saving}>
                {saving ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}} /> Saving...</> : `${decision === "approved" ? "Approve" : "Reject"} Leave`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
