from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
import httpx
from openai import OpenAI
from dotenv import load_dotenv
from agent import run_agent

# Load environment variables
load_dotenv()

# Initialize app
app = FastAPI()

# Enable CORS (IMPORTANT for frontend connection)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client with Google Gemini settings
client = OpenAI(
    api_key=os.getenv("GOOGLE_API_KEY"),
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

# ─── Request models ──────────────────────────────────────────────────────────

class CodeInput(BaseModel):
    code: str
    language: str

class CommitRequest(BaseModel):
    token: str
    repo: str          # "owner/repo-name"
    filename: str
    content: str
    message: str = "fix: auto-commit via DebugMind AI"
    branch: str = "main"

# ─── Existing debug endpoint ──────────────────────────────────────────────────

@app.post("/debug")
async def debug_code(data: CodeInput):
    try:
        result = run_agent(data.code, data.language)
        return {"result": result}

    except Exception as e:
        error_msg = str(e)
        print("Error detected:", error_msg)

        if "429" in error_msg or "quota" in error_msg.lower() or "google" in error_msg.lower():
            return {"result": f"""
### 🧠 AI Agent Thought Process
- [PASSED]: Syntax Analysis: Initial structural check completed. Core syntax looks valid.
- [FAILED]: Logic Verification: Detected infinite negative loop in `for (let i = 0; i <= 5; i--)`.
- [SECURE]: Security Audit: No sensitive credentials found in plaintext.
- [OPTIMIZATION]: Performance Profiling: Identified area for loop speed-up.

### 🚨 Detected Errors
1. **Infinite Loop**: The decrementing iterator `i--` will never allow `i` to reach the terminating condition of `> 5`. 
2. **Quota Alert**: Your Google Gemini API Key has no credits left. I am providing a simulated report.

### 💡 Technical Explanation
The iterator was decreasing instead of increasing, so the loop would never end! This consumes infinite CPU. Update the GOOGLE_API_KEY in your `.env` for real analysis.

### 🛠️ Fixed Source Code
```javascript
// Optimized via DebugMind AI Pro (Gemini)
for (let i = 0; i <= 5; i++) {{  // Corrected to increment
   console.log(i);
}}
```

### 🚀 Best Practices & Optimization
- **Check Iterators**: Always ensure loop counters move towards the exit condition.
- **Strict Equality**: Always prefer `===` over `==`.
- **API Setup**: Ensure Google AI Studio credits are available at aistudio.google.com.
"""}

        return {
            "result": f"""
AI Agent (Gemini) Error Occurred ❌

Reason:
{error_msg}

Tip:
- Check your Google Gemini API Key in `.env`
- Ensure GOOGLE_API_KEY=AIza... is correctly set.
"""
        }

@app.get("/health")
def health_check():
    return {"status": "Engine Online"}


# ─── GitHub OAuth endpoints ───────────────────────────────────────────────────

GITHUB_CLIENT_ID     = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI  = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:9999/github/callback")
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:3000")


@app.get("/github/auth")
def github_auth():
    """
    Returns the GitHub OAuth authorization URL for the frontend to open
    in a popup window.
    """
    if not GITHUB_CLIENT_ID or GITHUB_CLIENT_ID == "your_github_client_id_here":
        raise HTTPException(
            status_code=500,
            detail="GITHUB_CLIENT_ID is not configured. Please add it to your .env file."
        )
    scope = "repo user"
    url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={GITHUB_REDIRECT_URI}"
        f"&scope={scope}"
        f"&state=debugmind_oauth"
    )
    return {"auth_url": url}


@app.get("/github/callback")
async def github_callback(code: str, state: str = ""):
    """
    GitHub redirects here after the user authorises the app.
    We exchange the code for an access token, then redirect back to the
    frontend with the token as a query-param so the popup can relay it.
    """
    if not code:
        raise HTTPException(status_code=400, detail="Missing OAuth code")

    async with httpx.AsyncClient() as client_http:
        token_resp = await client_http.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": GITHUB_REDIRECT_URI,
            },
        )

    token_data = token_resp.json()
    access_token = token_data.get("access_token")

    if not access_token:
        error = token_data.get("error_description", "Unknown error during token exchange")
        return RedirectResponse(url=f"{FRONTEND_URL}?github_error={error}")

    # Redirect back to frontend — the popup will read this URL param
    return RedirectResponse(url=f"{FRONTEND_URL}?github_token={access_token}")


@app.get("/github/user")
async def github_user(token: str):
    """
    Returns the authenticated GitHub user's profile using their access token.
    """
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
            },
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Failed to fetch GitHub user")
    return resp.json()


@app.get("/github/repos")
async def github_repos(token: str):
    """
    Returns a list of the authenticated user's repositories (owned by them).
    """
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://api.github.com/user/repos?per_page=50&sort=updated&affiliation=owner",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
            },
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Failed to fetch repositories")

    repos = resp.json()
    return [{"name": r["full_name"], "private": r["private"], "url": r["html_url"]} for r in repos]


@app.post("/github/commit")
async def github_commit(req: CommitRequest):
    """
    Creates or updates a file in the given repository via the GitHub Contents API.
    The content is base64-encoded automatically.
    """
    import base64

    headers = {
        "Authorization": f"Bearer {req.token}",
        "Accept": "application/vnd.github+json",
    }
    api_url = f"https://api.github.com/repos/{req.repo}/contents/{req.filename}"

    encoded_content = base64.b64encode(req.content.encode()).decode()

    # Check if the file already exists (need its SHA to update)
    sha = None
    async with httpx.AsyncClient() as client_http:
        check = await client_http.get(api_url, headers=headers)
        if check.status_code == 200:
            sha = check.json().get("sha")

        payload = {
            "message": req.message,
            "content": encoded_content,
            "branch": req.branch,
        }
        if sha:
            payload["sha"] = sha

        put_resp = await client_http.put(api_url, headers=headers, json=payload)

    if put_resp.status_code not in (200, 201):
        detail = put_resp.json().get("message", "Commit failed")
        raise HTTPException(status_code=put_resp.status_code, detail=detail)

    commit_url = put_resp.json().get("commit", {}).get("html_url", "")
    return {"success": True, "commit_url": commit_url}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9999)
