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
  { id: 'tablero', label: 'Tablero de Distribución / TD', prefix: 'TD-', icon: '⚡', defaultNorm: 'BT' },
  { id: 'transformador', label: 'Transformador / Subestación', prefix: 'TR-', icon: '🔋', defaultNorm: 'MT' },
  { id: 'camara_electrica', label: 'Cámara de Empalme Eléctrico', prefix: 'CE-', icon: '🔌', defaultNorm: 'BT' },
  { id: 'caja_paso', label: 'Caja de Paso / Derivación', prefix: 'CP-', icon: '📦', defaultNorm: 'BT' },
  { id: 'punto_fuerza', label: 'Punto de Fuerza / Carga', prefix: 'PF-', icon: '⚙️', defaultNorm: 'BT' },
  { id: 'luminaria', label: 'Poste / Luminaria Alumbrado', prefix: 'LUM-', icon: '💡', defaultNorm: 'BT' },
  { id: 'spt', label: 'Malla / Puesta a Tierra (SPT)', prefix: 'SPT-', icon: '⏚', defaultNorm: 'BT' }
];

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
