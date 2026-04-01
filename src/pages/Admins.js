// src/pages/Admins.js
import React, { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import { db, storage } from "../firebase";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs, updateDoc, doc, serverTimestamp, query, orderBy, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import { MdAdd, MdCheck, MdClose, MdSearch, MdPerson, MdRefresh, MdCameraAlt } from "react-icons/md";

const TEAMS = ["HR", "General Management", "Fullstack", "Marketing", "Finance", "Operations"];

const firebaseConfig = {
  apiKey: "AIzaSyCvVPDMm5kWA49jQZhG8kAs9oNkqRVoBEk",
  authDomain: "boss-foundation.firebaseapp.com",
  projectId: "boss-foundation",
  storageBucket: "boss-foundation.firebasestorage.app",
  messagingSenderId: "68368947662",
  appId: "1:68368947662:web:561216a4b4675d7123339f",
};

function getSecondaryAuth() {
  const existing = getApps().find(a => a.name === "secondary");
  const app = existing || initializeApp(firebaseConfig, "secondary");
  return getAuth(app);
}

export default function Admins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({ name: "", email: "", password: "", team: "", phone: "", startDate: "", endDate: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAdmins(); }, []);

  async function fetchAdmins() {
    try {
      const snap = await getDocs(query(collection(db, "admins"), orderBy("createdAt", "desc")));
      setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); toast.error("Error loading admins"); }
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.name || !form.email || !form.password || !form.team) { toast.error("Fill all required fields"); return; }
    if (form.password.length < 6) { toast.error("Password min 6 characters"); return; }
    setSaving(true);
    try {
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
      const uid = cred.user.uid;
      await signOut(secondaryAuth);
      await setDoc(doc(db, "admins", uid), {
        uid, name: form.name, email: form.email, team: form.team, phone: form.phone,
        startDate: form.startDate, endDate: form.endDate, status: "approved", role: "admin",
        createdAt: serverTimestamp(),
      });
      toast.success(`Admin "${form.name}" added!`);
      setShowModal(false);
      setForm({ name: "", email: "", password: "", team: "", phone: "", startDate: "", endDate: "" });
      fetchAdmins();
    } catch (e) {
      const msgs = { "auth/email-already-in-use": "Email already registered", "auth/invalid-email": "Invalid email", "auth/weak-password": "Password too weak" };
      toast.error(msgs[e.code] || e.message);
    }
    setSaving(false);
  }

  async function handleTerminate(admin) {
    if (!window.confirm(`Terminate ${admin.name}? Data will be retained.`)) return;
    try { await updateDoc(doc(db, "admins", admin.id), { status: "terminated" }); toast.success("Terminated"); fetchAdmins(); }
    catch { toast.error("Error"); }
  }

  async function handleReadmit(admin) {
    if (!window.confirm(`Re-admit ${admin.name}?`)) return;
    try { await updateDoc(doc(db, "admins", admin.id), { status: "approved" }); toast.success("Admin re-admitted!"); fetchAdmins(); }
    catch { toast.error("Error"); }
  }

  async function handleApprove(admin) {
    try { await updateDoc(doc(db, "admins", admin.id), { status: "approved" }); toast.success("Approved"); fetchAdmins(); }
    catch { toast.error("Error"); }
  }

  const filtered = admins.filter(a => {
    const matchSearch = a.name?.toLowerCase().includes(search.toLowerCase()) || a.email?.toLowerCase().includes(search.toLowerCase()) || a.team?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const tabs = [
    { key: "all", label: "All" },
    { key: "approved", label: "Active" },
    { key: "terminated", label: "Terminated" },
    { key: "pending", label: "Pending" },
  ];

  return (
    <Layout title="Admins" subtitle="Manage admin accounts">
      <div className="page-header">
        <div><h2>Admin Management</h2><p>Add and manage admins per team</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><MdAdd /> Add Admin</button>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div className="tabs" style={{ margin: 0, border: "none", background: "none", padding: 0 }}>
            {tabs.map(t => (
              <button key={t.key} className={`tab-btn${statusFilter === t.key ? " active" : ""}`} onClick={() => setStatusFilter(t.key)}>
                {t.label} <span style={{ opacity: 0.7, marginLeft: 4 }}>({admins.filter(a => t.key === "all" ? true : a.status === t.key).length})</span>
              </button>
            ))}
          </div>
          <div className="search-bar"><MdSearch /><input placeholder="Search admins..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>

        {loading ? <div className="loading-center"><div className="spinner" /></div>
        : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon"><MdPerson /></div><h3>No Admins Found</h3></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Team</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(admin => (
                  <tr key={admin.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {admin.photoURL ? (
                          <img src={admin.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)" }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-glow)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: "var(--accent)" }}>
                            {admin.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{admin.name}</div>
                          {admin.phone && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{admin.phone}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{admin.email}</td>
                    <td><span className="badge badge-purple">{admin.team}</span></td>
                    <td style={{ fontSize: 13 }}>{admin.startDate || "—"}</td>
                    <td style={{ fontSize: 13 }}>{admin.endDate || "—"}</td>
                    <td><span className={`badge badge-${admin.status === "approved" ? "success" : admin.status === "terminated" ? "danger" : "warning"}`}>{admin.status}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {admin.status === "pending" && <button className="btn btn-success btn-sm" onClick={() => handleApprove(admin)}><MdCheck /></button>}
                        {admin.status === "approved" && <button className="btn btn-danger btn-sm" onClick={() => handleTerminate(admin)}><MdClose /> Terminate</button>}
                        {admin.status === "terminated" && <button className="btn btn-success btn-sm" onClick={() => handleReadmit(admin)}><MdRefresh /> Re-admit</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">Add New Admin</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Admin Name" /></div>
                <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="admin@email.com" /></div>
                <div className="form-group"><label className="form-label">Password * (min 6)</label><input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 6 characters" /></div>
                <div className="form-group"><label className="form-label">Team *</label><select className="form-select" value={form.team} onChange={e => setForm({...form, team: e.target.value})}><option value="">Select Team</option>{TEAMS.map(t => <option key={t}>{t}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 XXXXX XXXXX" /></div>
                <div className="form-group"><label className="form-label">Start Date</label><input className="form-input" type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">End Date</label><input className="form-input" type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
                {saving ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}} /> Creating...</> : "Add Admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
