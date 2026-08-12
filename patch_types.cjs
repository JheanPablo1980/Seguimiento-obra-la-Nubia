const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf-8');

content = content.replace(
  `  category?: 'tuberia' | 'camara' | 'sector' | 'general';
  notes?: string;`,
  `  category?: 'tuberia' | 'camara' | 'sector' | 'general' | string;
  notes?: string;

  // New imported cronograma fields
  duracion?: string;
  start?: string;
  finish?: string;
  porcentajeCompletado?: number;
  comienzoLineaBase?: string;
  finLineaBase?: string;
  duracionLineaBase?: string;
  rawExtras?: Record<string, string>;`
);

fs.writeFileSync('src/types.ts', content);
