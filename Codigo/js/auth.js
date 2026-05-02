// auth.js - Gestión global de sesión y navegación UI
const API_AUTH = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    const userInfo = JSON.parse(localStorage.getItem('usuarioInfo'));
    const loginBtn = document.querySelector('.btn-login');
    const navUl = document.querySelector('.nav-global ul');

    // 1. Si el usuario está logueado, eliminamos "Inicia Sesión" y mostramos perfil + salir
    if (userInfo && loginBtn && navUl) {
        // Eliminar por completo el <li> del botón "Inicia Sesión"
        const loginLi = loginBtn.closest('li');
        if (loginLi) loginLi.remove();

        // Añadir item "Mi Perfil" reutilizando .btn-login para padding/radius/color blanco
        const perfilLi = document.createElement('li');
        perfilLi.innerHTML = `<a href="/html/perfil.html" class="btn-login btn-logged">Mi Perfil (${userInfo.nombre}) 👤</a>`;
        navUl.appendChild(perfilLi);

        // Añadir botón de cerrar sesión al lado
        const logoutLi = document.createElement('li');
        logoutLi.innerHTML = `<a href="#" id="globalLogout" style="color: #ef4444; font-weight: bold;">Salir 🚪</a>`;
        navUl.appendChild(logoutLi);

        document.getElementById('globalLogout').addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('¿Cerrar sesión?')) {
                localStorage.removeItem('usuarioInfo');
                window.location.href = '/html/index.html';
            }
        });
    }

    // 2. Protección de rutas privadas
    const path = window.location.pathname;
    if (path.includes('perfil.html') && !userInfo) {
        window.location.href = '/html/login.html';
    }

    // 3. Redirección si ya está logueado e intenta entrar a login/registro
    if ((path.includes('login.html') || path.includes('registro.html')) && userInfo) {
        window.location.href = '/html/busqueda.html';
    }

    // 4. Crear contenedor de notificaciones si no existe
    if (!document.getElementById('toast-container')) {
        const tc = document.createElement('div');
        tc.id = 'toast-container';
        document.body.appendChild(tc);
    }
});

/**
 * Muestra una notificación temporal elegante
 */
function showToast(msg, type = 'success') {
    const tc = document.getElementById('toast-container');
    if (!tc) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    tc.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Helper global para obtener el ID del usuario
function getUserId() {
    const user = JSON.parse(localStorage.getItem('usuarioInfo'));
    return user ? user._id || user.id : null;
}

/**
 * Verifica si la respuesta del servidor indica un ID de usuario no válido (sesión huérfana).
 * Si es así, limpia la sesión y redirige al login.
 */
async function verificarSesion(res) {
    if (res.status === 404) {
        // Clonamos la respuesta para poder leer el JSON sin agotar el body si otros scripts lo necesitan
        const tempRes = res.clone();
        try {
            const data = await tempRes.json();
            if (data.error && data.error.includes("reinicia sesión")) {
                alert("⚠️ Tu sesión ya no es válida (el servidor ha sido reiniciado). Por favor, inicia sesión de nuevo.");
                localStorage.removeItem('usuarioInfo');
                window.location.href = '/html/login.html';
                return true;
            }
        } catch (e) { /* No era un JSON de error válido */ }
    }
    return false;
}
