document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('active');
            menuToggle.innerHTML = navMenu.classList.contains('active') ? '✕' : '☰';
        });

        // Cerrar menú al hacer click fuera
        document.addEventListener('click', (e) => {
            if (navMenu.classList.contains('active') && !navMenu.contains(e.target) && e.target !== menuToggle) {
                navMenu.classList.remove('active');
                menuToggle.innerHTML = '☰';
            }
        });

        // Cerrar menú al redimensionar a desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 992 && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                menuToggle.innerHTML = '☰';
            }
        });
    }
});
