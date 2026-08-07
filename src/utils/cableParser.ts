export interface ParsedCableItem {
  rawToken: string;
  gauge: string;       // e.g. "calibre#500"
  cleanGauge: string;  // e.g. "#500" or "500"
  conductors: number;  // e.g. 3 (multiplier from '3x' or '3#')
  meters: number;      // conductors * lineMeters
}

export interface GaugeSummary {
  gauge: string;           // e.g. "calibre#500"
  cleanGauge: string;      // e.g. "#500"
  totalConductors: number; // total conductors count across all lines/acometidas
  acometidasCount: number; // number of lines/acometidas referencing this gauge
  totalMeters: number;     // total conductors * lineMeters
}

export interface CableLineSource {
  cables?: string;
  meters?: number;
}

/**
 * Parses cable specification strings for a specific line/tramo.
 * Rules:
 * - 'x' or 'X' or '#' is multiplication / conductor count.
 * - What is preceded by '#' is calibre/gauge (e.g. #500, #350, #250, #2/0, #3/0, #10, #12, #6).
 * - Omits 'f', 'n', 't', 'F', 'N', 'T' (fases, neutro, tierra markers).
 * - Calculates meters = conductors * lineMeters.
 */
export function parseCableSpecification(cableStr?: string, lineMeters: number = 0): ParsedCableItem[] {
  if (!cableStr || !cableStr.trim()) return [];

  // Split multi-conductor terms separated by '+', ',', ';' or 'y'
  const rawTerms = cableStr.split(/[\+;,]/);
  const items: ParsedCableItem[] = [];

  for (const rawTerm of rawTerms) {
    const trimmed = rawTerm.trim();
    if (!trimmed) continue;

    // Remove standalone phase/neutro/tierra indicators: F, N, T, f, n, t
    // E.g. "3#250 F" -> "3#250", "1#500N" -> "1#500", "1#6T" -> "1#6"
    let clean = trimmed.replace(/([0-9]+[xX#][0-9\/\.]+)\s*[fntFNT]\b/gi, '$1');
    clean = clean.replace(/([0-9\/\.]+)[fntFNT]\b/gi, '$1');
    clean = clean.replace(/\b[fntFNT]\b/gi, '');

    // Pattern A: Multiplier with 'x', 'X' or '#' followed optional '#' and Gauge
    const match = clean.match(/(?:(\d+)\s*[xX#]\s*)?#?\s*([0-9]+\/[0-9]+|[0-9]+)\b/);

    if (match) {
      const conductors = match[1] ? parseInt(match[1], 10) : 1;
      const rawGauge = match[2];
      const gauge = `calibre#${rawGauge}`;

      items.push({
        rawToken: trimmed,
        gauge,
        cleanGauge: `#${rawGauge}`,
        conductors,
        meters: conductors * (lineMeters || 0)
      });
    }
  }

  return items;
}

/**
 * Aggregates a list of line elements or cable sources into a consolidated gauge breakdown summary.
 */
export function summarizeCables(lines: CableLineSource[]): GaugeSummary[] {
  const map: Record<string, GaugeSummary> = {};

  for (const line of lines) {
    if (!line.cables) continue;
    const lineMeters = line.meters || 0;
    const parsedItems = parseCableSpecification(line.cables, lineMeters);
    const seenInThisLine = new Set<string>();

    for (const item of parsedItems) {
      if (!map[item.gauge]) {
        map[item.gauge] = {
          gauge: item.gauge,
          cleanGauge: item.cleanGauge,
          totalConductors: 0,
          acometidasCount: 0,
          totalMeters: 0
        };
      }

      map[item.gauge].totalConductors += item.conductors;
      map[item.gauge].totalMeters += item.meters;

      if (!seenInThisLine.has(item.gauge)) {
        map[item.gauge].acometidasCount += 1;
        seenInThisLine.add(item.gauge);
      }
    }
  }

  // Sort gauges logically (numeric gauge descending: 500, 350, 250, 4/0, 3/0, 2/0, 12, 6, etc.)
  return Object.values(map).sort((a, b) => {
    const parseNum = (g: string) => {
      const clean = g.replace('calibre#', '');
      if (clean.includes('/0')) {
        const num = parseInt(clean.split('/')[0], 10);
        return 1000 + num; // Sort 4/0, 3/0 higher than small AWG
      }
      return parseInt(clean, 10) || 0;
    };
    return parseNum(b.gauge) - parseNum(a.gauge);
  });
}
