// src/components/MeetingNotification.js
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { MdVideoCall, MdClose, MdAccessTime } from "react-icons/md";
import { format } from "date-fns";

export default function MeetingNotification() {
  const { userRole, userData } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => { if (userData?.uid) fetchMeetings(); }, [userData]);

  async function fetchMeetings() {
    const today = format(new Date(), "yyyy-MM-dd");
    try {
      if (userRole === "superadmin") {
        const snap = await getDocs(query(collection(db, "meetings"), where("status","==","scheduled")));
        setMeetings(snap.docs.map(d=>({id:d.id,...d.data()})).filter(m=>m.date>=today));
        const reqSnap = await getDocs(query(collection(db, "meetingRequests"), where("status","==","pending")));
        setRequests(reqSnap.docs.map(d=>({id:d.id,...d.data()})));
      } else if (userRole==="admin" && userData?.uid) {
        const snap = await getDocs(query(collection(db,"meetings"),where("targetAdmins","array-contains",userData.uid),where("status","==","scheduled")));
        setMeetings(snap.docs.map(d=>({id:d.id,...d.data()})).filter(m=>m.date>=today));
      } else if (userRole==="intern" && userData?.uid) {
        const snap = await getDocs(query(collection(db,"meetings"),where("targetInterns","array-contains",userData.uid),where("status","==","scheduled")));
        setMeetings(snap.docs.map(d=>({id:d.id,...d.data()})).filter(m=>m.date>=today));
      }
    } catch(e) { console.error(e); }
  }

  if (dismissed || (meetings.length===0 && requests.length===0)) return null;

  return (
    <div style={{ position:"fixed",top:80,right:20,zIndex:999,maxWidth:360,display:"flex",flexDirection:"column",gap:8 }}>
      {meetings.slice(0,3).map(m => (
        <div key={m.id} style={{ background:"var(--bg-secondary)",border:"1px solid var(--info)",borderLeft:"4px solid var(--info)",borderRadius:12,padding:"14px 16px",boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4 }}>
                <MdVideoCall style={{ color:"var(--info)",fontSize:18 }} />
                <span style={{ fontWeight:700,fontSize:13 }}>Meeting: {m.title}</span>
              </div>
              <div style={{ fontSize:12,color:"var(--text-secondary)",marginBottom:8,display:"flex",alignItems:"center",gap:4 }}>
                <MdAccessTime style={{ fontSize:13 }} /> {m.date} at {m.time}
              </div>
              {userRole==="admin" && <p style={{ fontSize:11,color:"var(--warning)",marginBottom:8 }}>⚠️ Inform your interns to join on time.</p>}
              <a href={m.meetLink} target="_blank" rel="noreferrer" style={{ display:"inline-flex",alignItems:"center",gap:4,fontSize:12,color:"var(--info)",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.2)",padding:"4px 10px",borderRadius:6,textDecoration:"none" }}>
                <MdVideoCall /> Join
              </a>
            </div>
            <button onClick={()=>setDismissed(true)} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)" }}><MdClose /></button>
          </div>
        </div>
      ))}
      {userRole==="superadmin" && requests.length>0 && (
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--warning)",borderLeft:"4px solid var(--warning)",borderRadius:12,padding:"14px 16px",boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <span style={{ fontSize:13,color:"var(--warning)",fontWeight:600 }}>📋 {requests.length} meeting request(s) pending</span>
            <button onClick={()=>setDismissed(true)} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)" }}><MdClose /></button>
          </div>
        </div>
      )}
    </div>
  );
}
