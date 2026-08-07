import { InspectionElement } from '../types';

/**
 * Adjusts the meters of a line element (tramo) and scales its graphical coordinates (x2, y2)
 * on the blueprint canvas accordingly.
 */
export function adjustTramoMeters(el: InspectionElement, newMetersOrDelta: number, isDelta = false): InspectionElement {
  if (el.type !== 'line') return el;

  const currentMeters = el.meters || 1;
  const targetMeters = Math.max(1, isDelta ? currentMeters + newMetersOrDelta : newMetersOrDelta);

  let newX2 = el.x2;
  let newY2 = el.y2;

  if (el.x2 !== undefined && el.y2 !== undefined) {
    const dx = el.x2 - el.x;
    const dy = el.y2 - el.y;
    const currentDistPx = Math.hypot(dx, dy);

    if (currentDistPx > 0) {
      // 15px per meter ratio
      const desiredPx = targetMeters * 15;
      const scale = desiredPx / currentDistPx;
      newX2 = Math.round(el.x + dx * scale);
      newY2 = Math.round(el.y + dy * scale);
    } else {
      newX2 = el.x + targetMeters * 15;
      newY2 = el.y;
    }
  }

  return {
    ...el,
    meters: targetMeters,
    x2: newX2,
    y2: newY2,
    lastUpdate: new Date().toLocaleTimeString()
  };
}
