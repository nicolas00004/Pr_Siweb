# INFUNI — Portal Global de Destinos (Vivir, Trabajar, Viajar) 🌎💼🍹

> Una plataforma interactiva diseñada para que estudiantes Erasmus, nómadas digitales y viajeros puedan explorar, comparar y planificar su próximo gran destino con información real, herramientas inteligentes y feedback de la comunidad.

---

## 📋 Descripción del Proyecto

**INFUNI** ha evolucionado de un portal académico a una solución global de información sobre destinos. Desarrollado como proyecto para la asignatura de **Sistemas de Información en la Web (SIWEB)**, el portal ofrece una experiencia integral para:

- **Nómadas Digitales**: Información sobre conectividad Wi-Fi, espacios de coworking y coste de vida profesional.
- **Estudiantes Erasmus**: Guías de alojamiento, trámites universitarios y presupuesto estudiantil.
- **Viajeros y Turistas**: Rankins de seguridad, nivel de interés turístico y monumentos.

---

## 🏗️ Arquitectura del Proyecto

```
Pr_Siweb/
├── Codigo/                   # Código fuente de la aplicación
│   ├── html/                 # Páginas de la interfaz (UI)
│   │   ├── index.html        # Explorador global de destinos
│   │   ├── detalle.html      # Wiki-ficha de ciudad (Historia, Barrios, Vivienda)
│   │   ├── herramientas.html # Calculadora dual y Comparador multidestino
│   │   ├── guias.html        # Hojas de ruta interactivas con checklist
│   │   ├── comunidad.html    # Plataforma de reseñas y foro
│   │   ├── login.html        # Autenticación segura
│   │   └── perfil.html       # Panel personal (Favoritos sincronizados)
│   ├── css/
│   │   └── style.css         # Diseño Glassmorphism y sistema de notificaciones
│   ├── js/
│   │   ├── auth.js           # Gestión global de sesión y notificaciones Toast
│   │   ├── script.js         # Lógica del mural y persistencia de favoritos
│   │   ├── detalle.js        # Motor de renderizado de fichas dinámicas
│   │   └── api.js            # Configuración de base de la API
│   └── server/
│       ├── server.js         # API REST (Express) + Sincronización de Sesiones
│       └── seed.js           # Script de poblamiento inteligente (Modelos relacionados)
├── package.json
└── README.md
```

---

## 🔧 Ecosistema Tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | HTML5 Semantic, CSS3 (Custom Variables), JavaScript (ES6 Modules) |
| **Backend** | Node.js + Express.js Framework |
| **Base de Datos** | MongoDB (Documental) + Mongoose (ODM) |
| **Persistencia** | Sincronización inteligente de ID de sesión y LocalStorage |
| **UX/UI** | Glassmorphism, Notificaciones Toast, Animaciones CSS |
| **Comunicación** | API REST + Server-Sent Events (SSE) para rankings en vivo |

---

## 🗄️ Modelo de Datos Extendido

El sistema utiliza un esquema relacional sobre MongoDB para garantizar la integridad de los datos:

### `ciudades` (Extendido para Nómadas y Turistas)
| Campo | Tipo | descripción |
|---|---|---|
| `nombre` | String | Nombre del destino |
| `presupuesto` | Number | Gasto mensual (Estudiante vs Pro) |
| `conectividad` | Number (1-5) | Calidad de Wi-Fi y Coworking |
| `turismo` | Number (1-5) | Interés monumental y turístico |
| `ambiente` | String | Estilo de vida (Vida Social / Tranquilidad) |
| `seguridad` | Number (1-5) | Nivel de seguridad ciudadana |
| `historia` | String | Datos históricos y académicos |
| `paisId` | ObjectId | Referencia al país contenedor |

### `usuarios`
| Campo | Tipo | descripción |
|---|---|---|
| `nombre` | String | Nombre completo |
| `correo` | String | Email (Login ID) |
| `ciudadesFavoritas`| [ObjectId]| Relación R1: Ciudades guardadas |
| `paisesRelacionados`| [ObjectId]| Relación R2: Intereses geográficos |

---

## 🚀 Instalación y Puesta en Marcha

Dado que INFUNI utiliza una arquitectura avanzada con un **Sharded Cluster de MongoDB** en Docker, sigue estos pasos para levantar el entorno completo:

### 1. Levantar la Base de Datos Distribuida (Docker)
1. Abre una terminal y navega a la carpeta de configuración de MongoDB:
   ```bash
   cd "Codigo/infuni-mongodb"
   ```
2. Levanta los contenedores en segundo plano:
   ```bash
   docker compose up -d
   ```
3. Inicializa el clúster particionado ejecutando el script de configuración:
   ```bash
   bash init-cluster.sh
   ```
   *(Espera a que el script finalice y muestre "Cluster listo ✓")*

### 2. Instalar el Backend y Sembrar Datos
1. Vuelve a la carpeta raíz del proyecto y luego a `Codigo/server`:
   ```bash
   cd ../server
   npm install
   ```
2. Poblar la base de datos con los datos iniciales y el schema unificado:
   ```bash
   node seed.js
   ```
   *(Esto creará la base de datos `infuni`, usuarios, y fusionará las ciudades con los archivos JSON)*

### 3. Iniciar la Aplicación
1. Arranca el servidor Node.js:
   ```bash
   node server.js
   ```
2. Abre tu navegador y accede a: **`http://localhost:3000`**

### 🔑 Usuarios de Prueba
- **Email**: `maria@universidad.es`
- **Email**: `carlos@universidad.es`
- **Password**: `123456`

---

## ✨ Funcionalidades Estrella

- **🔍 Mural Global**: Filtros avanzados por presupuesto y estilo de vida con actualizaciones en tiempo real.
- **⚖️ Comparador Multidestino**: Compara hasta 4 ciudades simultáneamente incluyendo criterios de Wi-Fi y Turismo.
- **🎚️ Calculadora Dual Estudiante/Pro**: Cambia el modo de la calculadora para adaptar los consejos y costes a tu perfil.
- **✅ Checklist con Memoria**: Hoja de ruta para reubicación que guarda tu progreso automáticamente.
- **🛡️ Sincronización de Seguridad**: Monitorización de sesión que detecta si el ID de usuario es inválido y fuerza el re-login.
- **🔔 Sistema de Toasts**: Feedback visual instantáneo al guardar favoritos o reseñas.

---

## 👨‍💻 Autor

Práctica desarrollada para la asignatura **SIWEB** — Grado en Ingeniería Informática.  
Universidad de Jaén· Curso 2025-2026