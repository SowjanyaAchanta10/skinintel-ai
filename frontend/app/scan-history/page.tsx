"use client";

import React, { useEffect, useState } from "react";

type HistoryItem = {
  skin_type?: string;
  confidence?: number;
  top_concerns?: (string | { name?: string; concern?: string; label?: string })[];
  date?: string;
};

export default function ScanHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("skinintel_scan_history");

    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#07151b",
        color: "white",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <button
        onClick={() => (window.location.href = "/scan")}
        style={{
          background: "#17343d",
          color: "white",
          border: "1px solid #2b6977",
          borderRadius: "10px",
          padding: "10px 18px",
          cursor: "pointer",
          marginBottom: "30px",
        }}
      >
        ← New Skin Analysis
      </button>

      <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>
        Scan History
      </h1>

      <p style={{ color: "#9db4ba", marginBottom: "30px" }}>
        Your previous skin analysis results.
      </p>

      {history.length === 0 ? (
        <div
          style={{
            background: "#10262d",
            border: "1px solid #234952",
            borderRadius: "16px",
            padding: "40px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "42px", marginBottom: "15px" }}>📋</div>

          <h2>No scan history yet</h2>

          <p style={{ color: "#9db4ba" }}>
            Complete a skin analysis to see your results here.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "18px" }}>
          {history.map((item, index) => (
            <div
              key={index}
              style={{
                background: "#10262d",
                border: "1px solid #234952",
                borderRadius: "16px",
                padding: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "15px",
                }}
              >
                <h2 style={{ margin: 0 }}>
                  {item.skin_type || "Unknown"} Skin
                </h2>

                <span style={{ color: "#9db4ba" }}>
                  {item.date || "Previous Scan"}
                </span>
              </div>

              <p>
                Confidence:{" "}
                <strong>
                  {item.confidence
                    ? `${(item.confidence * 100).toFixed(1)}%`
                    : "N/A"}
                </strong>
              </p>

              {item.top_concerns && item.top_concerns.length > 0 && (
                <p style={{ color: "#b8cbd0" }}>
                  Top concerns:{" "}
                  {item.top_concerns
                    .slice(0, 3)
                    .map((concern) =>
                      typeof concern === "string"
                        ? concern
                        : concern.name ||
                          concern.concern ||
                          concern.label ||
                          ""
                    )
                    .join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}