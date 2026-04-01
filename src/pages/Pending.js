// src/pages/Pending.js
import React from "react";
import { useAuth } from "../contexts/AuthContext";
export default function Pending() {
  const { logout, userData } = useAuth();
  return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg-primary)",fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border-light)",borderRadius:20,padding:"48px 40px",maxWidth:400,width:"100%",textAlign:"center" }}>
        <div style={{ fontSize:48,marginBottom:16 }}>⏳</div>
        <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:700,marginBottom:8,color:"var(--text-primary)" }}>Account Pending Approval</h2>
        <p style={{ color:"var(--text-secondary)",fontSize:14,lineHeight:1.7,marginBottom:24 }}>Your account ({userData?.email}) is awaiting approval. Please contact your team.</p>
        <button onClick={logout} style={{ background:"var(--accent)",color:"#000",border:"none",borderRadius:8,padding:"10px 24px",fontFamily:"'DM Sans',sans-serif",fontWeight:600,cursor:"pointer",fontSize:14 }}>Sign Out</button>
      </div>
    </div>
  );
}
