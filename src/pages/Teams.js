// src/pages/Teams.js
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { db } from "../firebase";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { MdAdd, MdClose, MdCheck, MdGroup } from "react-icons/md";

const DOMAINS = ["HR", "General Management", "Fullstack", "Marketing", "Finance", "Operations"];

export default function Teams() {
  const { userRole, userData } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", domain: "HR", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTeams(); }, []);

  async function fetchTeams() {
    try {
      const q = query(collection(db, "teams"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.name || !form.domain) { toast.error("Fill required fields"); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, "teams"), {
        name: form.name, domain: form.domain, description: form.description,
        status: userRole === "superadmin" ? "approved" : "pending",
        createdBy: userData?.uid, createdByName: userData?.name,
        createdByRole: userRole, createdAt: serverTimestamp(),
      });
      toast.success(userRole === "superadmin" ? "Team created!" : "Team request sent for approval!");
      setShowModal(false); setForm({ name: "", domain: "HR", description: "" }); fetchTeams();
    } catch (e) { toast.error("Error creating team"); }
    setSaving(false);
  }

  async function handleApprove(team) {
    try { await updateDoc(doc(db, "teams", team.id), { status: "approved" }); toast.success("Approved!"); fetchTeams(); }
    catch { toast.error("Error"); }
  }

  async function handleReject(team) {
    try { await updateDoc(doc(db, "teams", team.id), { status: "rejected" }); toast.success("Rejected."); fetchTeams(); }
    catch { toast.error("Error"); }
  }

  const grouped = DOMAINS.reduce((acc, domain) => { acc[domain] = teams.filter(t => t.domain === domain); return acc; }, {});

  return (
    <Layout title="Teams" subtitle="Manage sub-teams under each domain">
      <div className="page-header">
        <div><h2>Team Management</h2><p>Sub-teams under each internship domain</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><MdAdd /> {userRole === "superadmin" ? "Create Team" : "Request Team"}</button>
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        DOMAINS.map(domain => {
          const domainTeams = grouped[domain] || [];
          return (
            <div key={domain} style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <MdGroup style={{ color: "var(--accent)" }} /> {domain}
                <span className="badge badge-accent" style={{ fontSize: 11 }}>{domainTeams.filter(t => t.status === "approved").length} teams</span>
              </h3>
              {domainTeams.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 0 8px 24px" }}>No teams yet</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                  {domainTeams.map(team => (
                    <div key={team.id} className="card" style={{ borderLeft: `4px solid var(--${team.status === "approved" ? "success" : team.status === "rejected" ? "danger" : "warning"})` }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{team.name}</div>
                          {team.description && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{team.description}</div>}
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>By: {team.createdByName}</div>
                        </div>
                        <span className={`badge badge-${team.status === "approved" ? "success" : team.status === "rejected" ? "danger" : "warning"}`}>{team.status}</span>
                      </div>
                      {userRole === "superadmin" && team.status === "pending" && (
                        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                          <button className="btn btn-success btn-sm" onClick={() => handleApprove(team)}><MdCheck /> Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleReject(team)}><MdClose /> Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">{userRole === "superadmin" ? "Create Team" : "Request Team"}</span><button className="modal-close" onClick={() => setShowModal(false)}><MdClose /></button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Team Name *</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g., Frontend Team A" /></div>
              <div className="form-group"><label className="form-label">Domain *</label><select className="form-select" value={form.domain} onChange={e => setForm({...form, domain: e.target.value})}>{DOMAINS.map(d => <option key={d}>{d}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" style={{ minHeight: 80 }} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="What does this team focus on?" /></div>
              {userRole !== "superadmin" && <div className="alert alert-info">Team name will be reviewed by Super Admin before activation.</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : userRole === "superadmin" ? "Create" : "Submit for Approval"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
