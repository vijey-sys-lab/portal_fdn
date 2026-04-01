// src/pages/Interns.js
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { db } from "../firebase";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import {
  collection, getDocs, updateDoc, doc,
  serverTimestamp, query, orderBy, where, setDoc
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { MdAdd, MdClose, MdSearch, MdDownload, MdBlock, MdCheck } from "react-icons/md";
import jsPDF from "jspdf";
import signatureBase64 from "../signatureData";

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

function generateOfferLetter(intern) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  pdf.setFillColor(245, 166, 35); pdf.rect(0, 0, W, 18, "F");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(0, 0, 0);
  pdf.text("BOSS FOUNDATION", W / 2, 11, { align: "center" });
  pdf.setFillColor(22, 22, 31); pdf.rect(0, 18, W, 10, "F");
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(200, 200, 200);
  pdf.text("Internship Management Portal  |  Inspiring Growth", W / 2, 24, { align: "center" });
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.setTextColor(30, 30, 30);
  pdf.text("INTERNSHIP OFFER LETTER", W / 2, 44, { align: "center" });
  pdf.setDrawColor(245, 166, 35); pdf.setLineWidth(0.8); pdf.line(40, 47, W - 40, 47);
  const today = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  const refNo = `BF/${new Date().getFullYear()}/${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(120, 120, 120);
  pdf.text(`Date: ${today}`, 20, 55); pdf.text(`Ref No: ${refNo}`, W - 20, 55, { align: "right" });
  pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.3); pdf.line(20, 59, W - 20, 59);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(30, 30, 30);
  pdf.text("To,", 20, 67); pdf.setFontSize(12); pdf.text(intern.name, 20, 74);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(80, 80, 80);
  pdf.text(`Email: ${intern.email}`, 20, 81);
  if (intern.college) pdf.text(`College: ${intern.college}`, 20, 87);
  pdf.setDrawColor(220, 220, 220); pdf.line(20, 93, W - 20, 93);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(30, 30, 30);
  pdf.text("Sub: Internship Offer Letter — BOSS Foundation", 20, 101);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10.5); pdf.setTextColor(50, 50, 50);
  pdf.text(`Dear ${intern.name},`, 20, 112);
  pdf.text(pdf.splitTextToSize("We are pleased to offer you an internship position at BOSS Foundation. After reviewing your profile, we confirm your selection for the internship program.", W - 40), 20, 120);
  pdf.setFillColor(248, 248, 248); pdf.setDrawColor(245, 166, 35); pdf.setLineWidth(0.4);
  pdf.roundedRect(20, 134, W - 40, 48, 3, 3, "FD");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(245, 166, 35);
  pdf.text("INTERNSHIP DETAILS", 25, 142);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(40, 40, 40);
  [["Intern Name", intern.name], ["Intern ID (NIN)", intern.nin], ["Domain / Team", intern.team], ["Start Date", intern.startDate], ["End Date", intern.endDate]].forEach(([label, value], i) => {
    const y = 150 + i * 6;
    pdf.setFont("helvetica", "bold"); pdf.text(`${label}:`, 25, y);
    pdf.setFont("helvetica", "normal"); pdf.text(value || "—", 80, y);
  });
  let y = 192;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(30, 30, 30);
  pdf.text("EXPECTATIONS:", 20, y); y += 7;
  pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60);
  ["• Submit Daily Journals with completed work Google Drive links", "• Complete all assigned tasks within deadlines", "• Participate actively in weekly reviews and team meetings", "• Maintain professional conduct throughout the tenure"].forEach(line => { pdf.text(line, 25, y); y += 6.5; });
  y += 4; pdf.setFontSize(10); pdf.text("We look forward to your valuable contribution and wish you a rewarding internship experience.", 20, y);
  y += 10; pdf.text("Yours sincerely,", 20, y); y += 4;
  try { pdf.addImage(signatureBase64, "PNG", 20, y, 45, 18); } catch (e) { console.error(e); }
  y += 22;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(30, 30, 30);
  pdf.text("Vijey Prasanna", 20, y);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(100, 100, 100);
  pdf.text("Chief Executive Officer", 20, y + 5); pdf.text("BOSS Foundation", 20, y + 10);
  pdf.setFillColor(245, 166, 35); pdf.rect(0, 285, W, 12, "F");
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(0, 0, 0);
  pdf.text("BOSS Foundation  |  Internship Management Portal  |  Inspiring Growth", W / 2, 292, { align: "center" });
  pdf.save(`Offer_Letter_${intern.name.replace(/ /g, "_")}.pdf`);
}

export default function Interns() {
  const { userRole, userData } = useAuth();
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [form, setForm] = useState({ name: "", email: "", password: "", team: "", phone: "", college: "", startDate: "", endDate: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchInterns(); }, []);

  async function fetchInterns() {
    setLoading(true);
    try {
      let q;
      if (userRole === "superadmin") {
        q = query(collection(db, "interns"), orderBy("createdAt", "desc"));
      } else if (userData?.uid) {
        q = query(collection(db, "interns"), where("assignedAdmin", "==", userData.uid), orderBy("createdAt", "desc"));
      } else { setLoading(false); return; }
      const snap = await getDocs(q);
      setInterns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error("Interns fetch error:", e); toast.error("Error loading interns"); }
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.name || !form.email || !form.password || !form.team || !form.startDate || !form.endDate) {
      toast.error("Fill all required fields"); return;
    }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSaving(true);
    try {
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
      const uid = cred.user.uid;
      await signOut(secondaryAuth);
      const nin = `NIN-${Date.now().toString().slice(-5)}`;
      await setDoc(doc(db, "interns", uid), {
        uid, name: form.name, email: form.email, team: form.team, phone: form.phone,
        college: form.college, startDate: form.startDate, endDate: form.endDate,
        nin,
        // Created as "pending" — must be approved by admin/SA before intern can use portal
        status: "pending",
        role: "intern",
        assignedAdmin: userData?.uid || "superadmin",
        createdAt: serverTimestamp(),
      });
      toast.success(`Intern created! NIN: ${nin} — Approve their profile to give access.`);
      setShowModal(false);
      setForm({ name: "", email: "", password: "", team: "", phone: "", college: "", startDate: "", endDate: "" });
      fetchInterns();
    } catch (e) {
      const msgs = { "auth/email-already-in-use": "Email already registered", "auth/invalid-email": "Invalid email", "auth/weak-password": "Password too weak" };
      toast.error(msgs[e.code] || e.message);
    }
    setSaving(false);
  }

  async function handleApprove(intern) {
    try {
      await updateDoc(doc(db, "interns", intern.id), { status: "active" });
      toast.success(`${intern.name} approved — portal access granted!`);
      fetchInterns();
    } catch { toast.error("Error approving intern"); }
  }

  async function handleCancel(intern) {
    if (!window.confirm(`Cancel internship for ${intern.name}? Data retained till tenure end.`)) return;
    try {
      await updateDoc(doc(db, "interns", intern.id), { status: "cancelled" });
      toast.success("Cancelled. Data retained.");
      fetchInterns();
    } catch { toast.error("Error"); }
  }

  const filtered = interns.filter(i => {
    const matchSearch =
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.email?.toLowerCase().includes(search.toLowerCase()) ||
      i.nin?.toLowerCase().includes(search.toLowerCase());
    if (activeTab === "all") return matchSearch;
    // Normalize "approved" old status as "active"
    const status = (i.status === "approved") ? "active" : i.status;
    return matchSearch && status === activeTab;
  });

  // Count tab badges — normalize "approved" → "active"
  function countByStatus(status) {
    return interns.filter(i => {
      const s = (i.status === "approved") ? "active" : i.status;
      return s === status;
    }).length;
  }

  const tabs = [
    { key: "all", label: "All", count: interns.length },
    { key: "pending", label: "Pending Approval", count: interns.filter(i => i.status === "pending").length },
    { key: "active", label: "Active", count: countByStatus("active") },
    { key: "cancelled", label: "Cancelled", count: countByStatus("cancelled") },
  ];

  return (
    <Layout title="Interns" subtitle="Manage intern accounts and tenures">
      <div className="page-header">
        <div>
          <h2>Intern Management</h2>
          <p>Create intern accounts — approve to grant portal access</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <MdAdd /> Add Intern
        </button>
      </div>

      {/* Pending notice */}
      {interns.filter(i => i.status === "pending").length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          ⏳ <strong>{interns.filter(i => i.status === "pending").length} intern(s)</strong> are waiting for approval — click <strong>Approve</strong> to grant them portal access.
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div className="tabs" style={{ margin: 0, border: "none", background: "none", padding: 0, gap: 6 }}>
            {tabs.map(t => (
              <button
                key={t.key}
                className={`tab-btn${activeTab === t.key ? " active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
                <span style={{ marginLeft: 4, opacity: 0.7 }}>({t.count})</span>
                {t.key === "pending" && t.count > 0 && (
                  <span style={{ marginLeft: 4, background: "var(--warning)", color: "#000", borderRadius: "50%", width: 16, height: 16, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="search-bar">
            <MdSearch />
            <input placeholder="Search interns..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">👥</div><h3>No Interns Found</h3></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Intern</th><th>NIN</th><th>Team</th><th>College</th>
                  <th>Start</th><th>End</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(intern => {
                  // Normalize old "approved" to "active" for display
                  const displayStatus = intern.status === "approved" ? "active" : intern.status;
                  return (
                    <tr key={intern.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {intern.photoURL
                            ? <img src={intern.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)" }} />
                            : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-glow)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: "var(--accent)" }}>
                                {intern.name?.charAt(0).toUpperCase()}
                              </div>
                          }
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{intern.name}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{intern.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-accent">{intern.nin}</span></td>
                      <td><span className="badge badge-purple">{intern.team}</span></td>
                      <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>{intern.college || "—"}</td>
                      <td style={{ fontSize: 13 }}>{intern.startDate || "—"}</td>
                      <td style={{ fontSize: 13 }}>{intern.endDate || "—"}</td>
                      <td>
                        <span className={`badge badge-${
                          displayStatus === "active" ? "success" :
                          displayStatus === "cancelled" ? "danger" : "warning"
                        }`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {/* Approve button — for pending interns */}
                          {intern.status === "pending" && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleApprove(intern)}
                            >
                              <MdCheck /> Approve
                            </button>
                          )}
                          {/* Cancel button — for active interns */}
                          {(displayStatus === "active") && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleCancel(intern)}
                            >
                              <MdBlock /> Cancel
                            </button>
                          )}
                          {/* Offer letter always available */}
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => generateOfferLetter(intern)}
                            title="Download Offer Letter"
                          >
                            <MdDownload />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Intern Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">Add New Intern</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Intern Name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="intern@email.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Password * (min 6)</label>
                  <input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 6 characters" />
                </div>
                <div className="form-group">
                  <label className="form-label">Team *</label>
                  <select className="form-select" value={form.team} onChange={e => setForm({...form, team: e.target.value})}>
                    <option value="">Select Team</option>
                    {TEAMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 XXXXX XXXXX" />
                </div>
                <div className="form-group">
                  <label className="form-label">College</label>
                  <input className="form-input" value={form.college} onChange={e => setForm({...form, college: e.target.value})} placeholder="College name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input className="form-input" type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date *</label>
                  <input className="form-input" type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
                </div>
              </div>
              <div className="alert alert-info" style={{ marginTop: 8 }}>
                ℹ️ Intern account will be created as <strong>Pending</strong>. You must click <strong>Approve</strong> to give them portal access.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
                {saving
                  ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Creating...</>
                  : "Create Intern"
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
