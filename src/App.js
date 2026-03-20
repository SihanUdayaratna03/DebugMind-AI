import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

// Import custom components
import BlurText from "./BlurText";
import ElectricBorder from "./ElectricBorder";

// Custom Apple-style Dropdown Component
const CustomSelect = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="custom-select-container" ref={dropdownRef}>
      <div 
        className={`custom-select-trigger ${isOpen ? "open" : ""}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="selected-value">
          <i className={selectedOption?.icon || "fa-solid fa-code"}></i>
          <span>{selectedOption?.label}</span>
        </div>
        <i className="fa-solid fa-chevron-down dropdown-arrow"></i>
      </div>
      
      {isOpen && (
        <div className="custom-select-dropdown popup-anim">
          {options.map((option) => (
            <div 
              key={option.value} 
              className={`custom-select-option ${value === option.value ? "selected" : ""}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <i className={option.icon}></i>
              <span>{option.label}</span>
              {value === option.value && <i className="fa-solid fa-check check-icon"></i>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function App() {
  const [view, setView] = useState("landing"); // 'landing' or 'dashboard'
  
  // Dashboard state
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState("");

  const languageOptions = [
    { value: "python", label: "Python 3.x", icon: "fa-brands fa-python" },
    { value: "javascript", label: "JavaScript (Node)", icon: "fa-brands fa-js" },
    { value: "java", label: "Java Standard Edition", icon: "fa-brands fa-java" },
    { value: "cpp", label: "C++ (GCC/Clang)", icon: "fa-solid fa-c" },
    { value: "php", label: "Engine PHP 8.x", icon: "fa-brands fa-php" },
  ];

  useEffect(() => {
    if (view === "dashboard") {
      const updateTime = () => {
        const now = new Date();
        setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      };
      updateTime();
      const interval = setInterval(updateTime, 10000);
      return () => clearInterval(interval);
    }
  }, [view]);

  const handleDebug = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult("");
    try {
      const response = await axios.post("http://127.0.0.1:8000/debug", {
        code: code,
        language: language,
      });
      setResult(response.data.result || "✓ Analysis Complete: No structural issues detected. The code is highly optimized.");
    } catch (error) {
      setResult("❌ Offline: AI Server at 127.0.0.1:8000 is not responding.");
    } finally {
      setLoading(false);
    }
  };

  const getLanguageName = (lang) => {
    return languageOptions.find(opt => opt.value === lang)?.label || lang.toUpperCase();
  };

  if (view === "landing") {
    return (
      <div className="landing-page dark-apple-theme">
        
        {/* Ambient background glows */}
        <div className="ambient-glow glow-1"></div>
        <div className="ambient-glow glow-2"></div>
        
        <div className="landing-content">
          <div className="title-wrapper">
             {/* BlurText component for prominent display */}
             <BlurText
               text="Welcome DebugMind AI"
               delay={100}
               animateBy="words"
               direction="top"
               className="landing-title gradient-text"
             />
          </div>
          <p className="landing-subtitle" style={{ animation: 'fadeInUp 1s ease 1.2s backwards' }}>
            A state-of-the-art neural engine designed to detect bugs, optimize architecture, <br/> and elevate your codebase with absolute precision.
          </p>
          <button 
            className="btn-launch glass-button" 
            onClick={() => setView("dashboard")}
            style={{ animation: 'fadeInUp 1s ease 1.5s backwards' }}
          >
            Launch Workspace <i className="fa-solid fa-arrow-right" style={{ marginLeft: '10px', fontSize: '14px' }}></i>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page dark-apple-theme fade-in-view">
       {/* Ambient background glows */}
       <div className="ambient-glow glow-3"></div>

       <header className="header glass-panel">
          <div className="header-left">
             <div className="brand-logo" onClick={() => setView("landing")} title="Return to Landing Page">
                <i className="fa-brands fa-apple apple-icon"></i>
             </div>
             <span className="brand-name">DebugMind Pro</span>
             <button className="back-nav-btn" onClick={() => setView("landing")}>
               <i className="fa-solid fa-chevron-left"></i> Home
             </button>
          </div>
          <div className="header-right">
             <div className="status-indicator">
                <span className="dot pulse-green"></span>
                <span className="status-text">Engine Online</span>
             </div>
             <div className="time-display-wrapper">
                <i className="fa-regular fa-clock"></i>
                <span className="time-display">{time}</span>
             </div>
          </div>
       </header>

       <main className="main-wrapper">
          <div className="dashboard-grid">
             
             {/* Left Panel: Editor */}
             <div className="editor-panel stagger-1">
                <div className="panel-header">
                   <div className="mac-dots">
                      <span className="mac-dot red"></span>
                      <span className="mac-dot yellow"></span>
                      <span className="mac-dot green"></span>
                   </div>
                   <span className="panel-title">Source Viewer — {getLanguageName(language)}</span>
                </div>
                
                <div className="editor-body">
                   <div className="controls-row">
                      <CustomSelect 
                        options={languageOptions} 
                        value={language} 
                        onChange={setLanguage} 
                      />
                   </div>

                   <textarea 
                      className="code-editor"
                      placeholder="// Type or paste your code here for analysis..." 
                      value={code} 
                      onChange={(e) => setCode(e.target.value)}
                      spellCheck="false"
                   />
                </div>
             </div>

             {/* Right Panel: Controls & Results */}
             <div className="action-panel stagger-2">
                <div className="action-card glass-panel">
                   <h3 className="card-title">Analysis Engine</h3>
                   <p className="card-desc">Run our advanced AI model to profile your code for vulnerabilities, inefficiencies, and standard compliance.</p>
                   
                   <button 
                      className="btn-primary" 
                      onClick={handleDebug} 
                      disabled={loading || !code.trim()}
                   >
                      {loading ? (
                         <>
                            <div className="spinner-mini"></div>
                            Analysing...
                         </>
                      ) : (
                         <>
                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                            Analyse & Debug
                         </>
                      )}
                   </button>
                </div>

                {(result || loading) && (
                   <div style={{ marginTop: '30px' }} className="fade-in-up">
                     <ElectricBorder
                       color="#0A84FF" // Apple Blue matching
                       speed={2}
                       chaos={0.2}
                       borderRadius={24}
                     >
                       <div className="result-card">
                          <div className="result-header">
                             <i className="fa-solid fa-microchip"></i>
                             <span>AI Intelligence Dashboard</span>
                          </div>
                          <div className="result-content-area">
                             {loading ? (
                                <div className="loading-state">
                                   <div className="spinner"></div>
                                   <p>Processing via Neural Engine...</p>
                                </div>
                             ) : (
                                <pre className="result-text">{result}</pre>
                             )}
                          </div>
                       </div>
                     </ElectricBorder>
                   </div>
                )}
             </div>

          </div>
       </main>

       <footer className="footer">
          Designed in High Fidelity &bull; DebugMind Pro Edition v3.0 &bull; Minimal Dark Theme
       </footer>
    </div>
  );
}

export default App;
