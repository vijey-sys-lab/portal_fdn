// src/pages/Admins.js
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { db } from "../firebase";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs, updateDoc, doc, serverTimestamp, query, orderBy, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { MdAdd, MdCheck, MdClose, MdSearch, MdPerson, MdRefresh, MdAddCircle, MdDownload } from "react-icons/md";
import jsPDF from "jspdf";
import signatureBase64 from "../signatureData";
import { differenceInDays } from "date-fns";

const DEFAULT_TEAMS = ["HR", "General Management", "Fullstack", "Marketing", "Finance", "Operations"];

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

// ─── Admin Offer Letter ───────────────────────────────────────────────────────
function generateAdminOfferLetter(admin) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const today = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  const refNo = `BF/ADM/${new Date().getFullYear()}/${Math.random().toString(36).slice(2,7).toUpperCase()}`;

  // Gold header
  pdf.setFillColor(245, 166, 35); pdf.rect(0, 0, W, 18, "F");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(0, 0, 0);
  pdf.text("BOSS FOUNDATION", W / 2, 11, { align: "center" });

  // Dark subheader
  pdf.setFillColor(22, 22, 31); pdf.rect(0, 18, W, 10, "F");
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(200, 200, 200);
  pdf.text("Internship Management Portal  |  Inspiring Growth", W / 2, 24, { align: "center" });

  // Title
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.setTextColor(30, 30, 30);
  pdf.text("ADMIN APPOINTMENT LETTER", W / 2, 44, { align: "center" });
  pdf.setDrawColor(245, 166, 35); pdf.setLineWidth(0.8); pdf.line(35, 47, W - 35, 47);

  // Date & Ref
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(120, 120, 120);
  pdf.text(`Date: ${today}`, 20, 55);
  pdf.text(`Ref No: ${refNo}`, W - 20, 55, { align: "right" });
  pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.3); pdf.line(20, 59, W - 20, 59);

  // Addressee
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(30, 30, 30);
  pdf.text("To,", 20, 67);
  pdf.setFontSize(12); pdf.text(admin.name, 20, 74);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(80, 80, 80);
  pdf.text(`Email: ${admin.email}`, 20, 81);
  if (admin.phone) pdf.text(`Phone: ${admin.phone}`, 20, 87);
  pdf.setDrawColor(220, 220, 220); pdf.line(20, 93, W - 20, 93);

  // Subject
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(30, 30, 30);
  pdf.text("Sub: Admin Appointment Letter — BOSS Foundation", 20, 101);

  // Body
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10.5); pdf.setTextColor(50, 50, 50);
  pdf.text(`Dear ${admin.name},`, 20, 112);
  const intro = "We are pleased to appoint you as an Admin at BOSS Foundation. Your role involves overseeing interns, reviewing daily journals, approving tasks, and ensuring smooth operations within your team.";
  pdf.text(pdf.splitTextToSize(intro, W - 40), 20, 120);

  // Details box
  pdf.setFillColor(248, 248, 248); pdf.setDrawColor(245, 166, 35); pdf.setLineWidth(0.4);
  pdf.roundedRect(20, 133, W - 40, 46, 3, 3, "FD");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(245, 166, 35);
  pdf.text("APPOINTMENT DETAILS", 25, 141);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(40, 40, 40);
  const details = [
    ["Admin Name", admin.name],
    ["Designation", "Admin"],
    ["Team / Domain", admin.team],
    ["Start Date", admin.startDate || "—"],
    ["End Date", admin.endDate || "—"],
  ];
  details.forEach(([label, value], i) => {
    const y = 149 + i * 6;
    pdf.setFont("helvetica", "bold"); pdf.text(`${label}:`, 25, y);
    pdf.setFont("helvetica", "normal"); pdf.text(value, 80, y);
  });

  // Responsibilities
  let y = 190;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(30, 30, 30);
  pdf.text("RESPONSIBILITIES:", 20, y); y += 7;
  pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60);
  [
    "• Manage and monitor assigned intern profiles and activities",
    "• Review and remark on intern daily journals",
    "• Assign tasks and track completion by interns",
    "• Submit weekly reviews to Super Admin",
    "• Conduct leave approvals for interns under your supervision",
    "• Maintain professionalism and report to Super Admin",
  ].forEach(line => { pdf.text(line, 25, y); y += 6.5; });

  y += 4;
  pdf.setFontSize(10); pdf.text("We welcome you to the BOSS Foundation team and look forward to your leadership.", 20, y);
  y += 10; pdf.text("Yours sincerely,", 20, y); y += 4;

  // Signature
  try { pdf.addImage(signatureBase64, "PNG", 20, y, 50, 20); } catch (e) { console.error(e); }
  y += 24;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(30, 30, 30);
  pdf.text("Vijey Prasanna", 20, y);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(100, 100, 100);
  pdf.text("Chief Executive Officer", 20, y + 5);
  pdf.text("BOSS Foundation", 20, y + 10);

  // Footer
  pdf.setFillColor(245, 166, 35); pdf.rect(0, 285, W, 12, "F");
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(0, 0, 0);
  pdf.text("BOSS Foundation  |  Internship Management Portal  |  Inspiring Growth", W / 2, 292, { align: "center" });

  pdf.save(`Admin_Appointment_${admin.name.replace(/ /g, "_")}.pdf`);
}

// ─── Admin Certificate ────────────────────────────────────────────────────────
function generateAdminCertificate(admin) {
  if (!admin.startDate || !admin.endDate) {
    toast.error("Start date and end date required for certificate"); return;
  }
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297; const H = 210;
  const days = differenceInDays(new Date(admin.endDate), new Date(admin.startDate));

  // Dark background
  pdf.setFillColor(10, 10, 15); pdf.rect(0, 0, W, H, "F");

  // Gold outer border
  pdf.setDrawColor(245, 166, 35); pdf.setLineWidth(4); pdf.rect(8, 8, W - 16, H - 16);
  pdf.setLineWidth(1); pdf.rect(13, 13, W - 26, H - 26);

  // Header
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(245, 166, 35);
  pdf.text("BOSS FOUNDATION", W / 2, 30, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(160, 160, 160);
  pdf.text("I N S P I R I N G   G R O W T H", W / 2, 37, { align: "center" });
  pdf.setDrawColor(245, 166, 35); pdf.setLineWidth(0.5); pdf.line(60, 41, W - 60, 41);

  // Certificate title
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(28); pdf.setTextColor(255, 255, 255);
  pdf.text("Certificate of Administration", W / 2, 63, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(180, 180, 180);
  pdf.text("A P P R E C I A T I O N   &   S E R V I C E", W / 2, 72, { align: "center" });

  // Presented to
  pdf.setFontSize(12); pdf.setTextColor(160, 160, 160);
  pdf.text("This is to proudly certify that", W / 2, 88, { align: "center" });

  // Admin name
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(26); pdf.setTextColor(245, 166, 35);
  pdf.text(admin.name, W / 2, 103, { align: "center" });
  const nameWidth = pdf.getTextWidth(admin.name);
  pdf.setDrawColor(245, 166, 35); pdf.setLineWidth(0.5);
  pdf.line(W / 2 - nameWidth / 2, 106, W / 2 + nameWidth / 2, 106);

  // Description
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(11); pdf.setTextColor(200, 200, 200);
  pdf.text("has served as Admin at BOSS Foundation in the domain of", W / 2, 116, { align: "center" });

  // Team
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(15); pdf.setTextColor(255, 255, 255);
  pdf.text(admin.team, W / 2, 126, { align: "center" });

  // Duration
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(160, 160, 160);
  pdf.text(
    `Duration: ${admin.startDate} to ${admin.endDate}  (${days} days of service)`,
    W / 2, 137, { align: "center" }
  );

  // Divider
  pdf.setDrawColor(80, 80, 80); pdf.setLineWidth(0.3); pdf.line(40, 148, W - 40, 148);

  // Signature
  const sigX = W / 2 - 35;
  try { pdf.addImage(signatureBase64, "PNG", sigX, 152, 70, 22); } catch (e) { console.error(e); }
  pdf.setDrawColor(245, 166, 35); pdf.setLineWidth(0.4);
  pdf.line(W / 2 - 40, 176, W / 2 + 40, 176);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(255, 255, 255);
  pdf.text("Vijey Prasanna", W / 2, 182, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(160, 160, 160);
  pdf.text("Chief Executive Officer, BOSS Foundation", W / 2, 188, { align: "center" });

  // Footer bar
  pdf.setFillColor(245, 166, 35); pdf.rect(0, H - 12, W, 12, "F");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(0, 0, 0);
  pdf.text("BOSS FOUNDATION  |  INTERNSHIP MANAGEMENT PORTAL  |  INSPIRING GROWTH", W / 2, H - 4, { align: "center" });

  pdf.save(`Admin_Certificate_${admin.name.replace(/ /g, "_")}.pdf`);
}

export default function Admins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customTeams, setCustomTeams] = useState([]);
  const [newCustomTeam, setNewCustomTeam] = useState("");
  const [showCustomTeamInput, setShowCustomTeamInput] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", team: "", phone: "", startDate: "", endDate: ""
  });
  const [saving, setSaving] = useState(false);

  const allTeams = [...DEFAULT_TEAMS, ...customTeams];

  useEffect(() => {
    fetchAdmins();
    const saved = localStorage.getItem("bossFoundationCustomTeams");
    if (saved) { try { setCustomTeams(JSON.parse(saved)); } catch (e) {} }
  }, []);

  function addCustomTeam() {
    const trimmed = newCustomTeam.trim();
    if (!trimmed) { toast.error("Enter a team name"); return; }
    if (allTeams.map(t => t.toLowerCase()).includes(trimmed.toLowerCase())) {
      toast.error("Team already exists"); return;
    }
    const updated = [...customTeams, trimmed];
    setCustomTeams(updated);
    localStorage.setItem("bossFoundationCustomTeams", JSON.stringify(updated));
    setForm({ ...form, team: trimmed });
    setNewCustomTeam(""); setShowCustomTeamInput(false);
    toast.success(`Team "${trimmed}" added!`);
  }

  function removeCustomTeam(team) {
    const updated = customTeams.filter(t => t !== team);
    setCustomTeams(updated);
    localStorage.setItem("bossFoundationCustomTeams", JSON.stringify(updated));
    if (form.team === team) setForm({ ...form, team: "" });
  }

  async function fetchAdmins() {
    try {
      const snap = await getDocs(query(collection(db, "admins"), orderBy("createdAt", "desc")));
      setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); toast.error("Error loading admins"); }
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.name || !form.email || !form.password || !form.team) {
      toast.error("Fill all required fields"); return;
    }
    if (form.password.length < 6) { toast.error("Password min 6 characters"); return; }
    setSaving(true);
    try {
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
      const uid = cred.user.uid;
      await signOut(secondaryAuth);
      await setDoc(doc(db, "admins", uid), {
        uid, name: form.name, email: form.email, team: form.team,
        phone: form.phone, startDate: form.startDate, endDate: form.endDate,
        status: "approved", role: "admin", createdAt: serverTimestamp(),
      });
      toast.success(`Admin "${form.name}" added!`);
      setShowModal(false);
      setForm({ name: "", email: "", password: "", team: "", phone: "", startDate: "", endDate: "" });
      fetchAdmins();
    } catch (e) {
      const msgs = {
        "auth/email-already-in-use": "Email already registered",
        "auth/invalid-email": "Invalid email",
        "auth/weak-password": "Password too weak",
      };
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
    try { await updateDoc(doc(db, "admins", admin.id), { status: "approved" }); toast.success("Re-admitted!"); fetchAdmins(); }
    catch { toast.error("Error"); }
  }

  async function handleApprove(admin) {
    try { await updateDoc(doc(db, "admins", admin.id), { status: "approved" }); toast.success("Approved"); fetchAdmins(); }
    catch { toast.error("Error"); }
  }

  const filtered = admins.filter(a => {
    const matchSearch =
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.team?.toLowerCase().includes(search.toLowerCase());
    return (statusFilter === "all" || a.status === statusFilter) && matchSearch;
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
          <div className="search-bar">
            <MdSearch /><input placeholder="Search admins..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
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
                        {admin.photoURL
                          ? <img src={admin.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)" }} />
                          : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-glow)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: "var(--accent)" }}>
                              {admin.name?.charAt(0).toUpperCase()}
                            </div>
                        }
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
                    <td>
                      <span className={`badge badge-${admin.status === "approved" ? "success" : admin.status === "terminated" ? "danger" : "warning"}`}>
                        {admin.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {admin.status === "pending" && <button className="btn btn-success btn-sm" onClick={() => handleApprove(admin)}><MdCheck /></button>}
                        {admin.status === "approved" && <button className="btn btn-danger btn-sm" onClick={() => handleTerminate(admin)}><MdClose /> Terminate</button>}
                        {admin.status === "terminated" && <button className="btn btn-success btn-sm" onClick={() => handleReadmit(admin)}><MdRefresh /> Re-admit</button>}
                        {/* Offer Letter - always available */}
                        <button className="btn btn-secondary btn-sm" onClick={() => generateAdminOfferLetter(admin)} title="Download Appointment Letter">
                          <MdDownload /> Letter
                        </button>
                        {/* Certificate - available after tenure ends */}
                        {admin.endDate && new Date() >= new Date(admin.endDate) ? (
                          <button className="btn btn-success btn-sm" onClick={() => generateAdminCertificate(admin)} title="Download Certificate">
                            <MdDownload /> Cert
                          </button>
                        ) : (
                          <button className="btn btn-secondary btn-sm" disabled title="Available after tenure ends" style={{ opacity: 0.4 }}>
                            <MdDownload /> Cert
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Admin Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">Add New Admin</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Admin Name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="admin@email.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Password * (min 6)</label>
                  <input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 6 characters" />
                </div>

                {/* Custom Team Field */}
                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Team *</span>
                    <button type="button" onClick={() => setShowCustomTeamInput(!showCustomTeamInput)}
                      style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>
                      <MdAddCircle /> Add New Team
                    </button>
                  </label>
                  {showCustomTeamInput && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input className="form-input" value={newCustomTeam} onChange={e => setNewCustomTeam(e.target.value)}
                        placeholder="New team name..." onKeyDown={e => e.key === "Enter" && addCustomTeam()} style={{ flex: 1 }} />
                      <button type="button" className="btn btn-primary btn-sm" onClick={addCustomTeam}>Add</button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowCustomTeamInput(false); setNewCustomTeam(""); }}>✕</button>
                    </div>
                  )}
                  <select className="form-select" value={form.team} onChange={e => setForm({...form, team: e.target.value})}>
                    <option value="">Select Team</option>
                    <optgroup label="Default Teams">
                      {DEFAULT_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </optgroup>
                    {customTeams.length > 0 && (
                      <optgroup label="Custom Teams">
                        {customTeams.map(t => <option key={t} value={t}>{t}</option>)}
                      </optgroup>
                    )}
                  </select>
                  {customTeams.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {customTeams.map(t => (
                        <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: "var(--purple)" }}>
                          {t}
                          <button type="button" onClick={() => removeCustomTeam(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 XXXXX XXXXX" />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-input" type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
                </div>
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
