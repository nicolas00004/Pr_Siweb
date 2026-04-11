/**
 * Lógica compartida para las Hojas de Ruta Globales
 * Maneja la persistencia de tareas individuales en localStorage
 */

const STORAGE_KEY = 'infuni_checklist_state';

// 1. Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    loadChecklistState();
    updateGlobalProgress();
});

/**
 * Función que se llama cada vez que un checkbox cambia
 */
function toggleTask(id) {
    const cb = document.getElementById(id);
    if (!cb) return;

    const label = cb.parentElement;
    if (cb.checked) label.classList.add('done');
    else label.classList.remove('done');

    saveChecklistState(id, cb.checked);
    updateGlobalProgress();
}

/**
 * Guarda un estado individual en el mapa de persistencia
 */
function saveChecklistState(id, isChecked) {
    let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    state[id] = isChecked;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Carga el estado de todos los checkboxes presentes en la página actual
 */
function loadChecklistState() {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const inputs = document.querySelectorAll('.checklist input[type="checkbox"]');
    
    inputs.forEach(input => {
        const id = input.id;
        if (state[id] !== undefined) {
            input.checked = state[id];
            if (input.checked) input.parentElement.classList.add('done');
        }
    });
}

/**
 * Calcula el progreso total basado en todas las tareas posibles (estén o no en esta página)
 * y actualiza los elementos visuales si existen.
 */
function updateGlobalProgress() {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    
    // Lista de IDs totales esperados en todas las guías (para normalizar el 100%)
    const allExpectedTasks = [
        'v-1', 'v-2', 'v-3', 'v-4', 'v-5', // Vivienda
        'l-1', 'l-2', 'l-3', 'l-4', 'l-5', // Legal
        's-1', 's-2', 's-3', 's-4',        // Salud
        'm-1', 'm-2', 'm-3', 'm-4',        // Maleta
        'f-1', 'f-2', 'f-3', 'f-4',        // Finanzas
        'c-1', 'c-2', 'c-3'                // Cultura
    ];

    let doneCount = 0;
    allExpectedTasks.forEach(taskId => {
        if (state[taskId] === true) doneCount++;
    });

    const totalTasks = allExpectedTasks.length;
    const pct = Math.round((doneCount / totalTasks) * 100);

    // Actualizar barra de progreso (si la página la tiene)
    const progressBar = document.getElementById('main-progress');
    const progressText = document.getElementById('progress-text');

    if (progressBar) progressBar.style.width = pct + '%';
    if (progressText) {
        progressText.innerText = `Has completado ${doneCount} de ${totalTasks} pasos esenciales en tu viaje.`;
    }

    // Easter Egg en el Hub
    const progTitle = document.querySelector('.progress-info h2');
    if (progTitle) {
        if (pct === 100) progTitle.innerText = "🏆 ¡MISIÓN CUMPLIDA!";
        else progTitle.innerText = "Tu Hoja de Ruta Global";
    }
}
