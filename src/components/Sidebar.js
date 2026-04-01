// src/components/Sidebar.js
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { MdDashboard,MdPeople,MdAssignment,MdBook,MdLogout,MdAdminPanelSettings,MdRateReview,MdPerson,MdBeachAccess,MdVideoCall,MdGroup,MdSchedule } from "react-icons/md";

export default function Sidebar() {
  const { userRole, userData, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate("/login"); };
  const initials = userData?.name ? userData.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2) : "U";
  const roleLabel = { superadmin:"Super Admin", admin:"Admin", intern:"Intern" }[userRole] || "User";

  const saLinks = [
    { to:"/dashboard", icon:<MdDashboard />, label:"Dashboard" },
    { to:"/admins", icon:<MdAdminPanelSettings />, label:"Admins" },
    { to:"/interns", icon:<MdPeople />, label:"Interns" },
    { to:"/teams", icon:<MdGroup />, label:"Teams" },
    { to:"/tasks", icon:<MdAssignment />, label:"Tasks" },
    { to:"/journals", icon:<MdBook />, label:"All Journals" },
    { to:"/weekly-review", icon:<MdRateReview />, label:"Weekly Reviews" },
    { to:"/leaves", icon:<MdBeachAccess />, label:"Leaves" },
    { to:"/meetings", icon:<MdVideoCall />, label:"Meetings" },
    { to:"/meeting-requests", icon:<MdSchedule />, label:"Meet Requests" },
  ];
  const adminLinks = [
    { to:"/dashboard", icon:<MdDashboard />, label:"Dashboard" },
    { to:"/interns", icon:<MdPeople />, label:"Interns" },
    { to:"/teams", icon:<MdGroup />, label:"Teams" },
    { to:"/tasks", icon:<MdAssignment />, label:"Tasks" },
    { to:"/journals", icon:<MdBook />, label:"Journals" },
    { to:"/weekly-review", icon:<MdRateReview />, label:"Weekly Reviews" },
    { to:"/leaves", icon:<MdBeachAccess />, label:"Leave Requests" },
    { to:"/meetings", icon:<MdVideoCall />, label:"Meetings" },
  ];
  const internLinks = [
    { to:"/dashboard", icon:<MdDashboard />, label:"Dashboard" },
    { to:"/my-tasks", icon:<MdAssignment />, label:"My Tasks" },
    { to:"/journal", icon:<MdBook />, label:"Daily Journal" },
    { to:"/weekly-review", icon:<MdRateReview />, label:"Weekly Review" },
    { to:"/meetings", icon:<MdVideoCall />, label:"Meetings" },
    { to:"/profile", icon:<MdPerson />, label:"My Profile" },
  ];
  const links = userRole==="superadmin"?saLinks:userRole==="admin"?adminLinks:internLinks;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/favicon.jpg" alt="BOSS Foundation" onError={e=>{e.target.style.display="none"}} />
        <div className="sidebar-logo-text">BOSS Foundation<span>Internship Portal</span></div>
      </div>
      <nav className="sidebar-nav">
        <span className="nav-section-label">Navigation</span>
        {links.map(link => (
          <NavLink key={link.to} to={link.to} className={({isActive})=>`nav-item${isActive?" active":""}`}>
            {link.icon}{link.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding:"12px 16px",borderTop:"1px solid var(--border)",background:"var(--bg-secondary)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
          {userData?.photoURL
            ? <img src={userData.photoURL} alt="" style={{ width:36,height:36,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--accent)",flexShrink:0 }} />
            : <div style={{ width:36,height:36,borderRadius:"50%",background:"var(--accent-glow)",border:"2px solid var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"var(--accent)",fontSize:14,flexShrink:0 }}>{initials}</div>
          }
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:13,fontWeight:600,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{userData?.name||"User"}</div>
            <div style={{ fontSize:10,color:"var(--accent)",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600 }}>{roleLabel}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"9px 14px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:8,color:"#ef4444",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s" }}
          onMouseEnter={e=>{e.currentTarget.style.background="#ef4444";e.currentTarget.style.color="white"}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(239,68,68,0.1)";e.currentTarget.style.color="#ef4444"}}
        >
          <MdLogout style={{ fontSize:17 }} /> Logout
        </button>
      </div>
    </aside>
  );
}
