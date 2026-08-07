export const normalizeActa = (acta?: string): string => {
  if (!acta) return 'Sin Asignar';
  const trimmed = acta.trim();
  if (!trimmed || trimmed.toLowerCase() === 'sin asignar') return 'Sin Asignar';
  
  // Pure number string like "1", "2", "3" -> "Acta 1", "Acta 2"
  if (/^\d+$/.test(trimmed)) {
    return `Acta ${parseInt(trimmed, 10)}`;
  }

  // Handle "acta 1", "acta 01", "acta#1", "ACTA 1" -> "Acta 1"
  const match = trimmed.match(/^acta\s*#?\s*0*(\d+)$/i);
  if (match) {
    return `Acta ${parseInt(match[1], 10)}`;
  }

  return trimmed;
};

export const getAvailableActas = (
  elements: Array<{ acta?: string }>,
  totalActas: number = 10
): string[] => {
  const defaultActas = Array.from({ length: totalActas }, (_, i) => `Acta ${i + 1}`);
  const customActas = elements
    .map(e => normalizeActa(e.acta))
    .filter(a => a !== 'Sin Asignar' && !defaultActas.includes(a));
  return Array.from(new Set([...defaultActas, ...customActas])).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
    const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
    return numA - numB;
  });
};
