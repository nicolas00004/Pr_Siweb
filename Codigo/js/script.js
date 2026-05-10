const contenedor = document.getElementById('contenedorCiudades');
const slider = document.getElementById('rangoPresupuesto');
const etiquetaPrecio = document.getElementById('valorPresupuesto');
const selectorAmbiente = document.getElementById('selectAmbiente');
const rankingBody = document.getElementById('rankingBody');

const weightsGrid = document.getElementById('weightsGrid');
const ahpControls = document.getElementById('ahpControls');
const btnGuardar = document.getElementById('btnGuardarBusqueda');
const selectBusqueda = document.getElementById('selectBusqueda');
const selectRol = document.getElementById('selectRol');
const savedSearchesContainer = document.getElementById('savedSearchesContainer');
const inputBusquedaTexto = document.getElementById('inputBusquedaTexto');
const selectOrden = document.getElementById('selectOrden');
const selectTopN = document.getElementById('selectTopN');
const resultadosCount = document.getElementById('resultadosCount');
let minSeguridad = 0;

// Mapa global
let map = null;
let markers = [];

// URL relativa: usa el mismo host/puerto desde el que se sirvió la página
const API_BASE = '';
let ciudades = [];
let userFull = null;
let userFavoritasIds = [];
let currentWeights = {
    transporte: 1,
    ocio: 1,
    ocioNocturno: 1,
    seguridad: 1,
    calidadAcademica: 1,
    conectividad: 1,
    asequibilidad: 1,
    gastronomia: 1
};
let seleccionParaComparar = [];
let rankingDataGlobal = [];

let ORIGIN = [40.4168, -3.7038]; // Madrid por defecto
const sliderDistancia = document.getElementById('rangoDistancia');
const etiquetaDistancia = document.getElementById('valorDistancia');
const btnGeo = document.getElementById('btnGeo');
const originText = document.getElementById('originText');

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function cargarDatos() {
    try {
        const res = await fetch(`${API_BASE}/api/ciudades`);
        ciudades = await res.json();
        renderizarSliders();
        aplicarFiltros();

        // Ajuste Leaflet para layout Dashboard (el mapa se inicializa lazy en renderizarMapa)
        setTimeout(() => { if (map) map.invalidateSize(); }, 1000);
        
        const userInfo = JSON.parse(localStorage.getItem('usuarioInfo'));

        // 2. Si hay usuario, cargar sus datos completos
        if (userInfo) {
            const userId = getUserId();
            const resU = await fetch(`${API_BASE}/api/usuarios/${userId}`);
            userFull = await resU.json();
            userFavoritasIds = (userFull.ciudadesFavoritas || []).map(f => f._id || f);
            
            // Mostrar controles extendidos
            if (ahpControls) ahpControls.style.display = 'block';
            document.getElementById('saveSearchSection').style.display = 'block';
            document.getElementById('saveLoginPrompt').style.display = 'none';
            const btnGuardarTop = document.getElementById('btnGuardarBusquedaTop');
            if (btnGuardarTop) btnGuardarTop.style.display = 'inline-block';

            // Siempre renderizar (muestra el mensaje vacío o las pills)
            renderizarSelectBusquedas();

            // Mostrar bienvenida personalizada
            const welcomeUser = document.getElementById('welcomeUser');
            if (welcomeUser) welcomeUser.innerText = `👋 ¡Hola ${userFull.nombre}! Personaliza tu búsqueda en tiempo real.`;
        }

        renderizarSliders();
        
        // Cargar búsqueda temporal si viene del perfil
        const temp = localStorage.getItem('tempBusqueda');
        let lanzarBusquedaAuto = false;
        if (temp) {
            const b = JSON.parse(temp);
            currentWeights = { ...currentWeights, ...b.pesos };
            if (selectRol) selectRol.value = b.rol;
            localStorage.removeItem('tempBusqueda');
            renderizarSliders();
            showToast(`📂 Cargada búsqueda: ${b.nombre}`, "success");
            lanzarBusquedaAuto = true;
        }

        aplicarFiltros();

        // Si veníamos del perfil, lanzar el ranking directamente (con su animación)
        if (lanzarBusquedaAuto) {
            setTimeout(() => mostrarRanking(), 300);
        }
    } catch (e) {
        console.error('Error cargando ciudades:', e);
        if (contenedor) {
            contenedor.innerHTML = '<p style="text-align:center;padding:40px;">Error al cargar datos. Asegúrate de que el servidor está encendido (<code>node server.js</code>).</p>';
        }
    }
}

function obtenerImagenCiudad(ciudad) {
    if (ciudad.imagenes && ciudad.imagenes.length > 0) {
        return ciudad.imagenes[0];
    }
    return ciudad.imagen || `https://picsum.photos/seed/${encodeURIComponent(ciudad.nombre)}/400/300`;
}

function renderizarCiudades(datos) {
    if (!contenedor) return;

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
    const maxPresupuesto = slider ? parseInt(slider.value) : Infinity;
    const maxDistancia = sliderDistancia ? parseInt(sliderDistancia.value) : Infinity;
    const ambienteFilter = selectorAmbiente ? selectorAmbiente.value : 'todos';
    const textoBusqueda = inputBusquedaTexto ? inputBusquedaTexto.value.trim().toLowerCase() : '';

    const filtradas = ciudades.filter(c => {
        // Filtro de texto
        if (textoBusqueda && !c.nombre.toLowerCase().includes(textoBusqueda)) return false;

        // Filtro de presupuesto
        if (c.presupuesto > maxPresupuesto) return false;

        // Filtro de ambiente
        if (ambienteFilter !== 'todos' && c.tipoAmbiente !== ambienteFilter) return false;

        // Filtro de seguridad mínima
        if (minSeguridad > 0) {
            const seg = c.metricas?.seguridad ?? 0;
            if (minSeguridad === 5 ? seg < 5 : seg < minSeguridad) return false;
        }

        // Filtro de distancia
        if (maxDistancia < 2000 && c.coordenadas?.coordinates) {
            const [lng, lat] = c.coordenadas.coordinates;
            const dist = calcularDistancia(ORIGIN[0], ORIGIN[1], lat, lng);
            if (dist > maxDistancia) return false;
        }

        return true;
    });

    // Actualizar contador (respetando el límite Top N si está activo)
    if (resultadosCount) {
        const topN = selectTopN ? parseInt(selectTopN.value) : 0;
        const mostradas = (topN > 0 && topN < filtradas.length) ? topN : filtradas.length;
        if (topN > 0 && topN < filtradas.length) {
            resultadosCount.textContent = `Top ${mostradas} de ${filtradas.length} ciudades`;
        } else {
            resultadosCount.textContent = `${filtradas.length} ciudad${filtradas.length !== 1 ? 'es' : ''}`;
        }
    }

    renderizarCiudades(filtradas);
    const ranking = calcularRanking(filtradas);
    // Los marcadores solo se muestran tras pulsar "Buscar Destinos", y solo las del Top N (ranking)
    renderizarMapa(rankingVisible ? ranking : [], rankingVisible ? ranking : []);
}

function renderizarMapa(datos, rankingData = []) {
    if (!map) {
        // Inicializar mapa centrado en España
        map = L.map('mapa-destinos').setView([40.4168, -3.7038], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    }

    // Limpiar markers y flechas antiguos
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    
    // Función para obtener icono coloreado
    const getMarkerIcon = (color) => {
        return L.divIcon({
            className: 'custom-div-icon',
            html: `<div style='background-color:${color}; width:30px; height:30px; border-radius:50% 50% 50% 0; transform: rotate(-45deg); border:2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);'></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });
    };
    
    // Añadir nuevos markers
    datos.forEach(c => {
        if (c.coordenadas && c.coordenadas.coordinates) {
            const [lng, lat] = c.coordenadas.coordinates;
            
            // Determinar color basado en ranking
            let color = '#3b82f6'; // Azul por defecto
            const rankIndex = rankingData.findIndex(rc => rc._id === c._id);
            if (rankIndex === 0) color = '#fbbf24'; // Oro
            else if (rankIndex === 1) color = '#10b981'; // Esmeralda
            else if (rankIndex === 2) color = '#8b5cf6'; // Violeta (para diferenciar del azul)

            const marker = L.marker([lat, lng], {
                icon: rankIndex >= 0 && rankIndex < 3 ? getMarkerIcon(color) : new L.Icon.Default()
            }).addTo(map);

            marker.bindPopup(`
                <div style="font-family: inherit;">
                    <strong style="color:var(--primary-color);">${c.nombre}</strong><br>
                    ${rankIndex >= 0 ? `<span class="pill" style="background:${color}; color:white; font-size:0.7rem; padding:2px 6px;">${rankIndex + 1}º en Ranking</span><br>` : ''}
                    <span>Presupuesto: ${c.presupuesto}€</span><br>
                    <a href="detalle.html?id=${c._id}" style="color:var(--accent-color); font-weight:bold; text-decoration:none;">Ver Detalles →</a>
                </div>
            `);
            markers.push(marker);
        }
    });
    // Añadir marcador de Origen (desde donde se busca)
    if (ORIGIN && ORIGIN.length === 2 && datos.length > 0) {
        const originMarker = L.marker([ORIGIN[0], ORIGIN[1]], {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div style='background-color:#ef4444; width:24px; height:24px; border-radius:50%; border:3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; font-size:12px;'>📍</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            }),
            zIndexOffset: 1000 // Para que se vea por encima de otras flechas si se solapan
        }).addTo(map);

        originMarker.bindPopup(`
            <div style="font-family: inherit; text-align:center;">
                <strong style="color:#ef4444;">📍 Tu Ubicación</strong><br>
                <span style="font-size:0.75rem; color:var(--text-muted);">Punto de origen de la búsqueda</span>
            </div>
        `);
        markers.push(originMarker);
        
        // Ajustar la vista del mapa para que incluya el origen y los destinos
        const bounds = L.featureGroup(markers).getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }
}

// AHP-Sort II canónico: cada perfil define el LÍMITE INFERIOR de su categoría
// como un vector de métricas. El umbral real se recalcula con los pesos actuales
// del usuario, por lo que las fronteras de categoría se mueven con sus prioridades.
const LIMITING_PROFILES = [
    {
        name: '🌟 Destino de Élite', color: '#fbbf24',
        metricasPerfil: {
            calidadTransporte: 4.5, turismo: 4.5, ambienteNocturno: 4.0,
            seguridad: 4.5, calidadAcademica: 4.5, conectividad: 4.5,
            asequibilidad: 4.0, gastronomia: 4.5
        }
    },
    {
        name: '✅ Muy Recomendado', color: '#10b981',
        metricasPerfil: {
            calidadTransporte: 3.8, turismo: 3.8, ambienteNocturno: 3.5,
            seguridad: 4.0, calidadAcademica: 4.0, conectividad: 3.8,
            asequibilidad: 3.5, gastronomia: 3.8
        }
    },
    {
        name: '🆗 Aceptable', color: '#3b82f6',
        metricasPerfil: {
            calidadTransporte: 2.5, turismo: 2.5, ambienteNocturno: 2.0,
            seguridad: 3.0, calidadAcademica: 3.0, conectividad: 2.5,
            asequibilidad: 2.5, gastronomia: 2.5
        }
    }
];
const CATEGORIA_FALLBACK = { name: '⚠️ No Recomendado', color: '#ef4444' };

// Vetos: una métrica crítica por debajo del umbral cap la categoría máxima alcanzable.
// Rompe la compensación pura del weighted-sum en casos donde una sola dimensión es
// inaceptable (p. ej. seguridad muy baja no debería poder ser "Élite" por mucho ocio).
const VETO_RULES = [
    { criterio: 'seguridad', umbral: 2.0, capCategoria: '🆗 Aceptable', mensaje: '🚫 Seguridad insuficiente' }
];

const CRIT_TO_METRIC = {
    ocioNocturno: 'ambienteNocturno',
    transporte:   'calidadTransporte',
    ocio:         'turismo',
    gastronomia:  'gastronomia'
};

// Score que obtiene un perfil límite con los pesos actuales del usuario.
// Define el umbral dinámico de su categoría.
function scoreDePerfil(metricasPerfil, weights) {
    let scoreTotal = 0, pesoTotal = 0;
    Object.keys(weights).forEach(crit => {
        const critKey = CRIT_TO_METRIC[crit] || crit;
        const v = metricasPerfil[critKey];
        if (v != null) {
            scoreTotal += v * weights[crit];
            pesoTotal += weights[crit];
        }
    });
    return scoreTotal / (pesoTotal || 1);
}

// Devuelve la lista de categorías con su umbral recalculado a partir de los
// pesos actuales del usuario. Mantiene compatibilidad con consumidores que
// esperaban la forma { name, color, min } del antiguo CATEGORIAS_AHP.
function categoriasConUmbrales() {
    const cats = LIMITING_PROFILES.map(p => ({
        name: p.name,
        color: p.color,
        min: scoreDePerfil(p.metricasPerfil, currentWeights)
    }));
    cats.push({ ...CATEGORIA_FALLBACK, min: 0 });
    return cats;
}

let rankingVisible = false;
let buscando = false;

function mostrarRanking() {
    if (buscando) return;
    buscando = true;

    const btn = document.getElementById('btnBuscarDestinos');
    const rankingContainer = document.querySelector('.ranking-container');
    const mapaWrapper = document.getElementById('mapa-destinos')?.parentElement;

    // Estado "buscando" en el botón
    if (btn) {
        btn.classList.add('btn-loading');
        btn.dataset.active = '1';
        btn.innerHTML = '<span class="btn-spinner"></span> Calculando...';
    }

    // Overlay de carga sobre el ranking
    if (rankingContainer) {
        rankingContainer.classList.add('searching');
        let overlay = rankingContainer.querySelector('.search-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'search-overlay';
            overlay.innerHTML = `
                <div class="search-overlay-inner">
                    <div class="search-radar"></div>
                    <p class="search-overlay-text">🔍 Aplicando AHP-Sort II…</p>
                    <p class="search-overlay-sub">Calculando umbrales dinámicos y vetos</p>
                </div>`;
            rankingContainer.appendChild(overlay);
        }
        overlay.classList.add('is-visible');
    }

    if (mapaWrapper) mapaWrapper.classList.add('searching-pulse');

    // Pequeño retardo para que la animación sea perceptible aunque el cálculo sea instantáneo
    setTimeout(() => {
        rankingVisible = true;
        activarPaso(3);
        aplicarFiltros();

        // Animar entrada de las filas del ranking
        const filas = document.querySelectorAll('#rankingBody tr.ranking-row');
        filas.forEach((tr, i) => {
            tr.style.animationDelay = `${i * 60}ms`;
            tr.classList.add('row-fade-in');
        });

        // Quitar overlay
        if (rankingContainer) {
            const overlay = rankingContainer.querySelector('.search-overlay');
            if (overlay) overlay.classList.remove('is-visible');
            rankingContainer.classList.remove('searching');
            setTimeout(() => { if (overlay) overlay.remove(); }, 400);
        }
        if (mapaWrapper) mapaWrapper.classList.remove('searching-pulse');

        if (btn) {
            btn.classList.remove('btn-loading');
            btn.innerHTML = '🔄 Actualizar';
            btn.style.background = '#10b981';
        }

        document.querySelector('.ranking-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        buscando = false;
    }, 650);
}

function calcularRanking(ciudadesInput = ciudades) {
    if (!rankingBody) return [];
    const seleccionados = Object.keys(currentWeights);

    // Pre-calcular normalización invertida para asequibilidad (mayor coste → menor score)
    const costes = ciudadesInput.map(c => c.metricas?.costeAlquilerMedio).filter(v => v != null && v > 0);
    const minCoste = costes.length ? Math.min(...costes) : 0;
    const maxCoste = costes.length ? Math.max(...costes) : 1;
    const rangoCoste = (maxCoste - minCoste) || 1;

    // Umbrales de categoría dinámicos: dependen sólo de los pesos actuales,
    // por lo que se calculan una sola vez por render (no por ciudad).
    const cats = categoriasConUmbrales();

    const rankingData = ciudadesInput.map(c => {
        let scoreTotal = 0;
        let pesoTotal = 0;

        seleccionados.forEach(crit => {
            let metricValue;
            if (crit === 'asequibilidad') {
                const coste = c.metricas?.costeAlquilerMedio;
                if (coste != null && coste > 0) {
                    metricValue = 1 + 4 * (maxCoste - coste) / rangoCoste;
                }
            } else {
                const critKey = CRIT_TO_METRIC[crit] || crit;
                metricValue = c.metricas ? c.metricas[critKey] : null;
                // Fallback para gastronomía: si la ciudad no tiene métrica explícita,
                // usamos turismo como proxy y sumamos un bonus si está etiquetada "Gastronomía"
                if (crit === 'gastronomia' && (metricValue == null)) {
                    const proxy = c.metricas?.turismo;
                    const bonus = Array.isArray(c.etiquetas) && c.etiquetas.some(t => /gastronom/i.test(t)) ? 0.5 : 0;
                    if (proxy != null) metricValue = Math.min(5, proxy + bonus);
                }
            }

            if (metricValue !== null && metricValue !== undefined) {
                const peso = currentWeights[crit] || 1;
                scoreTotal += metricValue * peso;
                pesoTotal += peso;
            }
        });

        const scoreFinal = scoreTotal / (pesoTotal || 1);

        // Clasificación AHP-Sort II: primera categoría cuyo umbral cumple la ciudad
        let catInfo = cats[cats.length - 1];
        for (const cat of cats) {
            if (scoreFinal >= cat.min) { catInfo = cat; break; }
        }

        // Veto: capa la categoría máxima si una métrica crítica está por debajo del umbral
        let vetoMsg = null;
        for (const veto of VETO_RULES) {
            const valor = c.metricas?.[veto.criterio];
            if (valor != null && valor < veto.umbral) {
                const capIdx = cats.findIndex(x => x.name === veto.capCategoria);
                const catIdx = cats.findIndex(x => x.name === catInfo.name);
                if (capIdx !== -1 && catIdx !== -1 && catIdx < capIdx) {
                    catInfo = cats[capIdx];
                    vetoMsg = veto.mensaje;
                }
            }
        }

        // Sensibilidad: cerca del borde superior (próxima cat. mejor) o inferior (cat. actual)
        const idxActual = cats.findIndex(x => x.name === catInfo.name);
        const proximaCat = idxActual > 0 ? cats[idxActual - 1] : null;
        const estaCercaDeSubir = !vetoMsg && proximaCat && (proximaCat.min - scoreFinal < 0.15);
        const estaCercaDeBajar = (scoreFinal - catInfo.min < 0.1) && catInfo.min > 0;

        const costeC = c.metricas?.costeAlquilerMedio;
        const _asequibilidad = (costeC != null && costeC > 0) ? 1 + 4 * (maxCoste - costeC) / rangoCoste : null;

        return {
            ...c,
            globalScore: scoreFinal,
            categoria: catInfo.name,
            catColor: catInfo.color,
            vetoMsg,
            alertaUmbral: estaCercaDeSubir ? 'Subir' : (estaCercaDeBajar ? 'Bajar' : null),
            _asequibilidad
        };
    });

    const orden = selectOrden ? selectOrden.value : 'ahp';
    rankingData.sort((a, b) => {
        if (orden === 'presupuesto') return (a.presupuesto || 9999) - (b.presupuesto || 9999);
        if (orden === 'seguridad')   return (b.metricas?.seguridad || 0) - (a.metricas?.seguridad || 0);
        if (orden === 'nombre')      return a.nombre.localeCompare(b.nombre);
        return b.globalScore - a.globalScore; // 'ahp' (default)
    });
    rankingDataGlobal = rankingData; // Guardar para el comparador

    // Aplicar límite Top N
    const topN = selectTopN ? parseInt(selectTopN.value) : 0;
    const rankingMostrado = (topN > 0) ? rankingData.slice(0, topN) : rankingData;

    // Si el usuario aún no ha pulsado Buscar, mostrar placeholder y devolver datos para el mapa
    if (!rankingVisible) {
        rankingBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:40px 20px;">
                    <div style="color:var(--text-muted);">
                        <div style="font-size:2.5rem; margin-bottom:12px; opacity:0.4;">🔍</div>
                        <p style="font-size:0.9rem; font-weight:600; margin-bottom:6px;">Configura tus preferencias</p>
                        <p style="font-size:0.8rem;">y pulsa <strong style="color:var(--accent-color);">Buscar Destinos</strong> para ver el ranking</p>
                    </div>
                </td>
            </tr>`;
        return rankingMostrado;
    }

    const isLogged = !!userFull;
    rankingBody.innerHTML = rankingMostrado.map((c, i) => {
        const isFav = userFavoritasIds.includes(c._id);
        const favBtn = isLogged
            ? `<button class="rank-fav-btn ${isFav ? 'is-fav' : ''}"
                       onclick="event.stopPropagation(); toggleFavoritoRapido('${c._id}')"
                       title="${isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}">${isFav ? '❤️' : '🤍'}</button>`
            : `<button class="rank-fav-btn"
                       onclick="event.stopPropagation(); window.location.href='login.html'"
                       title="Inicia sesión para guardar favoritos">🤍</button>`;
        return `
        <tr class="ranking-row" onclick="window.location.href='detalle.html?id=${c._id}'">
            <td data-label="POS"><span class="rank-number">${i + 1}º</span></td>
            <td data-label="CIUDAD">
                <div class="rank-city">
                    <img src="${obtenerImagenCiudad(c)}" alt="${c.nombre}" onerror="this.style.display='none'">
                    <span>${c.nombre} ${c.rol === 'trabajador' ? '💼' : ''}</span>
                    ${favBtn}
                </div>
            </td>
            <td data-label="CLASIFICACIÓN">
                <span class="pill" style="display: inline-block; white-space: nowrap; background: ${c.catColor}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 700;">
                    ${c.categoria}
                </span>
                ${c.vetoMsg ? `<span class="near-threshold" style="color:#b91c1c;">${c.vetoMsg}</span>` : ''}
                ${c.alertaUmbral === 'Subir' ? '<span class="near-threshold">✨ Casi en cat. superior</span>' : ''}
                ${c.alertaUmbral === 'Bajar' ? '<span class="near-threshold">⚠️ Al límite inferior</span>' : ''}
            </td>
            <td data-label="PUNTUACIÓN" class="rank-score">
                <div style="display:flex; flex-direction:column; align-items:flex-end;">
                    <span>${c.globalScore.toFixed(2)} / 5</span>
                    <div style="width:60px; height:4px; background:#e2e8f0; border-radius:2px; margin-top:5px; overflow:hidden;">
                        <div style="width:${Math.min(100,(c.globalScore/5)*100)}%; height:100%; background:${c.catColor}; border-radius:2px;"></div>
                    </div>
                    <span style="font-size:0.65rem; color:var(--text-muted); font-weight:normal; margin-top:3px;">Métricas: ${Object.keys(c.metricas || {}).length}</span>
                </div>
            </td>
        </tr>
    `;
    }).join('');

    actualizarBotonComparar();
    return rankingMostrado;
}

function toggleSeleccionComparar(id) {
    const index = seleccionParaComparar.indexOf(id);
    if (index === -1) {
        if (seleccionParaComparar.length >= 4) {
            showToast("⚠️ Máximo 4 ciudades para comparar", "error");
            renderizarMatrizAHP(); // Refrescar para desmarcar el checkbox
            return;
        }
        seleccionParaComparar.push(id);
    } else {
        seleccionParaComparar.splice(index, 1);
    }
    actualizarBotonComparar();
}

function actualizarBotonComparar() {
    // Función deshabilitada: la comparación ahora se hace en herramientas.html
    return;
}

function abrirComparador() {
    const modal = document.getElementById('modalComparador');
    const body = document.getElementById('comparadorBody');
    if (!modal || !body) return;

    const seleccionadas = ciudades.filter(c => seleccionParaComparar.includes(c._id));
    
    // Calcular los mejores valores para resaltar
    const mejoresValores = {};
    const criterios = Object.keys(currentWeights);
    
    const _mapCritComp = { 'ocioNocturno': 'ambienteNocturno', 'transporte': 'calidadTransporte', 'ocio': 'turismo', 'conectividad': 'conectividad' };
    criterios.forEach(key => {
        if (key === 'asequibilidad') {
            mejoresValores[key] = Math.max(...seleccionadas.map(r => rankingDataGlobal.find(rd => rd._id === r._id)?._asequibilidad || 0));
        } else {
            const critKey = _mapCritComp[key] || key;
            mejoresValores[key] = Math.max(...seleccionadas.map(c => (c.metricas ? c.metricas[critKey] : 0) || 0));
        }
    });

    body.innerHTML = seleccionadas.map(c => {
        const scoreAHP = rankingDataGlobal.find(r => r._id === c._id)?.globalScore || 0;
        
        // Calcular distancia si hay coordenadas
        let distanciaTexto = "Distancia no disp.";
        if (c.coordenadas && c.coordenadas.coordinates) {
            const [lng, lat] = c.coordenadas.coordinates;
            const dist = calcularDistancia(ORIGIN[0], ORIGIN[1], lat, lng);
            distanciaTexto = `📍 a ${dist.toFixed(0)} km de ti`;
        }
        
        // --- GENERAR VEREDICTO ---
        const metricasOrdenadas = criterios
            .map(key => {
                if (key === 'asequibilidad') {
                    return { key, val: rankingDataGlobal.find(rd => rd._id === c._id)?._asequibilidad || 0 };
                }
                const critKey = _mapCritComp[key] || key;
                return { key, val: (c.metricas ? c.metricas[critKey] : 0) || 0 };
            })
            .sort((a, b) => b.val - a.val);

        const fortalezas = metricasOrdenadas.slice(0, 2).map(m => m.key);
        const esMasBarata = c.presupuesto === Math.min(...seleccionadas.map(s => s.presupuesto));
        
        let veredicto = `✨ Destaca en <strong>${fortalezas[0]}</strong> y <strong>${fortalezas[1]}</strong>.`;
        if (esMasBarata && seleccionadas.length > 1) veredicto += ` Es la opción más <strong>económica</strong>.`;

        return `
            <div class="comp-card premium-card" onclick="window.location.href='detalle.html?id=${c._id}'" style="cursor:pointer; transition: transform 0.2s;">
                <div class="comp-city-header">
                    <div style="position: relative; display: inline-block;">
                        <img src="${obtenerImagenCiudad(c)}" alt="${c.nombre}" style="width:100px; height:100px; border-radius:20px; object-fit:cover;">
                        <div style="position:absolute; bottom:-10px; right:-10px; background:var(--primary-color); color:white; width:35px; height:35px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; border:3px solid white; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                            ${scoreAHP.toFixed(1)}
                        </div>
                    </div>
                    <h4 style="margin: 15px 0 2px 0; font-size:1.4rem;">${c.nombre}</h4>
                    <p style="font-size:0.7rem; color:var(--text-muted); margin-bottom:8px;">${distanciaTexto}</p>
                    <div style="display:flex; justify-content:center; gap:5px;">
                        <span class="pill" style="background:#e0f2fe; color:#0369a1; font-weight:600; font-size:0.7rem;">${c.presupuesto}€/mes</span>
                        <span class="pill" style="background:#fef3c7; color:#92400e; font-weight:600; font-size:0.7rem;">🎓 ${c.universidades ? c.universidades.length : 0} Univ.</span>
                    </div>
                </div>

                <div style="background:rgba(59, 130, 246, 0.05); padding:10px; border-radius:12px; margin-top:15px; font-size:0.75rem; border:1px dashed var(--accent-color);">
                    <p style="margin:0; color:var(--primary-color);">${veredicto}</p>
                </div>
                
                <div class="comp-metrics-list" style="margin-top:15px; background:white; padding:15px; border-radius:15px; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
                    ${criterios.map(key => {
                        let val;
                        if (key === 'asequibilidad') {
                            val = rankingDataGlobal.find(rd => rd._id === c._id)?._asequibilidad || 0;
                        } else {
                            const critKey = _mapCritComp[key] || key;
                            val = (c.metricas ? c.metricas[critKey] : 0) || 0;
                        }
                        const esMejor = val === mejoresValores[key] && val > 0;

                        return `
                            <div style="margin-bottom:12px;">
                                <div class="comp-metric" style="margin-bottom:4px;">
                                    <span style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:5px; font-weight:500;">
                                        ${CRIT_LABELS[key] || key} ${esMejor ? '⭐' : ''}
                                    </span>
                                    <span style="font-size:0.8rem; font-weight:700; color:${esMejor ? 'var(--accent-color)' : '#1e293b'}">${val}/5</span>
                                </div>
                                <div class="comp-metric-bar" style="height:6px; background:#f1f5f9;">
                                    <div class="comp-metric-fill" style="width: ${(val/5)*100}%; background: ${esMejor ? 'var(--accent-color)' : 'var(--primary-color)'}; border-radius:4px;"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div style="margin-top:20px; text-align:center;">
                    <button class="btn-ver" style="width:100%; padding:12px; border-radius:12px; background:var(--primary-color); color:white; border:none; font-weight:600; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <span>Ver Perfil Completo</span>
                        <i class="fas fa-arrow-right" style="font-size:0.8rem;"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    modal.style.display = 'flex';
}

function cerrarComparador() {
    document.getElementById('modalComparador').style.display = 'none';
}

const btnCompararGlobal = document.getElementById('btnComparar');
if (btnCompararGlobal) {
    btnCompararGlobal.onclick = abrirComparador;
}

const CRIT_LABELS = {
    transporte:       '🚌 Transporte',
    ocio:             '🎭 Ocio y Turismo',
    ocioNocturno:     '🌙 Vida Nocturna',
    seguridad:        '🛡️ Seguridad',
    calidadAcademica: '🎓 Calidad Académica',
    conectividad:     '📶 Conectividad',
    asequibilidad:    '💰 Asequibilidad',
    gastronomia:      '🍽️ Gastronomía'
};

// --- PERFILES RÁPIDOS ---
const PERFILES = {
    economico:   { asequibilidad: 5, conectividad: 3, transporte: 3, ocio: 2, ocioNocturno: 2, seguridad: 3, calidadAcademica: 2, gastronomia: 1 },
    academico:   { calidadAcademica: 5, conectividad: 4, seguridad: 4, transporte: 3, asequibilidad: 3, ocio: 2, ocioNocturno: 1, gastronomia: 2 },
    social:      { ocioNocturno: 5, ocio: 5, turismo: 4, gastronomia: 3, conectividad: 3, transporte: 3, seguridad: 2, calidadAcademica: 2, asequibilidad: 2 },
    seguro:      { seguridad: 5, calidadAcademica: 4, conectividad: 3, transporte: 3, asequibilidad: 3, ocio: 2, ocioNocturno: 1, gastronomia: 2 },
    equilibrado: { transporte: 3, ocio: 3, ocioNocturno: 3, seguridad: 3, calidadAcademica: 3, conectividad: 3, asequibilidad: 3, gastronomia: 3 }
};

function aplicarPerfil(nombre) {
    const perfil = PERFILES[nombre];
    if (!perfil) return;
    currentWeights = { ...currentWeights, ...perfil };
    renderizarSliders();
    aplicarFiltros();
    // Marcar botón activo
    document.querySelectorAll('.qp-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.qp-btn[onclick*="${nombre}"]`);
    if (btn) btn.classList.add('active');
    showToast(`✅ Perfil "${btn?.textContent?.trim()}" aplicado`, 'success');
    activarPaso(2);
}

// Actualiza visualmente los pasos de la guía
function activarPaso(paso) {
    document.querySelectorAll('.step-item').forEach((el, i) => {
        el.classList.toggle('step-active', i < paso);
    });
}

// Toggle Filtros Básicos
window.toggleFiltrosBasicos = function() {
    const btn = document.getElementById('btnToggleFiltros');
    const panel = document.getElementById('filtrosContenido');
    if (!btn || !panel) return;
    
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', !isExpanded);
    panel.style.display = isExpanded ? 'none' : 'block';
    
    if (isExpanded) {
        btn.innerHTML = '⚙️ Ajustar más filtros <span id="filtrosArrow">▼</span>';
    } else {
        btn.innerHTML = '⚙️ Ocultar filtros extra <span id="filtrosArrow">▲</span>';
    }
};

function renderizarSliders() {
    if (!weightsGrid) return;
    weightsGrid.innerHTML = Object.keys(currentWeights).map(key => {
        const val = currentWeights[key];
        const percentage = (val / 5) * 100;
        return `
        <div class="weight-control" data-key="${key}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <label style="font-size:0.85rem; font-weight:600;">${CRIT_LABELS[key] || key}</label>
                <span class="weight-value" style="font-size:0.8rem; color:var(--accent-color); font-weight:bold; background:#eff6ff; padding:2px 8px; border-radius:10px; min-width:34px; text-align:center;">${val.toFixed(1)}</span>
            </div>
            <input type="range" min="1" max="5" step="0.1" value="${val}"
                   class="weight-slider" data-crit="${key}"
                   style="width: 100%;">
            <div class="ahp-weight-bar-container">
                <div class="ahp-weight-bar-fill" style="width: ${percentage}%;"></div>
            </div>
        </div>
    `}).join('');

    document.querySelectorAll('.weight-slider').forEach(s => {
        s.oninput = (e) => {
            const crit = e.target.dataset.crit;
            const v = parseFloat(e.target.value);
            currentWeights[crit] = v;

            // Actualizar valor visible y barra al instante (sin esperar re-render)
            const wrap = e.target.closest('.weight-control');
            if (wrap) {
                const valSpan = wrap.querySelector('.weight-value');
                if (valSpan) valSpan.textContent = v.toFixed(1);
                const fill = wrap.querySelector('.ahp-weight-bar-fill');
                if (fill) fill.style.width = `${(v / 5) * 100}%`;
            }

            aplicarFiltros();
            // Avanzar al paso 2 al tocar prioridades
            activarPaso(2);
        };
    });
}

function renderizarSelectBusquedas() {
    // Mantener el select del top-bar para compatibilidad
    if (savedSearchesContainer && selectBusqueda) {
        savedSearchesContainer.style.display = 'flex';
        selectBusqueda.innerHTML = '<option value="">-- Seleccionar --</option>' +
            userFull.busquedas.map((b, idx) => `<option value="${idx}">${b.nombre} (${b.rol})</option>`).join('');
    }

    // Renderizar pills en la columna 3
    const pillsContainer = document.getElementById('savedSearchesPills');
    if (!pillsContainer) return;

    if (!userFull.busquedas || userFull.busquedas.length === 0) {
        pillsContainer.innerHTML = '<p style="font-size:0.75rem; color:var(--text-muted); text-align:center; margin-top:4px;">Aún no tienes búsquedas guardadas.</p>';
        return;
    }

    pillsContainer.innerHTML = '<p style="font-size:0.72rem; color:var(--text-muted); margin-bottom:6px; font-weight:600;">MIS BÚSQUEDAS:</p>' +
        userFull.busquedas.map((b, idx) => `
            <div class="saved-search-pill" onclick="cargarBusqueda(${idx})" title="Cargar esta búsqueda">
                <div style="min-width:0;">
                    <span class="pill-search-name">${b.nombre}</span>
                    <span class="pill-search-meta">${b.rol === 'trabajador' ? '💼' : '🎓'} ${b.rol}</span>
                </div>
                <button onclick="event.stopPropagation(); eliminarBusqueda('${b._id}', ${idx})"
                        class="pill-delete-btn" title="Eliminar búsqueda">✕</button>
            </div>
        `).join('');
}

function cargarBusqueda(idx) {
    const b = userFull.busquedas[idx];
    if (!b) return;
    currentWeights = { ...currentWeights, ...b.pesos };
    if (selectRol) selectRol.value = b.rol;
    renderizarSliders();
    aplicarFiltros();
    showToast(`📂 Búsqueda cargada: ${b.nombre}`, "success");
}

async function eliminarBusqueda(busquedaId, idx) {
    const nombre = userFull.busquedas[idx]?.nombre || 'esta búsqueda';
    if (!confirm(`¿Eliminar la búsqueda "${nombre}"?`)) return;
    try {
        const res = await fetch(`${API_BASE}/api/usuarios/${userFull._id}/busquedas/${busquedaId}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            const data = await res.json();
            userFull.busquedas = data.busquedas;
            renderizarSelectBusquedas();
            showToast("🗑️ Búsqueda eliminada", "default");
        }
    } catch (e) {
        console.error(e);
        showToast("Error al eliminar la búsqueda", "error");
    }
}

if (selectBusqueda) {
    selectBusqueda.onchange = (e) => {
        const idx = e.target.value;
        if (idx === "") return;
        cargarBusqueda(Number(idx));
    };
}

async function guardarBusqueda(nombre) {
    if (!userFull) {
        showToast("⚠️ Inicia sesión para guardar búsquedas", "error");
        return false;
    }
    if (!nombre) {
        showToast("⚠️ Escribe un nombre para la búsqueda", "error");
        return false;
    }
    try {
        const res = await fetch(`${API_BASE}/api/usuarios/${userFull._id}/busquedas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre,
                rol: selectRol ? selectRol.value : 'estudiante',
                pesos: currentWeights
            })
        });

        if (res.ok) {
            userFull.busquedas = await res.json();
            renderizarSelectBusquedas();
            showToast("✅ Búsqueda guardada con éxito", "success");
            return true;
        }
    } catch (e) { console.error(e); }
    return false;
}

if (btnGuardar) {
    btnGuardar.onclick = async () => {
        const inputNombre = document.getElementById('inputNombreBusqueda');
        const nombre = inputNombre ? inputNombre.value.trim() : '';
        if (!nombre) {
            if (inputNombre) inputNombre.focus();
            showToast("⚠️ Escribe un nombre para la búsqueda", "error");
            return;
        }
        const ok = await guardarBusqueda(nombre);
        if (ok && inputNombre) inputNombre.value = '';
    };
}

const btnGuardarTop = document.getElementById('btnGuardarBusquedaTop');
if (btnGuardarTop) {
    btnGuardarTop.onclick = async () => {
        if (!userFull) {
            showToast("⚠️ Inicia sesión para guardar búsquedas", "error");
            return;
        }
        const sugerido = `Búsqueda ${new Date().toLocaleDateString('es-ES')}`;
        const nombre = (prompt('Nombre para esta búsqueda:', sugerido) || '').trim();
        if (!nombre) return;
        await guardarBusqueda(nombre);
    };
}

const btnResetAHP = document.getElementById('btnResetAHP');
if (btnResetAHP) {
    btnResetAHP.onclick = () => {
        Object.keys(currentWeights).forEach(k => currentWeights[k] = 1);
        if (selectRol) selectRol.value = 'estudiante';
        renderizarSliders();
        aplicarFiltros();
    };
}

// --- LÓGICA MODO EXPERTO (MATRIZ AHP) ---
const btnExpert = document.getElementById('btnExpertAHP');
const panelMatrix = document.getElementById('ahpMatrixPanel');
const tableMatrix = document.getElementById('ahpMatrixTable');
const consistencyInfo = document.getElementById('ahpConsistencyInfo');

if (btnExpert && panelMatrix) {
    btnExpert.onclick = () => {
        const isVisible = panelMatrix.style.display === 'block';
        panelMatrix.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) renderizarMatrizAHP();
    };
}

function renderizarMatrizAHP() {
    const criteria = Object.keys(currentWeights);
    const n = criteria.length;
    
    // Crear matriz de identidad si no existe o sincronizar
    let html = '<thead><tr><th></th>' + criteria.map(c => `<th style="font-size:0.75rem;">${CRIT_LABELS[c] || c}</th>`).join('') + '</tr></thead><tbody>';

    criteria.forEach((rowCrit, i) => {
        html += `<tr><td style="font-weight:700; font-size:0.75rem; padding:8px;">${CRIT_LABELS[rowCrit] || rowCrit}</td>`;
        criteria.forEach((colCrit, j) => {
            if (i === j) {
                html += `<td style="background:#f1f5f9; text-align:center; font-weight:bold; border:1px solid #e2e8f0;">1</td>`;
            } else if (i < j) {
                // Input para comparar row vs col
                html += `<td style="padding:4px; border:1px solid #e2e8f0;">
                          <input type="number" step="1" min="1" max="9" value="1" 
                          onchange="actualizarMatrizAHP(${i}, ${j}, this.value)" 
                          style="width:100%; border:none; background:transparent; text-align:center; font-weight:600; color:var(--accent-color);"></td>`;
            } else {
                // Recíproco (se calcula auto)
                html += `<td id="ahp_${i}_${j}" style="color:var(--text-muted); text-align:center; border:1px solid #e2e8f0; background:#f8fafc;">1</td>`;
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
        <div style="display:flex; flex-direction:column; gap:10px; background:${consistency.consistent ? '#ecfdf5' : '#fef2f2'}; padding:12px; border-radius:8px; border:1px solid ${consistency.consistent ? '#10b981' : '#ef4444'};">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; color:${consistency.consistent ? '#10b981' : '#ef4444'}">
                    ${consistency.consistent ? '✅ Matriz Consistente' : '⚠️ Revisar Consistencia'}
                </span>
                <span style="font-size:0.8rem; font-family:monospace; color:${consistency.consistent ? '#065f46' : '#991b1b'}">
                    CR: ${consistency.cr}
                </span>
            </div>
            ${!consistency.consistent && consistency.worstCell ? `
                <div style="font-size:0.75rem; color:#991b1b; padding-top:5px; border-top:1px dashed #fca5a5;">
                    💡 Revisa la comparación entre <strong>${CRIT_LABELS[criteria[consistency.worstCell.row]] || criteria[consistency.worstCell.row]}</strong> y <strong>${CRIT_LABELS[criteria[consistency.worstCell.col]] || criteria[consistency.worstCell.col]}</strong> (celda resaltada).
                </div>
            ` : ''}
        </div>
        <div style="margin-top:15px;">
            <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">UMBRALES AHP-SORT II <span style="font-weight:400; color:var(--text-muted);">(según pesos actuales)</span>:</p>
            <div style="display:flex; flex-direction:column; gap:5px;">
                ${categoriasConUmbrales().map(cat => `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:10px; height:10px; border-radius:2px; background:${cat.color};"></div>
                        <span style="font-size:0.7rem; flex:1;">${cat.name}</span>
                        <span style="font-size:0.7rem; color:var(--text-muted); font-family:monospace;">≥ ${cat.min.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            <p style="font-size:0.7rem; color:var(--text-muted); margin-top:8px; font-style:italic;">
                🚫 Veto: seguridad &lt; 2.0 ⇒ máximo "🆗 Aceptable".
            </p>
        </div>
    `;

    // --- VISUALIZACIÓN DE INCONSISTENCIA EN TABLA ---
    tableMatrix.querySelectorAll('td').forEach(td => td.classList.remove('inconsistent-cell'));
    if (!consistency.consistent && consistency.worstCell) {
        const { row, col } = consistency.worstCell;
        // Encontrar la celda visual. row+1 (thead), col+1 (primera col con nombres)
        // Pero j > i son inputs, j < i son celdas con id ahp_j_i
        if (row < col) {
            const input = tableMatrix.querySelector(`tr:nth-child(${row+1}) td:nth-child(${col+2})`);
            if (input) input.classList.add('inconsistent-cell');
        } else {
            const cell = document.getElementById(`ahp_${row}_${col}`);
            if (cell) cell.parentElement.classList.add('inconsistent-cell');
        }
    }
}
// La función showToast está definida globalmente en auth.js
// No se redefine aquí para evitar conflictos

const _animStyle = document.createElement('style');
_animStyle.innerHTML = `
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;
document.head.appendChild(_animStyle);

function iniciarSSE() {
    const ev = new EventSource(`${API_BASE}/api/ciudades/stream`);
    ev.onmessage = (e) => {
        ciudades = JSON.parse(e.data);
        aplicarFiltros(); 
    };
}

// Event Listeners
if (slider) {
    slider.addEventListener('input', () => {
        if (etiquetaPrecio) etiquetaPrecio.textContent = `${slider.value}€`;
        aplicarFiltros();
        activarPaso(1);
    });
}

if (selectorAmbiente) {
    selectorAmbiente.addEventListener('change', () => { aplicarFiltros(); activarPaso(1); });
}

if (sliderDistancia) {
    sliderDistancia.addEventListener('input', () => {
        const val = parseInt(sliderDistancia.value);
        if (etiquetaDistancia) {
            etiquetaDistancia.textContent = val >= 2000 ? "Cualquiera" : `${val}km`;
        }
        aplicarFiltros();
        activarPaso(1);
    });
}

if (btnGeo) {
    btnGeo.onclick = () => {
        if (!navigator.geolocation) {
            showToast("❌ Tu navegador no soporta geolocalización", "error");
            return;
        }
        btnGeo.innerText = "📍 Localizando...";
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                ORIGIN = [pos.coords.latitude, pos.coords.longitude];
                if (originText) originText.innerText = "(ubicación actual)";
                btnGeo.innerText = "✅ Ubicación fijada";
                aplicarFiltros();
            },
            (err) => {
                console.error(err);
                showToast("❌ Error al obtener ubicación", "error");
                btnGeo.innerText = "Usar mi ubicación";
            }
        );
    };
    // Obtener ubicación automáticamente al cargar la página
    setTimeout(() => { btnGeo.click(); }, 500);
}

// --- NUEVOS FILTROS ---
// Búsqueda por texto
if (inputBusquedaTexto) {
    inputBusquedaTexto.addEventListener('input', () => { aplicarFiltros(); activarPaso(1); });
}

// Filtro seguridad mínima (pills)
const filtroSeguridadEl = document.getElementById('filtroSeguridad');
if (filtroSeguridadEl) {
    filtroSeguridadEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-pill');
        if (!btn) return;
        filtroSeguridadEl.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        minSeguridad = parseFloat(btn.dataset.val);
        const labelVal = document.getElementById('valorSeguridad');
        if (labelVal) labelVal.textContent = minSeguridad === 0 ? 'Cualquiera' : (minSeguridad === 5 ? 'Solo 5★' : `≥ ${minSeguridad}★`);
        aplicarFiltros();
    });
}

// Ordenar ranking
if (selectOrden) {
    selectOrden.addEventListener('change', aplicarFiltros);
}

// Número de ciudades en el ranking
if (selectTopN) {
    selectTopN.addEventListener('change', () => {
        if (rankingVisible) aplicarFiltros();
    });
}

// Reset filtros
const btnResetFiltros = document.getElementById('btnResetFiltros');
if (btnResetFiltros) {
    btnResetFiltros.onclick = () => {
        if (slider) { slider.value = 1500; if (etiquetaPrecio) etiquetaPrecio.textContent = '1500€'; }
        if (sliderDistancia) { sliderDistancia.value = 2000; if (etiquetaDistancia) etiquetaDistancia.textContent = 'Cualquiera'; }
        if (selectorAmbiente) selectorAmbiente.value = 'todos';
        if (inputBusquedaTexto) inputBusquedaTexto.value = '';
        if (selectOrden) selectOrden.value = 'ahp';
        if (selectTopN) selectTopN.value = '10';
        minSeguridad = 0;
        if (filtroSeguridadEl) {
            filtroSeguridadEl.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
            const primeraPill = filtroSeguridadEl.querySelector('.filter-pill');
            if (primeraPill) primeraPill.classList.add('active');
        }
        const labelVal = document.getElementById('valorSeguridad');
        if (labelVal) labelVal.textContent = 'Cualquiera';
        aplicarFiltros();
        showToast('↩ Filtros restablecidos', 'default');
    };
}

// Inicialización
cargarDatos().then(() => iniciarSSE());

// --- LÓGICA DEL FORMULARIO DE COMUNIDAD ---
const formNuevaCiudad = document.getElementById('formNuevaCiudad');
const formFeedback = document.getElementById('form-feedback');

if (formNuevaCiudad) {
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
                turismo:            3,
                gastronomia:        Number(document.getElementById('f_gastronomia').value) || 3
            },
            coordenadas: {
                type: 'Point',
                coordinates: [lng, lat]
            }
        };
        
        try {
            const respuesta = await fetch(`${API_BASE}/api/ciudades`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(nuevaCiudad)
            });
            
            if (respuesta.ok) {
                const data = await respuesta.json();
                if (formFeedback) {
                    formFeedback.textContent = "📩 " + data.mensaje;
                    formFeedback.className = "feedback-msg feedback-success";
                }
                formNuevaCiudad.reset(); 
                
                setTimeout(() => {
                    if (formFeedback) formFeedback.textContent = "";
                }, 8000);
            } else {
                throw new Error("Error en la respuesta del servidor");
            }
        } catch (error) {
            console.error("Error enviando nueva ciudad:", error);
            if (formFeedback) {
                formFeedback.textContent = "Hubo un problema al añadir la ciudad. Revisa tu conexión.";
                formFeedback.className = "feedback-msg feedback-error";
            }
        }
    });
}