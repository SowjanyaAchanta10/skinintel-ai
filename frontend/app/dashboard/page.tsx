"use client";

import { useRef, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const colors = {
  bg: "#061817",
  panel: "rgba(255,255,255,0.045)",
  border: "rgba(255,255,255,0.10)",
  text: "#f3fbfa",
  muted: "#829995",
  accent: "#72d8cc",
};

type AnalysisResult = {
  skin_type: string;
  confidence: number;
  concerns: Record<string, number>;
  top_concerns?: string[];
  recommendations?: {
    name: string;
    reason: string;
    ingredients: string[];
    match_score: number;
  }[];
  simulation_image?: string;
  disclaimer?: string;
};

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [cameraOpen, setCameraOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];

    if (!selected) return;

    if (selected.size > 8 * 1024 * 1024) {
      setError("Image must be smaller than 8MB.");
      return;
    }

    if (!selected.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError("");
  }

  async function openCamera() {
    try {
      setError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera is not supported by this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 150);
    } catch {
      setError(
        "Camera access was denied. Please allow camera permission or upload an image."
      );
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video) return;

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const context = canvas.getContext("2d");

    if (!context) return;

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const capturedFile = new File(
          [blob],
          `skinintel-camera-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          }
        );

        setFile(capturedFile);
        setPreview(URL.createObjectURL(capturedFile));
        setError("");

        closeCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  async function analyze() {
    if (!file) {
      setError("Please upload or capture a skin image first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/api/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const data: AnalysisResult =
        await response.json();

      /*
       * Store the AI result temporarily so the
       * report page can display it.
       */
      sessionStorage.setItem(
        "skinintel_analysis_result",
        JSON.stringify(data)
      );

      /*
       * Store uploaded/captured image as Base64.
       * This allows the report page to show the
       * original analyzed image.
       */
      const reader = new FileReader();

      reader.onload = () => {
        sessionStorage.setItem(
          "skinintel_analysis_image",
          String(reader.result || "")
        );

        window.location.href = "/report";
      };

      reader.readAsDataURL(file);
    } catch {
      setError(
        "Unable to connect to the AI service. Please make sure FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  }

  function clearImage() {
    setFile(null);
    setPreview("");
    setError("");
  }

  function logout() {
    localStorage.removeItem("skinintel_logged_in");
    window.location.href = "/";
  }

  return (
    <div style={styles.app}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>SKININTEL</div>

        <div style={styles.logoSub}>
          DERMATOLOGY AI
        </div>

        <div style={styles.sideTitle}>
          WORKSPACE
        </div>

        <div
          style={{
            ...styles.nav,
            ...styles.navActive,
          }}
        >
          <span>◈</span>
          Skin Analysis
        </div>

        <div
          style={{ ...styles.nav, cursor: "pointer" }}
          onClick={() => (window.location.href = "/scan-history")}
        >
        <span>◉</span>
          Scan History
        </div>

        <div
           style={{ ...styles.nav, cursor: "pointer" }}
            onClick={() => (window.location.href = "/model-insights")}
        >
         <span>▦</span>
         Model Insights
        </div>

        <div
          style={{
            ...styles.sideTitle,
            marginTop: 40,
          }}
        >
          SYSTEM
        </div>

        <div style={styles.statusBox}>
          <b>● AI service</b>
          <span>Ready for analysis</span>
        </div>

        <div style={styles.infoBox}>
          <b>◉ Educational support</b>
          <span>Not a medical diagnosis</span>
        </div>

        <div style={styles.version}>
          SkinIntel v1.0 • B.Tech AI Project
        </div>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        {/* HEADER */}
        <header style={styles.header}>
          <div>
            <div style={styles.label}>
              AI SKIN INTELLIGENCE
            </div>

            <h1 style={styles.title}>
              Clinical Skin Dashboard
            </h1>

            <p style={styles.subtitle}>
              Privacy-first workflow for educational
              skin analysis
            </p>
          </div>

          <button
            onClick={logout}
            style={styles.logout}
          >
            Log out
          </button>
        </header>

        {/* HERO */}
        <section style={styles.hero}>
          <div style={styles.label}>
            SKININTEL AI ENGINE
          </div>

          <h2 style={styles.heroTitle}>
            Understand your skin.
            <br />
            <span>Care for it smarter.</span>
          </h2>

          <p style={styles.heroText}>
            Upload a clear facial image and SkinIntel will
            estimate skin type, identify visible concern
            patterns and generate personalized cosmetic
            recommendations.
          </p>
        </section>

        {/* NEW ANALYSIS */}
        <section style={styles.card}>
          <div style={styles.label}>
            NEW ANALYSIS
          </div>

          <h2 style={styles.sectionTitle}>
            Start your skin analysis
          </h2>

          <p style={styles.subtitle}>
            Choose an image source and provide a clear,
            front-facing and well-lit image.
          </p>

          <div style={styles.uploadRow}>
            {/* IMAGE UPLOAD */}
            <label style={styles.uploadBox}>
              {preview ? (
                <img
                  src={preview}
                  alt="Selected skin"
                  style={styles.preview}
                />
              ) : (
                <>
                  <div style={styles.uploadIcon}>
                    ↑
                  </div>

                  <b>
                    Upload skin image
                  </b>

                  <span style={styles.fileHint}>
                    JPG, PNG or WEBP • Max 8MB
                  </span>
                </>
              )}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFile}
                style={{
                  display: "none",
                }}
              />
            </label>

            {/* ACTIONS */}
            <div style={styles.uploadActions}>
              <button
                onClick={openCamera}
                style={styles.cameraButton}
                disabled={loading}
              >
                📷 Use Camera
              </button>

              {file && (
                <div style={styles.selectedFile}>
                  Selected image:
                  <br />
                  <b>{file.name}</b>
                </div>
              )}

              <button
                onClick={analyze}
                disabled={!file || loading}
                style={{
                  ...styles.analyzeButton,
                  opacity:
                    !file || loading ? 0.45 : 1,
                }}
              >
                {loading
                  ? "Analyzing with AI..."
                  : "Run AI Skin Analysis"}
              </button>

              {file && !loading && (
                <button
                  onClick={clearImage}
                  style={styles.clearButton}
                >
                  Clear image
                </button>
              )}

              {error && (
                <div style={styles.error}>
                  {error}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* INFORMATION */}
        <section style={styles.infoSection}>
          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>01</div>
            <div>
              <b>Upload or capture</b>
              <p>
                Provide a clear facial image with
                minimal obstruction.
              </p>
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>02</div>
            <div>
              <b>AI analysis</b>
              <p>
                SkinIntel evaluates skin type and visible
                concern indicators.
              </p>
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>03</div>
            <div>
              <b>Personalized report</b>
              <p>
                Review your structured analysis and
                cosmetic recommendations.
              </p>
            </div>
          </div>
        </section>

        {/* FOOTER DISCLAIMER */}
        <div style={styles.disclaimer}>
          <b>Responsible AI:</b> SkinIntel provides
          educational AI-assisted skin analysis and
          cosmetic guidance. It is not a medical
          diagnosis and should not replace professional
          dermatological advice.
        </div>
      </main>

      {/* CAMERA MODAL */}
      {cameraOpen && (
        <div style={styles.cameraOverlay}>
          <div style={styles.cameraModal}>
            <div style={styles.label}>
              LIVE CAMERA
            </div>

            <h2 style={styles.sectionTitle}>
              Position your face
            </h2>

            <p style={styles.bodyText}>
              Keep your face centered and use good
              lighting for better analysis.
            </p>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={styles.cameraVideo}
            />

            <div style={styles.cameraActions}>
              <button
                onClick={capturePhoto}
                style={styles.captureButton}
              >
                ● Capture Photo
              </button>

              <button
                onClick={closeCamera}
                style={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  app: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#061817 0%,#092827 50%,#041110 100%)",
    color: colors.text,
    fontFamily:
      "Arial, Helvetica, sans-serif",
    display: "flex",
  },

  sidebar: {
    width: 245,
    minHeight: "100vh",
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    padding: "28px 20px",
    boxSizing: "border-box",
    background: "rgba(2,15,15,.97)",
    borderRight:
      "1px solid rgba(114,216,204,.14)",
  },

  logo: {
    fontSize: 25,
    fontWeight: 800,
    letterSpacing: 4,
  },

  logoSub: {
    color: colors.accent,
    fontSize: 9,
    letterSpacing: 3,
    marginTop: 5,
  },

  sideTitle: {
    color: "#66817e",
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: 700,
    marginTop: 42,
    marginBottom: 12,
  },

  nav: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "12px",
    borderRadius: 9,
    color: "#839894",
    fontSize: 13,
    marginBottom: 5,
  },

  navActive: {
    background:
      "rgba(114,216,204,.10)",
    color: "#8be4d9",
    fontWeight: 700,
  },

  statusBox: {
    padding: 13,
    borderRadius: 10,
    background:
      "rgba(114,216,204,.07)",
    border:
      "1px solid rgba(114,216,204,.13)",
    fontSize: 13,
    marginBottom: 10,
  },

  infoBox: {
    padding: 13,
    borderRadius: 10,
    background:
      "rgba(255,255,255,.035)",
    fontSize: 13,
  },

  version: {
    position: "absolute",
    bottom: 25,
    left: 20,
    color: "#58716e",
    fontSize: 11,
  },

  main: {
    marginLeft: 245,
    width: "calc(100% - 245px)",
    padding: "30px 42px 70px",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom:
      "1px solid rgba(255,255,255,.08)",
    paddingBottom: 20,
    marginBottom: 30,
  },

  label: {
    color: colors.accent,
    fontSize: 10,
    letterSpacing: 2.5,
    fontWeight: 800,
  },

  title: {
    fontSize: 29,
    margin: "8px 0 5px",
  },

  subtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 1.6,
  },

  logout: {
    padding: "10px 18px",
    borderRadius: 9,
    border:
      "1px solid rgba(255,255,255,.14)",
    background:
      "rgba(255,255,255,.04)",
    color: "#d9e8e5",
    cursor: "pointer",
  },

  hero: {
    padding: "32px",
    borderRadius: 20,
    marginBottom: 25,
    border:
      "1px solid rgba(114,216,204,.16)",
    background:
      "linear-gradient(110deg,rgba(43,126,116,.23),rgba(255,255,255,.035))",
  },

  heroTitle: {
    fontSize: 30,
    lineHeight: 1.2,
    margin: "12px 0",
  },

  heroText: {
    maxWidth: 700,
    color: "#9bb1ad",
    lineHeight: 1.7,
    fontSize: 13,
  },

  card: {
    padding: 25,
    borderRadius: 18,
    marginBottom: 22,
    background: colors.panel,
    border:
      `1px solid ${colors.border}`,
  },

  sectionTitle: {
    fontSize: 19,
    margin: "10px 0 8px",
  },

  uploadRow: {
    display: "flex",
    gap: 25,
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 20,
  },

  uploadBox: {
    width: 280,
    height: 200,
    borderRadius: 14,
    border:
      "1px dashed rgba(114,216,204,.42)",
    background:
      "rgba(0,0,0,.18)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    overflow: "hidden",
  },

  preview: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  uploadIcon: {
    fontSize: 38,
    marginBottom: 10,
    color: colors.accent,
  },

  fileHint: {
    color: "#708985",
    fontSize: 10,
    marginTop: 7,
  },

  uploadActions: {
    flex: 1,
    minWidth: 250,
  },

  cameraButton: {
    width: "100%",
    maxWidth: 300,
    padding: "13px 20px",
    borderRadius: 10,
    border:
      "1px solid rgba(114,216,204,.35)",
    background:
      "rgba(114,216,204,.08)",
    color: "#9ae7df",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: 12,
  },

  selectedFile: {
    padding: 13,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 12,
    background:
      "rgba(114,216,204,.07)",
    border:
      "1px solid rgba(114,216,204,.13)",
  },

  analyzeButton: {
    width: "100%",
    maxWidth: 300,
    padding: "14px 20px",
    border: "none",
    borderRadius: 10,
    background: colors.accent,
    color: "#06201e",
    fontWeight: 800,
    cursor: "pointer",
  },

  clearButton: {
    display: "block",
    marginTop: 12,
    border: "none",
    background: "transparent",
    color: "#8ca5a1",
    cursor: "pointer",
    fontSize: 12,
  },

  error: {
    marginTop: 15,
    padding: 12,
    borderRadius: 9,
    background:
      "rgba(180,65,65,.12)",
    border:
      "1px solid rgba(255,100,100,.2)",
    color: "#ffaaa5",
    fontSize: 12,
  },

  infoSection: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,1fr)",
    gap: 14,
    marginBottom: 22,
  },

  infoCard: {
    display: "flex",
    gap: 12,
    padding: 17,
    borderRadius: 14,
    background:
      "rgba(255,255,255,.025)",
    border:
      "1px solid rgba(255,255,255,.07)",
  },

  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    background:
      "rgba(114,216,204,.10)",
    color: colors.accent,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 800,
  },

  bodyText: {
    color: "#899f9b",
    fontSize: 12,
    lineHeight: 1.7,
  },

  disclaimer: {
    padding: 18,
    borderRadius: 12,
    background:
      "rgba(255,255,255,.025)",
    border:
      "1px solid rgba(255,255,255,.06)",
    color: "#718984",
    fontSize: 11,
    lineHeight: 1.7,
  },

  cameraOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background:
      "rgba(0,0,0,.82)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    boxSizing: "border-box",
  },

  cameraModal: {
    width: "100%",
    maxWidth: 680,
    padding: 28,
    borderRadius: 20,
    background: "#071c1b",
    border:
      "1px solid rgba(114,216,204,.22)",
    boxShadow:
      "0 25px 80px rgba(0,0,0,.55)",
  },

  cameraVideo: {
    width: "100%",
    aspectRatio: "16/9",
    objectFit: "cover",
    borderRadius: 15,
    background: "#000",
    marginTop: 18,
    border:
      "1px solid rgba(255,255,255,.08)",
  },

  cameraActions: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginTop: 18,
  },

  captureButton: {
    flex: 1,
    padding: "14px 20px",
    border: "none",
    borderRadius: 10,
    background: colors.accent,
    color: "#06201e",
    fontWeight: 800,
    cursor: "pointer",
  },

  cancelButton: {
    padding: "14px 20px",
    borderRadius: 10,
    border:
      "1px solid rgba(255,255,255,.14)",
    background:
      "rgba(255,255,255,.04)",
    color: "#c6d6d3",
    cursor: "pointer",
  },
};