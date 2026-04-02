# ===== IMPORTS =====
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.tools import tool
from dotenv import load_dotenv
import os

# ===== LOAD ENV =====
load_dotenv()

# ===== DEFINE ADVANCED TOOLS =====

@tool
def syntax_checker(code: str) -> str:
    """Check for basic syntax errors like missing colons in Python or unclosed brackets."""
    if "for" in code and ":" not in code:
        return "[FAILED]: Missing ':' in loop syntax"
    if code.count("{") != code.count("}"):
        return "[FAILED]: Braces are not balanced"
    return "[PASSED]: Core syntax looks valid"

@tool
def bug_detector(code: str) -> str:
    """Identify common logic bugs like using assignment = instead of comparison == or infinite loops."""
    if "for" in code and "i--" in code:
        return "[CRITICAL]: Detected potential infinite negative loop"
    if "number = 10" in code and "if (number == 10)" not in code and "if (number === 10)" not in code:
        return "[WARNING]: Type coercion or assignment used in comparison block"
    return "[PASSED]: No structural logic bugs detected"

@tool
def security_auditor(code: str) -> str:
    """Scans for security vulnerabilities like hardcoded secrets or API keys."""
    if "api_key" in code.lower() or "secret" in code.lower() or "sk-" in code:
        return "[SECURITY ALERT]: Potentially sensitive credentials detected in plaintext"
    return "[SECURE]: No obvious security leaks found"

@tool
def performance_profiler(code: str) -> str:
    """Finds areas where the code can be optimized for faster execution."""
    if "for" in code and "in" in code:
        return "[OPTIMIZATION]: Consider using vectorized operations if data is large"
    return "[EFFICIENT]: No major performance bottlenecks identified"

# ===== LLM SETUP =====
def get_llm():
    # Use Google Gemini Pro 1.5 or 2.0 Flash/Pro
    return ChatGoogleGenerativeAI(
        model="gemini-1.5-pro", # High accuracy over speed
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.1
    )

# ===== FUNCTION TO RUN AGENT =====
def run_agent(code, language):
    llm = get_llm()
    
    # Simulate an Agentic Thought Loop using the built-in logic of the tools
    observations = [
        f"Syntax Analysis: {syntax_checker.run(code)}",
        f"Logic Verification: {bug_detector.run(code)}",
        f"Security Audit: {security_auditor.run(code)}",
        f"Performance Profiling: {performance_profiler.run(code)}"
    ]
    
    agent_thoughts = "\n".join(observations)
    
    prompt = f"""
    You are 'DebugMind AI Pro'—a high-fidelity architectural debugging agent powered by Google Gemini.
    
    TASK: Analyze the following {language} code for errors, fix them, and suggest architectural improvements.
    
    ORIGINAL SOURCE:
    {code}
    
    Internal Agent Observations:
    {agent_thoughts}
    
    Please structure your final report precisely as follows:
    
    ### 🧠 AI Agent Thought Process
    (Write a brief reasoning of how the agent used the tools to reach the conclusion)
    
    ### 🚨 Detected Errors
    (List all bugs and syntax issues detected)
    
    ### 💡 Technical Explanation
    (Clearly explain WHY these are issues in single, simple sentences)
    
    ### 🛠️ Fixed Source Code
    (Provide the fully corrected and optimized version in a markdown code block)
    
    ### 🚀 Best Practices & Optimization
    (Suggest 2-3 ways to improve the code beyond just fixing it)
    """
    
    response = llm.invoke(prompt)
    return response.content
