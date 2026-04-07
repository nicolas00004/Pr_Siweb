const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Fundamental para que el navegador no bloquee la petición
const app = express();

app.use(cors());
app.use(express.json());

// Conexión a tu MongoDB (ajustado a tu base de datos 'bdd')
mongoose.connect('mongodb://localhost:27017/bdd')
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error de conexión', err));

// Definimos el esquema para las ciudades
// Asegúrate de que los nombres coincidan con los de tu Compass
const CiudadSchema = new mongoose.Schema({
    nombre: String,
    presupuesto: Number,
    ambiente: String,
    seguridad: Number,
    ocio: Number
});

const Ciudad = mongoose.model('Ciudad', CiudadSchema, 'alumnos'); // Usamos 'alumnos' si esa es la colección donde guardaste los datos

// RUTA API
app.get('/api/ciudades', async (req, res) => {
    try {
        const ciudadesBD = await Ciudad.find();
        res.json(ciudadesBD);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Servidor backend en puerto 3000'));