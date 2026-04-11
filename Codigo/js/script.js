const contenedor = document.getElementById('contenedorCiudades');
const slider = document.getElementById('rangoPresupuesto');
const etiquetaPrecio = document.getElementById('valorPresupuesto');
const selectorAmbiente = document.getElementById('selectAmbiente');
const inputBusqueda = document.getElementById('inputBusqueda');
const btnBuscar = document.getElementById('btnBuscar');

const API_BASE = 'http://localhost:3000';
let ciudades = [];
let userFavoritasIds = [];

async function cargarDatos() {
    try {
        const userInfo = JSON.parse(localStorage.getItem('usuarioInfo'));
        
        // 1. Cargar ciudades
        const r = await fetch(`${API_BASE}/api/ciudades`);
        ciudades = await r.json();

        // 2. Si hay usuario, cargar sus favoritos para marcar los corazones
        if (userInfo) {
            const resU = await fetch(`${API_BASE}/api/usuarios/${userInfo.id}`);
            const userFull = await resU.json();
            userFavoritasIds = (userFull.ciudadesFavoritas || []).map(f => f._id || f);
            
            // Mostrar bienvenida personalizada
            const heroH2 = document.querySelector('#hero h2');
            if (heroH2) heroH2.innerText = `👋 ¡Hola ${userInfo.nombre}! Tu próximo destino te espera`;
        }

        aplicarFiltros();
    } catch (e) {
        console.error('Error cargando ciudades:', e);
        contenedor.innerHTML = '<p style="text-align:center;padding:40px;">Error al cargar datos. Asegúrate de que el servidor está encendido (<code>node server.js</code>).</p>';
    }
}

function obtenerImagenCiudad(ciudad) {
    return ciudad.imagen || `https://source.unsplash.com/400x300/?${encodeURIComponent(ciudad.nombre)},city`;
}

function renderizarCiudades(datos) {
    if (datos.length === 0) {
        contenedor.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <h3 style="color: var(--text-muted);">No se encontraron ciudades con estos filtros.</h3>
            </div>`;
        return;
    }

    contenedor.innerHTML = datos.map(c => {
        const isFav = userFavoritasIds.includes(c._id);
        return `
            <article class="card" style="cursor: pointer;" onclick="window.location.href='detalle.html?id=${c._id}'">
                <button class="fav-btn ${isFav ? 'active' : ''}" 
                        onclick="event.stopPropagation(); toggleFavoritoRapido('${c._id}')" 
                        title="${isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}">
                    ${isFav ? '❤️' : '🤍'}
                </button>
                <div class="card-img-placeholder" style="background-image: url('${obtenerImagenCiudad(c)}')"></div>
                <div class="card-content">
                    <h3>${c.nombre}</h3>
                    <div class="card-info">
                        <span class="pill">💶 ${c.presupuesto}€ / mes</span>
                        <span class="pill">🎭 Ambiente: ${c.ambiente || 'N/A'}</span>
                        <span class="pill">🛡️ Seguridad: ${"⭐".repeat(c.seguridad || 0)}</span>
                    </div>
                    <a href="detalle.html?id=${c._id}" class="btn-ver" onclick="event.stopPropagation()">Ver detalles completos</a>
                </div>
            </article>
        `;
    }).join('');
}

async function toggleFavoritoRapido(ciudadId) {
    const user = JSON.parse(localStorage.getItem('usuarioInfo'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/usuarios/${user.id}/favorito`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ciudadId })
        });
        
        // 1. Verificar si el ID de usuario sigue existiendo
        const sesionExpirada = await verificarSesion(res);
        if (sesionExpirada) return;

        if (res.ok) {
            const data = await res.json();
            
            // 2. Feedback visual (Toast)
            showToast(data.esFavorito ? "❤️ ¡Añadido a favoritos!" : "🤍 Eliminado de favoritos", data.esFavorito ? "success" : "default");

            // 3. Actualizar lista local y volver a renderizar
            if (data.esFavorito) {
                userFavoritasIds.push(ciudadId);
            } else {
                userFavoritasIds = userFavoritasIds.filter(id => id !== ciudadId);
            }
            aplicarFiltros(); 
        } else {
            showToast("⚠️ Error al guardar favorito", "error");
        }
    } catch (e) {
        console.error("Error favoritos:", e);
        showToast("🔌 Error de conexión con el servidor", "error");
    }
}

function aplicarFiltros() {
    const textoBusqueda = inputBusqueda.value.toLowerCase().trim();
    const maxPresupuesto = parseInt(slider.value);
    const ambienteFilter = selectorAmbiente.value;

    const filtradas = ciudades.filter(c => {
        const entraPresupuesto = c.presupuesto <= maxPresupuesto;
        const entraAmbiente = ambienteFilter === 'todos' || c.ambiente === ambienteFilter;
        const entraBusqueda = c.nombre.toLowerCase().includes(textoBusqueda);
        
        return entraPresupuesto && entraAmbiente && entraBusqueda;
    });

    renderizarCiudades(filtradas);
}

function iniciarSSE() {
    const ev = new EventSource('http://localhost:3000/api/ciudades/stream');
    ev.onmessage = (e) => {
        ciudades = JSON.parse(e.data);
        aplicarFiltros(); 
    };
}

// Event Listeners
slider.addEventListener('input', () => {
    etiquetaPrecio.textContent = `${slider.value}€`;
    aplicarFiltros();
});

selectorAmbiente.addEventListener('change', aplicarFiltros);
inputBusqueda.addEventListener('input', aplicarFiltros);
btnBuscar.addEventListener('click', aplicarFiltros);

// Inicialización
cargarDatos().then(() => iniciarSSE());

// --- LÓGICA DEL FORMULARIO DE COMUNIDAD ---
const formNuevaCiudad = document.getElementById('formNuevaCiudad');
const formFeedback = document.getElementById('form-feedback');

formNuevaCiudad.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Construir objeto con datos
    const nuevaCiudad = {
        nombre: document.getElementById('f_nombre').value,
        presupuesto: Number(document.getElementById('f_presupuesto').value),
        ambiente: document.getElementById('f_ambiente').value,
        seguridad: Number(document.getElementById('f_seguridad').value),
        ocio: Number(document.getElementById('f_ocio').value),
        descripcion: document.getElementById('f_descripcion').value
    };
    
    try {
        const respuesta = await fetch('http://localhost:3000/api/ciudades', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevaCiudad)
        });
        
        if (respuesta.ok) {
            formFeedback.textContent = "¡Ciudad añadida con éxito! Gracias por tu aportación.";
            formFeedback.className = "feedback-msg feedback-success";
            formNuevaCiudad.reset(); // Limpiar el formulario
            
            // Ocultar mensaje después de unos segundos
            setTimeout(() => {
                formFeedback.textContent = "";
            }, 5000);
        } else {
            throw new Error("Error en la respuesta del servidor");
        }
    } catch (error) {
        console.error("Error enviando nueva ciudad:", error);
        formFeedback.textContent = "Hubo un problema al añadir la ciudad. Revisa tu conexión.";
        formFeedback.className = "feedback-msg feedback-error";
    }
});