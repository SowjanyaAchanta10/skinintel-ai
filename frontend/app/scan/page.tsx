"use client";

import { useEffect, useRef, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Recommendation = {
  name: string;
  reason: string;
  ingredients: string[];
  match_score: number;
};

type AnalysisResult = {
  skin_type: string;
  confidence: number;
  concerns: Record<string, number>;
  top_concerns?: string[];
  recommendations?: Recommendation[];
  simulation_image?: string;
  disclaimer?: string;
};

export default function ScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [camera, setCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function selectImage(e: React.ChangeEvent<HTMLInputElement>) {
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

  async function startCamera() {
    try {
      setError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera is not supported by this browser.");
        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

      streamRef.current = stream;
      setCamera(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      setError(
        "Camera permission was denied. Please allow camera access or upload an image."
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCamera(false);
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video) return;

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const captured = new File(
          [blob],
          `skinintel-camera-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          }
        );

        setFile(captured);
        setPreview(URL.createObjectURL(captured));
        setError("");
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  async function analyze() {
  if (!file) {
    setError("Please upload or capture an image first.");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      "/api/analyze",
      {
        method: "POST",
        body: formData,
      }
    );

    const text = await response.text();

    if (!response.ok) {
      throw new Error(text || "Analysis failed");
    }

    const data = JSON.parse(text);

    // Save AI analysis result
    localStorage.setItem(
      "astra_analysis_result",
      JSON.stringify(data)
    );
    // Save analysis to scan history
const existingHistory = JSON.parse(
  localStorage.getItem("skinintel_scan_history") || "[]"
);

existingHistory.unshift({
  ...data,
  date: new Date().toLocaleString(),
});

localStorage.setItem(
  "skinintel_scan_history",
  JSON.stringify(existingHistory)
);
    // Save uploaded image
    const reader = new FileReader();

    reader.onload = () => {
      localStorage.setItem(
        "astra_analysis_image",
        reader.result as string
      );

      // Go directly to report
      window.location.href = "/report";
    };

    reader.onerror = () => {
      // Even if image saving fails, still open report
      window.location.href = "/report";
    };

    reader.readAsDataURL(file);

  } catch (err) {
    console.error("ANALYSIS ERROR:", err);

    setError(
      "Analysis failed. Please make sure the AI service is running."
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
    localStorage.removeItem("slinintel_user");
    localStorage.removeItem("skinintel_logged_in");
    window.location.href = "/";
  }

  return (
    <main style={styles.page}>

      {/* HEADER */}

      <header style={styles.header}>
        <div>
          <div style={styles.brand}>SKININTEL</div>
          <div style={styles.brandSub}>
            DERMATOLOGY AI
          </div>
        </div>

        <button
          onClick={logout}
          style={styles.logout}
        >
          Log out
        </button>
      </header>

      {/* INTRO */}

      <section style={styles.intro}>
        <div style={styles.eyebrow}>
          SKININTEL AI SKIN SCAN
        </div>

        <h1 style={styles.heading}>
          Understand your skin.
          <br />
          <span>Care for it smarter.</span>
        </h1>

        <p style={styles.introText}>
          Upload a clear facial image or use your camera.
          SkinIntel will analyze your skin type and visible
          concern patterns using the project's AI model.
        </p>
      </section>

      {/* SCAN CARD */}

      <section style={styles.scanCard}>

        <div style={styles.cardHeader}>
          <div>
            <div style={styles.eyebrow}>
              NEW ANALYSIS
            </div>

            <h2 style={styles.cardTitle}>
              Start your skin scan
            </h2>

            <p style={styles.muted}>
              Choose how you want to provide your image.
            </p>
          </div>
        </div>

        <div style={styles.scanGrid}>

          {/* IMAGE */}

          <div style={styles.imageArea}>

            {preview ? (
              <img
                src={preview}
                alt="Selected skin"
                style={styles.preview}
              />
            ) : (
              <label style={styles.dropZone}>
                <div style={styles.uploadIcon}>
                  ↑
                </div>

                <strong>
                  Upload skin image
                </strong>

                <span>
                  JPG, PNG or WEBP
                </span>

                <small>
                  Maximum 8MB
                </small>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={selectImage}
                  style={{ display: "none" }}
                />
              </label>
            )}

            {preview && (
              <label style={styles.changeButton}>
                Change image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={selectImage}
                  style={{ display: "none" }}
                />
              </label>
            )}

          </div>

          {/* ACTIONS */}

          <div style={styles.actions}>

            <div style={styles.option}>
              <div style={styles.optionIcon}>
                📷
              </div>

              <div>
                <strong>
                  Use your camera
                </strong>

                <p>
                  Capture a fresh facial image.
                </p>
              </div>
            </div>

            <button
              onClick={startCamera}
              disabled={loading}
              style={styles.cameraButton}
            >
              📷 Open Camera
            </button>

            <div style={styles.or}>
              OR
            </div>

            <label style={styles.uploadButton}>
              🖼️ Choose Image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={selectImage}
                style={{ display: "none" }}
              />
            </label>

            {file && (
              <div style={styles.fileBox}>
                <span>Selected image</span>
                <strong>{file.name}</strong>
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
                : "Analyze My Skin →"}
            </button>

            {file && !loading && (
              <button
                onClick={clearImage}
                style={styles.clear}
              >
                Remove image
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

      {/* PROCESS */}

      <section style={styles.process}>

        <div style={styles.processCard}>
          <span>01</span>
          <strong>Upload / Capture</strong>
          <p>
            Provide a clear, well-lit facial image.
          </p>
        </div>

        <div style={styles.processCard}>
          <span>02</span>
          <strong>AI Analysis</strong>
          <p>
            Skin type and concern indicators are evaluated.
          </p>
        </div>

        <div style={styles.processCard}>
          <span>03</span>
          <strong>Personalized Report</strong>
          <p>
            View your analysis and cosmetic recommendations.
          </p>
        </div>

      </section>

      {/* DISCLAIMER */}

      <div style={styles.disclaimer}>
        <strong>Responsible AI</strong>

        <span>
          SkinIntel provides educational AI-assisted skin
          analysis and cosmetic guidance. It is not a
          medical diagnosis or a replacement for a
          qualified dermatologist.
        </span>
      </div>

      {/* CAMERA */}

      {camera && (
        <div style={styles.overlay}>

          <div style={styles.cameraModal}>

            <div style={styles.eyebrow}>
              LIVE CAMERA
            </div>

            <h2 style={styles.cardTitle}>
              Position your face
            </h2>

            <p style={styles.muted}>
              Keep your face centered and use good lighting.
            </p>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={styles.video}
            />

            <div style={styles.cameraActions}>

              <button
                onClick={capturePhoto}
                style={styles.capture}
              >
                ● Capture Photo
              </button>

              <button
                onClick={stopCamera}
                style={styles.cancel}
              >
                Cancel
              </button>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {

  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#041312,#082522 55%,#03100f)",
    color: "#f3fbfa",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    padding: "30px 7%",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 22,
    borderBottom:
      "1px solid rgba(255,255,255,.08)",
  },

  brand: {
    fontSize: 25,
    fontWeight: 900,
    letterSpacing: 5,
  },

  brandSub: {
    fontSize: 9,
    letterSpacing: 3,
    color: "#72d8cc",
    marginTop: 4,
  },

  logout: {
    padding: "10px 18px",
    borderRadius: 10,
    border:
      "1px solid rgba(255,255,255,.14)",
    background:
      "rgba(255,255,255,.04)",
    color: "#d8e9e6",
    cursor: "pointer",
  },

  intro: {
    maxWidth: 800,
    margin: "60px auto 35px",
    textAlign: "center",
  },

  eyebrow: {
    color: "#72d8cc",
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: 800,
  },

  heading: {
    fontSize: 42,
    lineHeight: 1.15,
    margin: "15px 0",
    fontWeight: 800,
  },

  introText: {
    color: "#91aaa6",
    fontSize: 14,
    lineHeight: 1.8,
    maxWidth: 650,
    margin: "0 auto",
  },

  scanCard: {
    maxWidth: 1050,
    margin: "0 auto",
    padding: 30,
    borderRadius: 24,
    background:
      "rgba(255,255,255,.045)",
    border:
      "1px solid rgba(114,216,204,.16)",
    boxShadow:
      "0 25px 80px rgba(0,0,0,.28)",
  },

  cardHeader: {
    marginBottom: 25,
  },

  cardTitle: {
    fontSize: 23,
    margin: "10px 0 7px",
  },

  muted: {
    color: "#829995",
    fontSize: 12,
    lineHeight: 1.7,
  },

  scanGrid: {
    display: "grid",
    gridTemplateColumns:
      "1.1fr .9fr",
    gap: 30,
  },

  imageArea: {
    minHeight: 360,
    position: "relative",
  },

  dropZone: {
    height: 360,
    borderRadius: 18,
    border:
      "1px dashed rgba(114,216,204,.45)",
    background:
      "rgba(0,0,0,.20)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
  },

  uploadIcon: {
    fontSize: 48,
    color: "#72d8cc",
    marginBottom: 15,
  },

  preview: {
    width: "100%",
    height: 360,
    objectFit: "cover",
    borderRadius: 18,
    border:
      "1px solid rgba(255,255,255,.1)",
  },

  changeButton: {
    position: "absolute",
    bottom: 15,
    right: 15,
    padding: "9px 13px",
    borderRadius: 8,
    background:
      "rgba(0,0,0,.7)",
    color: "#a9e9e1",
    fontSize: 11,
    cursor: "pointer",
  },

  actions: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },

  option: {
    display: "flex",
    gap: 13,
    alignItems: "center",
    padding: 15,
    borderRadius: 13,
    background:
      "rgba(114,216,204,.06)",
    border:
      "1px solid rgba(114,216,204,.12)",
    marginBottom: 15,
  },

  optionIcon: {
    fontSize: 26,
  },

  cameraButton: {
    padding: "14px",
    borderRadius: 10,
    border:
      "1px solid rgba(114,216,204,.35)",
    background:
      "rgba(114,216,204,.10)",
    color: "#a1e9e2",
    fontWeight: 800,
    cursor: "pointer",
  },

  or: {
    textAlign: "center",
    color: "#627c78",
    fontSize: 10,
    margin: "14px 0",
  },

  uploadButton: {
    padding: "14px",
    borderRadius: 10,
    textAlign: "center",
    border:
      "1px solid rgba(255,255,255,.13)",
    background:
      "rgba(255,255,255,.04)",
    color: "#d5e4e1",
    fontWeight: 700,
    cursor: "pointer",
  },

  fileBox: {
    marginTop: 15,
    padding: 13,
    borderRadius: 10,
    background:
      "rgba(114,216,204,.06)",
    border:
      "1px solid rgba(114,216,204,.12)",
    display: "flex",
    flexDirection: "column",
    gap: 5,
    fontSize: 11,
  },

  analyzeButton: {
    marginTop: 16,
    padding: "16px",
    border: "none",
    borderRadius: 11,
    background: "#72d8cc",
    color: "#05201d",
    fontWeight: 900,
    fontSize: 14,
    cursor: "pointer",
  },

  clear: {
    border: "none",
    background: "transparent",
    color: "#809b96",
    cursor: "pointer",
    padding: 10,
    fontSize: 11,
  },

  error: {
    marginTop: 13,
    padding: 12,
    borderRadius: 9,
    background:
      "rgba(190,60,60,.12)",
    border:
      "1px solid rgba(255,90,90,.2)",
    color: "#ffaaa5",
    fontSize: 11,
  },

  process: {
    maxWidth: 1050,
    margin: "22px auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(3,1fr)",
    gap: 14,
  },

  processCard: {
    padding: 18,
    borderRadius: 14,
    background:
      "rgba(255,255,255,.025)",
    border:
      "1px solid rgba(255,255,255,.07)",
  },

  disclaimer: {
    maxWidth: 1050,
    margin: "25px auto",
    padding: 18,
    borderRadius: 12,
    background:
      "rgba(255,255,255,.025)",
    border:
      "1px solid rgba(255,255,255,.06)",
    color: "#728b87",
    fontSize: 11,
    lineHeight: 1.7,
    display: "flex",
    gap: 12,
    flexDirection: "column",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background:
      "rgba(0,0,0,.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  cameraModal: {
    width: "100%",
    maxWidth: 720,
    padding: 28,
    borderRadius: 22,
    background: "#071c1b",
    border:
      "1px solid rgba(114,216,204,.2)",
  },

  video: {
    width: "100%",
    aspectRatio: "16/9",
    objectFit: "cover",
    borderRadius: 15,
    marginTop: 15,
    background: "#000",
  },

  cameraActions: {
    display: "flex",
    gap: 12,
    marginTop: 15,
  },

  capture: {
    flex: 1,
    padding: 14,
    border: "none",
    borderRadius: 10,
    background: "#72d8cc",
    color: "#05201d",
    fontWeight: 900,
    cursor: "pointer",
  },

  cancel: {
    padding: "14px 22px",
    borderRadius: 10,
    border:
      "1px solid rgba(255,255,255,.14)",
    background:
      "rgba(255,255,255,.04)",
    color: "#d1dfdc",
    cursor: "pointer",
  },
};