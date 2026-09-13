"use client";

import { useEffect, useState } from "react";

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

const colors = {
  bg: "#061817",
  panel: "rgba(255,255,255,.045)",
  border: "rgba(255,255,255,.10)",
  text: "#f3fbfa",
  muted: "#829995",
  accent: "#72d8cc",
};

export default function ReportPage() {
  const [result, setResult] =
    useState<AnalysisResult | null>(null);

  const [image, setImage] = useState("");

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(
          "astra_analysis_result"
        );

      const storedImage =
        localStorage.getItem(
          "astra_analysis_image"
        );

      if (stored) {
        setResult(JSON.parse(stored));
      }

      if (storedImage) {
        setImage(storedImage);
      }
    } catch {
      console.error(
        "Unable to load analysis report"
      );
    }
  }, []);

  function goBack() {
    window.location.href = "/scan";
  }

  function printReport() {
    window.print();
  }

  if (!result) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingCard}>
          <div style={styles.logo}>
            SKININTEL
          </div>

          <p>
            No analysis report found.
          </p>

          <button
            onClick={goBack}
            style={styles.primaryButton}
          >
            Start a new analysis
          </button>
        </div>
      </div>
    );
  }

  const concerns = Object.entries(
    result.concerns || {}
  ).sort(
    (a, b) =>
      Number(b[1]) - Number(a[1])
  );

  const confidence = Math.round(
    result.confidence * 100
  );

  return (
    
    <div className="report-page" style={styles.page}>
      <style>{`
  @media print {
    header {
      display: none !important;
    }

    body {
      background: white !important;
    }

    .report-page {
      width: 100% !important;
      margin: 0 !important;
    }
  }
`}</style>
      {/* TOP BAR */}
      <header style={styles.topbar}>
        <div>
          <div style={styles.logo}>
            SKININTEL
          </div>

          <div style={styles.logoSub}>
            DERMATOLOGY AI
          </div>
        </div>

        <div style={styles.topActions}>
          <button
            onClick={goBack}
            style={styles.secondaryButton}
          >
            ← New Analysis
          </button>

          <button
            onClick={printReport}
            style={styles.primaryButton}
          >
            🖨 Print / Save Report
          </button>
        </div>
      </header>

      {/* REPORT HEADER */}
      <main style={styles.container}>
        <section style={styles.reportHeader}>
          <div>
            <div style={styles.label}>
              SKININTEL AI • ANALYSIS REPORT
            </div>

            <h1 style={styles.mainTitle}>
              Personalized Skin Intelligence Report
            </h1>

            <p style={styles.headerText}>
              AI-assisted analysis of visible skin
              characteristics and cosmetic compatibility.
            </p>
          </div>

          <div style={styles.reportBadge}>
            <span>REPORT STATUS</span>
            <b>✓ COMPLETE</b>
          </div>
        </section>

        {/* OVERVIEW */}
        <section style={styles.gridTwo}>
          {/* ANALYZED IMAGE */}
          <div style={styles.card}>
            <div style={styles.label}>
              ANALYZED IMAGE
            </div>

            {image ? (
              <img
                src={image}
                alt="Analyzed skin"
                style={styles.originalImage}
              />
            ) : (
              <div style={styles.noImage}>
                Image preview unavailable
              </div>
            )}

            <p style={styles.imageCaption}>
              Image provided for this educational
              analysis session.
            </p>
          </div>

          {/* SKIN PROFILE */}
          <div style={styles.card}>
            <div style={styles.label}>
              AI SKIN PROFILE
            </div>

            <div style={styles.profile}>
              <div>
                <div style={styles.skinType}>
                  {result.skin_type}
                </div>

                <div style={styles.muted}>
                  Estimated skin type
                </div>
              </div>

              <div style={styles.confidence}>
                {confidence}%
                <span>
                  confidence
                </span>
              </div>
            </div>

            <div
              style={
                styles.progressBackground
              }
            >
              <div
                style={{
                  ...styles.progress,
                  width: `${Math.min(
                    confidence,
                    100
                  )}%`,
                }}
              />
            </div>

            <div style={styles.profileFacts}>
              <div>
                <span>Model</span>
                <b>
                  Multi-task CNN
                </b>
              </div>

              <div>
                <span>Analysis</span>
                <b>
                  Skin + Concerns
                </b>
              </div>
            </div>
          </div>
        </section>

        {/* SUMMARY */}
        <section style={styles.card}>
          <div style={styles.label}>
            EXECUTIVE SUMMARY
          </div>

          <h2 style={styles.sectionTitle}>
            Your skin at a glance
          </h2>

          <div style={styles.summaryGrid}>
            <div style={styles.summaryBox}>
              <span>SKIN TYPE</span>
              <strong>
                {result.skin_type}
              </strong>
            </div>

            <div style={styles.summaryBox}>
              <span>CONFIDENCE</span>
              <strong>
                {confidence}%
              </strong>
            </div>

            <div style={styles.summaryBox}>
              <span>CONCERNS ANALYZED</span>
              <strong>
                {concerns.length}
              </strong>
            </div>

            <div style={styles.summaryBox}>
              <span>RECOMMENDATIONS</span>
              <strong>
                {result.recommendations
                  ?.length || 0}
              </strong>
            </div>
          </div>
        </section>

        {/* TOP CONCERNS */}
        {result.top_concerns &&
          result.top_concerns.length > 0 && (
            <section style={styles.card}>
              <div style={styles.label}>
                PRIORITY AREAS
              </div>

              <h2 style={styles.sectionTitle}>
                Top detected concerns
              </h2>

              <div style={styles.tags}>
                {result.top_concerns.map((item, index) => {
               const concernName =
  typeof item === "string"
    ? item
    : String(
        (item as any).name ??
        (item as any).concern ??
        (item as any).label ??
        ""
      );
                 return (
    <div
      key={index}
      style={styles.priorityTag}
    >
      <span>
        {String(index + 1).padStart(2, "0")}
      </span>

      {formatName(concernName)}
    </div>
  );
})}
              </div>
            </section>
          )}

        {/* ALL CONCERNS */}
        <section style={styles.card}>
          <div style={styles.label}>
            DETAILED SKIN ASSESSMENT
          </div>

          <h2 style={styles.sectionTitle}>
            Visible concern indicators
          </h2>

          <p style={styles.bodyText}>
            Scores range from 0 to 5. Higher values
            indicate stronger visible indicators
            detected by the AI model.
          </p>

          <div style={styles.concernGrid}>
            {concerns.map(
              ([name, value]) => {
                const score =
                  Number(value);

                return (
                  <div
                    key={name}
                    style={styles.concernCard}
                  >
                    <div
                      style={
                        styles.concernTop
                      }
                    >
                      <span>
                        {formatName(name)}
                      </span>

                      <strong>
                        {score.toFixed(1)}
                        <small>
                          /5
                        </small>
                      </strong>
                    </div>

                    <div
                      style={
                        styles.smallTrack
                      }
                    >
                      <div
                        style={{
                          ...styles.smallProgress,
                          width: `${Math.min(
                            (score / 5) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>

        {/* RECOMMENDATIONS */}
        <section style={styles.card}>
          <div style={styles.label}>
            COSMETIC INTELLIGENCE
          </div>

          <h2 style={styles.sectionTitle}>
            Personalized recommendations
          </h2>

          <p style={styles.bodyText}>
            These suggestions are generated from the
            estimated skin type, concern indicators and
            ingredient compatibility.
          </p>

          <div style={styles.productGrid}>
            {(
              result.recommendations ||
              []
            ).map(
              (product, index) => {
                const match = Math.round(
                  product.match_score * 100
                );

                return (
                  <div
                    key={index}
                    style={styles.productCard}
                  >
                    <div
                      style={
                        styles.productHeader
                      }
                    >
                      <div
                        style={
                          styles.productNumber
                        }
                      >
                        0{index + 1}
                      </div>

                      <div
                        style={styles.matchBadge}
                      >
                        {match}% MATCH
                      </div>
                    </div>

                    <h3
                      style={
                        styles.productName
                      }
                    >
                      {product.name}
                    </h3>

                    <p
                      style={
                        styles.productReason
                      }
                    >
                      {product.reason}
                    </p>

                    <div
                      style={
                        styles.ingredientLabel
                      }
                    >
                      KEY INGREDIENTS
                    </div>

                    <div
                      style={
                        styles.ingredients
                      }
                    >
                      {product.ingredients?.map(
                        (ingredient) => (
                          <span
                            key={ingredient}
                          >
                            {ingredient}
                          </span>
                        )
                      )}
                    </div>

                    <div
                      style={
                        styles.matchTrack
                      }
                    >
                      <div
                        style={{
                          ...styles.matchProgress,
                          width: `${Math.min(
                            match,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>

        {/* GAN */}
        {result.simulation_image && (
          <section style={styles.card}>
            <div style={styles.label}>
              GENERATIVE AI
            </div>

            <h2 style={styles.sectionTitle}>
              Class-conditioned AI reference
            </h2>

            <p style={styles.bodyText}>
              This image is generated by SkinIntel's
              conditional GAN as a synthetic research
              reference. It is not a transformation,
              prediction or future appearance of the
              uploaded face.
            </p>

            //<div style={styles.ganContainer}>
              
              <div style={styles.ganNote}>
                <b>
                  Synthetic reference
                </b>

                <p>
                  Generated conditionally from the
                  predicted skin class for project
                  visualization.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* RESPONSIBLE AI */}
        <section style={styles.responsible}>
          <div style={styles.responsibleIcon}>
            ✓
          </div>

          <div>
            <div
              style={
                styles.responsibleTitle
              }
            >
              RESPONSIBLE AI NOTICE
            </div>

            <p
              style={
                styles.responsibleText
              }
            >
              {result.disclaimer ||
                "SkinIntel provides educational AI-assisted skin analysis and cosmetic guidance. It is not a medical diagnosis and should not replace advice from a qualified dermatologist."}
            </p>
          </div>
        </section>

        {/* REPORT FOOTER */}
        <footer style={styles.footer}>
          <div>
            <b>SKININTEL</b>
            <span>
              Advanced AI-Driven Dermatological
              Analyzer
            </span>
          </div>

          <div>
            Educational B.Tech AI Project
          </div>
        </footer>
      </main>
    </div>
  );
}

function formatName(name: string) {
  if (!name) return "";
  return String(name)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#061817,#092827 55%,#041110)",
    color: colors.text,
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  topbar: {
    height: 78,
    padding: "0 5%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom:
      "1px solid rgba(255,255,255,.08)",
    background:
      "rgba(2,15,15,.92)",
  },

  logo: {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: 4,
  },

  logoSub: {
    color: colors.accent,
    fontSize: 8,
    letterSpacing: 3,
    marginTop: 3,
  },

  topActions: {
    display: "flex",
    gap: 10,
  },

  primaryButton: {
    padding: "11px 18px",
    border: "none",
    borderRadius: 9,
    background: colors.accent,
    color: "#06201e",
    fontWeight: 800,
    cursor: "pointer",
  },

  secondaryButton: {
    padding: "11px 18px",
    borderRadius: 9,
    border:
      "1px solid rgba(255,255,255,.13)",
    background:
      "rgba(255,255,255,.04)",
    color: "#d5e5e2",
    cursor: "pointer",
  },

  container: {
    width: "90%",
    maxWidth: 1180,
    margin: "0 auto",
    padding: "45px 0 70px",
  },

  reportHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 30,
    paddingBottom: 30,
    borderBottom:
      "1px solid rgba(255,255,255,.08)",
    marginBottom: 25,
  },

  label: {
    color: colors.accent,
    fontSize: 10,
    letterSpacing: 2.5,
    fontWeight: 800,
  },

  mainTitle: {
    fontSize: 34,
    lineHeight: 1.2,
    margin: "10px 0",
    maxWidth: 750,
  },

  headerText: {
    color: "#8ca6a2",
    fontSize: 13,
    lineHeight: 1.7,
  },

  reportBadge: {
    minWidth: 150,
    padding: 16,
    borderRadius: 12,
    background:
      "rgba(114,216,204,.07)",
    border:
      "1px solid rgba(114,216,204,.15)",
    display: "flex",
    flexDirection: "column",
    gap: 7,
    fontSize: 9,
    letterSpacing: 1.5,
    color: "#73908c",
  },

  gridTwo: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },

  card: {
    padding: 26,
    borderRadius: 18,
    marginBottom: 20,
    background: colors.panel,
    border:
      `1px solid ${colors.border}`,
  },

  originalImage: {
    width: "100%",
    height: 310,
    objectFit: "cover",
    borderRadius: 13,
    marginTop: 18,
  },

  noImage: {
    height: 310,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    borderRadius: 13,
    background:
      "rgba(0,0,0,.2)",
    color: colors.muted,
  },

  imageCaption: {
    color: "#657f7b",
    fontSize: 10,
    marginTop: 10,
  },

  profile: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 45,
  },

  skinType: {
    fontSize: 38,
    fontWeight: 800,
    textTransform: "capitalize",
  },

  muted: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 5,
  },

  confidence: {
    fontSize: 28,
    fontWeight: 800,
    color: colors.accent,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },

  progressBackground: {
    height: 8,
    borderRadius: 20,
    background: "#173432",
    overflow: "hidden",
    marginTop: 28,
  },

  progress: {
    height: "100%",
    background: colors.accent,
    borderRadius: 20,
  },

  profileFacts: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 35,
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4,1fr)",
    gap: 12,
    marginTop: 20,
  },

  summaryBox: {
    padding: 18,
    borderRadius: 12,
    background:
      "rgba(255,255,255,.035)",
    border:
      "1px solid rgba(255,255,255,.07)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  sectionTitle: {
    fontSize: 21,
    margin: "10px 0",
  },

  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 20,
  },

  priorityTag: {
    padding: "11px 15px",
    borderRadius: 22,
    background:
      "rgba(114,216,204,.09)",
    border:
      "1px solid rgba(114,216,204,.18)",
    color: "#a1e9e1",
    fontSize: 12,
    display: "flex",
    gap: 9,
    alignItems: "center",
  },

  concernGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,1fr)",
    gap: 12,
    marginTop: 22,
  },

  concernCard: {
    padding: 17,
    borderRadius: 12,
    background:
      "rgba(255,255,255,.035)",
    border:
      "1px solid rgba(255,255,255,.07)",
  },

  concernTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },

  smallTrack: {
    height: 5,
    background: "#183331",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 13,
  },

  smallProgress: {
    height: "100%",
    background: colors.accent,
    borderRadius: 10,
  },

  productGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,1fr)",
    gap: 15,
    marginTop: 22,
  },

  productCard: {
    padding: 20,
    borderRadius: 14,
    background:
      "rgba(255,255,255,.035)",
      border: "1px solid rgba(255,255,255,.08)",
    color: "#f5f7fa",
  },
};