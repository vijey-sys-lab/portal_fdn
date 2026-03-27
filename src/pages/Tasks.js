// src/pages/Tasks.js
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { db } from "../firebase";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy, where
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { MdAdd, MdClose, MdSearch, MdAssignment, MdDelete, MdEdit } from "react-icons/md";

const TEAMS = ["All Interns", "HR", "General Management", "Fullstack", "Marketing", "Finance", "Operations"];
const STATUSES = ["assigned", "ongoing", "completed", "paused"];

export default function Tasks() {
  const { userRole, userData } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", team: "All Interns", deadline: "",
    assignType: "team", specificInterns: []
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [tasksSnap, internsSnap] = await Promise.all([
        getDocs(query(collection(db, "tasks"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "interns"), where("status", "==", "approved"))),
      ]);
      setTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setInterns(internsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { toast.error("Error loading tasks"); }
    setLoading(false);
  }

  async function handleSave() {
    if (!form.title || !form.team) { toast.error("Fill required fields"); return; }
    setSaving(true);
    try {
      const data = {
        title: form.title,
        description: form.description,
        team: form.team,
        deadline: form.deadline,
        assignType: form.assignType,
        specificInterns: form.assignType === "specific" ? form.specificInterns : [],
        assignedTo: form.assignType === "specific"
          ? form.specificInterns
          : interns.filter(i => form.team === "All Interns" || i.team === form.team).map(i => i.uid),
        status: "assigned",
        createdBy: userData?.uid || "superadmin",
        createdByRole: userRole,
        updatedAt: serverTimestamp(),
      };
      if (editTask) {
        await updateDoc(doc(db, "tasks", editTask.id), data);
        toast.success("Task updated");
      } else {
        await addDoc(collection(db, "tasks"), { ...data, createdAt: serverTimestamp() });
        toast.success("Task assigned");
      }
      setShowModal(false);
      setEditTask(null);
      setForm({ title: "", description: "", team: "All Interns", deadline: "", assignType: "team", specificInterns: [] });
      fetchData();
    } catch (e) { toast.error("Error saving task"); }
    setSaving(false);
  }

  async function handleDelete(task) {
    if (!window.confirm("Delete this task?")) return;
    try {
      await deleteDoc(doc(db, "tasks", task.id));
      toast.success("Task deleted");
      fetchData();
    } catch { toast.error("Error"); }
  }

  function openEdit(task) {
    setEditTask(task);
    setForm({
      title: task.title, description: task.description || "",
      team: task.team, deadline: task.deadline || "",
      assignType: task.assignType || "team",
      specificInterns: task.specificInterns || []
    });
    setShowModal(true);
  }

  const filtered = tasks.filter(t =>
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.team?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredInterns = form.team === "All Interns" ? interns : interns.filter(i => i.team === form.team);

  return (
    <Layout title="Tasks" subtitle="Assign and manage tasks for interns">
      <div className="page-header">
        <div>
          <h2>Task Management</h2>
          <p>Assign tasks to teams or individual interns</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditTask(null); setForm({ title: "", description: "", team: "All Interns", deadline: "", assignType: "team", specificInterns: [] }); setShowModal(true); }}>
          <MdAdd /> Assign Task
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-bar">
            <MdSearch />
            <input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{filtered.length} tasks</span>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><MdAssignment /></div>
            <h3>No Tasks Yet</h3>
            <p>Assign a task to get started</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Team / Assignment</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => (
                  <tr key={task.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{task.title}</div>
                      {task.description && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, maxWidth: 240 }}>{task.description.slice(0, 80)}{task.description.length > 80 ? "..." : ""}</div>}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span className="badge badge-purple">{task.team}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {task.assignType === "specific" ? "Specific interns" : "All team"}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{task.deadline || <span style={{ color: "var(--text-muted)" }}>No deadline</span>}</td>
                    <td>
                      <span className={`badge badge-${task.status === "completed" ? "success" : task.status === "ongoing" ? "info" : task.status === "paused" ? "warning" : "accent"}`}>
                        {task.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {task.assignedTo?.length || 0} intern(s)
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(task)}><MdEdit /></button>
                        {(userRole === "superadmin") && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(task)}><MdDelete /></button>
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

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">{editTask ? "Edit Task" : "Assign New Task"}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Task Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Enter task title" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe the task..." />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Team *</label>
                  <select className="form-select" value={form.team} onChange={e => setForm({...form, team: e.target.value, specificInterns: []})}>
                    {TEAMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <input className="form-input" type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Assignment Type</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[["team", "All in Team"], ["specific", "Specific Interns"]].map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      className={`btn ${form.assignType === val ? "btn-primary" : "btn-secondary"} btn-sm`}
                      onClick={() => setForm({...form, assignType: val, specificInterns: []})}
                    >{lbl}</button>
                  ))}
                </div>
              </div>
              {form.assignType === "specific" && (
                <div className="form-group">
                  <label className="form-label">Select Interns</label>
                  <div style={{ maxHeight: 200, overflow: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
                    {filteredInterns.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No interns in selected team</p>
                    ) : filteredInterns.map(intern => (
                      <label key={intern.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer", fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={form.specificInterns.includes(intern.uid)}
                          onChange={e => {
                            const ids = e.target.checked
                              ? [...form.specificInterns, intern.uid]
                              : form.specificInterns.filter(id => id !== intern.uid);
                            setForm({...form, specificInterns: ids});
                          }}
                          style={{ accentColor: "var(--accent)" }}
                        />
                        <span>{intern.name}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>({intern.team})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}} /> Saving...</> : editTask ? "Update Task" : "Assign Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
