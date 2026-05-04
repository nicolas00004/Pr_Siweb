/**
 * Migración no destructiva: añade `metricas.gastronomia` a las ciudades
 * que aún no la tienen. Deriva el valor a partir de:
 *   - `turismo` (proxy razonable)
 *   - bonus si la etiqueta contiene "Gastronomía"
 *   - bonus por país conocido (Italia, España, Francia, Portugal)
 *
 * Mantiene la escala actual de cada documento (1-5 o 1-10) detectándola
 * por el rango de turismo. No sobrescribe valores ya presentes.
 *
 * Uso:
 *   node server/scripts/add_gastronomia.js
 */

const mongoose = require('mongoose');

const URI = process.env.MONGO_URI || 'mongodb://localhost:27017/infuni';

const CiudadSchema = new mongoose.Schema({}, { strict: false });
const Ciudad = mongoose.model('Ciudad', CiudadSchema, 'ciudades');

const PAIS_BONUS = {
    'Italia': 1.0,
    'España': 0.8,
    'Francia': 0.7,
    'Portugal': 0.6,
    'Grecia': 0.5
};

function calcularGastronomia(ciudad) {
    const turismo = ciudad?.metricas?.turismo;
    if (turismo == null) return null;

    // Detectar escala por el valor (turismo > 5 → escala 1-10, sino 1-5)
    const escala10 = turismo > 5;
    const max = escala10 ? 10 : 5;

    let val = turismo;

    // Bonus etiqueta "Gastronomía"
    const etiquetas = Array.isArray(ciudad.etiquetas) ? ciudad.etiquetas : [];
    if (etiquetas.some(t => /gastronom/i.test(String(t)))) {
        val += escala10 ? 1.0 : 0.5;
    }

    // Bonus país
    const bonusPais = PAIS_BONUS[ciudad.pais] || 0;
    val += escala10 ? bonusPais : bonusPais * 0.5;

    return Math.round(Math.min(max, val) * 10) / 10;
}

async function main() {
    await mongoose.connect(URI);
    console.log(`✅ Conectado a ${URI}`);

    const ciudades = await Ciudad.find({}).lean();
    console.log(`📍 ${ciudades.length} ciudades en total`);

    let actualizadas = 0;
    let saltadas = 0;
    for (const c of ciudades) {
        if (c?.metricas?.gastronomia != null) {
            saltadas++;
            continue;
        }
        const g = calcularGastronomia(c);
        if (g == null) {
            console.warn(`⚠️  ${c.nombre}: sin métrica turismo, no se puede derivar`);
            continue;
        }
        await Ciudad.updateOne({ _id: c._id }, { $set: { 'metricas.gastronomia': g } });
        console.log(`  + ${c.nombre.padEnd(28)} gastronomia = ${g}`);
        actualizadas++;
    }

    console.log(`\n✨ Migración completa: ${actualizadas} actualizadas, ${saltadas} ya tenían el campo.`);
    await mongoose.disconnect();
}

main().catch(err => {
    console.error('❌ Error en migración:', err);
    process.exit(1);
});
