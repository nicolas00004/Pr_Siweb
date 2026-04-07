// Selección de elementos (Mantengo tus constantes)
const contenedor = document.getElementById('contenedorCiudades');
const slider = document.getElementById('rangoPresupuesto');
const etiquetaPrecio = document.getElementById('valorPresupuesto');
const selectorAmbiente = document.getElementById('selectAmbiente');
const inputBusqueda = document.getElementById('inputBusqueda');
const btnBuscar = document.getElementById('btnBuscar');

let ciudades = []; // Empezamos con el array vacío

// --- NUEVA FUNCIÓN PARA TRAER LOS DATOS ---
async function cargarDatos() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/ciudades');
        ciudades = await respuesta.json();
        renderizarCiudades(ciudades); // Primera carga
    } catch (error) {
        console.error("Error al cargar datos de MongoDB:", error);
        contenedor.innerHTML = "<p>Error al conectar con la base de datos.</p>";
    }
}

// Función para pintar las tarjetas (Igual a la tuya, con una mejora en seguridad)
function renderizarCiudades(datos) {
    contenedor.innerHTML = "";
    if (datos.length === 0) {
        contenedor.innerHTML = "<p style='grid-column: 1/-1; text-align: center; padding: 2rem;'>No se encontraron resultados.</p>";
        return;
    }

    datos.forEach(ciudad => {
        const tarjeta = `
            <article class="card">
                <h3>${ciudad.nombre}</h3>
                <p><strong>Presupuesto:</strong> ${ciudad.presupuesto}€</p>
                <p><strong>Seguridad:</strong> ${"⭐".repeat(ciudad.seguridad || 0)}</p>
                <p><strong>Ocio:</strong> ${"⭐".repeat(ciudad.ocio || 0)}</p>
                <p><em>Ambiente: ${ciudad.ambiente}</em></p>
                <a href="#">Ver detalles</a>
            </article>
        `;
        contenedor.innerHTML += tarjeta;
    });
}

// Función de filtrado (Se mantiene igual, ahora usa la variable global 'ciudades')
function aplicarFiltros() {
    const presupuestoMax = parseInt(slider.value);
    const ambienteFiltro = selectorAmbiente.value;

    const filtradas = ciudades.filter(c => {
        const coincidePresupuesto = c.presupuesto <= presupuestoMax;
        const coincideAmbiente = (ambienteFiltro === "todos") || (c.ambiente === ambienteFiltro);
        return coincidePresupuesto && coincideAmbiente;
    });

    renderizarCiudades(filtradas);
}

// Eventos (Iguales)
slider.addEventListener('input', (e) => {
    etiquetaPrecio.innerText = e.target.value + "€";
    aplicarFiltros();
});
selectorAmbiente.addEventListener('change', aplicarFiltros);

// Carga inicial: En lugar de renderizar, ejecutamos la petición al servidor
cargarDatos();