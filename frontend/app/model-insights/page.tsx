"use client";

import React from "react";

export default function ModelInsights() {
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
        Model Insights
      </h1>

      <p style={{ color: "#9db4ba", marginBottom: "30px" }}>
        Performance and architecture overview of the SKININTEL AI model.
      </p>

      {/* Performance */}
      <section
        style={{
          background: "#10262d",
          border: "1px solid #234952",
          borderRadius: "16px",
          padding: "25px",
          marginBottom: "20px",
        }}
      >
        <h2>Model Performance</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "15px",
            marginTop: "20px",
          }}
        >
          <div style={cardStyle}>
            <span style={labelStyle}>Accuracy</span>
            <strong style={valueStyle}>84.84%</strong>
          </div>

          <div style={cardStyle}>
            <span style={labelStyle}>Macro F1</span>
            <strong style={valueStyle}>0.734</strong>
          </div>

          <div style={cardStyle}>
            <span style={labelStyle}>Concern MAE</span>
            <strong style={valueStyle}>1.20</strong>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section
        style={{
          background: "#10262d",
          border: "1px solid #234952",
          borderRadius: "16px",
          padding: "25px",
          marginBottom: "20px",
        }}
      >
        <h2>AI Architecture</h2>

        <p style={textStyle}>
          ResNet18 pretrained backbone → shared feature representation →
          two task-specific heads.
        </p>

        <div style={{ marginTop: "18px" }}>
          <p>🧠 <strong>Skin Type Head:</strong> 4-class classification</p>
          <p>🔍 <strong>Concern Head:</strong> 18 concern predictions</p>
          <p>📊 <strong>Concern Scale:</strong> 0–5</p>
          <p>⚙️ <strong>Optimizer:</strong> AdamW</p>
          <p>📈 <strong>Scheduler:</strong> Cosine learning rate scheduler</p>
        </div>
      </section>

      {/* Skin classes */}
      <section
        style={{
          background: "#10262d",
          border: "1px solid #234952",
          borderRadius: "16px",
          padding: "25px",
          marginBottom: "20px",
        }}
      >
        <h2>Supported Skin Types</h2>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "18px" }}>
          {["Normal", "Oily", "Dry", "Combination"].map((type) => (
            <span key={type} style={tagStyle}>
              {type}
            </span>
          ))}
        </div>
      </section>

      {/* Concerns */}
      <section
        style={{
          background: "#10262d",
          border: "1px solid #234952",
          borderRadius: "16px",
          padding: "25px",
          marginBottom: "20px",
        }}
      >
        <h2>Skin Concern Analysis</h2>

        <p style={textStyle}>
          The model estimates 18 visible skin characteristics including
          acne, blackheads, whiteheads, pores, oiliness, redness,
          sensitivity, dehydration, dark spots and other concerns.
        </p>

        <p style={{ color: "#9db4ba", marginTop: "15px" }}>
          Concern predictions are intended for educational and cosmetic
          guidance only.
        </p>
      </section>

      {/* GAN */}
      <section
        style={{
          background: "#10262d",
          border: "1px solid #234952",
          borderRadius: "16px",
          padding: "25px",
        }}
      >
        <h2>Generative AI — Conditional GAN</h2>

        <p style={textStyle}>
          SkinIntel also includes a class-conditioned GAN component designed
          to generate synthetic reference imagery based on the requested
          skin class.
        </p>

        <p style={{ color: "#9db4ba", marginTop: "15px" }}>
          The GAN is a synthetic reference module and does not transform
          the user's face or predict future skin appearance.
        </p>
      </section>

      <p
        style={{
          color: "#718b92",
          marginTop: "30px",
          fontSize: "13px",
        }}
      >
        Responsible AI: SkinIntel provides educational AI-assisted skin
        analysis and is not a medical diagnosis.
      </p>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#17343d",
  border: "1px solid #2b6977",
  borderRadius: "12px",
  padding: "20px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#9db4ba",
  marginBottom: "10px",
};

const valueStyle: React.CSSProperties = {
  fontSize: "28px",
};

const textStyle: React.CSSProperties = {
  color: "#c1d1d5",
  lineHeight: 1.7,
};

const tagStyle: React.CSSProperties = {
  background: "#17343d",
  border: "1px solid #2b6977",
  borderRadius: "20px",
  padding: "10px 18px",
  color: "#d8eef2",
};