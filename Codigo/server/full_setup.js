const { execSync } = require('child_process');

async function pipeline() {
    try {
        console.log('🚀 INICIANDO SETUP DE INFUNI (MODO CARPETAS)\n');

        console.log('1️⃣  Sincronizando Países y Ciudades desde archivos...');
        execSync('node seed.js', { stdio: 'inherit' });

        console.log('\n2️⃣  Extrayendo precios reales de Numbeo...');
        execSync('node scripts/importPreciosReales.js', { stdio: 'inherit' });

        console.log('\n3️⃣  Calculando notas de gastronomía...');
        execSync('node scripts/importGastronomiaReal.js', { stdio: 'inherit' });

        console.log('\n✨ WEB ACTUALIZADA. Solo has tenido que mover archivos JSON.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error en el proceso:', e);
        process.exit(1);
    }
}

pipeline();