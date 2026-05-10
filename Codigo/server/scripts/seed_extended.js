const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/bdd')
    .then(() => console.log('✅ Conectado a MongoDB para semilla extendida'))
    .catch(err => { console.error(err); process.exit(1); });

// Importar modelos (necesitamos cargarlos desde schemas si no existen o usar los de server.js)
const CiudadSchema = new mongoose.Schema({
    nombre: String,
    lat: Number,
    lng: Number,
    presupuesto: Number,
    ambiente: String,
    seguridad: Number,
    ocio: Number,
    transporte: Number,
    ocioNocturno: Number,
    calidadAcademica: Number,
    historia: String,
    alojamiento: String,
    barrios: String
}, { strict: false });
const Ciudad = mongoose.model('Ciudad', CiudadSchema, 'ciudades');

const PaisSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    transporte: { type: Number, default: 3 },
    ocio: { type: Number, default: 3 },
    ocioNocturno: { type: Number, default: 3 },
    seguridad: { type: Number, default: 3 },
    calidadAcademica: { type: Number, default: 3 }
});
const Pais = mongoose.model('Pais', PaisSchema, 'paises');

const UniversidadSchema = new mongoose.Schema({
    nombre: String,
    descripcion: String,
    ciudadId: mongoose.Schema.Types.ObjectId
});
const Universidad = mongoose.model('Universidad', UniversidadSchema, 'universidades');

const SitioSchema = new mongoose.Schema({
    nombre: String,
    categoria: String,
    descripcion: String,
    ciudadId: mongoose.Schema.Types.ObjectId
});
const Sitio = mongoose.model('Sitio', SitioSchema, 'sitios');

const nuevasCiudades = [
    {
        nombre: "Granada",
        lat: 37.1773, lng: -3.5986,
        presupuesto: 420, ambiente: "fiesta",
        historia: "Granada es una joya andaluza a los pies de Sierra Nevada...",
        universidades: [
            { nombre: "UGR - Facultad de Ciencias", descripcion: "Uno de los campus más activos de la universidad." },
            { nombre: "UGR - Facultad de Derecho", descripcion: "Ubicada en un edificio histórico en el centro." }
        ],
        sitios: [
            { nombre: "La Alhambra", categoria: "cultura", descripcion: "Palacio y fortaleza nazarí." },
            { nombre: "Calle Elvira", categoria: "ocio", descripcion: "Zona famosa por sus bares de tapas." }
        ]
    },
    {
        nombre: "Madrid",
        lat: 40.4168, lng: -3.7038,
        presupuesto: 850, ambiente: "fiesta",
        historia: "La capital de España ofrece una vida cultural inagotable...",
        universidades: [
            { nombre: "Universidad Complutense (UCM)", descripcion: "Principal campus de la capital." },
            { nombre: "Universidad Autónoma (UAM)", descripcion: "Referente en investigación." }
        ],
        sitios: [
            { nombre: "Museo del Prado", categoria: "cultura", descripcion: "Una de las pinacotecas más importantes del mundo." },
            { nombre: "Estadio Santiago Bernabéu", categoria: "ocio", descripcion: "Templo del fútbol mundial." }
        ]
    },
    {
        nombre: "Barcelona",
        lat: 41.3851, lng: 2.1734,
        presupuesto: 900, ambiente: "fiesta",
        historia: "Ciudad cosmopolita bañada por el Mediterráneo...",
        universidades: [
            { nombre: "Universitat de Barcelona (UB)", descripcion: "Institución histórica en el corazón de la ciudad." },
            { nombre: "UPC - Campus Nord", descripcion: "Referente en ingeniería y tecnología." }
        ],
        sitios: [
            { nombre: "Sagrada Familia", categoria: "cultura", descripcion: "Obra maestra de Gaudí." },
            { nombre: "Parque Güell", categoria: "ocio", descripcion: "Espacio verde con vistas increíbles." }
        ]
    },
    {
        nombre: "Sevilla",
        lat: 37.3891, lng: -5.9845,
        presupuesto: 550, ambiente: "fiesta",
        historia: "La capital hispalense destaca por su duende y color...",
        universidades: [
            { nombre: "Universidad de Sevilla (US)", descripcion: "Ubicada en la antigua Fábrica de Tabacos." }
        ],
        sitios: [
            { nombre: "La Giralda", categoria: "cultura", descripcion: "Torre campanario de la catedral." },
            { nombre: "Barrio de San Bernardo", categoria: "seguridad", descripcion: "Zona residencial e histórica." }
        ]
    }
];

async function seed() {
    try {
        console.log("🧹 Limpiando datos antiguos...");
        await Promise.all([
            Universidad.deleteMany({}),
            Sitio.deleteMany({}),
            Pais.deleteMany({}) // Limpiar países para regenerar
        ]);

        // Crear Países base
        const paises = await Pais.insertMany([
            { nombre: "España", seguridad: 4, ocio: 5 },
            { nombre: "Francia", seguridad: 3, ocio: 4 },
            { nombre: "Portugal", seguridad: 5, ocio: 3 }
        ]);
        console.log("🌍 Países creados.");

        for (const data of nuevasCiudades) {
            // Buscar o crear ciudad
            let ciudad = await Ciudad.findOne({ nombre: data.nombre });
            // Asignar país por defecto (España para estas ciudades nuevas)
            const paisEspaña = paises.find(p => p.nombre === "España");

            if (ciudad) {
                await Ciudad.findByIdAndUpdate(ciudad._id, {
                    lat: data.lat,
                    lng: data.lng,
                    historia: data.historia,
                    presupuesto: data.presupuesto,
                    ambiente: data.ambiente,
                    paisId: paisEspaña._id
                });
            } else {
                ciudad = new Ciudad({
                    nombre: data.nombre,
                    lat: data.lat,
                    lng: data.lng,
                    presupuesto: data.presupuesto,
                    ambiente: data.ambiente,
                    historia: data.historia,
                    paisId: paisEspaña._id
                });
                await ciudad.save();
            }

            // Añadir Universidades
            for (const u of data.universidades) {
                const nuevaU = new Universidad({ ...u, ciudadId: ciudad._id });
                await nuevaU.save();
            }

            // Añadir Sitios
            for (const s of data.sitios) {
                const nuevoS = new Sitio({ ...s, ciudadId: ciudad._id });
                await nuevoS.save();
            }

            console.log(`✅ ${data.nombre} procesada con éxito.`);
        }

        // --- ACTUALIZAR USUARIO TEST (MARÍA) ---
        // Intentar buscar a María
        const UsuarioSchema = new mongoose.Schema({}, { strict: false });
        const Usuario = mongoose.model('Usuario', UsuarioSchema, 'usuarios');
        
        const maria = await Usuario.findOne({ nombre: "María" });
        if (maria) {
            // Relacionar con España y Portugal
            const rel = paises.filter(p => p.nombre !== "Francia").map(p => p._id);
            await Usuario.findByIdAndUpdate(maria._id, { paisesRelacionados: rel });
            console.log("👤 Usuario María actualizado con países relacionados.");
        }

        console.log("\n🏁 Semilla extendida completada.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
