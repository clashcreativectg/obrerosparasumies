const fab = document.getElementById("aiFab");
const chat = document.getElementById("aiChat");
const closeBtn = document.getElementById("aiClose");
const form = document.getElementById("aiForm");
const input = document.getElementById("aiInput");
const body = document.getElementById("aiBody");

function openChat() {
  chat.classList.add("is-open");
  chat.setAttribute("aria-hidden", "false");
  setTimeout(() => input?.focus(), 50);
}
function closeChat() {
  chat.classList.remove("is-open");
  chat.setAttribute("aria-hidden", "true");
}

fab?.addEventListener("click", openChat);
closeBtn?.addEventListener("click", closeChat);

function addMsg(text, who = "bot") {
  const wrap = document.createElement("div");
  wrap.className = `ai-msg ai-msg--${who === "me" ? "me" : "bot"}`;

  const bubble = document.createElement("div");
  bubble.className = "ai-bubble";
  bubble.textContent = text;

  wrap.appendChild(bubble);
  body.appendChild(wrap);
  body.scrollTop = body.scrollHeight;
}

async function askAI(message) {
  const res = await fetch("/api/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Error consultando IA");
  return data.reply || "";
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = (input.value || "").trim();
  if (!msg) return;

  input.value = "";
  addMsg(msg, "me");
  addMsg("Pensando...", "bot");
  const thinking = body.lastElementChild;

  try {
    const reply = await askAI(msg);
    thinking.querySelector(".ai-bubble").textContent = reply;
  } catch (err) {
    thinking.querySelector(".ai-bubble").textContent =
      "Ups… hubo un problema. Intenta de nuevo.";
    console.error(err);
  }
});