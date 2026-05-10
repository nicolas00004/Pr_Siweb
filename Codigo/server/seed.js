// seed.js
const mongoose = require('mongoose');
const fs = require('fs');   
const path = require('path'); 

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/infuni';

mongoose.connect(MONGODB_URI)
    .then(() => console.log(`✅ Conectado a MongoDB para el sembrado (${MONGODB_URI.replace(/\/\/.*@/, '//***@')})`))
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
        metricas: { seguridad: 5, costeAlquilerMedio: 250, costeOcioMedio: 100, ambienteNocturno: 5, calidadTransporte: 3, calidadAcademica: 5, conectividad: 4, turismo: 5, gastronomia: 5 },
        coordenadas: { type: 'Point', coordinates: [-3.7003, 37.1773] }
    },
    {
        nombre: 'Sevilla', pais: 'España', c_postal: '41001', tipoAmbiente: 'fiesta', jsonRef: 'sevilla',
        metricas: { seguridad: 4, costeAlquilerMedio: 350, costeOcioMedio: 200, ambienteNocturno: 5, calidadTransporte: 4, calidadAcademica: 4, conectividad: 4, turismo: 5, gastronomia: 4 },
        coordenadas: { type: 'Point', coordinates: [-5.9845, 37.3891] }
    },
    {
        nombre: 'Madrid', pais: 'España', c_postal: '28001', tipoAmbiente: 'fiesta', jsonRef: 'madrid',
        metricas: { seguridad: 4, costeAlquilerMedio: 650, costeOcioMedio: 250, ambienteNocturno: 5, calidadTransporte: 5, calidadAcademica: 5, conectividad: 5, turismo: 5, gastronomia: 4.2 },
        coordenadas: { type: 'Point', coordinates: [-3.7038, 40.4168] }
    },
    {
        nombre: 'Salamanca', pais: 'España', c_postal: '37001', tipoAmbiente: 'tranquilo', jsonRef: 'salamanca',
        metricas: { seguridad: 5, costeAlquilerMedio: 280, costeOcioMedio: 150, ambienteNocturno: 4, calidadTransporte: 2, calidadAcademica: 5, conectividad: 3, turismo: 4, gastronomia: 4 },
        coordenadas: { type: 'Point', coordinates: [-5.6700, 40.9701] }
    },
    {
        nombre: 'Valencia', pais: 'España', c_postal: '46001', tipoAmbiente: 'fiesta', jsonRef: 'valencia',
        metricas: { seguridad: 4, costeAlquilerMedio: 380, costeOcioMedio: 200, ambienteNocturno: 4, calidadTransporte: 4, calidadAcademica: 4, conectividad: 4, turismo: 4, gastronomia: 4.7 },
        coordenadas: { type: 'Point', coordinates: [-0.3763, 39.4699] }
    },
    {
        nombre: 'Barcelona', pais: 'España', c_postal: '08001', tipoAmbiente: 'fiesta', jsonRef: 'barcelona',
        metricas: { seguridad: 3, costeAlquilerMedio: 600, costeOcioMedio: 250, ambienteNocturno: 5, calidadTransporte: 5, calidadAcademica: 5, conectividad: 5, turismo: 5, gastronomia: 4.2 },
        coordenadas: { type: 'Point', coordinates: [2.1734, 41.3851] }
    },
    {
        nombre: 'Córdoba', pais: 'España', c_postal: '14001', tipoAmbiente: 'fiesta',  jsonRef: 'cordoba',
        metricas: { seguridad: 4, costeAlquilerMedio: 300, costeOcioMedio: 150, ambienteNocturno: 3, calidadTransporte: 3, calidadAcademica: 4, conectividad: 4, turismo: 5, gastronomia: 4.8 },
        coordenadas: { type: 'Point', coordinates: [-4.7797, 37.8882] }
    },
    {
        nombre: 'Cádiz', pais: 'España', c_postal: '11001', tipoAmbiente: 'fiesta', jsonRef: 'cadiz',
        metricas: { seguridad: 4, costeAlquilerMedio: 350, costeOcioMedio: 180, ambienteNocturno: 4, calidadTransporte: 3, calidadAcademica: 3, conectividad: 3, turismo: 5, gastronomia: 4.5 },
        coordenadas: { type: 'Point', coordinates: [-6.2946, 36.5271] }
    },
    {
        nombre: 'Zaragoza', pais: 'España', c_postal: '50001', tipoAmbiente: 'tranquilo', jsonRef: 'zaragoza',
        metricas: { seguridad: 4, costeAlquilerMedio: 380, costeOcioMedio: 200, ambienteNocturno: 4, calidadTransporte: 5, calidadAcademica: 4, conectividad: 5, turismo: 4, gastronomia: 4.1 },
        coordenadas: { type: 'Point', coordinates: [-0.8891, 41.6488] }
    },
    {
        nombre: 'Bilbao', pais: 'España', c_postal: '48001', tipoAmbiente: 'tranquilo', jsonRef: 'bilbao',
        metricas: { seguridad: 4, costeAlquilerMedio: 550, costeOcioMedio: 280, ambienteNocturno: 4, calidadTransporte: 5, calidadAcademica: 5, conectividad: 5, turismo: 5, gastronomia: 4.3 },
        coordenadas: { type: 'Point', coordinates: [-2.9350, 43.2630] }
    },
    {
        nombre: 'Las Palmas de Gran Canaria', pais: 'España', c_postal: '35001', tipoAmbiente: 'fiesta', jsonRef: 'palmas',
        metricas: { seguridad: 3, costeAlquilerMedio: 450, costeOcioMedio: 220, ambienteNocturno: 4, calidadTransporte: 3, calidadAcademica: 3, conectividad: 4, turismo: 5, gastronomia: 3.6 },
        coordenadas: { type: 'Point', coordinates: [-15.4134, 28.1248] }
    },
    {
        nombre: 'Santander', pais: 'España', c_postal: '39001', tipoAmbiente: 'tranquilo', jsonRef: 'santander',
        metricas: { seguridad: 5, costeAlquilerMedio: 420, costeOcioMedio: 250, ambienteNocturno: 3, calidadTransporte: 4, calidadAcademica: 4, conectividad: 4, turismo: 4, gastronomia: 3.9 },
        coordenadas: { type: 'Point', coordinates: [-3.8092, 43.4623] }
    },
    {
        nombre: 'Oviedo', pais: 'España', c_postal: '33001', tipoAmbiente: 'tranquilo', jsonRef: 'oviedo',
        metricas: { seguridad: 5, costeAlquilerMedio: 300, costeOcioMedio: 180, ambienteNocturno: 3, calidadTransporte: 4, calidadAcademica: 4, conectividad: 3, turismo: 4, gastronomia: 4.7 },
        coordenadas: { type: 'Point', coordinates: [-5.8448, 43.3603] }
    },
    {
        nombre: 'Pamplona', pais: 'España', c_postal: '31001', tipoAmbiente: 'fiesta',  jsonRef: 'pamplona',
        metricas: { seguridad: 5, costeAlquilerMedio: 450, costeOcioMedio: 250, ambienteNocturno: 4, calidadTransporte: 4, calidadAcademica: 5, conectividad: 4, turismo: 4, gastronomia: 4.9 },
        coordenadas: { type: 'Point', coordinates: [-1.6432, 42.8125] }
    },
    {
        nombre: 'Logroño', pais: 'España', c_postal: '26001', tipoAmbiente: 'tranquilo', jsonRef: 'logrono',
        metricas: { seguridad: 5, costeAlquilerMedio: 280, costeOcioMedio: 150, ambienteNocturno: 3, calidadTransporte: 3, calidadAcademica: 3, conectividad: 3, turismo: 4, gastronomia: 4.8 },
        coordenadas: { type: 'Point', coordinates: [-2.4450, 42.4627] }
    },
    {
        nombre: 'Valladolid', pais: 'España', c_postal: '47001', tipoAmbiente: 'tranquilo',  jsonRef: 'valladolid',
        metricas: { seguridad: 4, costeAlquilerMedio: 350, costeOcioMedio: 190, ambienteNocturno: 3, calidadTransporte: 4, calidadAcademica: 4, conectividad: 5, turismo: 3, gastronomia: 4 },
        coordenadas: { type: 'Point', coordinates: [-4.7245, 41.6523] }
    },
    {
        nombre: 'Burgos', pais: 'España', c_postal: '09001', tipoAmbiente: 'tranquilo', jsonRef: 'burgos',
        metricas: { seguridad: 5, costeAlquilerMedio: 320, costeOcioMedio: 170, ambienteNocturno: 2, calidadTransporte: 3, calidadAcademica: 4, conectividad: 4, turismo: 4, gastronomia: 4.7 },
        coordenadas: { type: 'Point', coordinates: [-3.7018, 42.3440] }
    },
    {
        nombre: 'Alicante', pais: 'España', c_postal: '03001', tipoAmbiente: 'fiesta', jsonRef: 'alicante',
        metricas: { seguridad: 3, costeAlquilerMedio: 450, costeOcioMedio: 220, ambienteNocturno: 5, calidadTransporte: 4, calidadAcademica: 4, conectividad: 4, turismo: 5, gastronomia: 4.3 },
        coordenadas: { type: 'Point', coordinates: [-0.4815, 38.3452] }
    },
    {
        nombre: 'Gerona', pais: 'España', c_postal: '17001', tipoAmbiente: 'tranquilo', jsonRef: 'gerona',
        metricas: { seguridad: 4, costeAlquilerMedio: 500, costeOcioMedio: 250, ambienteNocturno: 3, calidadTransporte: 3, calidadAcademica: 4, conectividad: 4, turismo: 5, gastronomia: 3.5 },
        coordenadas: { type: 'Point', coordinates: [2.8249, 41.9794] }
    },
    {
        nombre: 'Tarragona', pais: 'España', c_postal: '43001', tipoAmbiente: 'tranquilo', jsonRef: 'tarragona',
        metricas: { seguridad: 3, costeAlquilerMedio: 400, costeOcioMedio: 210, ambienteNocturno: 3, calidadTransporte: 3, calidadAcademica: 4, conectividad: 4, turismo: 5, gastronomia: 3.7 },
        coordenadas: { type: 'Point', coordinates: [1.2445, 41.1189] }
    },
    {
        nombre: 'Toledo', pais: 'España', c_postal: '45001', tipoAmbiente: 'tranquilo', jsonRef: 'toledo',
        metricas: { seguridad: 4, costeAlquilerMedio: 350, costeOcioMedio: 180, ambienteNocturno: 2, calidadTransporte: 3, calidadAcademica: 3, conectividad: 5, turismo: 5, gastronomia: 3.9 },
        coordenadas: { type: 'Point', coordinates: [-4.0273, 39.8628] }
    },
    {
        nombre: 'Huelva', pais: 'España', c_postal: '21001', tipoAmbiente: 'tranquilo', jsonRef: 'huelva',
        metricas: { seguridad: 4, costeAlquilerMedio: 250, costeOcioMedio: 150, ambienteNocturno: 3, calidadTransporte: 3, calidadAcademica: 3, conectividad: 3, turismo: 4, gastronomia: 4.3 },
        coordenadas: { type: 'Point', coordinates: [-6.9447, 37.2614] }
    },
    {
        nombre: 'Jaén', pais: 'España', c_postal: '23001', tipoAmbiente: 'tranquilo', jsonRef: 'jaen',
        metricas: { seguridad: 5, costeAlquilerMedio: 190, costeOcioMedio: 70, ambienteNocturno: 2, calidadTransporte: 2, calidadAcademica: 3, conectividad: 3, turismo: 3, gastronomia: 4.8 },
        coordenadas: { type: 'Point', coordinates: [-3.7903, 37.7796] }
    },
    {
        nombre: 'Almería', pais: 'España', c_postal: '04001', tipoAmbiente: 'tranquilo', jsonRef: 'almeria',
        metricas: { seguridad: 3, costeAlquilerMedio: 300, costeOcioMedio: 170, ambienteNocturno: 3, calidadTransporte: 3, calidadAcademica: 3, conectividad: 3, turismo: 4, gastronomia: 3.5 },
        coordenadas: { type: 'Point', coordinates: [-2.4637, 36.8340] }
    },
    {
        nombre: 'Huesca', pais: 'España', c_postal: '22001', tipoAmbiente: 'tranquilo', jsonRef: 'huesca',
        metricas: { seguridad: 5, costeAlquilerMedio: 280, costeOcioMedio: 160, ambienteNocturno: 2, calidadTransporte: 2, calidadAcademica: 3, conectividad: 3, turismo: 4, gastronomia: 3 },
        coordenadas: { type: 'Point', coordinates: [-0.4084, 42.1362] }
    },
    {
        nombre: 'Teruel', pais: 'España', c_postal: '44001', tipoAmbiente: 'tranquilo', jsonRef: 'teruel',
        metricas: { seguridad: 5, costeAlquilerMedio: 250, costeOcioMedio: 140, ambienteNocturno: 2, calidadTransporte: 2, calidadAcademica: 3, conectividad: 2, turismo: 4, gastronomia: 4.1 },
        coordenadas: { type: 'Point', coordinates: [-1.1065, 40.3457] }
    },
    {
        nombre: 'La Laguna', pais: 'España', c_postal: '38201', tipoAmbiente: 'tranquilo', jsonRef: 'la-laguna',
        metricas: { seguridad: 4, costeAlquilerMedio: 400, costeOcioMedio: 200, ambienteNocturno: 4, calidadTransporte: 3, calidadAcademica: 4, conectividad: 3, turismo: 5, gastronomia: 3.9 },
        coordenadas: { type: 'Point', coordinates: [-16.3151, 28.4853] }
    },
    {
        nombre: 'Palma de Mallorca', pais: 'España', c_postal: '07001', tipoAmbiente: 'fiesta', jsonRef: 'palma',
        metricas: { seguridad: 3, costeAlquilerMedio: 500, costeOcioMedio: 300, ambienteNocturno: 5, calidadTransporte: 4, calidadAcademica: 4, conectividad: 5, turismo: 5, gastronomia: 4.1 },
        coordenadas: { type: 'Point', coordinates: [2.6502, 39.5696] }
    },
    {
        nombre: 'León', pais: 'España', c_postal: '24001', tipoAmbiente: 'tranquilo', jsonRef: 'leon',
        metricas: { seguridad: 5, costeAlquilerMedio: 280, costeOcioMedio: 160, ambienteNocturno: 4, calidadTransporte: 3, calidadAcademica: 4, conectividad: 4, turismo: 5, gastronomia: 4.5 },
        coordenadas: { type: 'Point', coordinates: [-5.5703, 42.5987] }
    },
    {
        nombre: 'Segovia', pais: 'España', c_postal: '40001', tipoAmbiente: 'tranquilo', jsonRef: 'segovia',
        metricas: { seguridad: 5, costeAlquilerMedio: 350, costeOcioMedio: 200, ambienteNocturno: 2, calidadTransporte: 3, calidadAcademica: 4, conectividad: 5, turismo: 5, gastronomia: 4.9 },
        coordenadas: { type: 'Point', coordinates: [-4.1184, 40.9429] }
    },
    {
        nombre: 'Guadalajara', pais: 'España', c_postal: '19001', tipoAmbiente: 'tranquilo', jsonRef: 'guadalajara',
        metricas: { seguridad: 4, costeAlquilerMedio: 320, costeOcioMedio: 180, ambienteNocturno: 2, calidadTransporte: 4, calidadAcademica: 3, conectividad: 5, turismo: 2, gastronomia: 4.2 },
        coordenadas: { type: 'Point', coordinates: [-3.1673, 40.6327] }
    },
    {
        nombre: 'Lérida', pais: 'España', c_postal: '25001', tipoAmbiente: 'fiesta', jsonRef: 'lerida',
        metricas: { seguridad: 3, costeAlquilerMedio: 300, costeOcioMedio: 180, ambienteNocturno: 3, calidadTransporte: 3, calidadAcademica: 4, conectividad: 4, turismo: 3, gastronomia: 3.7 },
        coordenadas: { type: 'Point', coordinates: [0.6206, 41.6176] }
    },
    {
        nombre: 'Elche', pais: 'España', c_postal: '03201', tipoAmbiente: 'tranquilo', jsonRef: 'elche',
        metricas: { seguridad: 4, costeAlquilerMedio: 300, costeOcioMedio: 170, ambienteNocturno: 3, calidadTransporte: 3, calidadAcademica: 4, conectividad: 4, turismo: 4, gastronomia: 3.6 },
        coordenadas: { type: 'Point', coordinates: [-0.6992, 38.2622] }
    },
    {
        nombre: 'Castellón de la Plana', pais: 'España', c_postal: '12001', tipoAmbiente: 'tranquilo', jsonRef: 'castellon',
        metricas: { seguridad: 4, costeAlquilerMedio: 280, costeOcioMedio: 170, ambienteNocturno: 3, calidadTransporte: 3, calidadAcademica: 4, conectividad: 4, turismo: 3, gastronomia: 4.2 },
        coordenadas: { type: 'Point', coordinates: [-0.0382, 39.9864] }
    },
    {
        nombre: 'La Coruña', pais: 'España', c_postal: '15001', tipoAmbiente: 'tranquilo', jsonRef: 'coruna',
        metricas: { seguridad: 4, costeAlquilerMedio: 380, costeOcioMedio: 220, ambienteNocturno: 4, calidadTransporte: 4, calidadAcademica: 4, conectividad: 4, turismo: 5, gastronomia: 4.7 },
        coordenadas: { type: 'Point', coordinates: [-8.4115, 43.3623] }
    },
    {
        nombre: 'Vigo', pais: 'España', c_postal: '36201', tipoAmbiente: 'tranquilo', jsonRef: 'vigo',
        metricas: { seguridad: 4, costeAlquilerMedio: 400, costeOcioMedio: 230, ambienteNocturno: 4, calidadTransporte: 3, calidadAcademica: 4, conectividad: 4, turismo: 4, gastronomia: 4.5 },
        coordenadas: { type: 'Point', coordinates: [-8.7226, 42.2328] }
    },
    {
        nombre: 'Ourense', pais: 'España', c_postal: '32001', tipoAmbiente: 'tranquilo', jsonRef: 'ourense',
        metricas: { seguridad: 5, costeAlquilerMedio: 250, costeOcioMedio: 150, ambienteNocturno: 3, calidadTransporte: 2, calidadAcademica: 3, conectividad: 3, turismo: 4, gastronomia: 4.1 },
        coordenadas: { type: 'Point', coordinates: [-7.8633, 42.3358] }
    },
    {
        nombre: 'Alcalá de Henares', pais: 'España', c_postal: '28801', tipoAmbiente: 'fiesta', jsonRef: 'alcala',
        metricas: { seguridad: 4, costeAlquilerMedio: 380, costeOcioMedio: 200, ambienteNocturno: 4, calidadTransporte: 4, calidadAcademica: 5, conectividad: 5, turismo: 5, gastronomia: 3.6 },
        coordenadas: { type: 'Point', coordinates: [-3.3644, 40.4819] }
    },
    {
        nombre: 'Málaga', pais: 'España', c_postal: '29001', tipoAmbiente: 'fiesta', jsonRef: 'malaga',
        metricas: { seguridad: 4, costeAlquilerMedio: 350, costeOcioMedio: 250, ambienteNocturno: 5, calidadTransporte: 4, calidadAcademica: 4, conectividad: 5, turismo: 5, gastronomia: 4.6 },
        coordenadas: { type: 'Point', coordinates: [-4.4214, 36.7213] }
    },
    {
        nombre: 'Murcia', pais: 'España', c_postal: '30001', tipoAmbiente: 'fiesta', jsonRef: 'murcia',
        metricas: { seguridad: 4, costeAlquilerMedio: 250, costeOcioMedio: 180, ambienteNocturno: 5, calidadTransporte: 4, calidadAcademica: 4, conectividad: 4, turismo: 4, gastronomia: 3.9 },
        coordenadas: { type: 'Point', coordinates: [-1.1307, 37.9870] }
    },
    
    // --- FRANCIA ---
    {
        nombre: 'Montpellier', pais: 'Francia', c_postal: '34000', tipoAmbiente: 'fiesta', jsonRef: 'montpellier',
        metricas: { seguridad: 3, costeAlquilerMedio: 600, costeOcioMedio: 350, ambienteNocturno: 5, calidadTransporte: 5, calidadAcademica: 4, conectividad: 4, turismo: 4, gastronomia: 2.9 },
        coordenadas: { type: 'Point', coordinates: [3.8767, 43.6108] }
    },
    {
        nombre: 'Lyon', pais: 'Francia', c_postal: '69000', tipoAmbiente: 'fiesta', jsonRef: 'lyon',
        metricas: { seguridad: 4, costeAlquilerMedio: 750, costeOcioMedio: 400, ambienteNocturno: 4, calidadTransporte: 5, calidadAcademica: 5, conectividad: 5, turismo: 5, gastronomia: 3.5 },
        coordenadas: { type: 'Point', coordinates: [4.8357, 45.7640] }
    },
    {
        nombre: 'París', pais: 'Francia', c_postal: '75001', tipoAmbiente: 'fiesta', jsonRef: 'paris',
        metricas: { seguridad: 3, costeAlquilerMedio: 950, costeOcioMedio: 550, ambienteNocturno: 5, calidadTransporte: 5, calidadAcademica: 5, conectividad: 5, turismo: 5, gastronomia: 4.1 },
        coordenadas: { type: 'Point', coordinates: [2.3522, 48.8566] }
    },

    // --- ITALIA ---
    {
        nombre: 'Bolonia', pais: 'Italia', c_postal: '40121', tipoAmbiente: 'fiesta', jsonRef: 'bolonia',
        metricas: { seguridad: 4, costeAlquilerMedio: 550, costeOcioMedio: 300, ambienteNocturno: 5, calidadTransporte: 4, calidadAcademica: 5, conectividad: 4, turismo: 4, gastronomia: 3.2 },
        coordenadas: { type: 'Point', coordinates: [11.3426, 44.4949] }
    },
    {
        nombre: 'Padua', pais: 'Italia', c_postal: '35121', tipoAmbiente: 'tranquilo', jsonRef: 'padua',
        metricas: { seguridad: 5, costeAlquilerMedio: 450, costeOcioMedio: 250, ambienteNocturno: 4, calidadTransporte: 4, calidadAcademica: 5, conectividad: 3, turismo: 4, gastronomia: 4.6 },
        coordenadas: { type: 'Point', coordinates: [11.8768, 45.4064] }
    },

    // --- ALEMANIA ---
    {
        nombre: 'Munich', pais: 'Alemania', c_postal: '80331', tipoAmbiente: 'fiesta', jsonRef: 'munich',
        metricas: { seguridad: 5, costeAlquilerMedio: 950, costeOcioMedio: 450, ambienteNocturno: 4, calidadTransporte: 5, calidadAcademica: 5, conectividad: 5, turismo: 5, gastronomia: 2.8 },
        coordenadas: { type: 'Point', coordinates: [11.5820, 48.1351] }
    },
    {
        nombre: 'Heidelberg', pais: 'Alemania', c_postal: '69115', tipoAmbiente: 'tranquilo', jsonRef: 'heidelberg',
        metricas: { seguridad: 5, costeAlquilerMedio: 650, costeOcioMedio: 350, ambienteNocturno: 3, calidadTransporte: 5, calidadAcademica: 5, conectividad: 3, turismo: 2.7 },
        coordenadas: { type: 'Point', coordinates: [8.6724, 49.3988] }
    },

    // --- PORTUGAL ---
    {
        nombre: 'Coímbra', pais: 'Portugal', c_postal: '3000', tipoAmbiente: 'tranquilo', jsonRef: 'coimbra',
        metricas: { seguridad: 5, costeAlquilerMedio: 350, costeOcioMedio: 200, ambienteNocturno: 4, calidadTransporte: 3, calidadAcademica: 4, conectividad: 3, turismo: 4, gastronomia: 3.9 },
        coordenadas: { type: 'Point', coordinates: [-8.4115, 40.2033] }
    },
    {
        nombre: 'Oporto', pais: 'Portugal', c_postal: '4000', tipoAmbiente: 'fiesta', jsonRef: 'oporto',
       metricas: { seguridad: 4, costeAlquilerMedio: 550, costeOcioMedio: 250, ambienteNocturno: 5, calidadTransporte: 4, calidadAcademica: 4, conectividad: 5, turismo: 5, gastronomia: 4.6 },
        coordenadas: { type: 'Point', coordinates: [-8.6291, 41.1579] }
    },
    // --- REINO UNIDO ---
    {
        nombre: 'Oxford', pais: 'Reino Unido', c_postal: 'OX1', tipoAmbiente: 'tranquilo', jsonRef: 'oxford',
        metricas: { seguridad: 5, costeAlquilerMedio: 900, costeOcioMedio: 500, ambienteNocturno: 3, calidadTransporte: 4, calidadAcademica: 5, conectividad: 5, turismo: 5, gastronomia: 2.2 },
        coordenadas: { type: 'Point', coordinates: [-1.2577, 51.7520] }
    },
    // --- PAÍSES BAJOS ---
    {
        nombre: 'Groninga', pais: 'Países Bajos', c_postal: '9711', tipoAmbiente: 'fiesta', jsonRef: 'groninga',
        metricas: { seguridad: 5, costeAlquilerMedio: 700, costeOcioMedio: 400, ambienteNocturno: 5, calidadTransporte: 5, calidadAcademica: 4, conectividad: 4, turismo: 3, gastronomia: 2.6 },
        coordenadas: { type: 'Point', coordinates: [6.5665, 53.2192] }
    },

    // --- POLONIA ---
    {
        nombre: 'Cracovia', pais: 'Polonia', c_postal: '30-001', tipoAmbiente: 'fiesta', jsonRef: 'cracovia',
        metricas: { seguridad: 4, costeAlquilerMedio: 500, costeOcioMedio: 250, ambienteNocturno: 5, calidadTransporte: 4, calidadAcademica: 4, conectividad: 4, turismo: 5, gastronomia: 3.2 },
        coordenadas: { type: 'Point', coordinates: [19.9450, 50.0647] }
    },

    // --- BÉLGICA ---
    {
        nombre: 'Lovaina', pais: 'Bélgica', c_postal: '3000', tipoAmbiente: 'fiesta', jsonRef: 'lovania',
        metricas: { seguridad: 5, costeAlquilerMedio: 600, costeOcioMedio: 300, ambienteNocturno: 5, calidadTransporte: 5, calidadAcademica: 5, conectividad: 5, turismo: 4, gastronomia: 2.9 },
        coordenadas: { type: 'Point', coordinates: [4.7009, 50.8798] }
    },

    // --- REPÚBLICA CHECA ---
    {
        nombre: 'Praga', pais: 'República Checa', c_postal: '110 00', tipoAmbiente: 'fiesta', jsonRef: 'praga',
        metricas: { seguridad: 4, costeAlquilerMedio: 650, costeOcioMedio: 300, ambienteNocturno: 5, calidadTransporte: 5, calidadAcademica: 4, conectividad: 5, turismo: 5, gastronomia: 3.5 },
        coordenadas: { type: 'Point', coordinates: [14.4378, 50.0755] }
    },

    // --- AUSTRIA ---
    {
        nombre: 'Viena', pais: 'Austria', c_postal: '1010', tipoAmbiente: 'tranquilo', jsonRef: 'viena',
        metricas: { seguridad: 5, costeAlquilerMedio: 750, costeOcioMedio: 400, ambienteNocturno: 4, calidadTransporte: 5, calidadAcademica: 5, conectividad: 5, turismo: 5, gastronomia: 3.6 },
        coordenadas: { type: 'Point', coordinates: [16.3738, 48.2082] }
    },
    // --- ESTADOS UNIDOS ---
    {
        nombre: 'Boston', pais: 'Estados Unidos', c_postal: '02108', tipoAmbiente: 'ciudad', jsonRef: 'boston',
        metricas: { seguridad: 3, costeAlquilerMedio: 1500, costeOcioMedio: 700, ambienteNocturno: 4, calidadTransporte: 4, calidadAcademica: 5, conectividad: 5, turismo: 4, gastronomia: 3.2 },
        coordenadas: { type: 'Point', coordinates: [-71.0589, 42.3601] }
    },

    // --- JAPÓN ---
    {
        nombre: 'Kioto', pais: 'Japón', c_postal: '600-0000', tipoAmbiente: 'tranquilo', jsonRef: 'kioto',
        metricas: { seguridad: 5, costeAlquilerMedio: 600, costeOcioMedio: 400, ambienteNocturno: 3, calidadTransporte: 5, calidadAcademica: 5, conectividad: 4, turismo: 5, gastronomia: 4.6 },
        coordenadas: { type: 'Point', coordinates: [135.7681, 35.0116] }
    },

    // --- ARGENTINA ---
    {
        nombre: 'Buenos Aires', pais: 'Argentina', c_postal: 'C1001', tipoAmbiente: 'fiesta', jsonRef: 'buenosaires',
        metricas: { seguridad: 2, costeAlquilerMedio: 350, costeOcioMedio: 200, ambienteNocturno: 5, calidadTransporte: 4, calidadAcademica: 5, conectividad: 4, turismo: 5, gastronomia: 3.9 },
        coordenadas: { type: 'Point', coordinates: [-58.3816, -34.6037] }
    },

    // --- MÉXICO ---
    {
        nombre: 'Ciudad de México', pais: 'México', c_postal: '01000', tipoAmbiente: 'fiesta', jsonRef: 'cdmx',
        metricas: { seguridad: 2, costeAlquilerMedio: 200, costeOcioMedio: 200, ambienteNocturno: 5, calidadTransporte: 3, calidadAcademica: 4, conectividad: 5, turismo: 5, gastronomia: 3.9 },
        coordenadas: { type: 'Point', coordinates: [-99.1332, 19.4326] }
    },

    // --- CHINA ---
    {
        nombre: 'Shanghái', pais: 'China', c_postal: '200000', tipoAmbiente: 'fiesta', jsonRef: 'shanghai',
        metricas: { seguridad: 5, costeAlquilerMedio: 800, costeOcioMedio: 450, ambienteNocturno: 4, calidadTransporte: 5, calidadAcademica: 4, conectividad: 5, turismo: 5, gastronomia: 3.1 },
        coordenadas: { type: 'Point', coordinates: [121.4737, 31.2304] }
    },

    // --- RUSIA ---
    {
        nombre: 'San Petersburgo', pais: 'Rusia', c_postal: '190000', tipoAmbiente: 'tranquilo', jsonRef: 'stpetersburg',
        metricas: { seguridad: 3, costeAlquilerMedio: 450, costeOcioMedio: 250, ambienteNocturno: 5, calidadTransporte: 4, calidadAcademica: 5, conectividad: 4, turismo: 5, gastronomia: 2.9 },
        coordenadas: { type: 'Point', coordinates: [30.3351, 59.9343] }
    }
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
            { nombre: 'Francia', codigoISO: 'FR', moneda: 'EUR', idiomaOficial: 'Francés', transporte: 5, ocio: 4, ocioNocturno: 4, seguridad: 3, calidadAcademica: 5, costeVidaMedio: 1100, climaMedio: 'Templado' },
            { nombre: 'Alemania', codigoISO: 'DE', moneda: 'EUR', idiomaOficial: 'Alemán', transporte: 5, ocio: 4, ocioNocturno: 4, seguridad: 5, calidadAcademica: 5, costeVidaMedio: 1000, climaMedio: 'Continental' },
            { nombre: 'Italia', codigoISO: 'IT', moneda: 'EUR', idiomaOficial: 'Italiano', transporte: 3, ocio: 5, ocioNocturno: 4, seguridad: 4, calidadAcademica: 4, costeVidaMedio: 900, climaMedio: 'Mediterráneo' },
            { nombre: 'Portugal', codigoISO: 'PT', moneda: 'EUR', idiomaOficial: 'Portugués', transporte: 3, ocio: 4, ocioNocturno: 5, seguridad: 5, calidadAcademica: 3, costeVidaMedio: 700, climaMedio: 'Atlántico-Mediterráneo' },
            { nombre: 'Países Bajos', codigoISO: 'NL', moneda: 'EUR', idiomaOficial: 'Neerlandés', transporte: 5, ocio: 4, ocioNocturno: 4, seguridad: 5, calidadAcademica: 5, costeVidaMedio: 1300, climaMedio: 'Oceánico' },
            { nombre: 'Polonia', codigoISO: 'PL', moneda: 'PLN', idiomaOficial: 'Polaco', transporte: 4, ocio: 4, ocioNocturno: 5, seguridad: 5, calidadAcademica: 4, costeVidaMedio: 600, climaMedio: 'Continental Frío' },
            { nombre: 'Reino Unido', codigoISO: 'GB', moneda: 'GBP', idiomaOficial: 'Inglés', transporte: 4, ocio: 5, ocioNocturno: 5, seguridad: 3, calidadAcademica: 5, costeVidaMedio: 1400, climaMedio: 'Oceánico Lluvioso' },
            { nombre: 'Irlanda', codigoISO: 'IE', moneda: 'EUR', idiomaOficial: 'Irlandés/Inglés', transporte: 3, ocio: 4, ocioNocturno: 5, seguridad: 4, calidadAcademica: 4, costeVidaMedio: 1200, climaMedio: 'Oceánico' },
            { nombre: 'Suecia', codigoISO: 'SE', moneda: 'SEK', idiomaOficial: 'Sueco', transporte: 5, ocio: 3, ocioNocturno: 3, seguridad: 4, calidadAcademica: 5, costeVidaMedio: 1200, climaMedio: 'Subártico' },
            { nombre: 'Suiza', codigoISO: 'CH', moneda: 'CHF', idiomaOficial: 'Alemán/Francés/Italiano', transporte: 5, ocio: 3, ocioNocturno: 2, seguridad: 5, calidadAcademica: 5, costeVidaMedio: 1800, climaMedio: 'Alpino' },
            { nombre: 'Bélgica', codigoISO: 'BE', moneda: 'EUR', idiomaOficial: 'Francés/Neerlandés', transporte: 4, ocio: 4, ocioNocturno: 4, seguridad: 3, calidadAcademica: 4, costeVidaMedio: 1000, climaMedio: 'Templado' },
            { nombre: 'Grecia', codigoISO: 'GR', moneda: 'EUR', idiomaOficial: 'Griego', transporte: 2, ocio: 5, ocioNocturno: 5, seguridad: 4, calidadAcademica: 3, costeVidaMedio: 750, climaMedio: 'Mediterráneo' },
            { nombre: 'Austria', codigoISO: 'AT', moneda: 'EUR', idiomaOficial: 'Alemán', transporte: 5, ocio: 4, ocioNocturno: 3, seguridad: 5, calidadAcademica: 4, costeVidaMedio: 1050, climaMedio: 'Centroeuropeo' },
            { nombre: 'República Checa', codigoISO: 'CZ', moneda: 'CZK', idiomaOficial: 'Checo', transporte: 5, ocio: 4, ocioNocturno: 5, seguridad: 5, calidadAcademica: 4, costeVidaMedio: 700, climaMedio: 'Continental' },
            { nombre: 'Estados Unidos', codigoISO: 'US', moneda: 'USD', idiomaOficial: 'Inglés', transporte: 2, ocio: 5, ocioNocturno: 5, seguridad: 2, calidadAcademica: 5, costeVidaMedio: 1600, climaMedio: 'Variado/Extremo' },
            { nombre: 'Rusia', codigoISO: 'RU', moneda: 'RUB', idiomaOficial: 'Ruso', transporte: 4, ocio: 4, ocioNocturno: 5, seguridad: 3, calidadAcademica: 4, costeVidaMedio: 600, climaMedio: 'Continental Muy Frío' },
            { nombre: 'China', codigoISO: 'CN', moneda: 'CNY', idiomaOficial: 'Mandarín', transporte: 5, ocio: 4, ocioNocturno: 4, seguridad: 5, calidadAcademica: 4, costeVidaMedio: 700, climaMedio: 'Variado/Monzónico' },
            { nombre: 'Japón', codigoISO: 'JP', moneda: 'JPY', idiomaOficial: 'Japonés', transporte: 5, ocio: 4, ocioNocturno: 3, seguridad: 5, calidadAcademica: 5, costeVidaMedio: 1100, climaMedio: 'Templado/Húmedo' },
            { nombre: 'Argentina', codigoISO: 'AR', moneda: 'ARS', idiomaOficial: 'Español', transporte: 3, ocio: 5, ocioNocturno: 5, seguridad: 2, calidadAcademica: 4, costeVidaMedio: 500, climaMedio: 'Templado/Subtropical' },
            { nombre: 'México', codigoISO: 'MX', moneda: 'MXN', idiomaOficial: 'Español', transporte: 2, ocio: 5, ocioNocturno: 5, seguridad: 2, calidadAcademica: 3, costeVidaMedio: 650, climaMedio: 'Tropical/Templado' }
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

