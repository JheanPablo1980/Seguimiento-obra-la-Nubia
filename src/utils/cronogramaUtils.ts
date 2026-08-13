import { InspectionElement } from '../types';

export function matchElementToScheduleId(el: InspectionElement, targetIdOrCode: string): boolean {
  if (!targetIdOrCode) return false;
  const target = targetIdOrCode.trim().toUpperCase();

  // 1. Explicit scheduleItemId on element
  if (el.scheduleItemId) {
    const elItemId = el.scheduleItemId.trim().toUpperCase();
    if (elItemId === target) return true;

    // Equivalences between ID, Code and legacy codes
    if ((target === 'DUCT-4-MT' || target === 'D-4-MT') && (elItemId === 'DUCT-4-MT' || elItemId === 'D-4-MT' || elItemId === '200502')) return true;
    if ((target === 'DUCT-4-DATOS' || target === 'D-4-DATOS') && (elItemId === 'DUCT-4-DATOS' || elItemId === 'D-4-DATOS')) return true;
    if ((target === 'DUCT-6-BT' || target === 'D-6-BT') && (elItemId === 'DUCT-6-BT' || elItemId === 'D-6-BT' || elItemId === '200503')) return true;
    if ((target === 'CAM-MT' || target === 'C-MT') && (elItemId === 'CAM-MT' || elItemId === 'C-MT')) return true;
    if ((target === 'CAM-BT' || target === 'C-BT') && (elItemId === 'CAM-BT' || elItemId === 'C-BT' || elItemId === 'CAM-850')) return true;
    if ((target === 'CAM-DATOS' || target === 'C-DATOS') && (elItemId === 'CAM-DATOS' || elItemId === 'C-DATOS' || elItemId === 'CAM-858')) return true;
  }

  // 2. Fallback auto-matching by element specification if no explicit scheduleItemId
  if (el.type === 'line') {
    const pipeDesc = (el.pipes || '').toLowerCase();
    if (pipeDesc.includes('datos') || pipeDesc.includes('telecom')) {
      return target === 'DUCT-4-DATOS' || target === 'D-4-DATOS';
    } else if (pipeDesc.includes('mt') || pipeDesc.includes('media') || pipeDesc.includes('200502')) {
      return target === 'DUCT-4-MT' || target === 'D-4-MT';
    } else if (pipeDesc.includes('6"') || pipeDesc.includes('bt') || pipeDesc.includes('baja') || pipeDesc.includes('200503')) {
      return target === 'DUCT-6-BT' || target === 'D-6-BT';
    } else {
      return target === 'DUCT-4-MT' || target === 'D-4-MT';
    }
  } else if (el.type === 'camera') {
    const camDesc = (el.camType || el.label || '').toLowerCase();
    if (camDesc.includes('datos') || camDesc.includes('telecom') || camDesc.includes('sb858')) {
      return target === 'CAM-DATOS' || target === 'C-DATOS';
    } else if (camDesc.includes('bt') || camDesc.includes('baja') || camDesc.includes('sb850')) {
      return target === 'CAM-BT' || target === 'C-BT';
    } else if (camDesc.includes('mt') || camDesc.includes('media')) {
      return target === 'CAM-MT' || target === 'C-MT';
    } else {
      return target === 'CAM-BT' || target === 'C-BT';
    }
  }

  return false;
}

export function calcularPorcentajeCompletado(
  elementosEjecutados: InspectionElement[],
  idUnicoCrono: string
): number {
  const elementos = elementosEjecutados.filter(el => matchElementToScheduleId(el, idUnicoCrono));

  if (elementos.length === 0) return 0;

  let sum = 0;
  let count = 0;

  elementos.forEach(el => {
    let progress = el.progressPercent;
    
    if (progress === undefined || progress === null) {
      if (el.status === 'Terminado') progress = 100;
      else if (el.status === 'Pendiente') progress = 0;
      else if (el.status === 'En proceso') progress = 50;
    }

    if (progress !== undefined && progress !== null && !isNaN(Number(progress))) {
      let numericProgress = Number(progress);
      if (numericProgress > 0 && numericProgress <= 1 && numericProgress % 1 !== 0) {
        numericProgress = numericProgress * 100;
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
  const avances = new Map<string, number[]>();
  
  elementosEjecutados.forEach(el => {
    // Resolve matching schedule item key
    let matchedItemId = el.scheduleItemId;
    if (!matchedItemId) {
      if (el.type === 'line') {
        const pipeDesc = (el.pipes || '').toLowerCase();
        if (pipeDesc.includes('datos') || pipeDesc.includes('telecom')) matchedItemId = 'DUCT-4-DATOS';
        else if (pipeDesc.includes('mt') || pipeDesc.includes('media')) matchedItemId = 'DUCT-4-MT';
        else if (pipeDesc.includes('6"') || pipeDesc.includes('bt') || pipeDesc.includes('baja')) matchedItemId = 'DUCT-6-BT';
        else matchedItemId = 'DUCT-4-MT';
      } else if (el.type === 'camera') {
        const camDesc = (el.camType || el.label || '').toLowerCase();
        if (camDesc.includes('datos') || camDesc.includes('telecom')) matchedItemId = 'CAM-DATOS';
        else if (camDesc.includes('bt') || camDesc.includes('baja')) matchedItemId = 'CAM-BT';
        else if (camDesc.includes('mt') || camDesc.includes('media')) matchedItemId = 'CAM-MT';
        else matchedItemId = 'CAM-BT';
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
        if (numericProgress > 0 && numericProgress <= 1 && numericProgress % 1 !== 0) {
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
