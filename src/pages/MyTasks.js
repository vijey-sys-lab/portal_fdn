// src/pages/MyTasks.js
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { MdAssignment } from "react-icons/md";
import { format } from "date-fns";

export default function MyTasks() {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => { if (userData?.uid) fetchTasks(); }, [userData]);

  async function fetchTasks() {
    if (!userData?.uid) return;
    try {
      const results = await Promise.allSettled([
        getDocs(query(collection(db,"tasks"),where("assignedTo","array-contains",userData.uid))),
        userData.team ? getDocs(query(collection(db,"tasks"),where("team","==",userData.team),where("assignType","==","team"))) : Promise.resolve({docs:[]}),
        getDocs(query(collection(db,"tasks"),where("team","==","All Interns"),where("assignType","==","team"))),
      ]);
      const seen=new Set(); const all=[];
      results.forEach(r=>{ if(r.status==="fulfilled")(r.value.docs||[]).forEach(d=>{ if(!seen.has(d.id)){seen.add(d.id);all.push({id:d.id,...d.data()});} }); });
      all.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      setTasks(all);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  if (!userData) return <Layout title="My Tasks"><div className="loading-center"><div className="spinner spinner-lg" /></div></Layout>;

  return (
    <Layout title="My Tasks" subtitle="Tasks assigned to you">
      <div className="page-header">
        <div><h2>My Tasks</h2><p>Tasks assigned to you by your admin</p></div>
        <div style={{ background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 16px",fontSize:13,color:"var(--text-secondary)" }}>
          Team: <strong style={{ color:"var(--accent)" }}>{userData?.team||"—"}</strong>
        </div>
      </div>
      <div style={{ background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:10,padding:"14px 18px",marginBottom:24,fontSize:14,color:"var(--text-secondary)",display:"flex",alignItems:"center",gap:10 }}>
        💡 Once you complete a task, go to <a href="/journal" style={{ color:"var(--accent)",fontWeight:700,textDecoration:"none" }}>Daily Journal</a> and submit your work with a Google Drive link and what you learned.
      </div>
      <div className="stats-grid" style={{ marginBottom:24 }}>
        <div className="stat-card"><div className="stat-icon" style={{ background:"rgba(59,130,246,0.1)",color:"#3b82f6" }}><MdAssignment /></div><div className="stat-content"><div className="stat-value">{tasks.length}</div><div className="stat-label">Total Tasks</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background:"rgba(245,166,35,0.1)",color:"var(--accent)" }}>📋</div><div className="stat-content"><div className="stat-value">{tasks.filter(t=>!t.deadline||t.deadline>=today).length}</div><div className="stat-label">Active</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background:"rgba(239,68,68,0.1)",color:"var(--danger)" }}>⚠️</div><div className="stat-content"><div className="stat-value">{tasks.filter(t=>t.deadline&&t.deadline<today).length}</div><div className="stat-label">Overdue</div></div></div>
      </div>
      {loading ? <div className="loading-center"><div className="spinner spinner-lg" /></div>
      : tasks.length===0 ? (
        <div className="empty-state"><div className="empty-state-icon"><MdAssignment /></div><h3>No Tasks Assigned Yet</h3><p>Tasks assigned by your admin will appear here</p></div>
      ) : tasks.map(task => {
        const isOverdue = task.deadline && task.deadline < today;
        return (
          <div className="card" key={task.id} style={{ marginBottom:12,borderLeft:`4px solid ${isOverdue?"var(--danger)":"var(--accent)"}` }}>
            <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap" }}>
                  <h3 style={{ fontSize:16,fontWeight:700 }}>{task.title}</h3>
                  <span className="badge badge-accent">Assigned</span>
                  {task.assignType==="team"&&<span className="badge badge-purple" style={{ fontSize:10 }}>Team Task</span>}
                  {task.assignType==="specific"&&<span className="badge badge-info" style={{ fontSize:10 }}>For You</span>}
                  {isOverdue&&<span className="badge badge-danger" style={{ fontSize:10 }}>Overdue</span>}
                </div>
                {task.description&&<p style={{ fontSize:14,color:"var(--text-secondary)",lineHeight:1.7,marginBottom:10 }}>{task.description}</p>}
                <div style={{ display:"flex",gap:20,flexWrap:"wrap" }}>
                  <span style={{ fontSize:12,color:"var(--text-muted)" }}>Team: <span style={{ color:"var(--text-secondary)" }}>{task.team}</span></span>
                  {task.deadline ? <span style={{ fontSize:12,color:"var(--text-muted)" }}>Deadline: <span style={{ color:isOverdue?"var(--danger)":"var(--text-secondary)",fontWeight:isOverdue?700:400 }}>{task.deadline}{isOverdue&&" ⚠️"}</span></span>
                  : <span style={{ fontSize:12,color:"var(--text-muted)" }}>No deadline</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </Layout>
  );
}
