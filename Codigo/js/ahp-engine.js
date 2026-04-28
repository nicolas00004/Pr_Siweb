/**
 * Motor AHP-Sort II para INFUNI
 * Gestiona el cálculo de pesos mediante matrices y la clasificación por perfiles
 */

const AHPEngine = (function() {
    // Escala de Saaty para el Índice Aleatorio (RI)
    const RI = [0, 0, 0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45];

    return {
        /**
         * Calcula el vector de prioridades (pesos) a partir de una matriz de comparación
         * Utiliza el método de la media geométrica normalizada (aproximación de autovector)
         */
        calculateWeights: function(matrix) {
            const n = matrix.length;
            let geometricMeans = [];
            let sumTotal = 0;

            for (let i = 0; i < n; i++) {
                let prod = 1;
                for (let j = 0; j < n; j++) {
                    prod *= matrix[i][j];
                }
                const mean = Math.pow(prod, 1 / n);
                geometricMeans.push(mean);
                sumTotal += mean;
            }

            return geometricMeans.map(m => m / sumTotal);
        },

        /**
         * Verifica la consistencia de la matriz
         */
        checkConsistency: function(matrix, weights) {
            const n = matrix.length;
            if (n <= 2) return { consistent: true, cr: 0 };

            let lambdaMax = 0;
            for (let j = 0; j < n; j++) {
                let colSum = 0;
                for (let i = 0; i < n; i++) {
                    colSum += matrix[i][j];
                }
                lambdaMax += colSum * weights[j];
            }

            const ci = (lambdaMax - n) / (n - 1);
            const cr = ci / RI[n];

            return {
                consistent: cr < 0.1,
                cr: cr.toFixed(4),
                ci: ci.toFixed(4)
            };
        },

        /**
         * Clasifica una ciudad en categorías (AHP-Sort II)
         */
        classify: function(score, thresholds) {
            // thresholds: [ {name: 'Excelente', min: 4}, {name: 'Bueno', min: 3}, ... ]
            for (const t of thresholds) {
                if (score >= t.min) return t.name;
            }
            return 'No Recomendado';
        }
    };
})();
