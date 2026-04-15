import React, { useMemo } from 'react';
import './AnalysisDashboard.css';

const AnalysisDashboard = ({ rawResult, language }) => {
  const sections = useMemo(() => {
    if (!rawResult) return null;

    const sectionsData = {
      thoughts: "",
      errors: "",
      explanation: "",
      bestPractices: "",
      metrics: {
        security: 0,
        performance: 0,
        readability: 0,
        overall: 0
      }
    };

    // Split by headers
    const parts = rawResult.split(/###\s*(.*)/);
    
    for (let i = 1; i < parts.length; i += 2) {
      const header = parts[i].toLowerCase();
      const content = parts[i + 1]?.trim();

      if (header.includes("thought")) sectionsData.thoughts = content;
      else if (header.includes("error")) sectionsData.errors = content;
      else if (header.includes("explanation")) sectionsData.explanation = content;
      else if (header.includes("practice")) sectionsData.bestPractices = content;
    }

    // Calculate dummy metrics based on content
    const errorCount = (sectionsData.errors.match(/\d+\./g) || []).length || 
                      (sectionsData.errors.match(/-/g) || []).length || 0;
    
    const securityIssues = sectionsData.errors.toLowerCase().includes("security") || 
                          sectionsData.explanation.toLowerCase().includes("vulnerability") ||
                          sectionsData.explanation.toLowerCase().includes("api key") ||
                          sectionsData.explanation.toLowerCase().includes("secret");

    const performanceIssues = sectionsData.explanation.toLowerCase().includes("performance") || 
                             sectionsData.explanation.toLowerCase().includes("slow") ||
                             sectionsData.bestPractices.toLowerCase().includes("optimize");

    sectionsData.metrics.security = securityIssues ? 45 : 98;
    sectionsData.metrics.performance = performanceIssues ? 65 : 100;
    sectionsData.metrics.readability = errorCount > 3 ? 60 : 92;
    sectionsData.metrics.overall = Math.round(
      (sectionsData.metrics.security + sectionsData.metrics.performance + sectionsData.metrics.readability) / 3
    );

    return sectionsData;
  }, [rawResult]);

  if (!sections) return null;

  const getMetricColor = (val) => {
    if (val > 80) return "#34C759";
    if (val > 50) return "#FFBD2E";
    return "#FF5F56";
  };

    return (
    <div className="analysis-dashboard">
      {/* Metric Overview Row */}
      <div className="metrics-grid">
        <MetricCard 
          label="Health Score" 
          value={sections.metrics.overall} 
          unit="%" 
          color={getMetricColor(sections.metrics.overall)}
          icon="fa-solid fa-heart-pulse"
          delay="0s"
        />
        <MetricCard 
          label="Security" 
          value={sections.metrics.security} 
          unit="%" 
          color={getMetricColor(sections.metrics.security)}
          icon="fa-solid fa-shield-halved"
          delay="0.1s"
        />
        <MetricCard 
          label="Performance" 
          value={sections.metrics.performance} 
          unit="%" 
          color={getMetricColor(sections.metrics.performance)}
          icon="fa-solid fa-bolt-lightning"
          delay="0.2s"
        />
      </div>

      <div className="analysis-sections">
        {sections.thoughts && (
          <SectionCard 
            title="AI Agent Intelligence" 
            icon="fa-solid fa-brain" 
            color="#0A84FF"
            content={sections.thoughts}
            specialClass="thought-card"
            delay="0.3s"
          />
        )}

        {sections.errors && (
          <SectionCard 
            title="Critical Issues" 
            icon="fa-solid fa-triangle-exclamation" 
            color="#FF5F56"
            content={sections.errors}
            type="list"
            delay="0.4s"
          />
        )}

        {sections.explanation && (
          <SectionCard 
            title="Root Cause Analysis" 
            icon="fa-solid fa-magnifying-glass-chart" 
            color="#FFBD2E"
            content={sections.explanation}
            delay="0.5s"
          />
        )}

        {sections.bestPractices && (
          <SectionCard 
            title="Optimization Strategy" 
            icon="fa-solid fa-rocket" 
            color="#34C759"
            content={sections.bestPractices}
            type="list"
            delay="0.6s"
          />
        )}
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, unit, color, icon, delay }) => (
  <div className="metric-card glass-panel fade-in-up-stagger" style={{ '--accent': color, animationDelay: delay }}>
    <div className="metric-ring">
      <svg viewBox="0 0 36 36" className="circular-chart">
        <path className="circle-bg"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path className="circle"
          strokeDasharray={`${value}, 100`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <div className="metric-value">{value}{unit}</div>
    </div>
    <div className="metric-info">
      <i className={icon}></i>
      <span>{label}</span>
    </div>
  </div>
);

const SectionCard = ({ title, icon, color, content, type = "list", specialClass = "", delay }) => {
  // Simple format for lists if content has bullets or numbers
  const formattedContent = content.split('\n').filter(line => line.trim()).map((line, i) => {
    const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*') || /^\d+\./.test(line.trim());
    return (
      <div key={i} className={`content-line ${isBullet ? 'bullet-line' : ''}`}>
        {line.replace(/^[-*\d.]+\s*/, '')}
      </div>
    );
  });

  return (
    <div className={`section-card glass-panel fade-in-up-stagger ${specialClass}`} style={{ animationDelay: delay }}>
      <div className="section-header" style={{ borderLeftColor: color }}>
        <i className={`${icon}`} style={{ color }}></i>
        <h4 style={{ color }}>{title}</h4>
      </div>
      <div className="section-content">
        {formattedContent}
      </div>
    </div>
  );
};

export default AnalysisDashboard;
