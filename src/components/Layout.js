// src/components/Layout.js
import React from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "../contexts/AuthContext";

export default function Layout({ children, title, subtitle }) {
  const { userData, userRole } = useAuth();
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="page-title">{title}</div>
            {subtitle && <div className="page-subtitle">{subtitle}</div>}
          </div>
          <div className="topbar-right">
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{today}</span>
          </div>
        </div>
        <div className="content-area">
          {children}
        </div>
      </div>
    </div>
  );
}
