// Datos de ejemplo para el proyecto INFUNI
const ciudades = [
    { nombre: "Granada", presupuesto: 400, ambiente: "fiesta", seguridad: 5, ocio: 5 },
    { nombre: "Madrid", presupuesto: 900, ambiente: "fiesta", seguridad: 4, ocio: 5 },
    { nombre: "Salamanca", presupuesto: 500, ambiente: "tranquilo", seguridad: 5, ocio: 4 },
    { nombre: "Bolonia", presupuesto: 750, ambiente: "fiesta", seguridad: 4, ocio: 4 },
    { nombre: "Cracovia", presupuesto: 350, ambiente: "tranquilo", seguridad: 4, ocio: 4 },
    { nombre: "Barcelona", presupuesto: 950, ambiente: "fiesta", seguridad: 3, ocio: 5 }
];

// Selección de elementos
const contenedor = document.getElementById('contenedorCiudades');
const slider = document.getElementById('rangoPresupuesto');
const etiquetaPrecio = document.getElementById('valorPresupuesto');
const selectorAmbiente = document.getElementById('selectAmbiente');
const inputBusqueda = document.getElementById('inputBusqueda');
const btnBuscar = document.getElementById('btnBuscar');

// Función para pintar las tarjetas en el HTML
function renderizarCiudades(datos) {
    contenedor.innerHTML = "";
    
    if (datos.length === 0) {
        contenedor.innerHTML = "<p style='grid-column: 1/-1; text-align: center; padding: 2rem;'>No se encontraron ciudades con esos criterios.</p>";
        return;
    }

    datos.forEach(ciudad => {
        // Usamos backticks `` para el template string
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
// Función maestra de filtrado
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

// Eventos
slider.addEventListener('input', (e) => {
    etiquetaPrecio.innerText = e.target.value + "€";
    aplicarFiltros();
});

selectorAmbiente.addEventListener('change', aplicarFiltros);

btnBuscar.addEventListener('click', () => {
    const texto = inputBusqueda.value.toLowerCase();
    const resultados = ciudades.filter(c => c.nombre.toLowerCase().includes(texto));
    renderizarCiudades(resultados);
});

// Carga inicial
renderizarCiudades(ciudades);