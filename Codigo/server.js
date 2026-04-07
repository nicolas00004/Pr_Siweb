const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 1. Conexión a MongoDB (Colección 'alumnos' según tus capturas)
mongoose.connect('mongodb://localhost:27017/bdd')
    .then(() => console.log('✅ Conectado a MongoDB'))
    .catch(err => console.error('❌ Error de conexión:', err));

const CiudadSchema = new mongoose.Schema({
    nombre: String,
    presupuesto: Number,
    ambiente: String,
    seguridad: Number,
    ocio: Number,
    descripcion: String // Aquí va el texto de tus .txt
});

const Ciudad = mongoose.model('Ciudad', CiudadSchema, 'alumnos');

// --- RUTAS API ---

// Obtener todas las ciudades
app.get('/api/ciudades', async (req, res) => {
    try {
        const lista = await Ciudad.find();
        res.json(lista);
    } catch (err) { res.status(500).json(err); }
});

// Obtener UNA ciudad por ID para la página de detalles
app.get('/api/ciudades/:id', async (req, res) => {
    try {
        const ciudad = await Ciudad.findById(req.params.id);
        res.json(ciudad);
    } catch (err) { res.status(404).json({ mensaje: "No encontrada" }); }
});

// --- TIEMPO REAL (SSE) ---
const clientesSSE = new Set();
app.get('/api/ciudades/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    clientesSSE.add(res);
    req.on('close', () => clientesSSE.delete(res));
});

async function notificarCambios() {
    const ciudades = await Ciudad.find();
    const payload = `data: ${JSON.stringify(ciudades)}\n\n`;
    clientesSSE.forEach(c => c.write(payload));
}

// Escuchar cambios en Compass automáticamente
mongoose.connection.once('open', () => {
    Ciudad.watch().on('change', () => notificarCambios());
});

app.listen(3000, () => console.log('🚀 Servidor en puerto 3000'));