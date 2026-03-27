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
import { MdAdd, MdCheck, MdClose, MdSearch, MdPerson, MdDownload, MdBlock } from "react-icons/md";
import jsPDF from "jspdf";

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
  const body = `Dear ${intern.name},\n\nWe are pleased to offer you an internship position at BOSS Foundation in the ${intern.team} team.\n\nInternship Details:\n• Domain: ${intern.team}\n• Intern ID (NIN): ${intern.nin}\n• Duration: ${intern.startDate} to ${intern.endDate}\n\nExpectations:\n- Submit Daily Journals with work drive links\n- Complete assigned tasks within deadlines\n- Participate actively in team reviews\n- Maintain professional conduct\n\nWelcome to BOSS Foundation!`;
  const lines = pdf.splitTextToSize(body, 170);
  pdf.text(lines, 20, 145);
  pdf.setFont("helvetica", "bold");
  pdf.text("For BOSS Foundation,", 20, 240);
  pdf.setFont("helvetica", "normal");
  pdf.text("Authorized Signatory", 20, 250);
  pdf.save(`Offer_Letter_${intern.name.replace(/ /g,"_")}.pdf`);
}

export default function Interns() {
  const { userRole, userData } = useAuth();
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [form, setForm] = useState({
    name: "", email: "", password: "", team: "", phone: "",
    college: "", startDate: "", endDate: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchInterns(); }, []);

  async function fetchInterns() {
    try {
      let q;
      if (userRole === "superadmin") {
        q = query(collection(db, "interns"), orderBy("createdAt", "desc"));
      } else {
        q = query(collection(db, "interns"), where("assignedAdmin", "==", userData.uid), orderBy("createdAt", "desc"));
      }
      const snap = await getDocs(q);
      setInterns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { toast.error("Error loading interns"); }
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.name || !form.email || !form.password || !form.team || !form.startDate || !form.endDate) {
      toast.error("Fill all required fields"); return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters"); return;
    }
    setSaving(true);
    try {
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
      const uid = cred.user.uid;
      await signOut(secondaryAuth);

      const nin = `NIN-${Date.now().toString().slice(-5)}`;
      await setDoc(doc(db, "interns", uid), {
        uid,
        name: form.name,
        email: form.email,
        team: form.team,
        phone: form.phone,
        college: form.college,
        startDate: form.startDate,
        endDate: form.endDate,
        nin,
        status: "approved",
        role: "intern",
        assignedAdmin: userData?.uid || "superadmin",
        createdAt: serverTimestamp(),
      });

      toast.success(`Intern added! NIN: ${nin}`);
      setShowModal(false);
      setForm({ name: "", email: "", password: "", team: "", phone: "", college: "", startDate: "", endDate: "" });
      fetchInterns();
    } catch (e) {
      const msgs = {
        "auth/email-already-in-use": "This email is already registered",
        "auth/invalid-email": "Invalid email address",
        "auth/weak-password": "Password must be at least 6 characters",
      };
      toast.error(msgs[e.code] || e.message || "Error adding intern");
    }
    setSaving(false);
  }

  async function handleCancel(intern) {
    if (!window.confirm(`Cancel internship for ${intern.name}? Data will be retained till tenure end.`)) return;
    try {
      await updateDoc(doc(db, "interns", intern.id), { status: "cancelled" });
      toast.success("Internship cancelled. Data retained."); fetchInterns();
    } catch { toast.error("Error"); }
  }

  async function handleApprove(intern) {
    try {
      await updateDoc(doc(db, "interns", intern.id), { status: "approved" });
      toast.success("Intern approved"); fetchInterns();
    } catch { toast.error("Error"); }
  }

  const filtered = interns.filter(i => {
    const matchSearch = i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.email?.toLowerCase().includes(search.toLowerCase()) ||
      i.nin?.toLowerCase().includes(search.toLowerCase());
    if (activeTab === "all") return matchSearch;
    return matchSearch && i.status === activeTab;
  });

  const tabs = [
    { key: "all", label: "All" },
    { key: "approved", label: "Active" },
    { key: "pending", label: "Pending" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <Layout title="Interns" subtitle="Manage intern accounts and tenures">
      <div className="page-header">
        <div><h2>Intern Management</h2><p>Add interns with login credentials and manage their tenure</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><MdAdd /> Add Intern</button>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div className="tabs" style={{ margin: 0, border: "none", background: "none", padding: 0, gap: 6 }}>
            {tabs.map(t => (
              <button key={t.key} className={`tab-btn${activeTab === t.key ? " active" : ""}`} onClick={() => setActiveTab(t.key)}>
                {t.label} <span style={{ marginLeft: 4, opacity: 0.7 }}>({interns.filter(i => t.key === "all" ? true : i.status === t.key).length})</span>
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
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No Interns Found</h3><p>Add interns to get started</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Intern</th><th>NIN</th><th>Team</th><th>College</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(intern => (
                  <tr key={intern.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-glow)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: "var(--accent)" }}>
                          {intern.name?.charAt(0).toUpperCase()}
                        </div>
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
                      <span className={`badge badge-${intern.status === "approved" ? "success" : intern.status === "cancelled" ? "danger" : "warning"}`}>
                        {intern.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {intern.status === "pending" && (
                          <button className="btn btn-success btn-sm" onClick={() => handleApprove(intern)}><MdCheck /></button>
                        )}
                        {intern.status === "approved" && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancel(intern)}><MdBlock /> Cancel</button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => generateOfferLetter(intern)} title="Download Offer Letter">
                          <MdDownload />
                        </button>
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
                  <label className="form-label">Password * (min 6 chars)</label>
                  <input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Minimum 6 characters" />
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
                A unique NIN will be auto-generated. Intern can download their offer letter from their profile after the start date.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
                {saving ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}} /> Creating...</> : "Add Intern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
