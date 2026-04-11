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

const CiudadSchema = new mongoose.Schema({
    nombre: String,
    presupuesto: Number,
    ambiente: String,
    seguridad: Number,
    ocio: Number,
    descripcion: String,
    f_registro: { type: Date, default: Date.now }
});

const Ciudad = mongoose.model('Ciudad', CiudadSchema, 'ciudades');

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