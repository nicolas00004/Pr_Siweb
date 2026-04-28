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
            const userId = getUserId();
            const resU = await fetch(`${API_BASE}/api/usuarios/${userId}`);
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
    if (ciudad.imagenes && ciudad.imagenes.length > 0) {
        return ciudad.imagenes[0];
    }
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
                        <span class="pill">🎭 Ambiente: ${c.tipoAmbiente || 'N/A'}</span>
                        <span class="pill">🛡️ Seguridad: ${"⭐".repeat(Math.round(c.metricas ? c.metricas.seguridad / 2 : 0))}</span>
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
        const res = await fetch(`${API_BASE}/api/usuarios/${getUserId()}/favorito`, {
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
        const entraAmbiente = ambienteFilter === 'todos' || c.tipoAmbiente === ambienteFilter;
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
        if (c.coordenadas && c.coordenadas.coordinates) {
            const [lng, lat] = c.coordenadas.coordinates;
            const marker = L.marker([lat, lng]).addTo(map);
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

const CATEGORIAS_AHP = [
    { name: '🌟 Destino de Élite', min: 4.5, color: '#fbbf24' },
    { name: '✅ Muy Recomendado', min: 3.8, color: '#10b981' },
    { name: '🆗 Aceptable', min: 2.5, color: '#3b82f6' },
    { name: '⚠️ No Recomendado', min: 0, color: '#ef4444' }
];

function calcularRanking() {
    const seleccionados = Array.from(document.querySelectorAll('.criterio-chip input:checked'))
                               .map(input => input.value);
    
    if (seleccionados.length === 0) {
        rankingBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Selecciona al menos un criterio para ver el ranking.</td></tr>';
        return;
    }

    const rankingData = ciudades.map(c => {
        let scoreTotal = 0;
        let pesoTotal = 0;

        seleccionados.forEach(crit => {
            const peso = currentWeights[crit] || 1;
            const mapCrit = { 'ocioNocturno': 'ambienteNocturno', 'transporte': 'calidadTransporte' };
            const critKey = mapCrit[crit] || crit;
            const scoreBD = (c.metricas ? c.metricas[critKey] : 0) || 0;
            
            scoreTotal += scoreBD * peso;
            pesoTotal += peso;
        });

        const scoreFinal = scoreTotal / (pesoTotal || 1);
        const categoria = AHPEngine.classify(scoreFinal, CATEGORIAS_AHP);
        const catInfo = CATEGORIAS_AHP.find(cat => cat.name === categoria) || { color: '#64748b' };

        return { ...c, globalScore: scoreFinal, categoria, catColor: catInfo.color };
    });

    rankingData.sort((a, b) => b.globalScore - a.globalScore);
    
    rankingBody.innerHTML = rankingData.map((c, i) => `
        <tr class="ranking-row" onclick="window.location.href='detalle.html?id=${c._id}'">
            <td data-label="POS"><span class="rank-number">${i + 1}º</span></td>
            <td data-label="CIUDAD">
                <div class="rank-city">
                    <img src="${obtenerImagenCiudad(c)}" alt="${c.nombre}">
                    <span>${c.nombre} ${c.rol === 'trabajador' ? '💼' : ''}</span>
                </div>
            </td>
            <td data-label="CLASIFICACIÓN">
                <span class="pill" style="background: ${c.catColor}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 700;">
                    ${c.categoria}
                </span>
            </td>
            <td data-label="PUNTUACIÓN" class="rank-score">${c.globalScore.toFixed(1)} / 5</td>
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

// --- LÓGICA MODO EXPERTO (MATRIZ AHP) ---
const btnExpert = document.getElementById('btnExpertAHP');
const panelMatrix = document.getElementById('ahpMatrixPanel');
const tableMatrix = document.getElementById('ahpMatrixTable');
const consistencyInfo = document.getElementById('ahpConsistencyInfo');

btnExpert.onclick = () => {
    const isVisible = panelMatrix.style.display === 'block';
    panelMatrix.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) renderizarMatrizAHP();
};

function renderizarMatrizAHP() {
    const criteria = Object.keys(currentWeights);
    const n = criteria.length;
    
    // Crear matriz de identidad si no existe o sincronizar
    let html = '<thead><tr><th></th>' + criteria.map(c => `<th style="text-transform:capitalize;">${c}</th>`).join('') + '</tr></thead><tbody>';
    
    criteria.forEach((rowCrit, i) => {
        html += `<tr><td style="font-weight:700; text-transform:capitalize;">${rowCrit}</td>`;
        criteria.forEach((colCrit, j) => {
            if (i === j) {
                html += `<td style="background:#e2e8f0; text-align:center;">1</td>`;
            } else if (i < j) {
                // Input para comparar row vs col
                html += `<td><input type="number" step="0.1" min="0.1" max="9" value="1" 
                          onchange="actualizarMatrizAHP(${i}, ${j}, this.value)" 
                          style="width:50px; padding:4px; border-radius:4px; border:1px solid #cbd5e1;"></td>`;
            } else {
                // Recíproco (se calcula auto)
                html += `<td id="ahp_${i}_${j}" style="color:var(--text-muted); text-align:center;">1</td>`;
            }
        });
        html += '</tr>';
    });
    
    html += '</tbody>';
    tableMatrix.innerHTML = html;
    recalcularPrioridadesAHP();
}

let ahpMatrixInternal = [];

function actualizarMatrizAHP(row, col, val) {
    const v = parseFloat(val);
    if (isNaN(v) || v <= 0) return;
    
    document.getElementById(`ahp_${col}_${row}`).innerText = (1/v).toFixed(2);
    recalcularPrioridadesAHP();
}

function recalcularPrioridadesAHP() {
    const criteria = Object.keys(currentWeights);
    const n = criteria.length;
    const matrix = Array.from({ length: n }, () => Array(n).fill(1));
    
    // Leer valores de la tabla
    criteria.forEach((_, i) => {
        criteria.forEach((_, j) => {
            if (i < j) {
                const input = tableMatrix.querySelector(`tr:nth-child(${i+1}) td:nth-child(${j+2}) input`);
                const val = parseFloat(input.value) || 1;
                matrix[i][j] = val;
                matrix[j][i] = 1/val;
            }
        });
    });

    const newWeights = AHPEngine.calculateWeights(matrix);
    const consistency = AHPEngine.checkConsistency(matrix, newWeights);

    // Actualizar currentWeights (normalizados a escala 1-5 para compatibilidad con sliders)
    const maxW = Math.max(...newWeights);
    criteria.forEach((key, idx) => {
        currentWeights[key] = (newWeights[idx] / maxW) * 5;
    });

    // Actualizar UI
    renderizarSliders();
    aplicarFiltros();

    consistencyInfo.innerHTML = `
        <span style="color: ${consistency.consistent ? '#10b981' : '#ef4444'}">
            ${consistency.consistent ? '✅ Consistente' : '⚠️ Inconsistente'} (CR: ${consistency.cr})
        </span>
    `;
}
// La función showToast está definida globalmente en auth.js
// No se redefine aquí para evitar conflictos

const _animStyle = document.createElement('style');
_animStyle.innerHTML = `
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;
document.head.appendChild(_animStyle);

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
    
    // Construir objeto con datos adaptados al schema actual de CiudadSchema
    const alquiler = Number(document.getElementById('f_presupuesto').value) * 0.7; // aprox. 70% alquiler
    const ocio     = Number(document.getElementById('f_presupuesto').value) * 0.3; // aprox. 30% ocio
    const lat = Number(document.getElementById('f_lat').value) || 40.4168;
    const lng = Number(document.getElementById('f_lng').value) || -3.7038;

    const nuevaCiudad = {
        nombre:       document.getElementById('f_nombre').value,
        tipoAmbiente: document.getElementById('f_ambiente').value,
        historia:     document.getElementById('f_historia').value,
        alojamiento:  document.getElementById('f_alojamiento').value,
        metricas: {
            seguridad:          Number(document.getElementById('f_seguridad').value),
            costeAlquilerMedio: Math.round(alquiler),
            costeOcioMedio:     Math.round(ocio),
            ambienteNocturno:   Number(document.getElementById('f_ocio').value),
            calidadTransporte:  3,
            calidadAcademica:   3,
            conectividad:       3,
            turismo:            3
        },
        coordenadas: {
            type: 'Point',
            coordinates: [lng, lat]
        }
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