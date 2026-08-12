const fs = require('fs');
let content = fs.readFileSync('src/components/KpiMetrics.tsx', 'utf-8');

if (!content.includes('import { calcularAvancePorCronograma }')) {
  content = content.replace(
    "import { normalizeActa } from '../utils/actaUtils';",
    "import { normalizeActa } from '../utils/actaUtils';\nimport { calcularAvancePorCronograma } from '../utils/cronogramaUtils';"
  );
}

const oldProgressPct = `  let progressPct = 0;
  if (totalItems > 0) {
    progressPct = Math.round(((termCount + procCount * 0.5) / totalItems) * 100);
  }`;

const newProgressPct = `  let progressPct = 0;
  const avancesMap = calcularAvancePorCronograma(filteredElements);
  const avanceValues = Object.values(avancesMap);
  if (avanceValues.length > 0) {
    const sum = avanceValues.reduce((acc, val) => acc + val, 0);
    progressPct = Math.round(sum / avanceValues.length);
  } else if (totalItems > 0) {
    // Fallback if no elements match any schedule items
    progressPct = Math.round(((termCount + procCount * 0.5) / totalItems) * 100);
  }`;

content = content.replace(oldProgressPct, newProgressPct);

fs.writeFileSync('src/components/KpiMetrics.tsx', content);
