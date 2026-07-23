// Reemplaza el encabezado de admin-eventos.js con esto:
import { 
  db, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp 
} from "./firebase-config.js";

/* ================= CLOUDINARY ================= */

const CLOUD_NAME = "dwap3udvq";
const UPLOAD_PRESET = "galeria_publica"; // el mismo preset que usas para la galería

async function uploadImageCloudinary(file){

    const form = new FormData();

    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);
    form.append("folder","eventos");

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
            method:"POST",
            body:form
        }
    );

    const data = await res.json();

    if(!res.ok){
        throw new Error(data.error?.message || "Error subiendo imagen");
    }

    return data.secure_url;
}

const $ = (id) => document.getElementById(id);

function showStatus(msg, type="ok"){
  const el = $("evStatus");
  if (el) el.textContent = msg;
  if (window.showToast) window.showToast(msg, type);
  setTimeout(()=>{ if(el) el.textContent=""; }, 2200);
}

function escapeHtml(s="") {
  return s.replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function renderEmpty(grid){
  grid.innerHTML = `
    <div class="empty">
      <div class="empty__icon">📅</div>
      <div class="empty__title">No hay eventos todavía</div>
      <div class="empty__text">Crea tu primer evento para verlo aquí.</div>
    </div>
  `;
}

async function addEvent() {

    const title = $("evTitle")?.value.trim();
    const date  = $("evDate")?.value;
    const time  = $("evTime")?.value.trim();
    const place = $("evPlace")?.value.trim();
    const desc  = $("evDesc")?.value.trim();
    const link  = $("evLink")?.value.trim() || "#";

    const imageFile = $("evImage")?.files[0];

    if (!title || !date) {
        showStatus("⚠️ Título y fecha son obligatorios.", "err");
        return;
    }

    let image = "";

    try {

        // Subir imagen a Cloudinary
        if (imageFile) {
            showStatus("Subiendo imagen...");
            image = await uploadImageCloudinary(imageFile);
        }

        // Guardar evento en Firestore
        await addDoc(collection(db, "events"), {
            title,
            date,
            time,
            place,
            desc,
            link,
            image,
            createdAt: serverTimestamp()
        });

        // Limpiar formulario
        [
            "evTitle",
            "evDate",
            "evTime",
            "evPlace",
            "evDesc",
            "evLink",
            "evImage"
        ].forEach(id => {
            const el = $(id);
            if (el) el.value = "";
        });

        showStatus("✅ Evento publicado");

    } catch (e) {

        console.error(e);
        showStatus("❌ " + (e.message || "Error al publicar el evento"), "err");

    }

}
  

function listenEvents(){
  const grid = $("events-grid_admin");
  const chip = $("evCountChip");
  if(!grid) return;

  const q = query(collection(db,"events"), orderBy("date","asc"));
  onSnapshot(q, (snap)=>{
    if(chip) chip.textContent = `${snap.size} eventos`;

    if(snap.empty){
      renderEmpty(grid);
      return;
    }

    grid.innerHTML = "";
    snap.forEach(d=>{
      const e = d.data();

      const card = document.createElement("div");
      card.className = "card";
      card.style.padding = "14px";
      card.style.borderRadius = "14px";
      card.style.border = "1px solid rgba(0,0,0,.08)";
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
          <div>
            <div style="font-weight:900; margin-bottom:6px;">${escapeHtml(e.title || "")}</div>
            <div style="opacity:.85; font-weight:700;">
              📅 ${escapeHtml(e.date || "--")} · ⏰ ${escapeHtml(e.time || "--")} · 📍 ${escapeHtml(e.place || "--")}
            </div>
            <div style="opacity:.85; margin-top:8px; line-height:1.35;">
              ${escapeHtml(e.desc || "")}
            </div>
            ${e.link ? `<div style="margin-top:8px; opacity:.85;">🔗 ${escapeHtml(e.link)}</div>` : ``}
          </div>
          <button class="btn btn--ghost" data-del="${d.id}" title="Eliminar">🗑️</button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll("[data-del]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        try{
          await deleteDoc(doc(db,"events",btn.dataset.del));
          showStatus("🗑️ Evento eliminado.", "ok");
        }catch(e){
          console.error(e);
          showStatus("❌ Error eliminando evento.", "err");
        }
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("evAddBtn")?.addEventListener("click", addEvent);
  listenEvents();

});
