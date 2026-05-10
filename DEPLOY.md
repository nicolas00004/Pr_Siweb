# Guía de despliegue — Infuni

Despliegue de la aplicación Express + MongoDB en producción usando:

- **MongoDB Atlas** (Free M0) — base de datos en la nube
- **Render** (Free Web Service) — servidor Node.js
- **Porkbun** — dominio personalizado ya adquirido

Coste total: **0 €/mes**.

---

## Resumen de fases

1. Crear y configurar cluster en MongoDB Atlas
2. Preparar el repositorio en GitHub
3. Crear el Web Service en Render
4. Sembrar la base de datos
5. Configurar el DNS en Porkbun
6. Verificar HTTPS y dominio
7. Troubleshooting

---

## 1. MongoDB Atlas

### 1.1 Crear cluster

1. Entra en https://cloud.mongodb.com y crea cuenta (con Google o email).
2. **Build a Database** → elige tier **M0 Free**.
3. Provider/Region: **AWS / Frankfurt (eu-central-1)** (latencia baja desde Render Frankfurt).
4. Cluster name: `infuni-cluster` (o el que prefieras).
5. **Create Deployment** y espera 1-3 minutos.

### 1.2 Crear usuario de base de datos

1. **Database Access** (menú izquierdo) → **Add New Database User**.
2. Authentication Method: **Password**.
3. Username: `infuni_app`.
4. Password: pulsa **Autogenerate Secure Password** y **GUÁRDALA** (no la verás otra vez).
5. Database User Privileges: **Read and write to any database**.
6. **Add User**.

### 1.3 Whitelist de IPs

1. **Network Access** → **Add IP Address**.
2. Selecciona **Allow Access from Anywhere** (`0.0.0.0/0`).
   - Render Free no tiene IP fija, no hay alternativa.
3. **Confirm**.

### 1.4 Obtener connection string

1. **Database** → en tu cluster pulsa **Connect**.
2. Elige **Drivers** → Driver: **Node.js**, Version: la más reciente.
3. Copia la cadena, parecida a:

   ```
   mongodb+srv://infuni_app:<password>@infuni-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

4. Sustituye `<password>` por la real **e inserta el nombre de la BD `infuni`** antes del `?`:

   ```
   mongodb+srv://infuni_app:TU_PASSWORD_REAL@infuni-cluster.xxxxx.mongodb.net/infuni?retryWrites=true&w=majority
   ```

5. Guarda esta cadena en un sitio seguro — la usaremos en Render.

---

## 2. Repositorio en GitHub

### 2.1 Verificar `.gitignore`

Asegúrate de que `.env` y `node_modules/` están en `.gitignore` (ya lo están).

### 2.2 Pushear los últimos cambios

```bash
git status
git add .
git commit -m "Preparar despliegue"
git push origin release   # o la rama que quieras desplegar
```

> Si quieres desplegar `main`, primero haz merge de `release` a `main`.

---

## 3. Render — Web Service

### 3.1 Crear cuenta

1. https://render.com → **Get Started** → Sign in with GitHub.
2. Autoriza el acceso al repositorio `Pr_Siweb`.

### 3.2 Crear Web Service

1. Dashboard → **New +** → **Web Service**.
2. Selecciona el repo `Pr_Siweb` → **Connect**.
3. Configuración:

   | Campo | Valor |
   |-------|-------|
   | Name | `infuni` |
   | Region | Frankfurt (EU Central) |
   | Branch | `release` (o `main`) |
   | Root Directory | (vacío) |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | **Free** |

### 3.3 Variables de entorno

En la sección **Environment Variables** añade:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | la cadena del paso 1.4 |
| `NODE_ENV` | `production` |

> **No añadas `PORT`** — Render lo inyecta automáticamente y `server.js` ya lo lee con `process.env.PORT`.

### 3.4 Crear el servicio

Pulsa **Create Web Service**. Render hará el primer build (3-5 min). Cuando termine, verás un log con:

```
✅ Conectado a MongoDB (mongodb+srv://...)
🚀 Servidor escuchando en puerto XXXX
```

(o similar — depende de tus mensajes en `server.js`).

Render te asigna una URL temporal: `https://infuni.onrender.com`.

---

## 4. Sembrar la base de datos (primera vez)

La BD en Atlas está vacía. Hay dos opciones:

### Opción A — Sembrar desde tu equipo (recomendado)

1. Crea localmente un fichero `.env` en la raíz del proyecto con la **misma** `MONGODB_URI` de Atlas:

   ```
   MONGODB_URI=mongodb+srv://infuni_app:TU_PASSWORD@infuni-cluster.xxxxx.mongodb.net/infuni?retryWrites=true&w=majority
   PORT=3000
   NODE_ENV=development
   ```

2. Ejecuta:

   ```bash
   npm install
   npm run seed
   ```

3. Verás `✅ Conectado a MongoDB para el sembrado (...)` y los logs de inserción. Cuando termine, **borra ese `.env` o asegúrate de que sigue ignorado por git**.

### Opción B — Sembrar desde Render

1. En Render → tu servicio → **Shell** (pestaña).
2. Ejecuta `npm run seed`.

---

## 5. DNS en Porkbun

### 5.1 Añadir el dominio en Render

1. Render → tu servicio → **Settings** → **Custom Domains** → **Add Custom Domain**.
2. Escribe tu dominio (ej. `tudominio.com`) → **Save**.
3. Repite para `www.tudominio.com`.
4. Render te muestra los valores DNS que necesita. Apúntalos:
   - Para la **raíz** (`tudominio.com`): un host/IP para registro `ALIAS` o `A`.
   - Para `www`: un target `CNAME` (`infuni.onrender.com`).

### 5.2 Configurar registros en Porkbun

1. Entra en https://porkbun.com → **Account** → **Domain Management**.
2. En tu dominio pulsa el icono de **DNS** (engranaje / "Details").
3. **Borra** los registros por defecto que apunten al parking de Porkbun (suele haber un `A` y `CNAME` hacia `pixie.porkbun.com` o similar).
4. Añade los nuevos:

   | Type | Host | Answer | TTL |
   |------|------|--------|-----|
   | `ALIAS` | *(dejar vacío para la raíz)* | el host que indique Render | 600 |
   | `CNAME` | `www` | `infuni.onrender.com` | 600 |

   - Si Render te da una **IP** en lugar de un host, usa **`A`** en vez de `ALIAS`.
   - Porkbun llama "ALIAS" al equivalente de "ANAME"/"CNAME en raíz".

5. Guarda.

### 5.3 Esperar propagación

- 5-30 minutos típicamente, hasta 24 h en el peor caso.
- Comprueba con:
  ```bash
  dig tudominio.com
  dig www.tudominio.com
  ```
  o en https://dnschecker.org.

---

## 6. Verificación

1. En Render → **Custom Domains**, los estados deben pasar de `Verifying` a `Verified` y emitir el certificado HTTPS automáticamente (Let's Encrypt).
2. Abre `https://tudominio.com` en el navegador. Debe cargar tu app con candado verde.
3. Comprueba que las llamadas a la API funcionan (las que `script.js` hace contra el backend) y que el listado de ciudades aparece.

---

## 7. Troubleshooting

### El servicio tarda mucho en responder la primera vez
Es normal en Render Free: tras 15 min sin tráfico el servicio "duerme" y la primera petición tarda ~30 s. Soluciones:
- Pasar a plan **Starter** ($7/mes) → no duerme.
- O usar un cron-pinger gratuito (https://cron-job.org) que haga `GET /` cada 10 min.

### Error `MongoServerError: bad auth`
- Contraseña mal escrita en `MONGODB_URI`.
- Caracteres especiales en la contraseña → debes URL-encodearlos (`@` → `%40`, `:` → `%3A`, etc.).

### Error `connection timed out` a Atlas
- IP no whitelisted. Vuelve a 1.3 y verifica que `0.0.0.0/0` está activo.

### `Cannot GET /` o 404 en producción
- Render usa otro `cwd`. Comprueba que `server.js` referencia archivos estáticos con `path.join(__dirname, ...)` (ya lo hace).

### El dominio no resuelve después de 1 hora
- En Porkbun verifica que **no queden registros antiguos** apuntando al parking.
- Si usas Cloudflare como DNS proxy, debe estar en modo **DNS only** (nube gris) hasta que Render emita el certificado.

### Cambios en el código no se ven
- Render redespliega solo al hacer `git push` a la rama configurada. Si no detecta el push, revisa **Settings → Build & Deploy → Auto-Deploy: Yes**.

---

## Apéndice — Archivo `.env.example` final para producción

```env
# Cadena de conexión a MongoDB Atlas (sustituye con la tuya)
MONGODB_URI=mongodb+srv://infuni_app:<password>@infuni-cluster.xxxxx.mongodb.net/infuni?retryWrites=true&w=majority

# Render inyecta PORT automáticamente; en local usa 3000
PORT=3000

# production desactiva el auto-open del navegador
NODE_ENV=production
```
