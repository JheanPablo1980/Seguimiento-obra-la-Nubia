import { InspectionElement, ScheduleItem } from '../types';

/**
 * Normaliza cualquier valor de porcentaje de avance (0-100) desde la bitácora,
 * considerando tanto el número ingresado como el estado en texto si no hay porcentaje.
 */
export function normalizarPorcentaje(progress?: number | null, status?: string): number {
  if (progress !== undefined && progress !== null && !isNaN(Number(progress))) {
    let numeric = Number(progress);
    if (numeric > 0 && numeric <= 1 && numeric % 1 !== 0) {
      numeric = numeric * 100;
    }
    return Math.min(100, Math.max(0, numeric));
  }

  if (status) {
    const st = status.toLowerCase().trim();
    if (st.includes('terminad') || st.includes('completad') || st.includes('finalizad')) return 100;
    if (st.includes('proceso') || st.includes('ejecucion') || st.includes('ejecución')) return 50;
  }

  return 0;
}

/**
 * Comprueba si un elemento de la bitácora coincide con el ID o Código de un rubro del cronograma.
 */
export function matchElementToScheduleId(
  el: InspectionElement, 
  targetIdOrCode: string,
  scheduleItems?: ScheduleItem[]
): boolean {
  if (!targetIdOrCode) return false;
  const target = targetIdOrCode.trim().toUpperCase();

  // 1. Check scheduleItems if provided
  if (scheduleItems && scheduleItems.length > 0) {
    const targetItem = scheduleItems.find(
      i => i.id.trim().toUpperCase() === target || (i.code && i.code.trim().toUpperCase() === target)
    );
    if (targetItem && el.scheduleItemId) {
      const elItemId = el.scheduleItemId.trim().toUpperCase();
      if (
        elItemId === targetItem.id.trim().toUpperCase() || 
        (targetItem.code && elItemId === targetItem.code.trim().toUpperCase())
      ) {
        return true;
      }
    }
  }

  // 2. Coincidencia explícita por scheduleItemId
  if (el.scheduleItemId) {
    const elItemId = el.scheduleItemId.trim().toUpperCase();
    if (elItemId === target) return true;

    // Equivalencias entre ID, Código y códigos heredados
    if ((target === 'DUCT-4-MT' || target === 'D-4-MT' || target === '200502') && 
        (elItemId === 'DUCT-4-MT' || elItemId === 'D-4-MT' || elItemId === '200502')) return true;
    if ((target === 'DUCT-4-DATOS' || target === 'D-4-DATOS') && 
        (elItemId === 'DUCT-4-DATOS' || elItemId === 'D-4-DATOS')) return true;
    if ((target === 'DUCT-6-BT' || target === 'D-6-BT' || target === '200503') && 
        (elItemId === 'DUCT-6-BT' || elItemId === 'D-6-BT' || elItemId === '200503')) return true;
    if ((target === 'CAM-MT' || target === 'C-MT') && 
        (elItemId === 'CAM-MT' || elItemId === 'C-MT')) return true;
    if ((target === 'CAM-BT' || target === 'C-BT' || target === 'CAM-850') && 
        (elItemId === 'CAM-BT' || elItemId === 'C-BT' || elItemId === 'CAM-850')) return true;
    if ((target === 'CAM-DATOS' || target === 'C-DATOS' || target === 'CAM-858') && 
        (elItemId === 'CAM-DATOS' || elItemId === 'C-DATOS' || elItemId === 'CAM-858')) return true;

    return false;
  }

  // 2. Coincidencia automática por especificaciones si no tiene scheduleItemId
  if (el.type === 'line') {
    const pipeDesc = (el.pipes || '').toLowerCase();
    if (pipeDesc.includes('datos') || pipeDesc.includes('telecom')) {
      return target === 'DUCT-4-DATOS' || target === 'D-4-DATOS';
    } else if (pipeDesc.includes('mt') || pipeDesc.includes('media') || pipeDesc.includes('200502')) {
      return target === 'DUCT-4-MT' || target === 'D-4-MT' || target === '200502';
    } else if (pipeDesc.includes('6"') || pipeDesc.includes('bt') || pipeDesc.includes('baja') || pipeDesc.includes('200503')) {
      return target === 'DUCT-6-BT' || target === 'D-6-BT' || target === '200503';
    } else {
      return target === 'DUCT-4-MT' || target === 'D-4-MT' || target === '200502';
    }
  } else if (el.type === 'camera') {
    const camDesc = (el.camType || el.label || '').toLowerCase();
    if (camDesc.includes('datos') || camDesc.includes('telecom') || camDesc.includes('sb858')) {
      return target === 'CAM-DATOS' || target === 'C-DATOS' || target === 'CAM-858';
    } else if (camDesc.includes('bt') || camDesc.includes('baja') || camDesc.includes('sb850')) {
      return target === 'CAM-BT' || target === 'C-BT' || target === 'CAM-850';
    } else if (camDesc.includes('mt') || camDesc.includes('media')) {
      return target === 'CAM-MT' || target === 'C-MT';
    } else {
      return target === 'CAM-BT' || target === 'C-BT' || target === 'CAM-850';
    }
  }

  return false;
}

/**
 * FUNCIÓN CENTRALIZADA: calcularAvancePorCronograma
 * Promedio agrupado por ID_UNICO_CRONO para la lista de actividades/elementos ejecutados.
 * Es la ÚNICA FUENTE DE VERDAD para el cálculo del porcentaje completado en todos los módulos.
 */
export function calcularAvancePorCronograma(
  elementosEjecutados: InspectionElement[],
  scheduleItems?: ScheduleItem[]
): Record<string, number> {
  const result: Record<string, number> = {};
  const avances = new Map<string, number[]>();

  elementosEjecutados.forEach(el => {
    const numericProgress = normalizarPorcentaje(el.progressPercent, el.status);

    // Determinar ID / Código de cronograma del elemento
    let matchedItemId = el.scheduleItemId;

    if (scheduleItems && scheduleItems.length > 0) {
      const foundItem = scheduleItems.find(
        item => item.id === matchedItemId || item.code === matchedItemId
      );
      if (foundItem) {
        matchedItemId = foundItem.id;
      }
    }

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
      if (!avances.has(matchedItemId)) {
        avances.set(matchedItemId, []);
      }
      avances.get(matchedItemId)!.push(numericProgress);
    }
  });

  // Calcular el promedio simple por grupo de ID_UNICO_CRONO
  avances.forEach((valores, id) => {
    if (valores.length === 0) {
      result[id] = 0;
    } else {
      const suma = valores.reduce((acc, val) => acc + val, 0);
      result[id] = Math.round((suma / valores.length) * 100) / 100;
    }
  });

  // Mapear alias y códigos equivalentes para que la búsqueda por id o por código devuelva el mismo valor
  if (scheduleItems && scheduleItems.length > 0) {
    scheduleItems.forEach(item => {
      const avg = result[item.id] ?? result[item.code] ?? 0;
      result[item.id] = avg;
      if (item.code) {
        result[item.code] = avg;
      }
    });
  }

  // Mapeos heredados de compatibilidad
  if (result['DUCT-4-MT'] !== undefined) {
    result['D-4-MT'] = result['DUCT-4-MT'];
    result['200502'] = result['DUCT-4-MT'];
  }
  if (result['DUCT-4-DATOS'] !== undefined) {
    result['D-4-DATOS'] = result['DUCT-4-DATOS'];
  }
  if (result['DUCT-6-BT'] !== undefined) {
    result['D-6-BT'] = result['DUCT-6-BT'];
    result['200503'] = result['DUCT-6-BT'];
  }
  if (result['CAM-MT'] !== undefined) {
    result['C-MT'] = result['CAM-MT'];
  }
  if (result['CAM-BT'] !== undefined) {
    result['C-BT'] = result['CAM-BT'];
    result['CAM-850'] = result['CAM-BT'];
  }
  if (result['CAM-DATOS'] !== undefined) {
    result['C-DATOS'] = result['CAM-DATOS'];
    result['CAM-858'] = result['CAM-DATOS'];
  }

  return result;
}

/**
 * Obtiene el porcentaje de avance para un ID_UNICO_CRONO específico reutilizando calcularAvancePorCronograma.
 */
export function calcularPorcentajeCompletado(
  elementosEjecutados: InspectionElement[],
  idUnicoCrono: string,
  scheduleItems?: ScheduleItem[]
): number {
  if (!idUnicoCrono) return 0;
  const mapaAvances = calcularAvancePorCronograma(elementosEjecutados, scheduleItems);
  return mapaAvances[idUnicoCrono] ?? mapaAvances[idUnicoCrono.toUpperCase()] ?? 0;
}
