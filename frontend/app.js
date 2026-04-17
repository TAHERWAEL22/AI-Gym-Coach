/* ════════════════════════════════════════════════════════════════
   AI GYM COACH — ARIA  |  app.js
   Three.js 3D Background · Onboarding · Chat · Profile Management
   ════════════════════════════════════════════════════════════════ */

"use strict";

// Local dev: frontend served from any local port talks to Flask on 5000
// Production: relative path (Flask serves the frontend itself)
const IS_LOCAL = (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
);
const API_BASE = IS_LOCAL ? "http://127.0.0.1:5000" : "";

/* ══════════════════════════════════════════════════════════════════
   THREE.JS — 3D ANIMATED BACKGROUND
   ══════════════════════════════════════════════════════════════════ */

(function initThreeJS() {
  const canvas   = document.getElementById("three-canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.z = 50;

  // ── Floating Orbs ───────────────────────────────────────────────
  const orbCount   = 14;
  const orbMeshes  = [];
  const orbSpeeds  = [];

  const orbColors  = [0xFF6B35, 0xFF8C5A, 0x39FF14, 0xFF6B35, 0x39FF14,
                      0xFF6B35, 0xFF3D00, 0x39FF14, 0xFF8C5A, 0xFF6B35,
                      0x39FF14, 0xFF6B35, 0xFF8C5A, 0x39FF14];

  for (let i = 0; i < orbCount; i++) {
    const radius   = Math.random() * 1.4 + 0.3;
    const geo      = new THREE.SphereGeometry(radius, 16, 16);
    const mat      = new THREE.MeshStandardMaterial({
      color:       orbColors[i],
      emissive:    orbColors[i],
      emissiveIntensity: 0.6,
      transparent: true,
      opacity:     Math.random() * 0.25 + 0.08,
      roughness:   0.4,
      metalness:   0.8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 90,
      (Math.random() - 0.5) * 70,
      (Math.random() - 0.5) * 40 - 10
    );
    orbSpeeds.push({
      x: (Math.random() - 0.5) * 0.006,
      y: (Math.random() - 0.5) * 0.005,
      rotX: (Math.random() - 0.5) * 0.008,
      rotY: (Math.random() - 0.5) * 0.008,
      phase: Math.random() * Math.PI * 2,
    });
    scene.add(mesh);
    orbMeshes.push(mesh);
  }

  // ── Particle Field ───────────────────────────────────────────────
  const particleCount = 500;
  const positions     = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 160;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 120;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80 - 20;
  }

  const partGeo = new THREE.BufferGeometry();
  partGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const partMat = new THREE.PointsMaterial({
    color:       0xFF6B35,
    size:        0.18,
    transparent: true,
    opacity:     0.35,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(partGeo, partMat);
  scene.add(particles);

  // ── Grid Floor ───────────────────────────────────────────────────
  const gridHelper = new THREE.GridHelper(140, 30, 0x1a1a1a, 0x111111);
  gridHelper.position.y = -30;
  gridHelper.rotation.x = Math.PI * 0.04;
  scene.add(gridHelper);

  // ── Lighting ──────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));

  const orange = new THREE.PointLight(0xFF6B35, 2.5, 80);
  orange.position.set(20, 20, 20);
  scene.add(orange);

  const neon = new THREE.PointLight(0x39FF14, 1.5, 70);
  neon.position.set(-25, -15, 15);
  scene.add(neon);

  // ── Mouse parallax ───────────────────────────────────────────────
  let mouseX = 0, mouseY = 0;
  document.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ── Resize ────────────────────────────────────────────────────────
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ── Animate ───────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let lastTime = 0;
  const fpsInterval = 1000 / 30; // Target 30 FPS for background animation

  function animate(currentTime) {
    requestAnimationFrame(animate);

    // Throttling to 30 FPS to save CPU
    const elapsed = currentTime - lastTime;
    if (elapsed < fpsInterval) return;
    lastTime = currentTime - (elapsed % fpsInterval);

    const t = clock.getElapsedTime();

    // Parallax camera sway
    camera.position.x += (mouseX * 4 - camera.position.x) * 0.03;
    camera.position.y += (-mouseY * 3 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);

    // Animate orbs
    orbMeshes.forEach((mesh, i) => {
      const s = orbSpeeds[i];
      mesh.position.x += s.x;
      mesh.position.y += s.y + Math.sin(t + s.phase) * 0.003;
      mesh.rotation.x += s.rotX;
      mesh.rotation.y += s.rotY;

      // Wrap around screen
      if (Math.abs(mesh.position.x) > 55) s.x *= -1;
      if (Math.abs(mesh.position.y) > 45) s.y *= -1;
    });

    // Rotate particles
    particles.rotation.y  = t * 0.012;
    particles.rotation.x  = t * 0.006;

    // Pulsing lights
    orange.intensity = 2 + Math.sin(t * 1.5) * 0.8;
    neon.intensity   = 1.2 + Math.cos(t * 1.2) * 0.5;

    renderer.render(scene, camera);
  }

  animate();
})();


/* ══════════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════════ */

let currentProfile   = null;
let selectedGoal     = "fit";
let editSelectedGoal = "fit";
let isLoading        = false;

/* ══════════════════════════════════════════════════════════════════
   DOM REFERENCES
   ══════════════════════════════════════════════════════════════════ */

const onboardingScreen = document.getElementById("onboarding-screen");
const chatScreen       = document.getElementById("chat-screen");
const chatMessages     = document.getElementById("chat-messages");
const chatInput        = document.getElementById("chat-input");
const sendBtn          = document.getElementById("send-btn");
const toast            = document.getElementById("toast");
const editModal        = document.getElementById("edit-modal");

/* ══════════════════════════════════════════════════════════════════
   INIT — Lucide Icons
   ══════════════════════════════════════════════════════════════════ */

lucide.createIcons();

/* ══════════════════════════════════════════════════════════════════
   OFFLINE / ERROR BANNER
   ══════════════════════════════════════════════════════════════════ */

function showOfflineBanner(message) {
  // Remove any existing banner
  const old = document.getElementById("offline-banner");
  if (old) old.remove();

  const banner = document.createElement("div");
  banner.id    = "offline-banner";
  banner.style.cssText = `
    position: fixed; inset: 0; z-index: 900;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: rgba(8,9,10,0.96);
    backdrop-filter: blur(16px);
    padding: 32px; text-align: center;
  `;
  banner.innerHTML = `
    <div style="font-size:52px; margin-bottom:20px; animation: floatOrb 3s ease-in-out infinite;">⚠️</div>
    <h2 style="font-size:22px; font-weight:800; color:#FF6B35; margin-bottom:12px;">
      Server Offline
    </h2>
    <p style="color:#9AA0AE; font-size:14px; max-width:420px; line-height:1.7; margin-bottom:28px;">
      ${message}
    </p>
    <div style="
      background: rgba(255,107,53,0.08);
      border: 1px solid rgba(255,107,53,0.25);
      border-radius: 12px; padding: 16px 24px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px; color: #FF8C5A; margin-bottom:28px;
    ">
      cd &quot;AI Gym Coach/backend&quot;<br>
      pip install flask flask-cors google-generativeai<br>
      python app.py
    </div>
    <button onclick="location.reload()" style="
      background: linear-gradient(135deg,#FF6B35,#E8530A);
      border:none; border-radius:12px;
      padding:12px 32px; color:#fff;
      font-family:'Outfit',sans-serif; font-size:15px; font-weight:700;
      cursor:pointer; box-shadow:0 4px 20px rgba(255,107,53,0.35);
    ">🔄 Retry Connection</button>
  `;
  document.body.appendChild(banner);
}

function hideOfflineBanner() {
  const b = document.getElementById("offline-banner");
  if (b) b.remove();
}

/* ══════════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ══════════════════════════════════════════════════════════════════ */

let toastTimer = null;

function showToast(msg, type = "default") {
  toast.textContent = msg;
  toast.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

/* ══════════════════════════════════════════════════════════════════
   SCREEN TRANSITIONS
   ══════════════════════════════════════════════════════════════════ */

function showChatScreen() {
  onboardingScreen.style.display = "none";
  chatScreen.style.display       = "flex";
  chatInput.focus();
  lucide.createIcons(); // re-render icons after DOM change
}

function showOnboarding() {
  chatScreen.style.display       = "none";
  onboardingScreen.style.display = "flex";
}

/* ══════════════════════════════════════════════════════════════════
   PROFILE HELPERS
   ══════════════════════════════════════════════════════════════════ */

function updateSidebarStats(profile) {
  const goalLabels = { bulk: "💪 BULK", cut: "🔥 CUT", fit: "⚡ FIT" };
  document.getElementById("stat-name").textContent   = profile.name || "—";
  document.getElementById("stat-age").textContent    = profile.age  ? `${profile.age} yrs` : "—";
  document.getElementById("stat-weight").textContent = profile.weight ? `${profile.weight} kg` : "—";
  document.getElementById("stat-height").textContent = profile.height ? `${profile.height} cm` : "—";
  document.getElementById("stat-goal").textContent   = goalLabels[profile.goal] || profile.goal || "—";
  document.getElementById("header-profile-name").textContent = profile.name || "Athlete";
  document.getElementById("welcome-name").textContent        = profile.name || "Champ";
}

/* ══════════════════════════════════════════════════════════════════
   API CALLS
   ══════════════════════════════════════════════════════════════════ */

async function fetchProfile() {
  try {
    const res  = await fetch(`${API_BASE}/api/profile`);
    const data = await res.json();
    return data.profile || null;
  } catch {
    return null;
  }
}

async function saveProfile(payload) {
  const res  = await fetch(`${API_BASE}/api/profile`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  return res.json();
}

async function fetchHistory() {
  try {
    const res  = await fetch(`${API_BASE}/api/history`);
    const data = await res.json();
    return data.history || [];
  } catch {
    return [];
  }
}

async function sendChatMessage(message) {
  const res  = await fetch(`${API_BASE}/api/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ message }),
  });
  return res.json();
}

async function clearChatHistory() {
  await fetch(`${API_BASE}/api/history`, { method: "DELETE" });
}

/* ══════════════════════════════════════════════════════════════════
   CHAT UI — MESSAGE RENDERING
   ══════════════════════════════════════════════════════════════════ */

function createMessageEl(role, content) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = role === "model" ? "🤖" : "👤";

  const msgContent = document.createElement("div");
  msgContent.className = "msg-content";

  const roleLabel = document.createElement("div");
  roleLabel.className = "msg-role";
  roleLabel.textContent = role === "model" ? "ARIA" : "You";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";

  if (role === "model") {
    // Render markdown for AI messages
    bubble.innerHTML = marked.parse(content, { breaks: true, gfm: true });
    // Make external links open in new tab
    bubble.querySelectorAll("a").forEach(a => {
      a.target = "_blank";
      a.rel    = "noopener noreferrer";
    });
  } else {
    // Plain text for user messages
    bubble.textContent = content;
  }

  msgContent.appendChild(roleLabel);
  msgContent.appendChild(bubble);

  wrapper.appendChild(avatar);
  wrapper.appendChild(msgContent);

  return wrapper;
}

function appendMessage(role, content) {
  // Re-query each time to avoid stale reference after removal
  const banner = document.getElementById("welcome-banner");
  if (banner) banner.remove();

  const el = createMessageEl(role, content);
  chatMessages.appendChild(el);
  scrollToBottom();
  return el;
}


function showTypingIndicator() {
  const wrapper = document.createElement("div");
  wrapper.className = "message model";
  wrapper.id        = "typing-indicator";

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = "🤖";

  const indicator = document.createElement("div");
  indicator.className = "typing-indicator";
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("div");
    dot.className = "typing-dot";
    indicator.appendChild(dot);
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(indicator);
  chatMessages.appendChild(wrapper);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/* ══════════════════════════════════════════════════════════════════
   CHAT — SEND MESSAGE
   ══════════════════════════════════════════════════════════════════ */

async function handleSend() {
  const message = chatInput.value.trim();
  if (!message || isLoading) return;

  isLoading         = true;
  sendBtn.disabled  = true;
  chatInput.value   = "";
  autoResizeTextarea();

  appendMessage("user", message);
  showTypingIndicator();

  try {
    const data = await sendChatMessage(message);

    removeTypingIndicator();

    if (data.success) {
      appendMessage("model", data.reply);

      // If AI detected a weight update, refresh sidebar stats
      if (data.weight_update !== null && data.weight_update !== undefined) {
        currentProfile = await fetchProfile();
        if (currentProfile) updateSidebarStats(currentProfile);
        showToast(`✅ Weight updated to ${data.weight_update} kg!`, "success");
      }
    } else {
      appendMessage("model", `⚠️ **Error:** ${data.error || "Something went wrong. Please try again."}`);
    }
  } catch (err) {
    removeTypingIndicator();
    appendMessage("model", "⚠️ **Connection error.** Make sure the backend server is running on port 5000.");
    console.error("Chat error:", err);
  } finally {
    isLoading        = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

/* ══════════════════════════════════════════════════════════════════
   CHAT INPUT — AUTO-RESIZE & KEYBOARD
   ══════════════════════════════════════════════════════════════════ */

function autoResizeTextarea() {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
}

chatInput.addEventListener("input", autoResizeTextarea);

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

sendBtn.addEventListener("click", handleSend);

/* ══════════════════════════════════════════════════════════════════
   QUICK PROMPT CHIPS
   ══════════════════════════════════════════════════════════════════ */

document.querySelectorAll(".quick-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const prompt = chip.dataset.prompt;
    if (!prompt || isLoading) return;
    chatInput.value = prompt;
    autoResizeTextarea();
    handleSend();
  });
});

/* ══════════════════════════════════════════════════════════════════
   CLEAR CHAT
   ══════════════════════════════════════════════════════════════════ */

document.getElementById("clear-chat-btn").addEventListener("click", async () => {
  if (!confirm("Clear all chat history? This cannot be undone.")) return;
  await clearChatHistory();
  chatMessages.innerHTML = "";
  // Re-add welcome banner
  const banner = document.createElement("div");
  banner.className = "welcome-banner";
  banner.id        = "welcome-banner";
  banner.innerHTML = `
    <div class="welcome-orb">🤖</div>
    <div class="welcome-heading">
      Hey <span>${currentProfile?.name || "Champ"}</span>, I'm ARIA!
    </div>
    <p class="welcome-text">
      Chat cleared. Ready for a fresh start! Ask me anything about your training or nutrition. 💪
    </p>
  `;
  chatMessages.appendChild(banner);
  showToast("🗑️ Chat history cleared.", "success");
});

/* ══════════════════════════════════════════════════════════════════
   GOAL SELECTOR (ONBOARDING)
   ══════════════════════════════════════════════════════════════════ */

function setupGoalSelector(selectorId, onSelect) {
  const selector = document.getElementById(selectorId);
  if (!selector) return;

  selector.querySelectorAll(".goal-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      selector.querySelectorAll(".goal-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      onSelect(btn.dataset.goal);
    });
  });
}

setupGoalSelector("goal-selector",      (g) => { selectedGoal     = g; });
setupGoalSelector("edit-goal-selector", (g) => { editSelectedGoal = g; });

/* ══════════════════════════════════════════════════════════════════
   ONBOARDING FORM — SUBMIT
   ══════════════════════════════════════════════════════════════════ */

document.getElementById("onboarding-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name   = document.getElementById("input-name").value.trim();
  const age    = parseInt(document.getElementById("input-age").value,    10);
  const weight = parseFloat(document.getElementById("input-weight").value);
  const height = parseFloat(document.getElementById("input-height").value);

  if (!name) {
    showToast("⚠️ Please enter your name.", "error"); return;
  }
  if (!age || age < 13 || age > 100) {
    showToast("⚠️ Please enter a valid age (13–100).", "error"); return;
  }
  if (!weight || weight < 30) {
    showToast("⚠️ Please enter a valid weight.", "error"); return;
  }
  if (!height || height < 100) {
    showToast("⚠️ Please enter a valid height.", "error"); return;
  }

  const submitBtn  = document.getElementById("onboarding-submit");
  const submitText = document.getElementById("submit-text");
  submitBtn.disabled = true;
  submitText.textContent = "Activating...";

  try {
    const result = await saveProfile({ name, age, height, weight, goal: selectedGoal });

    if (result.success) {
      currentProfile = { name, age, height, weight, goal: selectedGoal };
      updateSidebarStats(currentProfile);

      // Transition to chat screen
      showChatScreen();

      // Load and render previous history
      await loadHistory();

      showToast(`🚀 Welcome aboard, ${name}! ARIA is ready.`, "success");
    } else {
      showToast(`❌ ${result.error || "Failed to save profile."}`, "error");
    }
  } catch (err) {
    showToast("❌ Cannot connect to server. Is Flask running?", "error");
    console.error("Onboarding error:", err);
  } finally {
    submitBtn.disabled     = false;
    submitText.textContent = "Activate ARIA";
  }
});

/* ══════════════════════════════════════════════════════════════════
   LOAD & RENDER CHAT HISTORY
   ══════════════════════════════════════════════════════════════════ */

async function loadHistory() {
  const history = await fetchHistory();
  if (history.length === 0) return;

  // Remove welcome banner if there's actual history
  const banner = document.getElementById("welcome-banner");
  if (banner) banner.remove();

  history.forEach(msg => {
    const el = createMessageEl(msg.role, msg.content);
    chatMessages.appendChild(el);
  });

  scrollToBottom();
}

/* ══════════════════════════════════════════════════════════════════
   EDIT PROFILE MODAL
   ══════════════════════════════════════════════════════════════════ */

function openEditModal() {
  if (!currentProfile) return;

  // Prefill form
  document.getElementById("edit-name").value   = currentProfile.name   || "";
  document.getElementById("edit-age").value    = currentProfile.age    || "";
  document.getElementById("edit-weight").value = currentProfile.weight || "";
  document.getElementById("edit-height").value = currentProfile.height || "";

  editSelectedGoal = currentProfile.goal || "fit";

  // Set active goal button
  const editSelector = document.getElementById("edit-goal-selector");
  editSelector.querySelectorAll(".goal-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.goal === editSelectedGoal);
  });

  editModal.classList.add("open");
}

function closeEditModal() {
  editModal.classList.remove("open");
}

document.getElementById("edit-profile-btn").addEventListener("click", openEditModal);
document.getElementById("modal-close").addEventListener("click", closeEditModal);
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal();
});

document.getElementById("edit-profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name   = document.getElementById("edit-name").value.trim();
  const age    = parseInt(document.getElementById("edit-age").value,    10);
  const weight = parseFloat(document.getElementById("edit-weight").value);
  const height = parseFloat(document.getElementById("edit-height").value);

  if (!name || !age || !weight || !height) {
    showToast("⚠️ Please fill all fields.", "error"); return;
  }

  try {
    const result = await saveProfile({ name, age, height, weight, goal: editSelectedGoal });

    if (result.success) {
      currentProfile = { name, age, height, weight, goal: editSelectedGoal };
      updateSidebarStats(currentProfile);
      closeEditModal();
      showToast("✅ Profile updated!", "success");
    } else {
      showToast(`❌ ${result.error}`, "error");
    }
  } catch {
    showToast("❌ Connection error.", "error");
  }
});

/* ══════════════════════════════════════════════════════════════════
   APP INIT — Ping server, then route to onboarding or chat
   ══════════════════════════════════════════════════════════════════ */

(async function init() {
  // ── 1. Ping health-check endpoint ─────────────────────────────
  try {
    // Increased timeout for Vercel cold starts (8 seconds)
    const ping = await fetch(`${API_BASE}/api/status`, { signal: AbortSignal.timeout(8000) });
    if (!ping.ok) throw new Error("Non-OK status");
    hideOfflineBanner();
  } catch {
    showOfflineBanner(
      "The AI backend is currently unavailable. "
      + "If this is a fresh deployment, please wait a moment for the server to wake up."
    );
    return;
  }

  // ── 2. Load profile & route to correct screen ─────────────────
  try {
    const profile = await fetchProfile();

    if (profile) {
      // Returning user — skip onboarding, go straight to chat
      currentProfile = profile;
      updateSidebarStats(profile);
      showChatScreen();
      await loadHistory();
    } else {
      // New user — show onboarding form
      showOnboarding();
    }
  } catch (err) {
    console.error("Init error:", err);
    showOnboarding(); // Graceful fallback
  }
})();
