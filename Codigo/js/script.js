const contenedor = document.getElementById('contenedorCiudades');
const slider = document.getElementById('rangoPresupuesto');
const etiquetaPrecio = document.getElementById('valorPresupuesto');
const selectorAmbiente = document.getElementById('selectAmbiente');
const criteriaContainer = document.getElementById('criteriosContainer');
const rankingBody = document.getElementById('rankingBody');

const weightsGrid = document.getElementById('weightsGrid');
const ahpControls = document.getElementById('ahpControls');
const btnGuardar = document.getElementById('btnGuardarBusqueda');
const selectBusqueda = document.getElementById('selectBusqueda');
const selectRol = document.getElementById('selectRol');
const savedSearchesContainer = document.getElementById('savedSearchesContainer');

// Mapa global
let map = null;
let markers = [];

const API_BASE = 'http://localhost:3000';
let ciudades = [];
let userFull = null;
let userFavoritasIds = [];
let currentWeights = {
    transporte: 1,
    ocio: 1,
    ocioNocturno: 1,
    seguridad: 1,
    calidadAcademica: 1
};

async function cargarDatos() {
    try {
        const userInfo = JSON.parse(localStorage.getItem('usuarioInfo'));
        
        // 1. Cargar ciudades
        const r = await fetch(`${API_BASE}/api/ciudades`);
        ciudades = await r.json();

        // 2. Si hay usuario, cargar sus datos completos
        if (userInfo) {
            const resU = await fetch(`${API_BASE}/api/usuarios/${userInfo.id}`);
            userFull = await resU.json();
            userFavoritasIds = (userFull.ciudadesFavoritas || []).map(f => f._id || f);
            
            // Mostrar controles extendidos
            ahpControls.style.display = 'block';
            btnGuardar.style.display = 'block';
            
            if (userFull.busquedas && userFull.busquedas.length > 0) {
                renderizarSelectBusquedas();
            }

            // Mostrar bienvenida personalizada
            const heroH2 = document.querySelector('#hero h2');
            if (heroH2) heroH2.innerText = `👋 ¡Hola ${userFull.nombre}! Personaliza tu búsqueda`;
        }

        renderizarSliders();
        
        // Cargar búsqueda temporal si viene del perfil
        const temp = localStorage.getItem('tempBusqueda');
        if (temp) {
            const b = JSON.parse(temp);
            currentWeights = { ...b.pesos };
            selectRol.value = b.rol;
            localStorage.removeItem('tempBusqueda');
            renderizarSliders();
            showToast(`📂 Cargada búsqueda: ${b.nombre}`, "success");
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
                        <span class="pill">🛡️ Seguridad: ${"⭐".repeat(Math.round(c.seguridad || 0))}</span>
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
    const maxPresupuesto = parseInt(slider.value);
    const ambienteFilter = selectorAmbiente.value;

    const filtradas = ciudades.filter(c => {
        const entraPresupuesto = c.presupuesto <= maxPresupuesto;
        const entraAmbiente = ambienteFilter === 'todos' || c.ambiente === ambienteFilter;
        return entraPresupuesto && entraAmbiente;
    });

    renderizarCiudades(filtradas);
    calcularRanking();
    renderizarMapa(filtradas);
}

function renderizarMapa(datos) {
    if (!map) {
        // Inicializar mapa centrado en España
        map = L.map('mapa-destinos').setView([40.4168, -3.7038], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    }

    // Limpiar markers antiguos
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    // Añadir nuevos markers
    datos.forEach(c => {
        if (c.lat && c.lng) {
            const marker = L.marker([c.lat, c.lng]).addTo(map);
            marker.bindPopup(`
                <div style="font-family: inherit;">
                    <strong style="color:var(--primary-color);">${c.nombre}</strong><br>
                    <span>Presupuesto: ${c.presupuesto}€</span><br>
                    <a href="detalle.html?id=${c._id}" style="color:var(--accent-color); font-weight:bold; text-decoration:none;">Ver Detalles →</a>
                </div>
            `);
            markers.push(marker);
        }
    });
}

function calcularRanking() {
    const seleccionados = Array.from(document.querySelectorAll('.criterio-chip input:checked'))
                               .map(input => input.value);
    
    if (seleccionados.length === 0) {
        rankingBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Selecciona al menos un criterio para ver el ranking.</td></tr>';
        return;
    }

    // Usar pesos actuales (ajustados por sliders)
    // El ranking se calcula con los valores guardados en la BASE DE DATOS
    const rankingData = ciudades.map(c => {
        let scoreTotal = 0;
        let pesoTotal = 0;

        seleccionados.forEach(crit => {
            const peso = currentWeights[crit] || 1;
            const scoreBD = c[crit] || 0; // transporte, ocio, ocioNocturno, etc.
            
            scoreTotal += scoreBD * peso;
            pesoTotal += peso;
        });

        return { ...c, globalScore: scoreTotal / (pesoTotal || 1) };
    });

    rankingData.sort((a, b) => b.globalScore - a.globalScore);
    const top3 = rankingData.slice(0, 3);

    rankingBody.innerHTML = top3.map((c, i) => `
        <tr class="ranking-row" onclick="window.location.href='detalle.html?id=${c._id}'">
            <td><span class="rank-number">${i + 1}º</span></td>
            <td>
                <div class="rank-city">
                    <img src="${obtenerImagenCiudad(c)}" alt="${c.nombre}">
                    <span>${c.nombre} ${c.rol === 'trabajador' ? '💼' : ''}</span>
                </div>
            </td>
            <td class="rank-score">${c.globalScore.toFixed(1)} / 5</td>
        </tr>
    `).join('');
}

function renderizarSliders() {
    weightsGrid.innerHTML = Object.keys(currentWeights).map(key => `
        <div class="weight-control">
            <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:5px; text-transform:capitalize;">${key}</label>
            <input type="range" min="1" max="5" value="${currentWeights[key]}" 
                   class="weight-slider" data-crit="${key}" 
                   style="width: 100%;">
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted);">
                <span>Poco</span><span>Mucho</span>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.weight-slider').forEach(s => {
        s.oninput = (e) => {
            currentWeights[e.target.dataset.crit] = parseInt(e.target.value);
            aplicarFiltros();
        };
    });
}

function renderizarSelectBusquedas() {
    savedSearchesContainer.style.display = 'flex';
    selectBusqueda.innerHTML = '<option value="">-- Seleccionar --</option>' + 
        userFull.busquedas.map((b, idx) => `<option value="${idx}">${b.nombre} (${b.rol})</option>`).join('');
}

selectBusqueda.onchange = (e) => {
    const idx = e.target.value;
    if (idx === "") return;
    
    const b = userFull.busquedas[idx];
    currentWeights = { ...b.pesos };
    selectRol.value = b.rol;
    
    // Sincronizar sliders y chips
    renderizarSliders();
    aplicarFiltros();
};

btnGuardar.onclick = async () => {
    const nombre = prompt("¿Qué nombre quieres ponerle a esta configuración?");
    if (!nombre) return;

    try {
        const res = await fetch(`${API_BASE}/api/usuarios/${userFull._id}/busquedas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre,
                rol: selectRol.value,
                pesos: currentWeights
            })
        });

        if (res.ok) {
            userFull.busquedas = await res.json();
            renderizarSelectBusquedas();
            showToast("✅ Búsqueda guardada con éxito", "success");
        }
    } catch (e) { console.error(e); }
};

document.getElementById('btnResetAHP').onclick = () => {
    Object.keys(currentWeights).forEach(k => currentWeights[k] = 1);
    selectRol.value = 'estudiante';
    renderizarSliders();
    aplicarFiltros();
};
function showToast(message, type = 'default') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; 
        padding: 12px 24px; border-radius: 12px; 
        background: ${type === 'success' ? '#10b981' : '#334155'}; 
        color: white; z-index: 9999; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        animation: slideUp 0.3s ease;
    `;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

const style = document.createElement('style');
style.innerHTML = `
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;
document.head.appendChild(style);

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

// Event Listeners para Chips de Criterios
document.querySelectorAll('.criterio-chip').forEach(chip => {
    chip.addEventListener('click', function(e) {
        // Prevenir doble click si se pulsa sobre el input (aunque esten ocultos)
        if (e.target.tagName === 'INPUT') return;
        
        const input = this.querySelector('input');
        input.checked = !input.checked;
        this.classList.toggle('active', input.checked);
        aplicarFiltros();
    });
});

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