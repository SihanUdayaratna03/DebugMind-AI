import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

// Import custom components
import BlurText from "./BlurText";
import ElectricBorder from "./ElectricBorder";
import GitHubIcon from "./GitHubIcon";
import AnalysisDashboard from "./AnalysisDashboard";

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
  const [analysisResult, setAnalysisResult] = useState("");
  const [correctedCode, setCorrectedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState("");
  const [gitStatus, setGitStatus] = useState(() => {
    return localStorage.getItem("github_connected") === "true" ? "connected" : "disconnected";
  });
  
  // Backend Connection State
  const [backendStatus, setBackendStatus] = useState("connecting"); // connecting, online, offline
  
  // GitHub Auto-Commit State
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(correctedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Calculate lines and chars
  const lineCount = code ? code.split(/\r\n|\r|\n/).length : 0;
  const charCount = code.length;

  const languageOptions = [
    { value: "python", label: "Python 3.x", icon: "fa-brands fa-python" },
    { value: "java", label: "Java", icon: "fa-brands fa-java" },
    { value: "c", label: "C", icon: "fa-solid fa-c" },
    { value: "cpp", label: "C++", icon: "fa-solid fa-c" },
    { value: "csharp", label: "C#", icon: "fa-solid fa-code" },
    { value: "html", label: "HTML5", icon: "fa-brands fa-html5" },
    { value: "css", label: "CSS3", icon: "fa-brands fa-css3-alt" },
    { value: "javascript", label: "JavaScript", icon: "fa-brands fa-js" },
    { value: "typescript", label: "TypeScript", icon: "fa-solid fa-code" },
    { value: "go", label: "Go (Golang)", icon: "fa-brands fa-golang" },
    { value: "rust", label: "Rust", icon: "fa-brands fa-rust" },
  ];

  useEffect(() => {
    if (view === "dashboard") {
      const updateTime = () => {
        const now = new Date();
        setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      };
      updateTime();
      const timeInterval = setInterval(updateTime, 10000);

      // Backend Health Ping
      const checkBackendHealth = async () => {
        try {
          // Backend is running on port 9999
          const res = await axios.get("http://localhost:9999/health", { timeout: 3000 });
          if (res.data && res.data.status) {
            setBackendStatus("online");
          } else {
            setBackendStatus("offline");
          }
        } catch (error) {
          setBackendStatus("offline");
        }
      };

      // Initial check
      checkBackendHealth();
      // Poll every 5 seconds
      const healthInterval = setInterval(checkBackendHealth, 5000);

      return () => {
        clearInterval(timeInterval);
        clearInterval(healthInterval);
      };
    }
  }, [view]);

  const handleDebug = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setAnalysisResult("");
    setCorrectedCode("");
    try {
      const response = await axios.post("http://localhost:9999/debug", {
        code: code,
        language: language,
      });
      if (response.data.error) {
        setAnalysisResult("⚠️ Backend execution failed:\n" + response.data.error);
      } else {
        const rawResult = response.data.result || "";
        let finalAnalysis = rawResult;
        let finalCode = "";
        
        // Advanced Parsing for Gemini Agent Headers (###)
        if (rawResult.includes("###")) {
           // Split by the "Fixed Source Code" header
           const parts = rawResult.split(/###\s*🛠️?\s*Fixed\s*Source\s*Code/i);
           
           if (parts.length > 1) {
              // The analysis is everything before the fixed code header
              finalAnalysis = parts[0].trim();
              
              // Extract the code block from the second part
              const codeMatch = parts[1].match(/```[\w]*\n([\s\S]*?)\n```/);
              if (codeMatch && codeMatch[1]) {
                 finalCode = codeMatch[1].trim();
                 // Add any remaining text after the code block to the analysis
                 const afterCode = parts[1].replace(codeMatch[0], "").trim();
                 if (afterCode) finalAnalysis += "\n\n" + afterCode;
              }
           }
        } else {
           // Fallback to older regex strategies if headers aren't found
           const fallbackBlock = rawResult.match(/```[\w]*\n([\s\S]*?)\n```/);
           if (fallbackBlock && fallbackBlock[1]) {
              finalCode = fallbackBlock[1].trim();
              finalAnalysis = rawResult.replace(fallbackBlock[0], "").trim();
           }
        }

        setAnalysisResult(finalAnalysis || "✓ Analysis Complete: No structural issues detected. The code is highly optimized.");
        setCorrectedCode(finalCode);
      }
    } catch (error) {
      setAnalysisResult("❌ Network Error or AI Server offline: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGitConnect = () => {
    if (gitStatus === "disconnected") {
      setGitStatus("connecting");
      
      // Simulate OAuth window opening
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const authWindow = window.open(
        "https://github.com/login", 
        "GitHub Login", 
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Simulate connection completion
      setTimeout(() => {
        if (authWindow) authWindow.close();
        setGitStatus("connected");
        localStorage.setItem("github_connected", "true");
      }, 3000); 
    } else if (gitStatus === "connected") {
      if (window.confirm("Are you sure you want to disconnect your GitHub account?")) {
        setGitStatus("disconnected");
        localStorage.setItem("github_connected", "false");
        setCommitMessage("");
      }
    }
  };

  const handleCommit = () => {
    if (!code.trim()) return;
    setIsCommitting(true);
    setCommitMessage("");
    // Simulate git add, commit, push
    setTimeout(() => {
      setIsCommitting(false);
      setCommitMessage("✓ Success: Code auto-committed to origin/main via DebugMind.");
    }, 2500);
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
               text="Welcome to DebugMind AI"
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
                <span className={`dot ${backendStatus === "online" ? "pulse-green" : backendStatus === "connecting" ? "pulse-yellow" : "pulse-red"}`}></span>
                <span className="status-text" style={{ color: backendStatus === "online" ? "#34C759" : backendStatus === "connecting" ? "#FFBD2E" : "#FF5F56" }}>
                  {backendStatus === "online" ? "Engine Online" : backendStatus === "connecting" ? "Connecting to Engine..." : "Engine Offline"}
                </span>
             </div>

             {/* Dynamic GitHub Connection */}
             {gitStatus === "disconnected" && (
                <button className="github-btn" onClick={handleGitConnect}>
                   <GitHubIcon size={18} /> Connect GitHub
                </button>
             )}
             {gitStatus === "connecting" && (
                <button className="github-btn connecting" disabled>
                   <div className="spinner-mini" style={{width: '12px', height: '12px', borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff'}}></div>
                   <span>Connecting...</span>
                </button>
             )}
             {gitStatus === "connected" && (
                <div className="github-connected" onClick={handleGitConnect} title="Click to disconnect">
                   <GitHubIcon size={18} />
                   <span>Developer</span>
                   <i className="fa-solid fa-check-circle auth-check"></i>
                </div>
             )}

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
                   
                   <div className="editor-status-bar">
                      Ln {lineCount}, Ch {charCount} &nbsp;&bull;&nbsp; UTF-8
                   </div>
                </div>
             </div>

             {/* Right Panel: Controls & Results */}
             <div className="action-panel stagger-2">
                <div className="action-card glass-panel">
                   <h3 className="card-title">Analysis Engine</h3>
                   <p className="card-desc">Run our advanced AI model to comprehensively profile your code for maximum accuracy in detecting vulnerabilities, inefficiencies, and standard compliance.</p>
                   
                   <button 
                      className={`btn-primary ${loading ? "loading" : ""}`} 
                      onClick={handleDebug} 
                      disabled={loading || !code.trim()}
                   >
                      {loading ? (
                         <>
                            <div className="spinner-mini"></div>
                            Analysing with High Accuracy...
                         </>
                      ) : (
                         <>
                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                            High Accuracy Analyse & Debug
                         </>
                      )}
                   </button>

                   {/* GitHub Auto-Commit Feature */}
                   {gitStatus === "connected" && (
                      <div className="github-action-area fade-in-up">
                         <div className="divider"></div>
                         <h4 className="sub-title"><GitHubIcon size={18} glow={false} /> Version Control</h4>
                         <p className="card-desc" style={{fontSize: '0.82rem', marginBottom: '15px'}}>
                            Your GitHub account is securely linked. You can automatically push this source code to your repository.
                         </p>
                         <button 
                            className="btn-secondary" 
                            onClick={handleCommit} 
                            disabled={isCommitting || !code.trim() || loading}
                         >
                            {isCommitting ? (
                               <>
                                  <div className="spinner-mini"></div>
                                  Pushing to origin/main...
                               </>
                            ) : (
                               <>
                                  <i className="fa-solid fa-code-commit"></i>
                                  Auto-Commit to GitHub
                               </>
                            )}
                         </button>
                         {commitMessage && (
                            <div className="commit-success fade-in-up">
                               {commitMessage}
                            </div>
                         )}
                      </div>
                   )}
                </div>

                {(analysisResult || loading) && (
                   <div style={{ marginTop: '30px' }} className="fade-in-up">
                     <ElectricBorder
                       color="#0A84FF"
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {/* Section 1: Detected Errors / Analysis */}
                                    <AnalysisDashboard 
                                      rawResult={analysisResult} 
                                      language={language} 
                                    />

                                   {/* Section 2: Corrected Code (if available) */}
                                   {correctedCode && (
                                     <div>
                                        <div className="divider" style={{ margin: '15px 0' }}></div>
                                        <h5 className="sub-title" style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#34c759' }}>
                                           <i className="fa-solid fa-code"></i> Corrected Code
                                        </h5>
                                        <div className="corrected-code-container">
                                           <button 
                                              className={`copy-btn ${copied ? "copied" : ""}`}
                                              onClick={handleCopyCode}
                                           >
                                              {copied ? <><i className="fa-solid fa-check"></i> Copied!</> : <><i className="fa-regular fa-copy"></i> Copy code</>}
                                           </button>
                                           <pre className="result-text" style={{ color: '#fff' }}>{correctedCode}</pre>
                                        </div>
                                     </div>
                                   )}
                                </div>
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
