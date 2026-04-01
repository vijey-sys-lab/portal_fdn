// src/pages/Journals.js
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { db } from "../firebase";
import {
  collection, getDocs, updateDoc, doc,
  query, orderBy, where
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { MdSearch, MdLink, MdCheck, MdClose, MdRateReview } from "react-icons/md";
import { format } from "date-fns";

export default function Journals() {
  const { userRole, userData } = useAuth();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("pending");
  const [remarkModal, setRemarkModal] = useState(null);
  const [remarkText, setRemarkText] = useState("");
  const [remarkStatus, setRemarkStatus] = useState("approved");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchJournals(); }, [filter]);

  async function fetchJournals() {
    setLoading(true);
    try {
      let q;
      if (filter === "all") {
        q = query(collection(db, "journals"), orderBy("date", "desc"));
      } else {
        q = query(collection(db, "journals"), where("status", "==", filter), orderBy("date", "desc"));
      }
      const snap = await getDocs(q);
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Admin only sees their team's interns
      if (userRole === "admin") {
        const internsSnap = await getDocs(query(collection(db, "interns"), where("assignedAdmin", "==", userData.uid)));
        const myInternIds = internsSnap.docs.map(d => d.data().uid);
        data = data.filter(j => myInternIds.includes(j.internId));
      }
      setJournals(data);
    } catch (e) { console.error(e); toast.error("Error loading journals"); }
    setLoading(false);
  }

  async function handleRemark() {
    if (!remarkText.trim()) { toast.error("Please enter a remark"); return; }
    setSaving(true);
    const remarkField = userRole === "superadmin" ? "superadminRemark" : "adminRemark";
    try {
      const updates = {
        [remarkField]: {
          text: remarkText,
          status: remarkStatus,
          byName: userData?.name || "Admin",
          byRole: userRole,
          date: format(new Date(), "dd MMM yyyy"),
        },
        status: remarkStatus,
        updatedAt: new Date(),
      };
      // Superadmin reviews admin DJ - status for admin's journal
      if (userRole === "superadmin" && remarkModal?.isAdminJournal) {
        updates.superadminReviewed = true;
      }
      await updateDoc(doc(db, "journals", remarkModal.id), updates);
      toast.success("Remark added!");
      setRemarkModal(null);
      setRemarkText("");
      fetchJournals();
    } catch (e) { toast.error("Error"); }
    setSaving(false);
  }

  const filtered = journals.filter(j =>
    j.internName?.toLowerCase().includes(search.toLowerCase()) ||
    j.date?.includes(search) ||
    j.internTeam?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All" },
  ];

  return (
    <Layout title="Journals" subtitle="Review and remark on intern daily journals">
      <div className="page-header">
        <div>
          <h2>Daily Journals</h2>
          <p>
            {userRole === "superadmin"
              ? "Review all intern and admin journals"
              : "Review journals from your interns"}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div className="tabs" style={{ margin: 0 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              className={`tab-btn${filter === t.key ? " active" : ""}`}
              onClick={() => setFilter(t.key)}
            >{t.label}</button>
          ))}
        </div>
        <div className="search-bar">
          <MdSearch />
          <input placeholder="Search by intern or date..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner spinner-lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📔</div>
          <h3>No Journals Found</h3>
          <p>No journals in this category</p>
        </div>
      ) : (
        filtered.map(j => (
          <div className="dj-card" key={j.id}>
            <div className="dj-card-header">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-glow)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>
                    {j.internName?.charAt(0)}
                  </div>
                  <div>
                    <div className="dj-date">{j.internName}</div>
                    <div className="dj-meta">{j.internTeam} · {j.date}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`badge badge-${j.status === "approved" ? "success" : j.status === "rejected" ? "danger" : "warning"}`}>
                  {j.status}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setRemarkModal(j); setRemarkText(""); setRemarkStatus("approved"); }}
                >
                  <MdRateReview /> Remark
                </button>
              </div>
            </div>

            {j.tasksDone && (
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Tasks Done: </span>
                <span style={{ fontSize: 13, color: "var(--accent)" }}>{j.tasksDone}</span>
              </div>
            )}

            <div className="dj-content">{j.content}</div>

            {j.driveLink && (
              <a href={j.driveLink} target="_blank" rel="noreferrer" className="dj-link">
                <MdLink /> View Work (Drive)
              </a>
            )}

            {j.adminRemark && (
              <div className={`remark-box ${j.adminRemark.status}`}>
                <div className="remark-label">Admin Remark</div>
                <div className="remark-text">{j.adminRemark.text}</div>
                <div className="remark-by">— {j.adminRemark.byName} · {j.adminRemark.date}</div>
              </div>
            )}

            {j.superadminRemark && (
              <div className="remark-box" style={{ borderLeftColor: "var(--purple)", marginTop: 8 }}>
                <div className="remark-label" style={{ color: "var(--purple)" }}>Super Admin Remark</div>
                <div className="remark-text">{j.superadminRemark.text}</div>
                <div className="remark-by">— {j.superadminRemark.byName} · {j.superadminRemark.date}</div>
              </div>
            )}
          </div>
        ))
      )}

      {remarkModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRemarkModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Add Remark</span>
              <button className="modal-close" onClick={() => setRemarkModal(null)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{remarkModal.internName}'s Journal</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{remarkModal.date}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Decision</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${remarkStatus === "approved" ? "btn-success" : "btn-secondary"}`}
                    onClick={() => setRemarkStatus("approved")}
                  ><MdCheck /> Approve</button>
                  <button
                    type="button"
                    className={`btn btn-sm ${remarkStatus === "rejected" ? "btn-danger" : "btn-secondary"}`}
                    onClick={() => setRemarkStatus("rejected")}
                  ><MdClose /> Reject</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Remark / Feedback *</label>
                <textarea
                  className="form-textarea"
                  value={remarkText}
                  onChange={e => setRemarkText(e.target.value)}
                  placeholder="Write your feedback or suggestions..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRemarkModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRemark} disabled={saving}>
                {saving ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}} /> Saving...</> : "Submit Remark"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
