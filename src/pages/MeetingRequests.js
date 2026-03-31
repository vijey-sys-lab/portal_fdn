// src/pages/MeetingRequests.js
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { MdCheck, MdClose, MdSchedule } from "react-icons/md";

export default function MeetingRequests() {
  const { userData } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null);
  const [actionForm, setActionForm] = useState({ meetLink: "", approvedTime: "", response: "approve" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchRequests(); }, []);

  async function fetchRequests() {
    try {
      const snap = await getDocs(query(collection(db, "meetingRequests"), orderBy("createdAt", "desc")));
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleAction() {
    if (actionForm.response === "approve" && (!actionForm.meetLink || !actionForm.approvedTime)) { toast.error("Provide meet link and time"); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, "meetingRequests", actionModal.id), {
        status: actionForm.response === "approve" ? "approved" : "rejected",
        meetLink: actionForm.meetLink, approvedTime: actionForm.approvedTime,
        respondedBy: userData?.name, respondedAt: serverTimestamp(),
      });
      toast.success(`Request ${actionForm.response === "approve" ? "approved" : "rejected"}`);
      setActionModal(null); fetchRequests();
    } catch { toast.error("Error"); }
    setSaving(false);
  }

  const pending = requests.filter(r => r.status === "pending");
  const others = requests.filter(r => r.status !== "pending");

  return (
    <Layout title="Meeting Requests" subtitle="Admin requests for meetings">
      <div className="page-header">
        <div><h2>Meeting Requests</h2><p>Review and respond to admin meeting requests</p></div>
        {pending.length > 0 && <div style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "var(--warning)", fontWeight: 600 }}>{pending.length} pending</div>}
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : requests.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon"><MdSchedule /></div><h3>No Meeting Requests</h3></div>
      ) : (
        [...pending, ...others].map(req => (
          <div key={req.id} className="card" style={{ marginBottom: 12, borderLeft: `4px solid var(--${req.status === "approved" ? "success" : req.status === "rejected" ? "danger" : "warning"})` }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700 }}>{req.requestedByName}</span>
                  <span className={`badge badge-${req.status === "approved" ? "success" : req.status === "rejected" ? "danger" : "warning"}`}>{req.status}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>{req.reason}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Preferred: {req.preferredTime}</div>
                {req.status === "approved" && req.meetLink && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: "var(--success)", marginBottom: 4 }}>Approved: {req.approvedTime}</div>
                    <a href={req.meetLink} target="_blank" rel="noreferrer" className="dj-link" style={{ fontSize: 12 }}>Join Meet</a>
                  </div>
                )}
              </div>
              {req.status === "pending" && <button className="btn btn-primary btn-sm" onClick={() => { setActionModal(req); setActionForm({ meetLink: "", approvedTime: req.preferredTime, response: "approve" }); }}>Respond</button>}
            </div>
          </div>
        ))
      )}

      {actionModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setActionModal(null)}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">Respond to Request</span><button className="modal-close" onClick={() => setActionModal(null)}><MdClose /></button></div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700 }}>{actionModal.requestedByName}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{actionModal.reason}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Requested: {actionModal.preferredTime}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Response</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" className={`btn btn-sm ${actionForm.response === "approve" ? "btn-success" : "btn-secondary"}`} onClick={() => setActionForm({...actionForm, response: "approve"})}><MdCheck /> Approve</button>
                  <button type="button" className={`btn btn-sm ${actionForm.response === "reject" ? "btn-danger" : "btn-secondary"}`} onClick={() => setActionForm({...actionForm, response: "reject"})}><MdClose /> Reject</button>
                </div>
              </div>
              {actionForm.response === "approve" && (
                <>
                  <div className="form-group"><label className="form-label">Confirmed Time *</label><input className="form-input" type="datetime-local" value={actionForm.approvedTime} onChange={e => setActionForm({...actionForm, approvedTime: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Google Meet Link *</label><input className="form-input" value={actionForm.meetLink} onChange={e => setActionForm({...actionForm, meetLink: e.target.value})} placeholder="https://meet.google.com/..." /></div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
              <button className={`btn ${actionForm.response === "approve" ? "btn-success" : "btn-danger"}`} onClick={handleAction} disabled={saving}>{saving ? "Saving..." : actionForm.response === "approve" ? "Approve" : "Reject"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
