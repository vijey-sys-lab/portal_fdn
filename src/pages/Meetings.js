// src/pages/Meetings.js
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { db } from "../firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { MdAdd, MdClose, MdVideoCall, MdSchedule, MdCancel, MdCheck, MdPeople, MdAccessTime } from "react-icons/md";
import { format } from "date-fns";

export default function Meetings() {
  const { userRole, userData } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ preferredTime: "", reason: "", meetingId: "" });
  const [form, setForm] = useState({
    title: "", meetLink: "", date: "", time: "",
    targetType: "all_admins", // all_admins, specific_admins, with_interns
    selectedAdmins: [], includeInterns: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      let q;
      if (userRole === "superadmin") {
        q = query(collection(db, "meetings"), orderBy("createdAt", "desc"));
      } else if (userRole === "admin") {
        q = query(collection(db, "meetings"), where("targetAdmins", "array-contains", userData.uid));
      } else {
        q = query(collection(db, "meetings"), where("targetInterns", "array-contains", userData.uid));
      }
      const snap = await getDocs(q);
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })));

      if (userRole === "superadmin") {
        const admSnap = await getDocs(query(collection(db, "admins"), where("status", "==", "approved")));
        setAdmins(admSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleSchedule() {
    if (!form.title || !form.meetLink || !form.date || !form.time) {
      toast.error("Fill all required fields"); return;
    }
    setSaving(true);
    try {
      // Get target admins
      let targetAdmins = [];
      let targetInterns = [];

      if (form.targetType === "all_admins") {
        targetAdmins = admins.map(a => a.uid);
      } else if (form.targetType === "specific_admins") {
        targetAdmins = form.selectedAdmins;
      }

      // If include interns, get all interns under selected admins
      if (form.includeInterns && targetAdmins.length > 0) {
        const internsSnap = await getDocs(query(collection(db, "interns"),
          where("status", "==", "active"),
          where("assignedAdmin", "in", targetAdmins)
        ));
        targetInterns = internsSnap.docs.map(d => d.data().uid);
      }

      await addDoc(collection(db, "meetings"), {
        title: form.title,
        meetLink: form.meetLink,
        date: form.date,
        time: form.time,
        targetAdmins,
        targetInterns,
        includeInterns: form.includeInterns,
        targetType: form.targetType,
        status: "scheduled",
        scheduledBy: userData?.name,
        cancelledNotified: false,
        createdAt: serverTimestamp(),
      });
      toast.success("Meeting scheduled! All participants will be notified.");
      setShowModal(false);
      setForm({ title: "", meetLink: "", date: "", time: "", targetType: "all_admins", selectedAdmins: [], includeInterns: false });
      fetchData();
    } catch (e) { console.error(e); toast.error("Error scheduling meeting"); }
    setSaving(false);
  }

  async function handleCancel(meeting) {
    if (!window.confirm("Cancel this meeting? All participants will be notified.")) return;
    try {
      await updateDoc(doc(db, "meetings", meeting.id), {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        cancelledBy: userData?.name,
      });
      toast.success("Meeting cancelled. Participants will be notified.");
      fetchData();
    } catch { toast.error("Error"); }
  }

  async function handleRequestMeeting() {
    if (!requestForm.preferredTime || !requestForm.reason) {
      toast.error("Fill all fields"); return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "meetingRequests"), {
        requestedBy: userData?.uid,
        requestedByName: userData?.name,
        requestedByRole: userRole,
        preferredTime: requestForm.preferredTime,
        reason: requestForm.reason,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      toast.success("Meeting request sent to Super Admin!");
      setShowRequestModal(false);
      setRequestForm({ preferredTime: "", reason: "" });
    } catch (e) { toast.error("Error sending request"); }
    setSaving(false);
  }

  async function handleApproveRequest(req) {
    if (!req.meetLink || !req.approvedTime) {
      toast.error("Set meet link and time first"); return;
    }
    try {
      await updateDoc(doc(db, "meetingRequests", req.id), {
        status: "approved",
        meetLink: req.meetLink,
        approvedTime: req.approvedTime,
        approvedAt: serverTimestamp(),
      });
      toast.success("Request approved!");
      fetchData();
    } catch { toast.error("Error"); }
  }

  const upcomingMeetings = meetings.filter(m => m.status === "scheduled" && m.date >= format(new Date(), "yyyy-MM-dd"));
  const pastMeetings = meetings.filter(m => m.status !== "scheduled" || m.date < format(new Date(), "yyyy-MM-dd"));

  return (
    <Layout title="Meetings" subtitle="Schedule and manage team meetings">
      <div className="page-header">
        <div><h2>Meetings</h2><p>Google Meet sessions for teams</p></div>
        <div style={{ display: "flex", gap: 10 }}>
          {userRole === "superadmin" && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <MdAdd /> Schedule Meeting
            </button>
          )}
          {userRole === "admin" && (
            <button className="btn btn-secondary" onClick={() => setShowRequestModal(true)}>
              <MdSchedule /> Request Meeting
            </button>
          )}
        </div>
      </div>

      {/* Upcoming meetings */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--text-primary)" }}>
          📅 Upcoming Meetings ({upcomingMeetings.length})
        </h3>
        {upcomingMeetings.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No upcoming meetings scheduled</div>
        ) : upcomingMeetings.map(m => (
          <div key={m.id} className="card" style={{ marginBottom: 12, borderLeft: "4px solid var(--info)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <MdVideoCall style={{ color: "var(--info)", fontSize: 20 }} />
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{m.title}</span>
                  <span className="badge badge-info">Scheduled</span>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                    <MdAccessTime /> {m.date} at {m.time}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                    <MdPeople /> {m.targetAdmins?.length || 0} admin(s){m.includeInterns ? ` + interns` : ""}
                  </span>
                </div>
                <a href={m.meetLink} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                  <MdVideoCall /> Join Meeting
                </a>
              </div>
              {userRole === "superadmin" && (
                <button className="btn btn-danger btn-sm" onClick={() => handleCancel(m)}>
                  <MdCancel /> Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Past / cancelled */}
      {pastMeetings.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--text-secondary)" }}>Past & Cancelled</h3>
          {pastMeetings.map(m => (
            <div key={m.id} className="card" style={{ marginBottom: 8, opacity: 0.7, borderLeft: `4px solid var(--${m.status === "cancelled" ? "danger" : "border"})` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</span>
                <span className={`badge badge-${m.status === "cancelled" ? "danger" : "accent"}`}>{m.status}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>{m.date} {m.time}</span>
              </div>
              {m.status === "cancelled" && m.cancelledBy && (
                <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>Cancelled by {m.cancelledBy}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Schedule Meeting Modal (SA only) */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">Schedule Meeting</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Meeting Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g., Weekly Team Sync" />
              </div>
              <div className="form-group">
                <label className="form-label">Google Meet Link *</label>
                <input className="form-input" value={form.meetLink} onChange={e => setForm({...form, meetLink: e.target.value})} placeholder="https://meet.google.com/..." />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input className="form-input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} min={format(new Date(), "yyyy-MM-dd")} />
                </div>
                <div className="form-group">
                  <label className="form-label">Time *</label>
                  <input className="form-input" type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Invite</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[["all_admins","All Admins"], ["specific_admins","Specific Admins"]].map(([val, lbl]) => (
                    <button key={val} type="button" className={`btn btn-sm ${form.targetType === val ? "btn-primary" : "btn-secondary"}`} onClick={() => setForm({...form, targetType: val, selectedAdmins: []})}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              {form.targetType === "specific_admins" && (
                <div className="form-group">
                  <label className="form-label">Select Admins</label>
                  <div style={{ maxHeight: 160, overflow: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
                    {admins.map(a => (
                      <label key={a.uid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer", fontSize: 13 }}>
                        <input type="checkbox" checked={form.selectedAdmins.includes(a.uid)} onChange={e => {
                          const ids = e.target.checked ? [...form.selectedAdmins, a.uid] : form.selectedAdmins.filter(id => id !== a.uid);
                          setForm({...form, selectedAdmins: ids});
                        }} style={{ accentColor: "var(--accent)" }} />
                        {a.name} <span style={{ color: "var(--text-muted)", fontSize: 11 }}>({a.team})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={form.includeInterns} onChange={e => setForm({...form, includeInterns: e.target.checked})} style={{ accentColor: "var(--accent)" }} />
                Also include interns under selected admins
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSchedule} disabled={saving}>
                {saving ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}} /> Scheduling...</> : <><MdVideoCall /> Schedule Meeting</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Meeting Modal (Admin only) */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowRequestModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Request Meeting with Super Admin</span>
              <button className="modal-close" onClick={() => setShowRequestModal(false)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Preferred Date & Time *</label>
                <input className="form-input" type="datetime-local" value={requestForm.preferredTime} onChange={e => setRequestForm({...requestForm, preferredTime: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Reason for Meeting *</label>
                <textarea className="form-textarea" value={requestForm.reason} onChange={e => setRequestForm({...requestForm, reason: e.target.value})} placeholder="What do you want to discuss?" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRequestMeeting} disabled={saving}>
                {saving ? "Sending..." : <><MdSchedule /> Send Request</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
