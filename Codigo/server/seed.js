// seed.js
const mongoose = require('mongoose');
const fs = require('fs');   
const path = require('path'); 

mongoose.connect('mongodb://localhost:27017/infuni')
    .then(() => console.log('✅ Conectado a MongoDB para el sembrado'))
    .catch(err => {
        console.error('❌ Error de conexión:', err);
        process.exit(1);
    });

// --- ESQUEMAS ---
const PaisSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    codigoISO: String,
    moneda: String,
    idiomaOficial: String,
    transporte: Number, ocio: Number, ocioNocturno: Number, seguridad: Number, calidadAcademica: Number, costeVidaMedio: Number, climaMedio: String
});

const CiudadSchema = new mongoose.Schema({
    nombre: String,
    pais: String,
    c_postal: String,
    metricas: {
        seguridad: Number, costeAlquilerMedio: Number, costeOcioMedio: Number, ambienteNocturno: Number,
        calidadTransporte: Number, calidadAcademica: Number, conectividad: Number, turismo: Number, gastronomia: Number
    },
    etiquetas: [String],
    tipoAmbiente: String,
    coordenadas: {
        type: { type: String, enum: ['Point'], default: 'Point' },
     coordinates: { type: [Number], default: [0, 0] }
    },
    valoracionMedia: { type: Number, default: 0 },
    jsonRef: String,
    paisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pais' },
    historia: String, alojamiento: String, barrios: String, imagenes: [String]
});
CiudadSchema.index({ coordenadas: '2dsphere' });

const UniversidadSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    descripcion: String,
    ciudadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad', required: true }
});

const SitioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    categoria: { type: String, enum: ['ocio', 'ocioNocturno', 'cultura', 'seguridad', 'academica', 'transporte'], default: 'ocio' },
    descripcion: String,
    ciudadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad', required: true }
});

const UsuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellidos: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    tipoPerfil: String,
    nacionalidad: String,
    idioma: String,
    ciudadesGuardadas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad' }],
    paisesRelacionados: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pais' }],
    fechaRegistro: { type: Date, default: Date.now }
});

const BusquedaSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    nombre: String, rol: String, transporte: Number, ocio: Number, ocioNocturno: Number, seguridad: Number, calidadAcademica: Number, fecha: { type: Date, default: Date.now }
});

const OpinionSchema = new mongoose.Schema({
    categoria: { type: String, default: 'general' },
    puntuacion: { type: Number, required: true, min: 1, max: 5 },  // no 'valoracion'
    texto_opinion: { type: String, required: true },               // no 'texto'
    id_usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },  // no 'usuarioId'
    id_ciudad: { type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad', required: true },    // no 'ciudadId'
    fecha_publicacion: { type: Date, default: Date.now },           // no 'fecha'
    pesos: {
        transporte: { type: Number, default: 5 },
        ocio: { type: Number, default: 5 },
        ocioNocturno: { type: Number, default: 5 },
        seguridad: { type: Number, default: 5 },
        calidadAcademica: { type: Number, default: 5 }
    }
});

const Pais = mongoose.model('Pais', PaisSchema, 'paises');
const Ciudad = mongoose.model('Ciudad', CiudadSchema, 'ciudades');
const Universidad = mongoose.model('Universidad', UniversidadSchema, 'universidades');
const Sitio = mongoose.model('Sitio', SitioSchema, 'sitios');
const Usuario = mongoose.model('Usuario', UsuarioSchema, 'usuarios');
const Busqueda = mongoose.model('Busqueda', BusquedaSchema, 'busquedas');
const Opinion = mongoose.model('Opinion', OpinionSchema, 'resenas');

const ciudadesData = [
    // --- España ---
    {
        nombre: 'Granada', pais: 'España', c_postal: '18001', tipoAmbiente: 'fiesta', jsonRef: 'granada',
        metricas: { seguridad: 5, costeAlquilerMedio: 250, costeOcioMedio: 150, ambienteNocturno: 5, calidadTransporte: 3, calidadAcademica: 5, conectividad: 4, turismo: 5, gastronomia: 5 },
        coordenadas: { type: 'Point', coordinates: [-3.7003, 37.1773] }
    },
    {
        nombre: 'Sevilla', pais: 'España', c_postal: '41001', tipoAmbiente: 'fiesta', jsonRef: 'sevilla',
        metricas: { seguridad: 4, costeAlquilerMedio: 350, costeOcioMedio: 200, ambienteNocturno: 5, calidadTransporte: 4, calidadAcademica: 4, conectividad: 4, turismo: 5, gastronomia: 5 },
        coordenadas: { type: 'Point', coordinates: [-5.9845, 37.3891] }
    },
    {
        nombre: 'Madrid', pais: 'España', c_postal: '28001', tipoAmbiente: 'fiesta', jsonRef: 'madrid',
        metricas: { seguridad: 4, costeAlquilerMedio: 700, costeOcioMedio: 250, ambienteNocturno: 5, calidadTransporte: 5, calidadAcademica: 5, conectividad: 5, turismo: 5, gastronomia: 5 },
        coordenadas: { type: 'Point', coordinates: [-3.7038, 40.4168] }
    },
    {
        nombre: 'Salamanca', pais: 'España', c_postal: '37001', tipoAmbiente: 'tranquilo', jsonRef: 'salamanca',
        metricas: { seguridad: 5, costeAlquilerMedio: 280, costeOcioMedio: 150, ambienteNocturno: 4, calidadTransporte: 2, calidadAcademica: 5, conectividad: 3, turismo: 4, gastronomia: 4 },
        coordenadas: { type: 'Point', coordinates: [-5.6700, 40.9701] }
    },
    {
        nombre: 'Valencia', pais: 'España', c_postal: '46001', tipoAmbiente: 'fiesta', jsonRef: 'valencia',
        metricas: { seguridad: 4, costeAlquilerMedio: 380, costeOcioMedio: 200, ambienteNocturno: 4, calidadTransporte: 4, calidadAcademica: 4, conectividad: 4, turismo: 4, gastronomia: 5 },
        coordenadas: { type: 'Point', coordinates: [-0.3763, 39.4699] }
    },
    {
        nombre: 'Barcelona', pais: 'España', c_postal: '08001', tipoAmbiente: 'fiesta', jsonRef: 'barcelona',
        metricas: { seguridad: 3, costeAlquilerMedio: 800, costeOcioMedio: 300, ambienteNocturno: 5, calidadTransporte: 5, calidadAcademica: 5, conectividad: 5, turismo: 5, gastronomia: 5 },
        coordenadas: { type: 'Point', coordinates: [2.1734, 41.3851] }
    },
    {
        nombre: 'Santiago de Compostela', pais: 'España', c_postal: '15701', tipoAmbiente: 'montaña', jsonRef: 'santiago',
        metricas: { seguridad: 5, costeAlquilerMedio: 220, costeOcioMedio: 150, ambienteNocturno: 5, calidadTransporte: 3, calidadAcademica: 5, conectividad: 3, turismo: 5, gastronomia: 5 },
        coordenadas: { type: 'Point', coordinates: [-8.5448, 42.8782] }
    },
    {
        nombre: 'Málaga', pais: 'España', c_postal: '29001', tipoAmbiente: 'playa', jsonRef: 'malaga',
        metricas: { seguridad: 4, costeAlquilerMedio: 400, costeOcioMedio: 250, ambienteNocturno: 5, calidadTransporte: 4, calidadAcademica: 4, conectividad: 5, turismo: 5, gastronomia: 5 },
        coordenadas: { type: 'Point', coordinates: [-4.4214, 36.7213] }
    },
    // --- FRANCIA ---
    {
        nombre: 'Montpellier', pais: 'Francia', c_postal: '34000', tipoAmbiente: 'fiesta', jsonRef: 'montpellier',
        metricas: { seguridad: 3, costeAlquilerMedio: 600, costeOcioMedio: 350, ambienteNocturno: 5, calidadTransporte: 5, calidadAcademica: 4, conectividad: 4, turismo: 4, gastronomia: 5 },
        coordenadas: { type: 'Point', coordinates: [3.8767, 43.6108] }
    },
    //{
   //     nombre: 'Lyon', pais: 'Francia', c_postal: '69000', tipoAmbiente: 'ciudad', jsonRef: 'lyon',
   //     metricas: { seguridad: 4, costeAlquilerMedio: 750, costeOcioMedio: 400, ambienteNocturno: 4, calidadTransporte: 5, calidadAcademica: 5, conectividad: 5, turismo: 5 },
   //     coordenadas: { type: 'Point', coordinates: [4.8357, 45.7640] }
   // },

    // --- ITALIA ---
    {
        nombre: 'Bolonia', pais: 'Italia', c_postal: '40121', tipoAmbiente: 'fiesta', jsonRef: 'bolonia',
        metricas: { seguridad: 4, costeAlquilerMedio: 550, costeOcioMedio: 300, ambienteNocturno: 5, calidadTransporte: 4, calidadAcademica: 5, conectividad: 4, turismo: 4, gastronomia: 5 },
        coordenadas: { type: 'Point', coordinates: [11.3426, 44.4949] }
    },
   // {
   //     nombre: 'Padua', pais: 'Italia', c_postal: '35121', tipoAmbiente: 'tranquilo', jsonRef: 'padua',
   //     metricas: { seguridad: 5, costeAlquilerMedio: 450, costeOcioMedio: 250, ambienteNocturno: 4, calidadTransporte: 4, calidadAcademica: 5, conectividad: 3, turismo: 4 },
    //    coordenadas: { type: 'Point', coordinates: [11.8768, 45.4064] }
   // },

    // --- ALEMANIA ---
    {
        nombre: 'Munich', pais: 'Alemania', c_postal: '80331', tipoAmbiente: 'ciudad', jsonRef: 'munich',
        metricas: { seguridad: 5, costeAlquilerMedio: 950, costeOcioMedio: 450, ambienteNocturno: 4, calidadTransporte: 5, calidadAcademica: 5, conectividad: 5, turismo: 5, gastronomia: 4 },
        coordenadas: { type: 'Point', coordinates: [11.5820, 48.1351] }
    },
   // {
    //    nombre: 'Heidelberg', pais: 'Alemania', c_postal: '69115', tipoAmbiente: 'tranquilo', jsonRef: 'heidelberg',
   //     metricas: { seguridad: 5, costeAlquilerMedio: 650, costeOcioMedio: 350, ambienteNocturno: 3, calidadTransporte: 5, calidadAcademica: 5, conectividad: 3, turismo: 5 },
    //    coordenadas: { type: 'Point', coordinates: [8.6724, 49.3988] }
   // },

    // --- PORTUGAL ---
    {
        nombre: 'Coímbra', pais: 'Portugal', c_postal: '3000', tipoAmbiente: 'tranquilo', jsonRef: 'coimbra',
       metricas: { seguridad: 5, costeAlquilerMedio: 350, costeOcioMedio: 200, ambienteNocturno: 4, calidadTransporte: 3, calidadAcademica: 4, conectividad: 3, turismo: 4, gastronomia: 4 },
        coordenadas: { type: 'Point', coordinates: [-8.4115, 40.2033] }
    }
   // {
   //     nombre: 'Oporto', pais: 'Portugal', c_postal: '4000', tipoAmbiente: 'playa', jsonRef: 'oporto',
    //    metricas: { seguridad: 4, costeAlquilerMedio: 550, costeOcioMedio: 250, ambienteNocturno: 5, calidadTransporte: 4, calidadAcademica: 4, conectividad: 5, turismo: 5 },
    //    coordenadas: { type: 'Point', coordinates: [-8.6291, 41.1579] }
    // }
];



async function poblarBD() {
    try {
        console.log('🧹 Limpiando colecciones...');
        await Promise.all([
            Pais.deleteMany({}), Ciudad.deleteMany({}), Universidad.deleteMany({}),
            Sitio.deleteMany({}), Usuario.deleteMany({}), Busqueda.deleteMany({}), Opinion.deleteMany({})
        ]);

        // 1. Crear Países
        const paisesCreados = {};
        const datosPaises = [
            { nombre: 'España', codigoISO: 'ES', moneda: 'EUR', idiomaOficial: 'Español', transporte: 4, ocio: 5, ocioNocturno: 5, seguridad: 4, calidadAcademica: 4, costeVidaMedio: 800, climaMedio: 'Mediterráneo' },
            { nombre: 'Francia', codigoISO: 'FR', moneda: 'EUR', idiomaOficial: 'Francés', transporte: 5, ocio: 4, ocioNocturno: 4, seguridad: 3, calidadAcademica: 5, costeVidaMedio: 1100, climaMedio: 'Templado' }
        ];
      
        for (const p of datosPaises) {
            const nuevoPais = await Pais.create(p);
            paisesCreados[p.nombre] = nuevoPais;
        }
        console.log('✅ Países creados.');

        // 2. Crear Ciudades
        const ciudadesInsertadas = [];
        for (const dataBasica of ciudadesData) {
            let datosExtra = { historia: "", alojamiento: "", barrios: "", imagenes: [], universidades: [], sitios: [] };
            const rutaJson = path.join(__dirname, '../info', `${dataBasica.jsonRef}.json`);
            
            if (fs.existsSync(rutaJson)) {
                try {
                    const contenido = fs.readFileSync(rutaJson, 'utf8');
                    if (contenido.trim()) datosExtra = JSON.parse(contenido);
                } catch (e) {
                    console.error(`⚠️ Error en ${dataBasica.jsonRef}.json:`, e.message);
                }
            }

            const ciudad = await Ciudad.create({
                ...dataBasica,
                paisId: paisesCreados[dataBasica.pais]?._id,
                historia: datosExtra.historia,
                alojamiento: datosExtra.alojamiento,
                barrios: datosExtra.barrios,
                imagenes: datosExtra.imagenes
            });

            ciudadesInsertadas.push(ciudad);
            if (datosExtra.universidades) {
                for (const u of datosExtra.universidades) await Universidad.create({ ...u, ciudadId: ciudad._id });
            }
            if (datosExtra.sitios) {
                for (const s of datosExtra.sitios) await Sitio.create({ ...s, ciudadId: ciudad._id });
            }
        }
        console.log('✅ Ciudades, universidades y sitios creados.');

        // 3. REFERENCIAS PARA USUARIOS Y OPINIONES (CORREGIDO)
        const ciudadGranada = ciudadesInsertadas.find(c => c.nombre === 'Granada');
        const ciudadMadrid = ciudadesInsertadas.find(c => c.nombre === 'Madrid');
        const espana = paisesCreados['España'];

        // 4. Crear Usuarios de prueba
        const usuario1 = await Usuario.create({
            nombre: 'María',
            apellidos: 'Pérez',
            email: 'maria@universidad.es',
            password: '123456',
            tipoPerfil: 'estudiante',
            paisesRelacionados: [espana._id],
            ciudadesGuardadas: [ciudadGranada._id, ciudadMadrid._id]
        });

        await Usuario.create({
            nombre: 'Carlos',
            apellidos: 'López',
            email: 'carlos@universidad.es',
            password: '123456',
            tipoPerfil: 'estudiante',
            ciudadesGuardadas: []
        });

        // 5. Crear Búsquedas guardadas
        await Busqueda.create({
            usuarioId: usuario1._id,
            nombre: 'Mi búsqueda: Erasmus perfecto',
            rol: 'estudiante',
            transporte: 3, ocio: 4, ocioNocturno: 2, seguridad: 5, calidadAcademica: 5
        });

        // 6. Crear Opiniones de prueba
        await Opinion.create({
            texto_opinion: '¡Granada es increíble y súper barata! El ambiente estudiantil es inmejorable.',
            puntuacion: 5,
            id_usuario: usuario1._id,
            id_ciudad: ciudadGranada._id,
            pesos: { transporte: 3, ocio: 5, ocioNocturno: 5, seguridad: 4, calidadAcademica: 4 }
        });

        await Opinion.create({
            texto_opinion: 'Madrid tiene todo pero el precio del alquiler es una locura.',
            puntuacion: 4,
            id_usuario: usuario1._id,
            id_ciudad: ciudadMadrid._id,
            pesos: { transporte: 5, ocio: 4, ocioNocturno: 5, seguridad: 4, calidadAcademica: 5 }
        });

        // 7. Actualizar valoracionMedia
        for (const ciudad of [ciudadGranada, ciudadMadrid]) {
            const ops = await Opinion.find({ id_ciudad: ciudad._id });
            const media = ops.reduce((a, o) => a + o.puntuacion, 0) / ops.length;
            await Ciudad.findByIdAndUpdate(ciudad._id, { valoracionMedia: Math.round(media * 10) / 10 });
        }

        console.log('\n🎉 ¡Seed completado con éxito con todos los datos!');

    } catch (err) {
        console.error('❌ Error durante el proceso:', err);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Conexión cerrada.');
        process.exit(0);
    }
}

poblarBD();

