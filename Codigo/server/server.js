const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/bdd')
    .then(() => console.log('✅ Conectado a MongoDB (Modo Standalone)'))
    .catch(err => console.error('❌ Error de conexión:', err));

// --- MODELOS MONGODB ---

const PaisSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    transporte: { type: Number, min: 1, max: 5 },
    ocio: { type: Number, min: 1, max: 5 },
    ocioNocturno: { type: Number, min: 1, max: 5 },
    seguridad: { type: Number, min: 1, max: 5 },
    calidadAcademica: { type: Number, min: 1, max: 5 }
});

const CiudadSchema = new mongoose.Schema({
    nombre: String,
    c_postal: String,
    info: String, // info/descripcion general
    valoracion: Number, // media calculada o info fija
    // Nuevas características editoriales detalladas:
    historia: String,
    alojamiento: String, // info sobre pisos/residencias
    transporte: String,
    barrios: String, // info sobre seguridad y distritos
    // Conservamos los anteriores por compatibilidad con el front que ya funciona:
    presupuesto: Number,
    ambiente: String,
    seguridad: Number,
    ocio: Number,
    descripcion: String, // backup de info para front
    paisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pais' },
    f_registro: { type: Date, default: Date.now }
});

const UsuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellidos: { type: String }, // No required para dar flexibilidad
    correo: { type: String, required: true, unique: true },
    // R2: Relación del usuario con países
    paisesRelacionados: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pais' }],
    // Favoritos: Relación de ciudades favoritas del usuario (R1 derivado)
    ciudadesFavoritas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad' }]
});

const OpinionSchema = new mongoose.Schema({
    texto: { type: String, required: true },
    valoracion: { type: Number, required: true, min: 1, max: 5 },
    // R1: Usuario TIENE opinión
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    // R3: Opinión es SOBRE ciudad
    ciudadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ciudad', required: true },
    fecha: { type: Date, default: Date.now }
});

const Pais = mongoose.model('Pais', PaisSchema, 'paises');
const Ciudad = mongoose.model('Ciudad', CiudadSchema, 'ciudades');
const Usuario = mongoose.model('Usuario', UsuarioSchema, 'usuarios');
const Opinion = mongoose.model('Opinion', OpinionSchema, 'opiniones');

// --- LÓGICA DE TIEMPO REAL (SSE) ---
const clientesSSE = new Set();

app.get('/api/ciudades/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    clientesSSE.add(res);

    // Enviar datos actuales al conectar
    enviarActualizacion(res);

    req.on('close', () => clientesSSE.delete(res));
});

async function enviarActualizacion(res) {
    const ciudades = await Ciudad.find();
    res.write(`data: ${JSON.stringify(ciudades)}\n\n`);
}

// Esta función sustituye al .watch()
async function notificarCambiosGlobal() {
    const ciudades = await Ciudad.find();
    const payload = `data: ${JSON.stringify(ciudades)}\n\n`;
    clientesSSE.forEach(c => c.write(payload));
}

// --- RUTAS API ---

app.get('/api/ciudades', async (req, res) => {
    try {
        const lista = await Ciudad.find();
        res.json(lista);
    } catch (err) { res.status(500).json(err); }
});

app.get('/api/ciudades/:id', async (req, res) => {
    try {
        const ciudad = await Ciudad.findById(req.params.id).populate('paisId');
        if (!ciudad) return res.status(404).json({ error: "Ciudad no encontrada" });
        res.json(ciudad);
    } catch (err) { res.status(500).json(err); }
});

// He añadido esta ruta POST para que puedas probar el tiempo real
app.post('/api/ciudades', async (req, res) => {
    try {
        const nueva = new Ciudad(req.body);
        await nueva.save();
        res.status(201).json(nueva);
        notificarCambiosGlobal(); // <--- Notificamos manualmente
    } catch (err) { res.status(400).json(err); }
});

app.delete('/api/ciudades/:id', async (req, res) => {
    try {
        await Ciudad.findByIdAndDelete(req.params.id);
        res.json({ mensaje: "Eliminado" });
        notificarCambiosGlobal(); // <--- Notificamos manualmente
    } catch (err) { res.status(500).json(err); }
});

// --- AQUÍ HEMOS BORRADO EL CIUDAD.WATCH() QUE DABA ERROR ---

app.listen(3000, () => console.log('🚀 Servidor corriendo en puerto 3000'));