import { ProjectLayer, StatusType } from '../types';

export const normalizeLayer = (layer?: string | null): ProjectLayer => {
  if (!layer) return 'civil';
  const l = layer.toLowerCase();
  if (l === 'electrica' || l === 'eléctrica' || l === 'electric') return 'electrica';
  return 'civil';
};

export const LAYER_CONFIG: Record<ProjectLayer, {
  name: string;
  shortName: string;
  icon: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  accentColor: string;
  primaryColorHex: string;
}> = {
  civil: {
    name: 'Obras Civiles',
    shortName: 'Civil',
    icon: '🏗️',
    description: 'Excavaciones, canalizaciones, bancos de ductos, cámaras de concreto y cajas de paso',
    badgeBg: 'bg-amber-950/80',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-700/80',
    accentColor: '#f59e0b',
    primaryColorHex: '#f59e0b'
  },
  electrica: {
    name: 'Obras Eléctricas',
    shortName: 'Eléctrica',
    icon: '⚡',
    description: 'Redes de cableado, conductores, circuitos de fuerza/control, tableros y transformadores',
    badgeBg: 'bg-cyan-950/80',
    badgeText: 'text-cyan-300',
    badgeBorder: 'border-cyan-700/80',
    accentColor: '#06b6d4',
    primaryColorHex: '#06b6d4'
  }
};

export const ELECTRICAL_NODE_TYPES = [
  { id: 'tablero', label: 'Tablero de Distribución / TD', prefix: 'TD-', icon: '⚡', defaultNorm: 'BT', color: '#38bdf8', category: 'distribucion' },
  { id: 'transformador', label: 'Transformador / Subestación', prefix: 'TR-', icon: '🔋', defaultNorm: 'MT', color: '#f59e0b', category: 'transformacion' },
  { id: 'barrajes_elastomericos', label: 'Barrajes Elastoméricos / Premoldeados', prefix: 'BE-', icon: '🪢', defaultNorm: 'MT', color: '#a855f7', category: 'empalme' },
  { id: 'contador_electrico', label: 'Contador / Medidor Eléctrico', prefix: 'MED-', icon: '⏱️', defaultNorm: 'BT', color: '#10b981', category: 'medicion' },
  { id: 'camara_electrica', label: 'Cámara de Empalme Eléctrico', prefix: 'CE-', icon: '🔌', defaultNorm: 'BT', color: '#06b6d4', category: 'empalme' },
  { id: 'caja_paso', label: 'Caja de Paso / Derivación', prefix: 'CP-', icon: '📦', defaultNorm: 'BT', color: '#64748b', category: 'paso' },
  { id: 'punto_fuerza', label: 'Punto de Fuerza / Carga', prefix: 'PF-', icon: '⚙️', defaultNorm: 'BT', color: '#ec4899', category: 'carga' },
  { id: 'luminaria', label: 'Poste / Luminaria Alumbrado', prefix: 'LUM-', icon: '💡', defaultNorm: 'BT', color: '#eab308', category: 'alumbrado' },
  { id: 'spt', label: 'Malla / Puesta a Tierra (SPT)', prefix: 'SPT-', icon: '⏚', defaultNorm: 'BT', color: '#22c55e', category: 'tierra' }
];

export const getElectricalNodeMeta = (type?: string, label?: string) => {
  const t = (type || '').toLowerCase();
  const l = (label || '').toUpperCase();

  if (t === 'transformador' || l.startsWith('TR')) {
    return { id: 'transformador', label: 'Transformador', prefix: 'TR-', icon: '🔋', color: '#f59e0b', norm: 'MT' };
  }
  if (t === 'barrajes_elastomericos' || t === 'barraje' || t === 'barrajes' || l.startsWith('BE') || l.startsWith('BAR')) {
    return { id: 'barrajes_elastomericos', label: 'Barrajes Elastoméricos', prefix: 'BE-', icon: '🪢', color: '#a855f7', norm: 'MT' };
  }
  if (t === 'contador_electrico' || t === 'contador' || t === 'medidor' || l.startsWith('MED') || l.startsWith('CNT')) {
    return { id: 'contador_electrico', label: 'Contador Eléctrico', prefix: 'MED-', icon: '⏱️', color: '#10b981', norm: 'BT' };
  }
  if (t === 'tablero' || l.startsWith('TD')) {
    return { id: 'tablero', label: 'Tablero Distribución', prefix: 'TD-', icon: '⚡', color: '#38bdf8', norm: 'BT' };
  }
  if (t === 'luminaria' || l.startsWith('LUM')) {
    return { id: 'luminaria', label: 'Luminaria / Alumbrado', prefix: 'LUM-', icon: '💡', color: '#eab308', norm: 'BT' };
  }
  if (t === 'spt' || l.startsWith('SPT')) {
    return { id: 'spt', label: 'Puesta a Tierra (SPT)', prefix: 'SPT-', icon: '⏚', color: '#22c55e', norm: 'BT' };
  }
  if (t === 'caja_paso' || l.startsWith('CP')) {
    return { id: 'caja_paso', label: 'Caja de Paso', prefix: 'CP-', icon: '📦', color: '#64748b', norm: 'BT' };
  }
  if (t === 'punto_fuerza' || l.startsWith('PF')) {
    return { id: 'punto_fuerza', label: 'Punto de Fuerza', prefix: 'PF-', icon: '⚙️', color: '#ec4899', norm: 'BT' };
  }
  return { id: 'camara_electrica', label: 'Cámara Eléctrica', prefix: 'CE-', icon: '🔌', color: '#06b6d4', norm: 'BT' };
};

export const ELECTRICAL_CABLE_PRESETS = [
  '3#250 kcmil Cu THHN + 1#250(N) + 1#2(T) / 480V',
  '3#4/0 AWG Cu + 1#4/0(N) + 1#4(T) / 220V',
  '3#2 AWG Cu THHN + 1#4(N) + 1#8(T) / 220V',
  '3#6 AWG Cu + 1#8(N) + 1#10(T) / 220V',
  '3#8 AWG Cu + 1#10(N) + 1#10(T) / 220-127V',
  '2#10 AWG Cu + 1#12(T) Circuito Alumbrado',
  '2#12 AWG Cu + 1#12(T) Circuito Tomas 120V',
  'Cable Fibra Óptica 24 Hilos Monomodo ADSS',
  'Cable Subterráneo Media Tensión 3x1/0 XLPE 15kV'
];

export const CIVIL_CONDUIT_PRESETS = [
  'Banco 4xØ4" PVC Schedule 40 (Media Tensión)',
  'Banco 2xØ6" + 2xØ4" PVC Conduit (Baja Tensión)',
  'Banco 2xØ4" PVC Conduit (Telecom / Datos)',
  'Tubería 1xØ4" PVC Schedule 40',
  'Tubería 1xØ2" PVC Schedule 40',
  'Tubería 2xØ2" PVC EMT / RMC',
  'Zanja excavación 0.60x1.00m con encamado arena'
];
