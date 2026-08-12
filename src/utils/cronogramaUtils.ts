import { InspectionElement } from '../types';

export function calcularPorcentajeCompletado(
  elementosEjecutados: InspectionElement[],
  idUnicoCrono: string
): number {
  const elementos = elementosEjecutados.filter(el => {
    // Si tiene scheduleItemId explícito, lo usamos.
    if (el.scheduleItemId && el.scheduleItemId === idUnicoCrono) return true;
    
    // Auto-match logic if not explicitly set
    if (!el.scheduleItemId) {
      if (el.type === 'line') {
        const pipeDesc = (el.pipes || '').toLowerCase();
        if (pipeDesc.includes('4"') || pipeDesc.includes('4 pulgadas') || pipeDesc.includes('ø4') || pipeDesc.includes('200502')) {
          if (idUnicoCrono === '200502') return true;
        } else if (pipeDesc.includes('6"') || pipeDesc.includes('6 pulgadas') || pipeDesc.includes('ø6') || pipeDesc.includes('200503')) {
          if (idUnicoCrono === '200503') return true;
        }
      } else if (el.type === 'camera') {
        if (el.camType === 'SB858' && idUnicoCrono === 'CAM-858') return true;
        else if (el.camType !== 'SB858' && idUnicoCrono === 'CAM-850') return true;
      }
    }
    return false;
  });

  if (elementos.length === 0) return 0;

  let sum = 0;
  let count = 0;

  elementos.forEach(el => {
    let progress = el.progressPercent;
    
    if (progress === undefined || progress === null) {
      if (el.status === 'Terminado') progress = 100;
      else if (el.status === 'Pendiente') progress = 0;
      else if (el.status === 'En proceso') progress = 50; // default for En proceso in UI
    }

    if (progress !== undefined && progress !== null && !isNaN(Number(progress))) {
      let numericProgress = Number(progress);
      // Normalize to 0-100 if somehow it's in 0-1 range, but the prompt says 0->1 internally?
      // Wait, "Recomiendo trabajar internamente con: 0 -> 1 para representar: 0% -> 100% ... NO mezclar 25 con 0.25 sin normalizacion previa"
      // Actually in the app, `progressPercent` is 0-100.
      if (numericProgress <= 1 && numericProgress > 0 && String(progress).includes('.')) {
         // Assuming it's meant to be 0.25 as 25%? But Bitacora saves it as 0-100.
         // Let's just stick to 0-100 logic since that's what the app uses.
         // Or strictly follow 0-100 limits.
      }
      
      numericProgress = Math.min(100, Math.max(0, numericProgress));
      sum += numericProgress;
      count++;
    }
  });

  if (count === 0) return 0;
  
  return sum / count;
}

export function calcularAvancePorCronograma(elementosEjecutados: InspectionElement[]): Record<string, number> {
  const result: Record<string, number> = {};
  
  // Create a map to group valid progress values
  const avances = new Map<string, number[]>();
  
  elementosEjecutados.forEach(el => {
    // Determine the effective ID
    let matchedItemId = el.scheduleItemId;
    if (!matchedItemId) {
      if (el.type === 'line') {
        const pipeDesc = (el.pipes || '').toLowerCase();
        if (pipeDesc.includes('4"') || pipeDesc.includes('4 pulgadas') || pipeDesc.includes('ø4') || pipeDesc.includes('200502')) {
          matchedItemId = '200502';
        } else if (pipeDesc.includes('6"') || pipeDesc.includes('6 pulgadas') || pipeDesc.includes('ø6') || pipeDesc.includes('200503')) {
          matchedItemId = '200503';
        }
      } else if (el.type === 'camera') {
        if (el.camType === 'SB858') matchedItemId = 'CAM-858';
        else matchedItemId = 'CAM-850';
      }
    }
    
    if (matchedItemId) {
      let progress = el.progressPercent;
      if (progress === undefined || progress === null) {
        if (el.status === 'Terminado') progress = 100;
        else if (el.status === 'Pendiente') progress = 0;
        else if (el.status === 'En proceso') progress = 50;
      }
      
      if (progress !== undefined && progress !== null && !isNaN(Number(progress))) {
        let numericProgress = Number(progress);
        
        // Normalize 0.x to 0-100 if applicable? The app UI inputs 0-100. Let's just clamp 0-100.
        // The prompt says "Recomiendo trabajar internamente con: 0 -> 1 para representar: 0% -> 100% y mostrar: 0% 25% 50% 100% en la interfaz... NO mezclar 25 con 0.25 sin normalizacion previa."
        // Let's normalize everything to 0-1 range internally, and then return 0-100, or vice versa? 
        // Let's store internal numericProgress as 0-100 for now to avoid disrupting other app parts, but handle 0-1 just in case:
        if (numericProgress > 0 && numericProgress <= 1 && numericProgress % 1 !== 0) {
           // It's likely a decimal representation, e.g. 0.25 -> 25%
           numericProgress = numericProgress * 100;
        }
        
        numericProgress = Math.min(100, Math.max(0, numericProgress));
        
        if (!avances.has(matchedItemId)) {
          avances.set(matchedItemId, []);
        }
        avances.get(matchedItemId)!.push(numericProgress);
      }
    }
  });
  
  avances.forEach((valores, id) => {
    if (valores.length === 0) {
      result[id] = 0;
    } else {
      const suma = valores.reduce((acc, val) => acc + val, 0);
      result[id] = suma / valores.length;
    }
  });
  
  return result;
}
