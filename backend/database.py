import sqlite3
import os

# For Vercel deployment, the filesystem is read-only except for /tmp.
# We move the database to /tmp if we are in a serverless environment.
if os.environ.get("VERCEL"):
    DB_PATH = "/tmp/gym_coach.db"
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), "gym_coach.db")


def get_connection():
    """Establish a connection to the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the database tables if they do not exist."""
    conn = get_connection()
    cursor = conn.cursor()

    # User Profile table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT DEFAULT 'Athlete',
            age INTEGER,
            height REAL,
            weight REAL,
            goal TEXT CHECK(goal IN ('bulk', 'cut', 'fit')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Chat History table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT CHECK(role IN ('user', 'model')),
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


# ── User Profile Operations ──────────────────────────────────────────────────

def get_user_profile():
    """Retrieve the most recent user profile."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_profile ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def save_user_profile(name: str, age: int, height: float, weight: float, goal: str):
    """Save or update the user profile."""
    conn = get_connection()
    cursor = conn.cursor()

    existing = get_user_profile()
    if existing:
        cursor.execute("""
            UPDATE user_profile
            SET name = ?, age = ?, height = ?, weight = ?, goal = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (name, age, height, weight, goal, existing["id"]))
    else:
        cursor.execute("""
            INSERT INTO user_profile (name, age, height, weight, goal)
            VALUES (?, ?, ?, ?, ?)
        """, (name, age, height, weight, goal))

    conn.commit()
    conn.close()


def update_user_weight(new_weight: float):
    """Update the weight field in the current user profile."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE user_profile
        SET weight = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT id FROM user_profile ORDER BY id DESC LIMIT 1)
    """, (new_weight,))
    conn.commit()
    conn.close()


# ── Chat History Operations ──────────────────────────────────────────────────

def save_message(role: str, content: str):
    """Persist a chat message to the history."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO chat_history (role, content) VALUES (?, ?)",
        (role, content)
    )
    conn.commit()
    conn.close()


def get_chat_history(limit: int = 30):
    """Retrieve the most recent chat history messages."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT role, content FROM chat_history ORDER BY id DESC LIMIT ?",
        (limit,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in reversed(rows)]


def clear_history():
    """Clear all messages from the chat history."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM chat_history")
    conn.commit()
    conn.close()
