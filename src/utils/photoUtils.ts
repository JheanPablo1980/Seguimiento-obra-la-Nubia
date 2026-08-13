import { ElementPhotoRecord, InspectionElement, FindingStage } from '../types';

/**
 * Normalizes photo records for an element, seamlessly combining
 * structured `photoRecords` and legacy `photos` string array.
 */
export function getElementPhotoRecords(element: InspectionElement): ElementPhotoRecord[] {
  const existingRecords: ElementPhotoRecord[] = Array.isArray(element.photoRecords) ? [...element.photoRecords] : [];
  const existingUrls = new Set(existingRecords.map(r => r.url));

  // If there are legacy string photos not yet registered in photoRecords, map them
  if (Array.isArray(element.photos)) {
    element.photos.forEach((url, index) => {
      if (url && !existingUrls.has(url)) {
        existingRecords.push({
          id: `photo_legacy_${element.id}_${index}_${Math.random().toString(36).substring(2, 7)}`,
          url,
          date: element.date || new Date().toISOString().split('T')[0],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          finding: element.observations || '',
          stage: 'Inspección',
          severity: 'Normal'
        });
        existingUrls.add(url);
      }
    });
  }

  // Sort chronologically (newest first)
  return existingRecords.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return (b.timestamp || '').localeCompare(a.timestamp || '');
  });
}

/**
 * Syncs photo records into the element updating both `photoRecords` and `photos`
 */
export function syncElementPhotoRecords(
  element: InspectionElement,
  records: ElementPhotoRecord[]
): InspectionElement {
  return {
    ...element,
    photoRecords: records,
    photos: records.map(r => r.url),
    lastUpdate: new Date().toLocaleTimeString()
  };
}

/**
 * Groups photo records by their inspection/finding date.
 */
export function groupPhotoRecordsByDate(records: ElementPhotoRecord[]): Record<string, ElementPhotoRecord[]> {
  const groups: Record<string, ElementPhotoRecord[]> = {};
  records.forEach(rec => {
    const d = rec.date || 'Sin fecha';
    if (!groups[d]) groups[d] = [];
    groups[d].push(rec);
  });
  return groups;
}

/**
 * Formats YYYY-MM-DD date string into a user-friendly Spanish label
 */
export function formatFindingDate(dateStr: string): string {
  if (!dateStr || dateStr === 'Sin fecha') return 'Sin fecha registrada';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Color and styling classes for finding stages
 */
export function getStageBadgeStyle(stage?: FindingStage | string): { bg: string; text: string; border: string } {
  const s = (stage || '').toLowerCase();
  if (s.includes('hallazgo')) {
    return { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' };
  }
  if (s.includes('no conformidad') || s.includes('critico') || s.includes('crítico')) {
    return { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/40' };
  }
  if (s.includes('avance') || s.includes('terminado') || s.includes('después') || s.includes('despues')) {
    return { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40' };
  }
  if (s.includes('durante') || s.includes('proceso')) {
    return { bg: 'bg-sky-500/20', text: 'text-sky-300', border: 'border-sky-500/40' };
  }
  if (s.includes('antes')) {
    return { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/40' };
  }
  return { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-600' };
}
