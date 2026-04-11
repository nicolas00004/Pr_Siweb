# INFUNI — Portal Erasmus para Estudiantes Universitarios

> Plataforma web completa para que los estudiantes universitarios puedan explorar, comparar y guardar destinos Erasmus, con gestión de usuarios, reseñas y herramientas de planificación.

---

## 📋 Descripción del Proyecto

**INFUNI** es un portal web desarrollado como práctica académica para la asignatura de **Sistemas de Información en la Web (SIWEB)**. Permite a los estudiantes:

- Explorar ciudades Erasmus disponibles con información detallada
- Comparar ciudades por presupuesto, seguridad y ambiente
- Guardar sus ciudades favoritas en un perfil personal
- Leer y escribir reseñas de la comunidad
- Acceder a guías prácticas sobre trámites, alojamiento y vida en el extranjero
- Calcular el presupuesto mensual estimado según sus preferencias

---

## 🏗️ Arquitectura del Proyecto

```
Pr_Siweb/
├── Codigo/                   # Código fuente de la aplicación
│   ├── html/                 # Páginas HTML
│   │   ├── index.html        # Página principal (explorador de ciudades)
│   │   ├── detalle.html      # Ficha detallada de cada ciudad
│   │   ├── herramientas.html # Comparador y calculadora de gastos
│   │   ├── guias.html        # Guías de supervivencia Erasmus
│   │   ├── comunidad.html    # Foro y reseñas de la comunidad
│   │   ├── login.html        # Inicio de sesión
│   │   ├── registro.html     # Registro de nuevos usuarios
│   │   └── perfil.html       # Panel de usuario (ciudades favoritas)
│   ├── css/
│   │   └── style.css         # Hoja de estilos global (glassmorphism + variables CSS)
│   ├── js/
│   │   ├── script.js         # Lógica de la página principal (filtros, SSE)
│   │   ├── detalle.js        # Carga y renderizado de la ficha de ciudad
│   │   └── api.js            # Constante API_BASE compartida
│   └── server/
│       ├── server.js         # Servidor Express + Mongoose + rutas API REST
│       └── seed.js           # Script de pobado de la base de datos
├── package.json
└── README.md
```

---

## 🔧 Tecnologías Utilizadas

| Capa | Tecnología |
|---|---|
| **Frontend** | HTML5, CSS3 (Vanilla), JavaScript ES6+ |
| **Backend** | Node.js + Express.js |
| **Base de Datos** | MongoDB (local) + Mongoose ODM |
| **Tiempo Real** | Server-Sent Events (SSE) |
| **Tipografía** | Google Fonts — Inter |
| **Diseño** | Glassmorphism, CSS Custom Properties |

---

## 🗄️ Modelo de Datos (NoSQL - MongoDB)

Se han definido **4 colecciones** con relaciones mediante referencias `ObjectId`:

### `paises`
| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | String | Nombre del país |
| `transporte` | Number (1-5) | Valoración del transporte |
| `ocio` | Number (1-5) | Valoración del ocio diurno |
| `ocioNocturno` | Number (1-5) | Valoración del ocio nocturno |
| `seguridad` | Number (1-5) | Valoración de seguridad |
| `calidadAcademica` | Number (1-5) | Calidad universitaria |

### `ciudades`
| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | String | Nombre de la ciudad |
| `presupuesto` | Number | Gasto mensual estimado (€) |
| `ambiente` | String | Tipo de ambiente (`fiesta`, `tranquilo`, etc.) |
| `seguridad` | Number (1-5) | Valoración de seguridad |
| `ocio` | Number (1-5) | Valoración del ocio |
| `descripcion` | String | Descripción breve |
| `historia` | String | Historia y universidad de la ciudad |
| `alojamiento` | String | Guía de alojamiento |
| `transporte` | String | Información de transporte |
| `barrios` | String | Guía de barrios recomendados |
| `paisId` | ObjectId → `paises` | Referencia al país |
| `f_registro` | Date | Fecha de inserción |

### `usuarios`
| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | String | Nombre del usuario |
| `apellidos` | String | Apellidos |
| `correo` | String (unique) | Email de acceso |
| `password` | String | Contraseña |
| `paisesRelacionados` | [ObjectId] → `paises` | Países de interés |
| `ciudadesFavoritas` | [ObjectId] → `ciudades` | Ciudades guardadas |

### `opiniones`
| Campo | Tipo | Descripción |
|---|---|---|
| `texto` | String | Contenido de la reseña |
| `valoracion` | Number (1-5) | Puntuación |
| `usuarioId` | ObjectId → `usuarios` | Autor de la opinión |
| `ciudadId` | ObjectId → `ciudades` | Ciudad valorada |
| `fecha` | Date | Fecha de publicación |

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/try/download/community) corriendo en local (`mongodb://localhost:27017`)

### Pasos

**1. Clonar el repositorio**
```bash
git clone https://github.com/nicolas00004/Pr_Siweb.git
cd Pr_Siweb
```

**2. Instalar dependencias**
```bash
npm install
```

**3. Poblar la base de datos** *(solo la primera vez o para resetear datos)*
```bash
cd Codigo/server
node seed.js
```

**4. Arrancar el servidor**
```bash
node server.js
```

> El navegador se abrirá automáticamente en `http://localhost:3000`.  
> Si no se abre, accede manualmente a esa dirección.

---

## 🔑 Usuario de Prueba

| Campo | Valor |
|---|---|
| **Correo** | `maria@universidad.es` |
| **Contraseña** | `123456` |

---

## 🌐 Rutas de la API REST

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/ciudades` | Listar todas las ciudades |
| `GET` | `/api/ciudades/:id` | Obtener detalle de una ciudad |
| `POST` | `/api/ciudades` | Crear nueva ciudad |
| `DELETE` | `/api/ciudades/:id` | Eliminar ciudad |
| `GET` | `/api/ciudades/stream` | Stream SSE de cambios en tiempo real |
| `POST` | `/api/login` | Iniciar sesión (correo + contraseña) |
| `POST` | `/api/registro` | Registrar nuevo usuario |
| `GET` | `/api/usuarios/:id` | Perfil completo con ciudades favoritas |

---

## 📄 Funcionalidades Implementadas

- ✅ Explorador de ciudades con filtros por presupuesto, ambiente y búsqueda de texto
- ✅ Actualización en tiempo real mediante Server-Sent Events (SSE)
- ✅ Ficha detallada de ciudad con historia, barrios, alojamiento y transporte
- ✅ Comparador V.S. de dos ciudades en tiempo real
- ✅ Calculadora interactiva de gastos mensuales
- ✅ Guías Erasmus en formato acordeón (Alojamiento, Trámites, 24h, Recetas)
- ✅ Foro de comunidad con formulario de reseñas
- ✅ Sistema de registro de usuarios con validación de contraseñas
- ✅ Inicio de sesión autenticado contra MongoDB
- ✅ Panel de perfil personal con ciudades favoritas guardadas
- ✅ Diseño responsive con estética premium glassmorphism

---

## 👨‍💻 Autor

Práctica desarrollada para la asignatura **SIWEB** — Grado en Ingeniería Informática.  
Universidad · Curso 2025-2026