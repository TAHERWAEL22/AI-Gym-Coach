import os
import sys

# ── Path Setup (Vercel-safe, no os.chdir) ─────────────────────────────────────
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# ── Environment Setup ─────────────────────────────────────────────────────────
# Load .env locally; on Vercel the key comes from the dashboard env vars
if not os.environ.get("VERCEL"):
    env_path = os.path.join(BACKEND_DIR, ".env")
    if os.path.exists(env_path):
        load_dotenv(dotenv_path=env_path, override=True)

# ── Startup Key Validation ────────────────────────────────────────────────────
if not os.environ.get("GEMINI_API_KEY"):
    print("WARNING: GEMINI_API_KEY is not set. Chat will not work.")
else:
    print("GEMINI_API_KEY detected.")

from database import (
    init_db, get_user_profile, save_user_profile,
    update_user_weight, save_message, get_chat_history, clear_history
)
from ai_engine import chat, extract_weight_update, clean_response

# ── App Configuration ────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(BACKEND_DIR)
FRONTEND = os.path.join(BASE_DIR, "frontend")

app = Flask(__name__, static_folder=FRONTEND, static_url_path="")

# Allow all origins — Vercel serves frontend & backend on the same domain,
# local dev hits from localhost ports. "*" covers both cleanly.
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize database tables on startup
init_db()


# ── Favicon Support ──────────────────────────────────────────────────────────

@app.route("/favicon.ico")
def favicon():
    """Handle favicon requests to prevent 404 errors."""
    return "", 204


# ── Frontend Routes ──────────────────────────────────────────────────────────

@app.route("/")
def index():
    """Serve the main frontend application."""
    return send_from_directory(FRONTEND, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    """Serve static assets from the frontend directory."""
    return send_from_directory(FRONTEND, path)


# ── API Endpoints ────────────────────────────────────────────────────────────

@app.route("/api/status", methods=["GET"])
def status():
    """Health check endpoint."""
    return jsonify({"online": True, "app": "AI Gym Coach", "version": "1.0.0"})


@app.route("/api/profile", methods=["GET"])
def get_profile():
    """Retrieve the current user's profile."""
    profile = get_user_profile()
    if profile:
        return jsonify({"success": True, "profile": profile})
    return jsonify({"success": False, "profile": None}), 200


@app.route("/api/profile", methods=["POST"])
def set_profile():
    """Create or update the user's profile."""
    data = request.get_json(force=True)
    required = ["name", "age", "height", "weight", "goal"]
    missing = [f for f in required if f not in data]
    
    if missing:
        return jsonify({"success": False, "error": f"Missing fields: {missing}"}), 400

    goal = str(data["goal"]).lower()
    if goal not in ("bulk", "cut", "fit"):
        return jsonify({"success": False, "error": "goal must be bulk | cut | fit"}), 400

    try:
        save_user_profile(
            name=str(data["name"]),
            age=int(data["age"]),
            height=float(data["height"]),
            weight=float(data["weight"]),
            goal=goal,
        )
        return jsonify({"success": True, "message": "Profile saved!"}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/chat", methods=["POST"])
def chat_endpoint():
    """Process a chat message and return the AI response."""
    data = request.get_json(force=True)
    user_message = data.get("message", "").strip()
    
    if not user_message:
        return jsonify({"success": False, "error": "Empty message"}), 400

    profile = get_user_profile()
    history = get_chat_history(limit=20)

    try:
        result = chat(user_message, profile, history)
        if not result.get("success"):
            raise RuntimeError(result.get("response", "Unknown Gemini error"))

        raw_response = str(result.get("response", ""))
        weight_update = extract_weight_update(raw_response)
        reply = clean_response(raw_response)

        # Persist conversation history
        save_message("user", user_message)
        save_message("model", reply)

        # Handle weight update if detected by the AI
        if weight_update is not None and profile:
            update_user_weight(weight_update)

        return jsonify({
            "success": True,
            "reply": reply,
            "weight_update": weight_update,
        })
    except Exception as e:
        # Log the real error to terminal for debugging
        import traceback
        traceback.print_exc()
        # Return 200 so the frontend can display the error message instead of crashing
        return jsonify({
            "success": False,
            "error": str(e),
            "reply": str(e),
            "weight_update": None,
        }), 200


@app.route("/api/history", methods=["GET"])
def history_endpoint():
    """Retrieve chat history."""
    history = get_chat_history(limit=50)
    return jsonify({"success": True, "history": history})


@app.route("/api/history", methods=["DELETE"])
def clear_history_endpoint():
    """Clear all chat history."""
    clear_history()
    return jsonify({"success": True, "message": "History cleared."})


# ── Application Entry Point ──────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\nAI Gym Coach - ARIA is online!")
    print(f"URL: http://127.0.0.1:{port}\n")
    app.run(host="127.0.0.1", port=port, debug=True)
