import React, { useMemo, useEffect, useRef, useState } from 'react';
import './AnalysisDashboard.css';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));

/** Convert a 0-100 score + cx/cy into an SVG radar polygon point */
const polarToXY = (angle, radius, cx, cy) => {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
};

/** Parse colour from score */
const scoreColor = (v) => {
  if (v >= 80) return '#34C759';
  if (v >= 55) return '#FFBD2E';
  return '#FF5F56';
};

/** Detect severity from a line of text */
const detectSeverity = (line) => {
  const l = line.toLowerCase();
  if (l.includes('critical') || l.includes('fatal') || l.includes('crash') || l.includes('infinite')) return 'critical';
  if (l.includes('warning') || l.includes('warn') || l.includes('potential') || l.includes('coercion')) return 'warning';
  if (l.includes('info') || l.includes('note') || l.includes('consider')) return 'info';
  return 'default';
};

/* ─────────────────────────────────────────────
   RADAR CHART (pure SVG, no deps)
───────────────────────────────────────────── */
const RadarChart = ({ metrics }) => {
  const SIZE = 220;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const MAX_R = 80;
  const LEVELS = 4;

  const dims = Object.keys(metrics);
  const angleStep = 360 / dims.length;

  /* Grid rings */
  const gridRings = Array.from({ length: LEVELS }, (_, i) => {
    const r = (MAX_R / LEVELS) * (i + 1);
    const pts = dims.map((_, j) => {
      const p = polarToXY(j * angleStep, r, cx, cy);
      return `${p.x},${p.y}`;
    });
    return pts.join(' ');
  });

  /* Axis lines */
  const axes = dims.map((_, i) => {
    const outer = polarToXY(i * angleStep, MAX_R, cx, cy);
    return { x1: cx, y1: cy, x2: outer.x, y2: outer.y };
  });

  /* Data polygon */
  const dataPoints = dims.map((dim, i) => {
    const r = (metrics[dim] / 100) * MAX_R;
    return polarToXY(i * angleStep, r, cx, cy);
  });
  const dataPoly = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  /* Labels */
  const labels = dims.map((dim, i) => {
    const p = polarToXY(i * angleStep, MAX_R + 18, cx, cy);
    return { ...p, label: dim };
  });

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="radar-svg">
      <defs>
        <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0A84FF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#34C759" stopOpacity="0.3" />
        </linearGradient>
        <filter id="radarGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Grid rings */}
      {gridRings.map((pts, i) => (
        <polygon key={i} points={pts} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}

      {/* Axis lines */}
      {axes.map((a, i) => (
        <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
          stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      ))}

      {/* Data area */}
      <polygon points={dataPoly}
        fill="url(#radarGrad)"
        stroke="#0A84FF"
        strokeWidth="2"
        filter="url(#radarGlow)"
        className="radar-poly"
      />

      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4"
          fill="#0A84FF" stroke="#fff" strokeWidth="1.5"
          className="radar-dot"
        />
      ))}

      {/* Labels */}
      {labels.map(({ x, y, label }, i) => (
        <text key={i} x={x} y={y}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.6)" fontSize="9" fontWeight="600"
          fontFamily="-apple-system, 'SF Pro Text', sans-serif"
          textTransform="uppercase"
        >
          {label}
        </text>
      ))}
    </svg>
  );
};

/* ─────────────────────────────────────────────
   ANIMATED SCORE BAR
───────────────────────────────────────────── */
const ScoreBar = ({ label, value, delay = '0s', icon }) => {
  const barRef = useRef(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      el.style.width = `${value}%`;
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  const color = scoreColor(value);
  return (
    <div className="score-bar-row" style={{ animationDelay: delay }}>
      <div className="score-bar-meta">
        <span className="score-bar-label">
          {icon && <i className={icon} style={{ color, marginRight: 6 }} />}
          {label}
        </span>
        <span className="score-bar-value" style={{ color }}>{value}<span className="score-unit">%</span></span>
      </div>
      <div className="score-bar-track">
        <div
          ref={barRef}
          className="score-bar-fill"
          style={{ '--bar-color': color, width: '0%' }}
        />
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   CIRCULAR GAUGE
───────────────────────────────────────────── */
const CircularGauge = ({ value, label, color, size = 120 }) => {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const gap = circ - dash;

  return (
    <div className="gauge-wrapper">
      <svg width={size} height={size} viewBox="0 0 100 100" className="gauge-svg">
        <defs>
          <linearGradient id={`gGrad-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx="50" cy="50" r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="8"
          strokeDasharray={`${circ}`}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
        {/* Value arc */}
        <circle cx="50" cy="50" r={r} fill="none"
          stroke={`url(#gGrad-${label})`} strokeWidth="8"
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
          className="gauge-arc"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
        <text x="50" y="46" textAnchor="middle" dominantBaseline="middle"
          fill="#fff" fontSize="18" fontWeight="800"
          fontFamily="-apple-system, 'SF Pro Text', sans-serif">
          {value}
        </text>
        <text x="50" y="60" textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.4)" fontSize="8" fontWeight="600">%</text>
      </svg>
      <div className="gauge-label" style={{ color }}>{label}</div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   AGENT THOUGHT STEPPER
───────────────────────────────────────────── */
const AgentStepper = ({ thoughts }) => {
  const [expanded, setExpanded] = useState(null);

  // Parse thought lines into structured steps
  const steps = useMemo(() => {
    if (!thoughts) return [];
    return thoughts.split('\n')
      .filter(l => l.trim())
      .map((line, i) => {
        const clean = line.replace(/^[-*•]\s*/, '').trim();
        const statusMatch = clean.match(/\[(PASSED|FAILED|CRITICAL|SECURE|WARNING|OPTIMIZATION|EFFICIENT)\]/i);
        const status = statusMatch ? statusMatch[1].toUpperCase() : 'INFO';
        const statusColors = {
          PASSED: '#34C759', SECURE: '#34C759', EFFICIENT: '#34C759',
          FAILED: '#FF5F56', CRITICAL: '#FF5F56',
          WARNING: '#FFBD2E', OPTIMIZATION: '#FFBD2E',
          INFO: '#0A84FF',
        };
        const statusIcons = {
          PASSED: 'fa-solid fa-circle-check', SECURE: 'fa-solid fa-shield-halved',
          EFFICIENT: 'fa-solid fa-bolt', FAILED: 'fa-solid fa-circle-xmark',
          CRITICAL: 'fa-solid fa-triangle-exclamation', WARNING: 'fa-solid fa-circle-exclamation',
          OPTIMIZATION: 'fa-solid fa-wand-magic-sparkles', INFO: 'fa-solid fa-circle-info',
        };
        return {
          id: i,
          text: clean.replace(/\[.*?\]:\s*/, '').trim(),
          status,
          color: statusColors[status] || '#0A84FF',
          icon: statusIcons[status] || 'fa-solid fa-circle-info',
          raw: clean,
        };
      });
  }, [thoughts]);

  if (!steps.length) return null;

  return (
    <div className="stepper-container">
      {steps.map((step, i) => (
        <div
          key={step.id}
          className={`stepper-step fade-in-up-stagger ${expanded === i ? 'expanded' : ''}`}
          style={{ animationDelay: `${0.05 * i}s` }}
          onClick={() => setExpanded(expanded === i ? null : i)}
        >
          {/* Connector line */}
          {i < steps.length - 1 && <div className="stepper-line" style={{ background: `linear-gradient(${step.color}, ${steps[i + 1].color})` }} />}

          <div className="stepper-dot" style={{ '--dot-color': step.color }}>
            <i className={step.icon} style={{ color: step.color, fontSize: '0.75rem' }} />
          </div>

          <div className="stepper-content">
            <div className="stepper-status-badge" style={{ '--badge-color': step.color }}>
              {step.status}
            </div>
            <p className="stepper-text">{step.text || step.raw}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────
   ISSUE CARD
───────────────────────────────────────────── */
const IssueCard = ({ line, index, delay }) => {
  const severity = detectSeverity(line);
  const severityConfig = {
    critical: { color: '#FF5F56', bg: 'rgba(255,95,86,0.08)', icon: 'fa-solid fa-skull-crossbones', label: 'CRITICAL' },
    warning:  { color: '#FFBD2E', bg: 'rgba(255,189,46,0.08)',  icon: 'fa-solid fa-triangle-exclamation', label: 'WARNING' },
    info:     { color: '#0A84FF', bg: 'rgba(10,132,255,0.08)',  icon: 'fa-solid fa-circle-info', label: 'INFO' },
    default:  { color: '#BF5AF2', bg: 'rgba(191,90,242,0.08)',  icon: 'fa-solid fa-bug', label: 'BUG' },
  };
  const cfg = severityConfig[severity];
  const cleanLine = line.replace(/^[\d.]+\s*/, '').replace(/\*\*/g, '').trim();

  return (
    <div className="issue-card fade-in-up-stagger"
      style={{ '--issue-color': cfg.color, '--issue-bg': cfg.bg, animationDelay: delay }}>
      <div className="issue-icon-wrap">
        <i className={cfg.icon} style={{ color: cfg.color }} />
      </div>
      <div className="issue-body">
        <span className="issue-severity-badge" style={{ color: cfg.color, borderColor: `${cfg.color}40`, background: cfg.bg }}>
          {cfg.label}
        </span>
        <p className="issue-text">{cleanLine}</p>
      </div>
      <div className="issue-index">#{index + 1}</div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   BEST PRACTICE CARD
───────────────────────────────────────────── */
const BestPracticeCard = ({ line, index, delay }) => {
  const icons = ['fa-solid fa-rocket', 'fa-solid fa-lightbulb', 'fa-solid fa-star', 'fa-solid fa-gem'];
  const colors = ['#34C759', '#0A84FF', '#BF5AF2', '#FFBD2E'];
  const color = colors[index % colors.length];
  const icon = icons[index % icons.length];
  const clean = line.replace(/^[-*•\d.]+\s*/, '').replace(/\*\*/g, '').trim();

  return (
    <div className="bp-card fade-in-up-stagger" style={{ animationDelay: delay }}>
      <div className="bp-icon" style={{ '--bp-color': color }}>
        <i className={icon} style={{ color }} />
      </div>
      <p className="bp-text">{clean}</p>
    </div>
  );
};

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */
const AnalysisDashboard = ({ rawResult, language }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const sections = useMemo(() => {
    if (!rawResult) return null;

    const data = {
      thoughts: '',
      errors: '',
      explanation: '',
      bestPractices: '',
      metrics: { Security: 0, Performance: 0, Readability: 0, Reliability: 0, Complexity: 0 },
    };

    /* Parse by ### headers */
    const parts = rawResult.split(/###\s*(.*)/);
    for (let i = 1; i < parts.length; i += 2) {
      const header = parts[i].toLowerCase();
      const content = (parts[i + 1] || '').trim();
      if (header.includes('thought')) data.thoughts = content;
      else if (header.includes('error') || header.includes('detect')) data.errors = content;
      else if (header.includes('explanation') || header.includes('technical')) data.explanation = content;
      else if (header.includes('practice') || header.includes('optim')) data.bestPractices = content;
    }

    /* Calculate metrics */
    const allText = `${data.errors} ${data.explanation} ${data.bestPractices}`.toLowerCase();
    const errorLines = data.errors.split('\n').filter(l => l.trim() && /\d+\.|[-*]/.test(l));

    const hasSecurity = allText.includes('security') || allText.includes('vulnerab') || allText.includes('api key') || allText.includes('secret') || allText.includes('credential');
    const hasPerf = allText.includes('performance') || allText.includes('slow') || allText.includes('optimize') || allText.includes('inefficien');
    const hasCritical = allText.includes('critical') || allText.includes('infinite') || allText.includes('crash') || allText.includes('fatal');
    const errorCount = errorLines.length;
    const bpCount = (data.bestPractices.match(/\n[-*•\d]/g) || []).length;

    data.metrics.Security    = clamp(hasSecurity ? 40 : 95);
    data.metrics.Performance = clamp(hasPerf ? 58 : 100);
    data.metrics.Readability = clamp(errorCount > 4 ? 55 : errorCount > 2 ? 72 : 90);
    data.metrics.Reliability = clamp(hasCritical ? 35 : errorCount > 3 ? 65 : 92);
    data.metrics.Complexity  = clamp(bpCount > 3 ? 60 : 85);

    data.overallScore = Math.round(
      Object.values(data.metrics).reduce((a, b) => a + b, 0) / Object.keys(data.metrics).length
    );

    data.errorLines = errorLines;
    data.bpLines = data.bestPractices.split('\n').filter(l => l.trim() && /[-*•\d]/.test(l));

    return data;
  }, [rawResult]);

  if (!sections) return null;

  const TABS = [
    { id: 'overview',  label: 'Overview',      icon: 'fa-solid fa-chart-pie' },
    { id: 'issues',    label: 'Issues',         icon: 'fa-solid fa-triangle-exclamation' },
    { id: 'agent',     label: 'Agent Log',      icon: 'fa-solid fa-brain' },
    { id: 'practices', label: 'Optimization',   icon: 'fa-solid fa-rocket' },
  ];

  return (
    <div className="ad-root">

      {/* ── TOP SUMMARY ROW ── */}
      <div className="ad-summary-row">
        <CircularGauge
          value={sections.overallScore}
          label="Health Score"
          color={scoreColor(sections.overallScore)}
          size={120}
        />

        <div className="ad-gauges-mini">
          {Object.entries(sections.metrics).map(([k, v], i) => (
            <div key={k} className="mini-gauge-wrap">
              <CircularGauge
                value={v}
                label={k}
                color={scoreColor(v)}
                size={76}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="ad-tab-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`ad-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="ad-tab-content" key={activeTab}>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="ad-overview-grid">
            <div className="ad-radar-card glass-panel-inner">
              <div className="ad-section-title">
                <i className="fa-solid fa-chart-radar" style={{ color: '#0A84FF' }} />
                Code Quality Radar
              </div>
              <RadarChart metrics={sections.metrics} />
            </div>

            <div className="ad-scores-card glass-panel-inner">
              <div className="ad-section-title">
                <i className="fa-solid fa-bars-progress" style={{ color: '#34C759' }} />
                Score Breakdown
              </div>
              <div className="ad-score-bars">
                {Object.entries(sections.metrics).map(([k, v], i) => (
                  <ScoreBar
                    key={k}
                    label={k}
                    value={v}
                    delay={`${i * 0.08}s`}
                    icon={[
                      'fa-solid fa-shield-halved',
                      'fa-solid fa-bolt-lightning',
                      'fa-solid fa-eye',
                      'fa-solid fa-heart-pulse',
                      'fa-solid fa-code-branch',
                    ][i]}
                  />
                ))}
              </div>
            </div>

            {sections.explanation && (
              <div className="ad-explanation-card glass-panel-inner" style={{ gridColumn: '1 / -1' }}>
                <div className="ad-section-title">
                  <i className="fa-solid fa-magnifying-glass-chart" style={{ color: '#FFBD2E' }} />
                  Root Cause Analysis
                </div>
                <div className="ad-explanation-text">
                  {sections.explanation.split('\n').filter(l => l.trim()).map((line, i) => {
                    const isBullet = /^[-*•]/.test(line.trim());
                    return (
                      <div key={i} className={`explanation-line ${isBullet ? 'bullet' : ''}`}>
                        {isBullet && <span className="bullet-dot" />}
                        <span>{line.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ISSUES */}
        {activeTab === 'issues' && (
          <div className="ad-issues-container">
            {sections.errorLines.length === 0 ? (
              <div className="ad-empty-state">
                <i className="fa-solid fa-circle-check" style={{ color: '#34C759', fontSize: '3rem' }} />
                <h4 style={{ color: '#34C759' }}>No Issues Detected</h4>
                <p>The analysis found no critical bugs or vulnerabilities in your code.</p>
              </div>
            ) : (
              <>
                <div className="ad-issues-header">
                  <span className="issues-count-badge">{sections.errorLines.length} issue{sections.errorLines.length !== 1 ? 's' : ''} found</span>
                </div>
                {sections.errorLines.map((line, i) => (
                  <IssueCard key={i} line={line} index={i} delay={`${i * 0.06}s`} />
                ))}
              </>
            )}
          </div>
        )}

        {/* AGENT LOG */}
        {activeTab === 'agent' && (
          <div className="ad-agent-container glass-panel-inner">
            <div className="ad-section-title">
              <i className="fa-solid fa-microchip" style={{ color: '#0A84FF' }} />
              AI Agent Thought Process
            </div>
            {sections.thoughts ? (
              <AgentStepper thoughts={sections.thoughts} />
            ) : (
              <div className="ad-empty-state">
                <i className="fa-solid fa-brain" style={{ color: '#0A84FF', fontSize: '2.5rem' }} />
                <p>Agent thought process not available for this analysis.</p>
              </div>
            )}
          </div>
        )}

        {/* BEST PRACTICES */}
        {activeTab === 'practices' && (
          <div className="ad-bp-container">
            <div className="ad-section-title" style={{ marginBottom: '16px' }}>
              <i className="fa-solid fa-rocket" style={{ color: '#34C759' }} />
              Optimization Strategies
            </div>
            {sections.bpLines.length === 0 ? (
              <div className="ad-empty-state">
                <p>No additional optimization strategies were suggested.</p>
              </div>
            ) : (
              sections.bpLines.map((line, i) => (
                <BestPracticeCard key={i} line={line} index={i} delay={`${i * 0.07}s`} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisDashboard;
