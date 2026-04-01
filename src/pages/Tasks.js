// src/pages/Tasks.js
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { db } from "../firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { MdAdd, MdClose, MdSearch, MdAssignment, MdDelete, MdEdit, MdLink, MdLightbulb, MdCheck, MdExpandMore, MdExpandLess } from "react-icons/md";

const TEAMS = ["All Interns", "HR", "General Management", "Fullstack", "Marketing", "Finance", "Operations"];

export default function Tasks() {
  const { userRole, userData } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", description: "", team: "All Interns", deadline: "", assignType: "team", specificInterns: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [tasksSnap, completionsSnap, internsSnap] = await Promise.allSettled([
        getDocs(query(collection(db, "tasks"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "taskCompletions"), where("status", "==", "pending_approval"))),
        getDocs(query(collection(db, "interns"), where("status", "==", "active"))),
      ]);
      if (tasksSnap.status === "fulfilled") setTasks(tasksSnap.value.docs.map(d => ({ id: d.id, ...d.data() })));
      if (completionsSnap.status === "fulfilled") setCompletions(completionsSnap.value.docs.map(d => ({ id: d.id, ...d.data() })));
      if (internsSnap.status === "fulfilled") setInterns(internsSnap.value.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); toast.error("Error loading tasks"); }
    setLoading(false);
  }

  async function handleSave() {
    if (!form.title || !form.team) { toast.error("Fill required fields"); return; }
    setSaving(true);
    try {
      const data = {
        title: form.title, description: form.description, team: form.team,
        deadline: form.deadline, assignType: form.assignType,
        specificInterns: form.assignType === "specific" ? form.specificInterns : [],
        assignedTo: form.assignType === "specific"
          ? form.specificInterns
          : interns.filter(i => form.team === "All Interns" || i.team === form.team).map(i => i.uid),
        status: "assigned",
        internCompletions: {},
        createdBy: userData?.uid || "superadmin",
        createdByRole: userRole,
        updatedAt: serverTimestamp(),
      };
      if (editTask) {
        await updateDoc(doc(db, "tasks", editTask.id), data);
        toast.success("Task updated");
      } else {
        await addDoc(collection(db, "tasks"), { ...data, createdAt: serverTimestamp() });
        toast.success("Task assigned to " + data.assignedTo.length + " intern(s)");
      }
      setShowModal(false); setEditTask(null);
      setForm({ title: "", description: "", team: "All Interns", deadline: "", assignType: "team", specificInterns: [] });
      fetchData();
    } catch (e) { toast.error("Error saving task"); }
    setSaving(false);
  }

  async function approveCompletion(completion) {
    try {
      // Update completion record
      await updateDoc(doc(db, "taskCompletions", completion.id), { status: "approved", approvedBy: userData?.name, approvedAt: serverTimestamp() });
      // Update task internCompletions map
      const task = tasks.find(t => t.id === completion.taskId);
      if (task) {
        const internCompletions = { ...(task.internCompletions || {}) };
        internCompletions[completion.internId] = { ...internCompletions[completion.internId], status: "approved" };
        await updateDoc(doc(db, "tasks", completion.taskId), { internCompletions });
      }
      toast.success(`${completion.internName}'s completion approved!`);
      fetchData();
    } catch { toast.error("Error"); }
  }

  async function handleDelete(task) {
    if (!window.confirm("Delete this task?")) return;
    try { await deleteDoc(doc(db, "tasks", task.id)); toast.success("Deleted"); fetchData(); }
    catch { toast.error("Error"); }
  }

  function openEdit(task) {
    setEditTask(task);
    setForm({ title: task.title, description: task.description || "", team: task.team, deadline: task.deadline || "", assignType: task.assignType || "team", specificInterns: task.specificInterns || [] });
    setShowModal(true);
  }

  const filtered = tasks.filter(t =>
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.team?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredInterns = form.team === "All Interns" ? interns : interns.filter(i => i.team === form.team);
  const pendingCompletions = completions.length;

  return (
    <Layout title="Tasks" subtitle="Assign and approve tasks">
      <div className="page-header">
        <div>
          <h2>Task Management</h2>
          {pendingCompletions > 0 && <p style={{ color: "var(--warning)" }}>⏳ {pendingCompletions} submission(s) awaiting your approval</p>}
        </div>
        <button className="btn btn-primary" onClick={() => { setEditTask(null); setForm({ title: "", description: "", team: "All Interns", deadline: "", assignType: "team", specificInterns: [] }); setShowModal(true); }}>
          <MdAdd /> Assign Task
        </button>
      </div>

      {/* Pending Approvals section */}
      {completions.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderLeft: "4px solid var(--warning)" }}>
          <div className="card-header">
            <span className="card-title" style={{ color: "var(--warning)" }}>⏳ Pending Task Approvals ({completions.length})</span>
          </div>
          {completions.map(c => (
            <div key={c.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.internName} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>submitted</span> {c.taskTitle}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{c.internTeam}</div>
                <div style={{ background: "var(--bg-primary)", borderRadius: 6, padding: "8px 12px", marginBottom: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Learning</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{c.learning}</div>
                </div>
                {c.driveLink && <a href={c.driveLink} target="_blank" rel="noreferrer" className="dj-link" style={{ fontSize: 12 }}><MdLink /> View Project</a>}
              </div>
              <button className="btn btn-success btn-sm" onClick={() => approveCompletion(c)}>
                <MdCheck /> Approve
              </button>
            </div>
          ))}
        </div>
      )}

      {/* All Tasks */}
      <div className="card">
        <div className="card-header">
          <div className="search-bar"><MdSearch /><input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{filtered.length} tasks</span>
        </div>

        {loading ? <div className="loading-center"><div className="spinner" /></div>
        : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon"><MdAssignment /></div><h3>No Tasks Yet</h3></div>
        ) : filtered.map(task => {
          const completionCount = Object.values(task.internCompletions || {}).filter(c => c.status === "approved").length;
          const totalAssigned = task.assignedTo?.length || 0;
          return (
            <div key={task.id} style={{ borderBottom: "1px solid var(--border)", padding: "14px 0" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{task.title}</span>
                    <span className={`badge badge-${task.status === "completed" ? "success" : task.status === "ongoing" ? "info" : "accent"}`}>{task.status}</span>
                    <span className="badge badge-purple">{task.team}</span>
                    <span className="badge badge-success" style={{ fontSize: 10 }}>{completionCount}/{totalAssigned} approved</span>
                  </div>
                  {task.description && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{task.description.slice(0, 100)}...</div>}
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {task.deadline ? `Deadline: ${task.deadline}` : "No deadline"} · {totalAssigned} intern(s)
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {completionCount > 0 && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}>
                      {expandedTask === task.id ? <MdExpandLess /> : <MdExpandMore />} Submissions
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(task)}><MdEdit /></button>
                  {userRole === "superadmin" && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(task)}><MdDelete /></button>}
                </div>
              </div>

              {/* Expanded completions */}
              {expandedTask === task.id && (
                <div style={{ marginTop: 12, background: "var(--bg-primary)", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>Approved Submissions</div>
                  {Object.entries(task.internCompletions || {}).filter(([, c]) => c.status === "approved").map(([uid, c]) => (
                    <div key={uid} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{interns.find(i => i.uid === uid)?.name || uid}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{c.learning}</div>
                      {c.driveLink && <a href={c.driveLink} target="_blank" rel="noreferrer" className="dj-link" style={{ fontSize: 11 }}><MdLink /> Project</a>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Assign Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">{editTask ? "Edit Task" : "Assign New Task"}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Task Title *</label><input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Task title" /></div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Task description..." /></div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Team *</label>
                  <select className="form-select" value={form.team} onChange={e => setForm({...form, team: e.target.value, specificInterns: []})}>
                    {TEAMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Deadline</label><input className="form-input" type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Assignment Type</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[["team","All in Team"],["specific","Specific Interns"]].map(([val, lbl]) => (
                    <button key={val} type="button" className={`btn btn-sm ${form.assignType === val ? "btn-primary" : "btn-secondary"}`} onClick={() => setForm({...form, assignType: val, specificInterns: []})}>{lbl}</button>
                  ))}
                </div>
              </div>
              {form.assignType === "specific" && (
                <div className="form-group">
                  <label className="form-label">Select Interns</label>
                  <div style={{ maxHeight: 180, overflow: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
                    {filteredInterns.map(intern => (
                      <label key={intern.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer", fontSize: 13 }}>
                        <input type="checkbox" checked={form.specificInterns.includes(intern.uid)} onChange={e => { const ids = e.target.checked ? [...form.specificInterns, intern.uid] : form.specificInterns.filter(id => id !== intern.uid); setForm({...form, specificInterns: ids}); }} style={{ accentColor: "var(--accent)" }} />
                        {intern.name} <span style={{ color: "var(--text-muted)", fontSize: 11 }}>({intern.team})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}} /> Saving...</> : editTask ? "Update" : "Assign Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
