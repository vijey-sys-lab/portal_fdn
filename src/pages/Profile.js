// src/pages/Profile.js
import React, { useEffect, useState, useRef } from "react";
import Layout from "../components/Layout";
import { db, storage } from "../firebase";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../contexts/AuthContext";
import { MdDownload, MdEmail, MdPhone, MdCalendarToday, MdSchool, MdCameraAlt, MdWarning } from "react-icons/md";
import jsPDF from "jspdf";
import signatureBase64 from "../signatureData";
import { format, differenceInDays } from "date-fns";

// ─── Offer Letter PDF ────────────────────────────────────────────────────────
function generateOfferLetter(intern) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210; // A4 width

  // Header bar
  pdf.setFillColor(245, 166, 35);
  pdf.rect(0, 0, W, 18, "F");

  // Company name in header
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(0, 0, 0);
  pdf.text("BOSS FOUNDATION", W / 2, 11, { align: "center" });

  // Subheader
  pdf.setFillColor(22, 22, 31);
  pdf.rect(0, 18, W, 10, "F");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(200, 200, 200);
  pdf.text("Internship Management Portal  |  Inspiring Growth", W / 2, 24, { align: "center" });

  // Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(30, 30, 30);
  pdf.text("INTERNSHIP OFFER LETTER", W / 2, 44, { align: "center" });

  // Underline
  pdf.setDrawColor(245, 166, 35);
  pdf.setLineWidth(0.8);
  pdf.line(40, 47, W - 40, 47);

  // Ref & Date
  const today = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  const ref = `BF/${new Date().getFullYear()}/${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text(`Date: ${today}`, 20, 55);
  pdf.text(`Ref No: ${ref}`, W - 20, 55, { align: "right" });

  // Divider
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.3);
  pdf.line(20, 59, W - 20, 59);

  // Addressee
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(30, 30, 30);
  pdf.text("To,", 20, 67);
  pdf.setFontSize(12);
  pdf.text(intern.name, 20, 74);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 80);
  pdf.text(`Email: ${intern.email}`, 20, 81);
  if (intern.college) pdf.text(`College: ${intern.college}`, 20, 87);

  pdf.setDrawColor(220, 220, 220);
  pdf.line(20, 93, W - 20, 93);

  // Subject
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(30, 30, 30);
  pdf.text("Sub: Internship Offer Letter — BOSS Foundation", 20, 101);

  // Body
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10.5);
  pdf.setTextColor(50, 50, 50);
  pdf.text(`Dear ${intern.name},`, 20, 112);

  const intro = "We are pleased to offer you an internship position at BOSS Foundation. After reviewing your profile, we confirm your selection for the internship program under the domain mentioned below.";
  const introLines = pdf.splitTextToSize(intro, W - 40);
  pdf.text(introLines, 20, 120);

  // Details box
  pdf.setFillColor(248, 248, 248);
  pdf.setDrawColor(245, 166, 35);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(20, 134, W - 40, 48, 3, 3, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(245, 166, 35);
  pdf.text("INTERNSHIP DETAILS", 25, 142);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(40, 40, 40);
  const details = [
    ["Intern Name", intern.name],
    ["Intern ID (NIN)", intern.nin],
    ["Domain / Team", intern.team],
    ["Start Date", intern.startDate],
    ["End Date", intern.endDate],
  ];
  details.forEach(([label, value], i) => {
    const y = 150 + i * 6;
    pdf.setFont("helvetica", "bold");
    pdf.text(`${label}:`, 25, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(value || "—", 80, y);
  });

  // Expectations
  let y = 192;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(30, 30, 30);
  pdf.text("EXPECTATIONS:", 20, y);
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(60, 60, 60);
  const expects = [
    "• Submit Daily Journals with completed work Google Drive links",
    "• Complete all assigned tasks within deadlines",
    "• Participate actively in weekly reviews and team meetings",
    "• Maintain professional conduct throughout the tenure",
  ];
  expects.forEach(line => { pdf.text(line, 25, y); y += 6.5; });

  // Closing
  y += 4;
  pdf.setFontSize(10);
  pdf.text("We look forward to your valuable contribution and wish you a rewarding internship experience.", 20, y);
  y += 10;
  pdf.text("Yours sincerely,", 20, y);

  // Signature image
  y += 4;
  try {
    pdf.addImage(signatureBase64, "PNG", 20, y, 45, 18);
  } catch (e) { console.error("Sign error:", e); }
  y += 22;

  // Signatory name
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(30, 30, 30);
  pdf.text("Vijey Prasanna", 20, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text("Chief Executive Officer", 20, y + 5);
  pdf.text("BOSS Foundation", 20, y + 10);

  // Footer bar
  pdf.setFillColor(245, 166, 35);
  pdf.rect(0, 285, W, 12, "F");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.text("BOSS Foundation  |  Internship Management Portal  |  Inspiring Growth", W / 2, 292, { align: "center" });

  pdf.save(`Offer_Letter_${intern.name.replace(/ /g, "_")}.pdf`);
}

// ─── Certificate PDF ──────────────────────────────────────────────────────────
function generateCertificate(intern) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297; const H = 210;

  // Dark background
  pdf.setFillColor(10, 10, 15);
  pdf.rect(0, 0, W, H, "F");

  // Gold outer border
  pdf.setDrawColor(245, 166, 35);
  pdf.setLineWidth(4);
  pdf.rect(8, 8, W - 16, H - 16);

  // Inner border
  pdf.setLineWidth(1);
  pdf.rect(13, 13, W - 26, H - 26);

  // Corner ornaments
  const corners = [[20, 20], [W - 20, 20], [20, H - 20], [W - 20, H - 20]];
  pdf.setLineWidth(2);
  corners.forEach(([x, y]) => {
    pdf.setDrawColor(245, 166, 35);
    pdf.circle(x, y, 3, "S");
  });

  // Header
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(245, 166, 35);
  pdf.text("BOSS FOUNDATION", W / 2, 30, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(160, 160, 160);
  pdf.text("I N S P I R I N G   G R O W T H", W / 2, 37, { align: "center" });

  // Decorative line
  pdf.setDrawColor(245, 166, 35);
  pdf.setLineWidth(0.5);
  pdf.line(60, 41, W - 60, 41);

  // Certificate title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(30);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Certificate of Internship", W / 2, 65, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(180, 180, 180);
  pdf.text("C O M P L E T I O N", W / 2, 74, { align: "center" });

  // Presented to
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.setTextColor(160, 160, 160);
  pdf.text("This is to proudly certify that", W / 2, 90, { align: "center" });

  // Intern name
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(26);
  pdf.setTextColor(245, 166, 35);
  pdf.text(intern.name, W / 2, 105, { align: "center" });

  // Underline name
  pdf.setDrawColor(245, 166, 35);
  pdf.setLineWidth(0.5);
  const nameWidth = pdf.getTextWidth(intern.name);
  pdf.line(W / 2 - nameWidth / 2, 108, W / 2 + nameWidth / 2, 108);

  // Description
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(200, 200, 200);
  pdf.text("has successfully completed an internship programme in", W / 2, 118, { align: "center" });

  // Domain
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.setTextColor(255, 255, 255);
  pdf.text(intern.team, W / 2, 128, { align: "center" });

  // Duration
  const days = intern.startDate && intern.endDate
    ? differenceInDays(new Date(intern.endDate), new Date(intern.startDate))
    : 0;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(160, 160, 160);
  pdf.text(
    `Duration: ${intern.startDate} to ${intern.endDate}  (${days} days)   |   NIN: ${intern.nin}`,
    W / 2, 138, { align: "center" }
  );

  // Divider line
  pdf.setDrawColor(80, 80, 80);
  pdf.setLineWidth(0.3);
  pdf.line(40, 150, W - 40, 150);

  // Signature section
  const sigX = W / 2 - 35;
  try {
    pdf.addImage(signatureBase64, "PNG", sigX, 153, 70, 22);
  } catch (e) { console.error("Cert sign error:", e); }

  // Signature line
  pdf.setDrawColor(245, 166, 35);
  pdf.setLineWidth(0.4);
  pdf.line(W / 2 - 40, 177, W / 2 + 40, 177);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Vijey Prasanna", W / 2, 183, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(160, 160, 160);
  pdf.text("Chief Executive Officer, BOSS Foundation", W / 2, 189, { align: "center" });

  // Bottom gold bar
  pdf.setFillColor(245, 166, 35);
  pdf.rect(0, H - 12, W, 12, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.text("BOSS FOUNDATION  |  INTERNSHIP MANAGEMENT PORTAL  |  INSPIRING GROWTH", W / 2, H - 4, { align: "center" });

  pdf.save(`Certificate_${intern.name.replace(/ /g, "_")}.pdf`);
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
export default function Profile() {
  const { userData, userRole } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [journals, setJournals] = useState([]);
  const [weeklyReviews, setWeeklyReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");
  const [uploading, setUploading] = useState(false);
  const [photoURL, setPhotoURL] = useState(userData?.photoURL || null);
  const fileRef = useRef();

  useEffect(() => {
    if (userData?.uid) fetchData();
  }, [userData]);

  async function fetchData() {
    try {
      const [tasksSnap, journalsSnap, wrSnap] = await Promise.allSettled([
        getDocs(query(collection(db, "tasks"), where("assignedTo", "array-contains", userData.uid))),
        getDocs(query(collection(db, "journals"), where("internId", "==", userData.uid))),
        getDocs(query(collection(db, "weeklyReviews"), where("submittedById", "==", userData.uid))),
      ]);
      if (tasksSnap.status === "fulfilled") setTasks(tasksSnap.value.docs.map(d => ({ id: d.id, ...d.data() })));
      if (journalsSnap.status === "fulfilled") setJournals(journalsSnap.value.docs.map(d => ({ id: d.id, ...d.data() })));
      if (wrSnap.status === "fulfilled") setWeeklyReviews(wrSnap.value.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast && alert("Photo must be under 2MB"); return; }
    setUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${userData.uid}/photo.jpg`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const col = userRole === "admin" ? "admins" : "interns";
      await updateDoc(doc(db, col, userData.uid), { photoURL: url });
      setPhotoURL(url);
    } catch (e) { console.error(e); alert("Error uploading photo"); }
    setUploading(false);
  }

  const startDate = userData?.startDate ? new Date(userData.startDate) : null;
  const endDate = userData?.endDate ? new Date(userData.endDate) : null;
  const now = new Date();
  const tenureEnded = endDate && now > endDate;
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))) : null;
  const canDownloadOffer = startDate && now >= startDate;
  const canDownloadCert = tenureEnded;

  const totalTasks = tasks.length;
  const progress = totalTasks ? Math.round((tasks.filter(t => t.status === "completed").length / totalTasks) * 100) : 0;

  return (
    <Layout title="My Profile" subtitle="Your internship profile and progress">

      {daysLeft !== null && daysLeft <= 7 && !tenureEnded && (
        <div className="alert alert-warning" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <MdWarning />
          <span>Your internship ends in <strong>{daysLeft} day(s)</strong>! Download your Offer Letter and Certificate before tenure ends.</span>
        </div>
      )}

      {tenureEnded && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <MdWarning /> <strong>Your internship tenure has ended.</strong> Portal active for 7 more days. Download your Certificate and Offer Letter now before data is removed.
        </div>
      )}

      {/* Profile Header */}
      <div className="profile-header" style={{ marginBottom: 24 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          {photoURL ? (
            <img src={photoURL} alt="Profile" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--accent)" }} />
          ) : (
            <div className="profile-avatar">
              {userData?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
          )}
          <button
            onClick={() => fileRef.current.click()}
            style={{ position: "absolute", bottom: 0, right: 0, background: "var(--accent)", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#000" }}
            title="Upload photo"
          >
            {uploading
              ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
              : <MdCameraAlt style={{ fontSize: 14 }} />
            }
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
        </div>

        <div className="profile-info" style={{ flex: 1 }}>
          <h2>{userData?.name}</h2>
          <p>{userData?.nin} · {userData?.team} Intern</p>
          <div className="profile-meta">
            <span className="profile-meta-item"><MdEmail />{userData?.email}</span>
            {userData?.phone && <span className="profile-meta-item"><MdPhone />{userData.phone}</span>}
            {userData?.college && <span className="profile-meta-item"><MdSchool />{userData.college}</span>}
            {userData?.startDate && <span className="profile-meta-item"><MdCalendarToday />Started: {userData.startDate}</span>}
            {userData?.endDate && <span className="profile-meta-item"><MdCalendarToday />Ends: {userData.endDate}</span>}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {canDownloadOffer ? (
            <button className="btn btn-primary btn-sm" onClick={() => generateOfferLetter(userData)}>
              <MdDownload /> Offer Letter
            </button>
          ) : (
            <button className="btn btn-secondary btn-sm" disabled title="Available on tenure start date">
              <MdDownload /> Offer Letter
            </button>
          )}
          {canDownloadCert ? (
            <button className="btn btn-success btn-sm" onClick={() => generateCertificate(userData)}>
              <MdDownload /> Certificate
            </button>
          ) : (
            <button className="btn btn-secondary btn-sm" disabled title="Available after tenure ends">
              <MdDownload /> Certificate
            </button>
          )}
          <span className={`badge badge-${userData?.status === "active" ? "success" : "danger"}`} style={{ textAlign: "center" }}>
            {userData?.status}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>📋</div>
          <div className="stat-content"><div className="stat-value">{totalTasks}</div><div className="stat-label">Total Tasks</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>📔</div>
          <div className="stat-content"><div className="stat-value">{journals.length}</div><div className="stat-label">Journals</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>⭐</div>
          <div className="stat-content"><div className="stat-value">{weeklyReviews.length}</div><div className="stat-label">Weekly Reviews</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(245,166,35,0.1)", color: "var(--accent)" }}>📈</div>
          <div className="stat-content"><div className="stat-value">{progress}%</div><div className="stat-label">Progress</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn${activeTab === "tasks" ? " active" : ""}`} onClick={() => setActiveTab("tasks")}>Tasks ({totalTasks})</button>
        <button className={`tab-btn${activeTab === "journals" ? " active" : ""}`} onClick={() => setActiveTab("journals")}>Journals ({journals.length})</button>
        <button className={`tab-btn${activeTab === "wr" ? " active" : ""}`} onClick={() => setActiveTab("wr")}>Weekly Reviews ({weeklyReviews.length})</button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : activeTab === "tasks" ? (
        <div className="card">
          {tasks.length === 0 ? (
            <div className="empty-state" style={{ padding: "30px 0" }}><p>No tasks assigned yet</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Task</th><th>Team</th><th>Deadline</th><th>Type</th></tr></thead>
                <tbody>
                  {tasks.map(t => (
                    <tr key={t.id}>
                      <td><div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>{t.description && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.description.slice(0,60)}...</div>}</td>
                      <td><span className="badge badge-purple">{t.team}</span></td>
                      <td style={{ fontSize: 13 }}>{t.deadline || "—"}</td>
                      <td><span className="badge badge-accent">{t.assignType === "specific" ? "For You" : "Team"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === "journals" ? (
        <div>
          {journals.length === 0 ? (
            <div className="empty-state"><p>No journals submitted yet</p></div>
          ) : journals.map(j => (
            <div className="dj-card" key={j.id}>
              <div className="dj-card-header">
                <div className="dj-date">{j.date}</div>
                <span className={`badge badge-${j.status === "approved" ? "success" : j.status === "rejected" ? "danger" : "warning"}`}>{j.status}</span>
              </div>
              <div className="dj-content">{j.content?.slice(0, 200)}{j.content?.length > 200 ? "..." : ""}</div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {weeklyReviews.length === 0 ? (
            <div className="empty-state"><p>No weekly reviews submitted yet</p></div>
          ) : weeklyReviews.map(wr => (
            <div className="card" key={wr.id} style={{ marginBottom: 12, borderLeft: `4px solid var(--${wr.saStatus === "approved" ? "success" : wr.saStatus === "rejected" ? "danger" : "warning"})` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>{wr.week}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div>{[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= wr.selfRating ? "var(--accent)" : "var(--border)", fontSize: 14 }}>★</span>)}</div>
                  <span className={`badge badge-${wr.saStatus === "approved" ? "success" : wr.saStatus === "rejected" ? "danger" : "warning"}`}>{wr.saStatus}</span>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
                {wr.learnings?.slice(0, 150)}{wr.learnings?.length > 150 ? "..." : ""}
              </div>
              {wr.saRemark && <div style={{ fontSize: 12, color: "var(--success)", marginTop: 6 }}>SA Remark: {wr.saRemark}</div>}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
