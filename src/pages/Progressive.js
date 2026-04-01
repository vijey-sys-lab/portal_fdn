// src/pages/Progressive.js
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";

export default function Progressive() {
  const { userData, logout } = useAuth();
  return (
    <Layout title="Portal Status" subtitle="Your account is being reviewed">
      <div style={{ maxWidth: 560, margin: "60px auto", textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🚀</div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
          Portal Status: <span style={{ color: "var(--warning)" }}>Progressive</span>
        </h2>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 24 }}>
          Welcome to BOSS Foundation, <strong style={{ color: "var(--text-primary)" }}>{userData?.name}</strong>!<br />
          Your account has been created by your admin and is currently awaiting Super Admin approval.
          <br /><br />
          You can explore the portal in the meantime. Once the Super Admin activates your account, your portal status will change to <strong style={{ color: "var(--success)" }}>Active</strong> and you can start working.
        </p>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Name</span>
              <span style={{ fontWeight: 600 }}>{userData?.name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>NIN</span>
              <span className="badge badge-accent">{userData?.nin}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Team</span>
              <span className="badge badge-purple">{userData?.team}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Status</span>
              <span className="badge badge-warning">Progressive</span>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 24px", color: "var(--danger)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer", fontSize: 14 }}
        >
          Sign Out
        </button>
      </div>
    </Layout>
  );
}
