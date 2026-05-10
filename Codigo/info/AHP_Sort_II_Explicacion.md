# Metodología AHP Sort II en INFUNI

Este documento detalla el proceso algorítmico utilizado para la clasificación de destinos mediante el método **AHP Sort II**. El motor de cálculo se encuentra implementado en `ahp-engine.js` y se integra en la lógica principal de `script.js`.

## 1. Fase AHP: Cálculo de Pesos de los Criterios

El primer paso es determinar la importancia relativa de cada criterio. El sistema maneja **7 criterios**, cuya denominación en la interfaz difiere de los campos reales en la base de datos:

| Criterio (interfaz / pesos) | Campo en `metricas.*` (BD) | Notas |
| :--- | :--- | :--- |
| `transporte` | `calidadTransporte` | |
| `ocio` | `turismo` | |
| `ocioNocturno` | `ambienteNocturno` | |
| `seguridad` | `seguridad` | |
| `calidadAcademica` | `calidadAcademica` | |
| `conectividad` | `conectividad` | |
| `asequibilidad` | `costeAlquilerMedio` | **Invertida**: mayor coste → menor score. Normalización dinámica: `1 + 4*(maxCoste − coste)/(maxCoste − minCoste)` |

Este mapeo se aplica en `script.js` antes del cálculo de puntuación para garantizar que cada peso se aplica sobre la métrica correcta de la ciudad. La `asequibilidad` se pre-computa sobre el rango de costes del conjunto de ciudades cargadas, de forma que la ciudad más barata obtiene un 5 y la más cara un 1.

### Matriz de Comparación (Modo Experto)
Se utiliza una matriz de Saaty $A$ de tamaño $n \times n$ (con $n = 5$), donde el usuario indica la importancia de un criterio $i$ frente a un criterio $j$ en la escala 1–9.

### Cálculo del Vector de Prioridades
Para obtener los pesos ($w$), el motor utiliza la **Media Geométrica Normalizada** (aproximación del autovector principal):

1.  Se calcula la media geométrica de cada fila $i$:
    $$GM_i = \sqrt[n]{\prod_{j=1}^{n} a_{ij}}$$
2.  Se normalizan estos valores para que sumen 1:
    $$w_i = \frac{GM_i}{\sum_{k=1}^{n} GM_k}$$
3.  Los pesos normalizados se reescalan al rango **1–5** para su compatibilidad con los sliders de la interfaz:
    $$w_i^{slider} = \frac{w_i}{\max_k(w_k)} \times 5$$

### Verificación de Consistencia
Se calcula el Índice de Consistencia ($CI$) y la Razón de Consistencia ($CR$):
$$CI = \frac{\lambda_{max} - n}{n - 1}, \quad CR = \frac{CI}{RI}$$

Donde $RI$ es el índice aleatorio de Saaty para el tamaño $n$:

| $n$ | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| $RI$ | 0.58 | 0.90 | 1.12 | 1.24 | 1.32 | 1.41 | 1.45 |

**Casos especiales:**
- Si $n \leq 2$, la consistencia es perfecta por definición ($CR = 0$, no se requiere verificación).
- Si $CR < 0.1$, la matriz se considera consistente.
- Si $CR \geq 0.1$, el motor identifica el **par de criterios más inconsistente** (el que tiene mayor error logarítmico relativo $|\log(a_{ij}) - \log(w_i/w_j)|$) y resalta su celda en la tabla para orientar al usuario.

---

## 2. Fase de Puntuación: Evaluación de Alternativas

Cada ciudad (alternativa) recibe una puntuación global basada en sus métricas y los pesos calculados. Solo se suman los criterios para los cuales la ciudad tiene datos disponibles en la BD:

$$PuntuacionGlobal = \frac{\sum_{i} (Métrica_{i} \times w_i)}{\sum_{i} w_i}$$

*   **Métricas**: Valores numéricos almacenados en `metricas.*` de cada ciudad.
*   **Pesos ($w$):** Los pesos $w_i^{slider}$ (escala 1–5) calculados en la fase AHP.

---

## 3. Fase Sort II: Clasificación por Perfiles Límite

AHP-Sort II clasifica las alternativas en categorías ordinales comparándolas frente a **Perfiles Límite** ($b_1, b_2, ...$): alternativas hipotéticas que marcan la frontera inferior de cada categoría. El umbral de cada categoría es el score que obtendría su perfil límite con los pesos actuales del usuario, por lo que **las fronteras se mueven de forma coherente con sus prioridades** (no son constantes arbitrarias).

### Perfiles Límite definidos
En `script.js`, `LIMITING_PROFILES` contiene un vector de métricas por categoría. Por ejemplo, el perfil límite para **🌟 Destino de Élite** representa una ciudad mínimamente apta para esa categoría:

```js
{
    calidadTransporte: 4.5, turismo: 4.5, ambienteNocturno: 4.0,
    seguridad: 4.5, calidadAcademica: 4.5, conectividad: 4.5,
    asequibilidad: 4.0
}
```

El umbral dinámico se calcula con la misma fórmula que para una ciudad real:
$$umbral_j = \frac{\sum_{i} (b_{j,i} \times w_i)}{\sum_{i} w_i}$$

Donde $b_{j,i}$ es el valor del criterio $i$ en el perfil $j$.

### Algoritmo de Clasificación
Las categorías están ordenadas de mejor a peor. Para una puntuación $S$ de una ciudad:

```javascript
let cat = catFallback; // ⚠️ No Recomendado por defecto
for (const c of categoriasConUmbrales()) {
    if (S >= c.min) { cat = c; break; }
}
```

### Veto (no-compensación parcial)
La suma ponderada es **compensatoria**: una métrica baja se puede compensar con otra alta. Para criterios donde esto es indeseable, se aplica un **veto** que **capa la categoría máxima alcanzable** independientemente del score:

| Criterio | Umbral | Capa a |
| :--- | :---: | :--- |
| `seguridad` | < 2.0 | 🆗 Aceptable |

Una ciudad con seguridad 1 nunca podrá ser clasificada como "Élite" o "Muy Recomendado", aunque su score global sea muy alto. La razón se muestra en la UI con la etiqueta "🚫 Seguridad insuficiente". Esto introduce semántica de outranking dentro de un marco AHP esencialmente compensatorio.

### Alertas de Umbral (sensibilidad)
Tras clasificar, el sistema detecta situaciones límite frente a los **umbrales dinámicos**:
- **Cerca de subir:** diferencia con el umbral de la categoría superior < 0.15 → `✨ Casi en cat. superior`.
- **Cerca de bajar:** diferencia con el umbral de la categoría actual < 0.10 → `⚠️ Al límite inferior`.

Estas alertas se suprimen cuando la ciudad está vetada (la categoría no la determina el score, sino el veto).

---

## Resumen del Flujo de Datos

1. **Entrada:** Matriz de Saaty (modo experto) o sliders con pesos directos.
2. **Procesamiento AHP:** Media Geométrica Normalizada → Test de Consistencia ($CR$) → Reescalado a 1–5.
3. **Agregación:** Suma ponderada de métricas (sólo criterios con datos disponibles), aplicando el mapeo interfaz→BD.
4. **Cálculo de umbrales dinámicos:** El score de cada perfil límite se recalcula con los pesos actuales del usuario.
5. **Clasificación Sort II:** Comparación del score de cada ciudad con los umbrales dinámicos.
6. **Veto:** Métricas críticas (seguridad) por debajo del umbral capan la categoría máxima.
7. **Alertas de umbral:** Detección de ciudades cerca del borde (suprimidas si hay veto).
8. **Salida:** Ranking visual con clasificación, alertas y vetos; mapa interactivo con marcadores de color por posición.
