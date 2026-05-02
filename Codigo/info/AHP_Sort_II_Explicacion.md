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

AHP Sort II clasifica las alternativas en categorías predefinidas comparando su puntuación global frente a **Perfiles Límite** (thresholds).

### Definición de Categorías
En el sistema INFUNI se definen 4 categorías con sus umbrales mínimos (`CATEGORIAS_AHP` en `script.js`):

| Categoría | Umbral Mínimo ($p_j$) | Color |
| :--- | :--- | :--- |
| **🌟 Destino de Élite** | $\ge 4.5$ | Dorado |
| **✅ Muy Recomendado** | $\ge 3.8$ | Verde |
| **🆗 Aceptable** | $\ge 2.5$ | Azul |
| **⚠️ No Recomendado** | $\ge 0.0$ | Rojo |

### Algoritmo de Clasificación
Las categorías están ordenadas de mayor a menor umbral. Para una puntuación $S$, se asigna la primera categoría cuyo umbral se cumple:

```javascript
for (const cat of categories) {
    if (score >= cat.min) return cat.name;
}
```

### Alertas de Umbral
Tras clasificar, el sistema detecta situaciones límite:
- **Cerca de subir:** si la diferencia con el umbral de la categoría superior es < 0.15, se muestra `✨ Casi en cat. superior`.
- **Cerca de bajar:** si la diferencia con el umbral inferior de la categoría actual es < 0.10, se muestra `⚠️ Al límite inferior`.

Esto permite al usuario saber qué ciudades son candidatas a cambiar de categoría con pequeñas variaciones en sus pesos.

---

## Resumen del Flujo de Datos

1. **Entrada:** Matriz de Saaty (modo experto) o Sliders con pesos directos.
2. **Procesamiento AHP:** Media Geométrica Normalizada → Test de Consistencia (CR) → Reescalado a 1–5.
3. **Agregación:** Suma ponderada de métricas (solo criterios con datos disponibles), aplicando el mapeo interfaz→BD.
4. **Clasificación Sort II:** Comparación con perfiles límite y asignación de categoría.
5. **Alertas de umbral:** Detección de ciudades cerca del borde de categoría.
6. **Salida:** Ranking visual con alertas, mapa interactivo con marcadores de color por posición en el ranking.
