// src/components/ErrorBoundary.js
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("App Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0f",
          fontFamily: "'DM Sans', sans-serif",
          padding: 24,
        }}>
          <div style={{
            background: "#16161f",
            border: "1px solid #2a2a3d",
            borderRadius: 16,
            padding: "40px 32px",
            maxWidth: 420,
            width: "100%",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, color: "#f0f0f8", marginBottom: 8 }}>
              Something went wrong
            </h2>
            <p style={{ color: "#8888aa", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              The page encountered an error. Click below to reload.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#f5a623",
                color: "#000",
                border: "none",
                borderRadius: 8,
                padding: "10px 24px",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
