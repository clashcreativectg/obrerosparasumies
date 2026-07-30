// 1. Importaciones oficiales desde el CDN de Firebase (versión 10.11.0)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// 2. CONFIGURACIÓN DE TU PROYECTO FIREBASE
// REEMPLAZA estos datos de ejemplo por los valores reales de tu proyecto (los encuentras en tu firebase-config.js anterior)
const firebaseConfig = {
  apiKey: "AIzaSyAN1JxitWiiw9Az7hgo-N-tl_w52Jra87U",
  authDomain: "cristianosenaccion-71a36.firebaseapp.com",
  projectId: "cristianosenaccion-71a36",
  storageBucket: "cristianosenaccion-71a36.firebasestorage.app",
  messagingSenderId: "254538909726",
  appId: "1:254538909726:web:6c3209d9153c602da6460f"
};

// 3. Inicialización controlada e interna de Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Capturamos el contenedor de la grilla de videos en el HTML
const firebaseGrid = document.querySelector(".firebase-grid");

// Convierte cualquier enlace de YouTube al formato embed
function getYoutubeEmbed(url) {
  try {
    const u = new URL(url);

    // https://youtu.be/xxxxx
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.substring(1)}`;
    }

    // https://www.youtube.com/watch?v=xxxxx
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }
    }

    return url;
  } catch (e) {
    return url;
  }
}

if (firebaseGrid) {
  try {
    // Consulta para ordenar los videos de forma cronológica descendente
    const q = query(collection(db, "multimedia"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
      firebaseGrid.innerHTML = ""; // Limpiamos el cargador circular/spinner interno

      if (snapshot.empty) {
        firebaseGrid.innerHTML = `
          <div class="empty" style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
            <div style="font-size: 4rem; color: rgba(240,74,0,0.3); margin-bottom: 16px;"><i class="fas fa-film"></i></div>
            <h3 style="color: #fff; font-family:'Montserrat', sans-serif; font-size: 1.5rem;">Próximamente más transmisiones</h3>
            <p style="color: var(--text-muted); margin-top: 8px; font-size: 1rem;">Estamos preparando nuevas predicaciones para edificación de la iglesia.</p>
          </div>
        `;
        return;
      }

      let delay = 50;
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Creamos la tarjeta responsiva con efecto tridimensional
        const mediaCard = document.createElement("div");
        mediaCard.className = "media-card reveal-item is-visible"; 
        mediaCard.style.animationDelay = `${delay}ms`;

        // Evaluamos si es un enlace embebido de YouTube o video directo de Cloudinary
        let mediaHtml = "";
        if (data.type === "youtube") {
  mediaHtml = `<iframe class="media-card__video"
      src="${getYoutubeEmbed(data.url)}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      style="width:100%; height:100%; border:none; display:block;"></iframe>`;
}
        // Formateo seguro de marcas de tiempo de Firebase
        let fechaFormateada = "Reciente";
        if (data.createdAt) {
          const dateObj = data.createdAt.seconds ? new Date(data.createdAt.seconds * 1000) : new Date(data.createdAt);
          fechaFormateada = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        }

        // Construcción limpia de la interfaz con los estilos premium de streaming
        mediaCard.innerHTML = `
          <div class="media-card__wrapper">
            ${mediaHtml}
          </div>
          <div class="media-card__body">
            <div class="media-card__meta">
              <span class="media-card__date">
                <i class="far fa-calendar-alt"></i> ${fechaFormateada}
              </span>
              <span class="media-card__tag">
                <i class="${data.type === 'youtube' ? 'fab fa-youtube' : 'fas fa-play-circle'}"></i> ${data.type === 'youtube' ? 'YouTube' : 'Video'}
              </span>
            </div>
            <h3 class="media-card__title">${data.title || "Mensaje de Bendición"}</h3>
          </div>
        `;

        firebaseGrid.appendChild(mediaCard);
        delay += 60; // Desfase progresivo para la animación de entrada
      });
    }, (error) => {
      console.error("Error en tiempo real de Firestore: ", error);
      firebaseGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--primary);">
          <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; margin-bottom: 10px;"></i>
          <p>Error de conexión: Permisos insuficientes o base de datos inactiva.</p>
        </div>`;
    });

  } catch (err) {
    console.error("Fallo crítico en el script multimedia:", err);
  }
}
