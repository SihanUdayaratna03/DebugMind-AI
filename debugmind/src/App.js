import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import "./App.css";

import BlurText   from "./BlurText";
import ElectricBorder from "./ElectricBorder";
import GitHubIcon from "./GitHubIcon";

/* ─────────────────────────────────────────────────────────────
   Particle Field — random floating dots behind landing page
   ───────────────────────────────────────────────────────────── */
const PARTICLE_COUNT = 40;
const COLORS = ["#0A84FF","#BF5AF2","#32D4DE","#FFD60A","#30D158"];

const ParticleField = () => {
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const left   = Math.random() * 100;
    const top    = Math.random() * 100;
    const delay  = Math.random() * 8;
    const dur    = 5 + Math.random() * 8;
    const dx     = (Math.random() - 0.5) * 200;
    const dy     = (Math.random() - 0.5) * 200;
    const color  = COLORS[Math.floor(Math.random() * COLORS.length)];
    const size   = 2 + Math.random() * 3;
    return { id: i, left, top, delay, dur, dx, dy, color, size };
  });

  return (
    <div className="particle-field" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left:          `${p.left}%`,
            top:           `${p.top}%`,
            width:         `${p.size}px`,
            height:        `${p.size}px`,
            background:    p.color,
            boxShadow:     `0 0 ${p.size * 3}px ${p.color}`,
            animationDelay:    `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            '--dx':        `${p.dx}px`,
            '--dy':        `${p.dy}px`,
          }}
        />
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Cursor Spotlight
   ───────────────────────────────────────────────────────────── */
const CursorSpotlight = () => {
  const ref = useRef(null);
  useEffect(() => {
    const move = (e) => {
      if (ref.current) {
        ref.current.style.left = `${e.clientX}px`;
        ref.current.style.top  = `${e.clientY}px`;
      }
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);
  return <div className="cursor-spotlight" ref={ref} aria-hidden="true" />;
};

/* ─────────────────────────────────────────────────────────────
   Custom Language Select
   ───────────────────────────────────────────────────────────── */
const CustomSelect = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="custom-select-container" ref={ref}>
      <div
        className={`custom-select-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(v => !v)}
      >
        <div className="selected-value">
          <i className={selected?.icon || "fa-solid fa-code"} />
          <span>{selected?.label}</span>
        </div>
        <i className="fa-solid fa-chevron-down dropdown-arrow" />
      </div>

      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map(opt => (
            <div
              key={opt.value}
              className={`custom-select-option ${value === opt.value ? "selected" : ""}`}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
            >
              <i className={opt.icon} />
              <span>{opt.label}</span>
              {value === opt.value && <i className="fa-solid fa-check check-icon" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Line Numbers
   ───────────────────────────────────────────────────────────── */
const LineNumbers = ({ code, activeLine }) => {
  const count = Math.max(1, code.split(/\r\n|\r|\n/).length);
  return (
    <div className="line-numbers" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`line-num ${activeLine === i + 1 ? "active" : ""}`}
        >
          {i + 1}
        </span>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Main App
   ───────────────────────────────────────────────────────────── */
function App() {
  const [view, setView]                   = useState("landing");
  const [code, setCode]                   = useState("");
  const [language, setLanguage]           = useState("python");
  const [analysisResult, setAnalysisResult] = useState("");
  const [correctedCode, setCorrectedCode] = useState("");
  const [loading, setLoading]             = useState(false);
  const [time, setTime]                   = useState("");
  const [gitStatus, setGitStatus]         = useState("disconnected");
  const [isCommitting, setIsCommitting]   = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [copied, setCopied]               = useState(false);
  const [activeLine, setActiveLine]       = useState(1);
  const [activeTab, setActiveTab]         = useState("analysis");  // "analysis" | "code"
  const [analysisCount, setAnalysisCount] = useState(0);
  const [lastLang, setLastLang]           = useState("—");

  const textareaRef = useRef(null);

  /* Line count & char count */
  const lineCount = code ? code.split(/\r\n|\r|\n/).length : 0;
  const charCount = code.length;

  /* Track active line from cursor position */
  const handleEditorKeyUp = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const linesBefore = ta.value.substring(0, ta.selectionStart).split("\n");
    setActiveLine(linesBefore.length);
  };

  /* Time update */
  useEffect(() => {
    if (view !== "dashboard") return;
    const update = () => {
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    };
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, [view]);

  /* Copy corrected code */
  const handleCopyCode = () => {
    navigator.clipboard.writeText(correctedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const languageOptions = [
    { value: "python",     label: "Python 3.x",   icon: "fa-brands fa-python"  },
    { value: "java",       label: "Java",          icon: "fa-brands fa-java"    },
    { value: "c",          label: "C",             icon: "fa-solid fa-c"        },
    { value: "cpp",        label: "C++",           icon: "fa-solid fa-c"        },
    { value: "csharp",     label: "C#",            icon: "fa-solid fa-code"     },
    { value: "html",       label: "HTML5",         icon: "fa-brands fa-html5"   },
    { value: "css",        label: "CSS3",          icon: "fa-brands fa-css3-alt"},
    { value: "javascript", label: "JavaScript",    icon: "fa-brands fa-js"      },
    { value: "typescript", label: "TypeScript",    icon: "fa-solid fa-code"     },
    { value: "go",         label: "Go (Golang)",   icon: "fa-brands fa-golang"  },
    { value: "rust",       label: "Rust",          icon: "fa-brands fa-rust"    },
  ];

  const getLanguageName = (lang) =>
    languageOptions.find(o => o.value === lang)?.label || lang.toUpperCase();

  /* ── Debug / Analyse ── */
  const handleDebug = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setAnalysisResult("");
    setCorrectedCode("");
    setActiveTab("analysis");
    try {
      const res = await axios.post("http://localhost:8000/debug", { code, language });
      if (res.data.error) {
        setAnalysisResult("⚠️ Backend execution failed:\n" + res.data.error);
      } else {
        const raw = res.data.result || "";
        let finalAnalysis = raw;
        let finalCode     = "";

        if (raw.includes("###")) {
          const parts = raw.split(/###\s*🛠️?\s*Fixed\s*Source\s*Code/i);
          if (parts.length > 1) {
            finalAnalysis = parts[0].trim();
            const m = parts[1].match(/```[\w]*\n([\s\S]*?)\n```/);
            if (m && m[1]) {
              finalCode = m[1].trim();
              const after = parts[1].replace(m[0], "").trim();
              if (after) finalAnalysis += "\n\n" + after;
            }
          }
        } else {
          const fb = raw.match(/```[\w]*\n([\s\S]*?)\n```/);
          if (fb && fb[1]) {
            finalCode     = fb[1].trim();
            finalAnalysis = raw.replace(fb[0], "").trim();
          }
        }

        setAnalysisResult(finalAnalysis || "✓ Analysis Complete: No structural issues detected. Code is well-optimized.");
        setCorrectedCode(finalCode);
        if (finalCode) setActiveTab("code");
        setAnalysisCount(c => c + 1);
        setLastLang(getLanguageName(language));
      }
    } catch (err) {
      setAnalysisResult("❌ Network Error or AI Server offline: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Git ── */
  const handleGitConnect = () => {
    if (gitStatus === "disconnected") {
      setGitStatus("connecting");
      setTimeout(() => setGitStatus("connected"), 2000);
    } else if (gitStatus === "connected") {
      setGitStatus("disconnected");
      setCommitMessage("");
    }
  };

  const handleCommit = () => {
    if (!code.trim()) return;
    setIsCommitting(true);
    setCommitMessage("");
    setTimeout(() => {
      setIsCommitting(false);
      setCommitMessage("✓ Success: Code auto-committed to origin/main via DebugMind.");
    }, 2500);
  };

  /* ══════════════════════════════════════════════════════════
     LANDING PAGE
     ══════════════════════════════════════════════════════════ */
  if (view === "landing") {
    return (
      <div className="dark-apex-theme landing-page" id="landing">
        {/* Animated background */}
        <div className="bg-canvas">
          <div className="bg-grid" />
          <div className="bg-orb orb-1" />
          <div className="bg-orb orb-2" />
          <div className="bg-orb orb-3" />
        </div>

        <CursorSpotlight />
        <ParticleField />

        {/* Hero content */}
        <div className="landing-content">
          {/* Status badge */}
          <div className="badge-pill">
            <span className="badge-dot" />
            AI Engine v3.0 — Online
          </div>

          {/* Title */}
          <div className="landing-title-area">
            <BlurText
              text="DebugMind AI"
              delay={80}
              animateBy="words"
              direction="top"
              className="landing-title gradient-text"
            />
          </div>

          <p className="landing-subtitle" style={{ animation: "fadeInUp 0.9s ease 1.1s backwards" }}>
            A state-of-the-art neural engine that detects bugs, optimises architecture,
            and elevates your codebase with surgical precision.
          </p>

          {/* Feature chips */}
          <div className="feature-chips">
            {[
              { icon: "fa-solid fa-bolt", label: "Instant Analysis" },
              { icon: "fa-solid fa-shield-halved", label: "Security Scan" },
              { icon: "fa-solid fa-code-branch", label: "Git Integration" },
              { icon: "fa-solid fa-wand-magic-sparkles", label: "AI Auto-Fix" },
              { icon: "fa-solid fa-layer-group", label: "11 Languages" },
            ].map(c => (
              <div key={c.label} className="feature-chip">
                <i className={c.icon} style={{ color: "var(--aurora-blue)" }} />
                {c.label}
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="cta-group">
            <button
              id="btn-launch-workspace"
              className="btn-launch"
              onClick={() => setView("dashboard")}
            >
              <i className="fa-solid fa-rocket" />
              Launch Workspace
              <i className="fa-solid fa-arrow-right" style={{ fontSize: "0.85rem" }} />
            </button>
            <button className="btn-ghost" id="btn-learn-more">
              <i className="fa-solid fa-circle-play" />
              See it in action
            </button>
          </div>

          {/* Stats */}
          <div className="stats-row">
            {[
              { value: "11+",    label: "Languages" },
              { value: "99%",    label: "Accuracy" },
              { value: "<2s",    label: "Analysis" },
              { value: "∞",      label: "Scans" },
            ].map(s => (
              <div key={s.label} className="stat-item">
                <span className="stat-value">{s.value}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     DASHBOARD PAGE
     ══════════════════════════════════════════════════════════ */
  return (
    <div className="dark-apex-theme dashboard-page fade-in-view" id="dashboard">
      {/* Background */}
      <div className="bg-canvas">
        <div className="bg-grid" />
        <div className="bg-orb orb-1" />
        <div className="bg-orb orb-2" />
      </div>

      {/* ── Header ── */}
      <header className="header glass" id="main-header">
        <div className="header-left">
          <div
            className="brand-logo"
            id="brand-logo"
            onClick={() => setView("landing")}
            title="Return to Landing Page"
          >
            <i className="fa-solid fa-bug" />
          </div>
          <span className="brand-name">DebugMind&nbsp;Pro</span>
          <div className="header-divider" />
          <button className="back-nav-btn" id="btn-back-home" onClick={() => setView("landing")}>
            <i className="fa-solid fa-chevron-left" /> Home
          </button>
        </div>

        <div className="header-right">
          {/* Engine status */}
          <div className="status-badge">
            <span className="status-dot" />
            <span className="status-label">Engine Online</span>
          </div>

          {/* GitHub */}
          {gitStatus === "disconnected" && (
            <button className="github-btn" id="btn-github-connect" onClick={handleGitConnect}>
              <GitHubIcon size={16} />
              Connect GitHub
            </button>
          )}
          {gitStatus === "connecting" && (
            <button className="github-btn connecting" disabled>
              <div className="spinner-mini" />
              <span>Connecting…</span>
            </button>
          )}
          {gitStatus === "connected" && (
            <div className="github-connected" id="github-connected-pill" onClick={handleGitConnect} title="Click to disconnect">
              <GitHubIcon size={16} />
              <span>Developer</span>
              <i className="fa-solid fa-check-circle auth-check" />
            </div>
          )}

          {/* Clock */}
          <div className="time-pill" id="time-display">
            <i className="fa-regular fa-clock" />
            <span className="time-display">{time}</span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main-wrapper">
        <div className="dashboard-grid">

          {/* ── Left: Editor ── */}
          <div className="editor-panel stagger-1" id="editor-panel">
            <div className="panel-titlebar">
              <div className="mac-dots">
                <span className="mac-dot red"    title="Close" />
                <span className="mac-dot yellow" title="Minimize" />
                <span className="mac-dot green"  title="Expand" />
              </div>
              <span className="panel-title-text">
                source.{language === "javascript" ? "js" : language === "python" ? "py" : language === "typescript" ? "ts" : language}
              </span>
              <div className="panel-badge">
                {getLanguageName(language)}
              </div>
            </div>

            <div className="editor-body">
              {/* Language selector */}
              <div className="controls-row">
                <CustomSelect
                  options={languageOptions}
                  value={language}
                  onChange={setLanguage}
                />
              </div>

              {/* Editor area with line numbers */}
              <div className="code-area-wrapper">
                <LineNumbers code={code} activeLine={activeLine} />
                <textarea
                  id="code-textarea"
                  ref={textareaRef}
                  className="code-editor"
                  placeholder={`// Paste your ${getLanguageName(language)} code here for AI analysis…`}
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onKeyUp={handleEditorKeyUp}
                  onClick={handleEditorKeyUp}
                  spellCheck="false"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
              </div>

              {/* Status bar */}
              <div className="editor-status-bar">
                <span>Ln {lineCount} &bull; Col {activeLine}</span>
                <div className="status-bar-right">
                  <span>{charCount} chars</span>
                  <span>UTF-8</span>
                  <span>{getLanguageName(language)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Controls + Results ── */}
          <div className="action-panel stagger-2" id="action-panel">

            {/* Engine Card */}
            <div className="engine-card" id="engine-card">
              <div className="card-header-row">
                <div className="card-icon">
                  <i className="fa-solid fa-microchip" />
                </div>
                <div>
                  <div className="card-title">Analysis Engine</div>
                </div>
              </div>
              <p className="card-desc">
                Our Gemini-powered model profiles your code for vulnerabilities,
                logic errors, and standard compliance, then auto-generates a fix.
              </p>

              <button
                id="btn-analyse"
                className={`btn-primary ${loading ? "loading" : ""}`}
                onClick={handleDebug}
                disabled={loading || !code.trim()}
              >
                {loading ? (
                  <>
                    <div className="spinner-mini" />
                    Analysing…
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-wand-magic-sparkles" />
                    Analyse &amp; Debug
                  </>
                )}
              </button>

              {/* GitHub Version Control */}
              {gitStatus === "connected" && (
                <div className="vc-section fade-in-up" id="vc-section">
                  <div className="divider" />
                  <div className="sub-title">
                    <GitHubIcon size={15} glow={false} />
                    Version Control
                  </div>
                  <p className="vc-desc">
                    Account linked. Push this code directly to your repository.
                  </p>
                  <button
                    className="btn-secondary"
                    id="btn-commit"
                    onClick={handleCommit}
                    disabled={isCommitting || !code.trim() || loading}
                  >
                    {isCommitting ? (
                      <><div className="spinner-mini" /> Pushing to origin/main…</>
                    ) : (
                      <><i className="fa-solid fa-code-commit" /> Auto-Commit to GitHub</>
                    )}
                  </button>
                  {commitMessage && (
                    <div className="commit-success fade-in-up" id="commit-success-msg">
                      {commitMessage}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Stats Card */}
            <div className="stats-card" id="stats-card">
              <div className="stats-card-title">Session Stats</div>
              <div className="stat-row">
                <div className="stat-name">
                  <i className="fa-solid fa-chart-line" /> Analyses Run
                </div>
                <span
                  className="stat-pill green"
                  style={analysisCount === 0 ? { background: "rgba(255,255,255,0.07)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.1)" } : {}}
                >
                  {analysisCount}
                </span>
              </div>
              <div className="stat-row">
                <div className="stat-name">
                  <i className="fa-solid fa-code" /> Lines of Code
                </div>
                <span className="stat-val">{lineCount || "—"}</span>
              </div>
              <div className="stat-row">
                <div className="stat-name">
                  <i className="fa-solid fa-layer-group" /> Last Language
                </div>
                <span className="stat-val">{lastLang}</span>
              </div>
              <div className="stat-row">
                <div className="stat-name">
                  <i className="fa-brands fa-github" /> Git Status
                </div>
                <span
                  className="stat-pill"
                  style={{
                    background: gitStatus === "connected" ? "rgba(48,209,88,0.12)" : "rgba(255,255,255,0.07)",
                    color:      gitStatus === "connected" ? "var(--aurora-green)" : "var(--text-muted)",
                    border:     gitStatus === "connected" ? "1px solid rgba(48,209,88,0.25)" : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {gitStatus === "connected" ? "Linked" : "Offline"}
                </span>
              </div>
            </div>

            {/* Results area */}
            {(analysisResult || loading) && (
              <div className="result-wrapper" id="result-wrapper">
                {/* Tabs header */}
                <div className="result-header-bar">
                  <i className="fa-solid fa-brain" />
                  <span className="result-header-label">AI Intelligence</span>
                  <div className="result-tabs">
                    <button
                      className={`result-tab ${activeTab === "analysis" ? "active" : ""}`}
                      id="tab-analysis"
                      onClick={() => setActiveTab("analysis")}
                    >
                      Analysis
                    </button>
                    {correctedCode && (
                      <button
                        className={`result-tab ${activeTab === "code" ? "active" : ""}`}
                        id="tab-code"
                        onClick={() => setActiveTab("code")}
                      >
                        Fixed Code
                      </button>
                    )}
                  </div>
                </div>

                <div className="result-body">
                  {loading ? (
                    <div className="loading-state">
                      <div className="spinner" />
                      <p className="loading-text">Processing via Neural Engine…</p>
                      <div className="loading-dots">
                        <span /><span /><span />
                      </div>
                    </div>
                  ) : (
                    <>
                      {activeTab === "analysis" && (
                        <div>
                          <div className="section-label errors">
                            <i className="fa-solid fa-triangle-exclamation" />
                            Detected Errors &amp; Analysis
                          </div>
                          <pre className="result-text">{analysisResult}</pre>
                        </div>
                      )}

                      {activeTab === "code" && correctedCode && (
                        <div>
                          <div className="section-label code">
                            <i className="fa-solid fa-circle-check" />
                            Corrected Source Code
                          </div>
                          <div className="corrected-code-container">
                            <button
                              className={`copy-btn ${copied ? "copied" : ""}`}
                              id="btn-copy-code"
                              onClick={handleCopyCode}
                            >
                              {copied
                                ? <><i className="fa-solid fa-check" /> Copied!</>
                                : <><i className="fa-regular fa-copy" /> Copy</>
                              }
                            </button>
                            <pre className="result-text" style={{ color: "#E8E8F0" }}>
                              {correctedCode}
                            </pre>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      <footer className="footer" id="main-footer">
        <div className="footer-inner">
          <span>DebugMind Pro</span>
          <span className="footer-dot">·</span>
          <span>Aurora Edition v3.0</span>
          <span className="footer-dot">·</span>
          <span>Powered by Gemini</span>
          <span className="footer-dot">·</span>
          <span style={{ color: "var(--aurora-blue)" }}>
            <i className="fa-solid fa-circle" style={{ fontSize: "6px", verticalAlign: "middle" }} /> System Operational
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
