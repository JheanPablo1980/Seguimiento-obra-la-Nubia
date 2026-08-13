import { AreaSector, InspectionElement, ProjectMeta, AreaColor, ScheduleItem } from '../types';

export const INITIAL_SCHEDULE_ITEMS: ScheduleItem[] = [
  {
    id: 'DUCT-4-MT',
    code: 'D-4-MT',
    description: 'Ducto PVC Ø4" MT (Canalizaciones Media Tensión)',
    targetQuantity: 1548,
    unit: 'mts',
    entrega1Target: 936,
    entrega1Label: 'Entrega 1 - Intersecciones (936m)',
    entrega2Target: 612,
    entrega2Label: 'Entrega 2 - Troncal (612m)',
    finalDeadline: '15/09/2026',
    category: 'tuberia'
  },
  {
    id: 'DUCT-4-DATOS',
    code: 'D-4-DATOS',
    description: 'Ducto PVC Ø4" Datos (Canalizaciones Telecomunicación)',
    targetQuantity: 1833,
    unit: 'mts',
    entrega1Target: 1628,
    entrega1Label: 'Entrega 1 - Intersecciones (1628m)',
    entrega2Target: 205,
    entrega2Label: 'Entrega 2 - Troncal (205m)',
    finalDeadline: '15/09/2026',
    category: 'tuberia'
  },
  {
    id: 'DUCT-6-BT',
    code: 'D-6-BT',
    description: 'Ducto PVC Ø6" BT (Canalizaciones Baja Tensión)',
    targetQuantity: 8233,
    unit: 'mts',
    entrega1Target: 5460,
    entrega1Label: 'Entrega 1 - Intersecciones (5460m)',
    entrega2Target: 2773,
    entrega2Label: 'Entrega 2 - Troncal (2773m)',
    finalDeadline: '30/09/2026',
    category: 'tuberia'
  },
  {
    id: 'CAM-MT',
    code: 'C-MT',
    description: 'Cámaras y Cajas de Media Tensión (MT)',
    targetQuantity: 27,
    unit: 'und',
    entrega1Target: 22,
    entrega1Label: 'Entrega 1 - Intersecciones (22 und)',
    entrega2Target: 5,
    entrega2Label: 'Entrega 2 - Troncal (5 und)',
    finalDeadline: '15/09/2026',
    category: 'camara'
  },
  {
    id: 'CAM-BT',
    code: 'C-BT',
    description: 'Cámaras y Cajas de Baja Tensión (BT)',
    targetQuantity: 52,
    unit: 'und',
    entrega1Target: 38,
    entrega1Label: 'Entrega 1 - Intersecciones (38 und)',
    entrega2Target: 14,
    entrega2Label: 'Entrega 2 - Troncal (14 und)',
    finalDeadline: '30/09/2026',
    category: 'camara'
  },
  {
    id: 'CAM-DATOS',
    code: 'C-DATOS',
    description: 'Cámaras y Cajas de Datos / Telecomunicación',
    targetQuantity: 45,
    unit: 'und',
    entrega1Target: 37,
    entrega1Label: 'Entrega 1 - Intersecciones (37 und)',
    entrega2Target: 8,
    entrega2Label: 'Entrega 2 - Troncal (8 und)',
    finalDeadline: '30/09/2026',
    category: 'camara'
  }
];

export function normalizeScheduleItems(items: ScheduleItem[]): ScheduleItem[] {
  if (!items || items.length === 0) return INITIAL_SCHEDULE_ITEMS;

  const isOldSchema = items.some(i => 
    i.id === '200502' || i.id === '200503' || i.id === 'CAM-850' ||
    (i.id === 'DUCT-4-MT' && i.targetQuantity !== 1548) ||
    (i.id === 'DUCT-4-DATOS' && i.targetQuantity !== 1833) ||
    (i.id === 'DUCT-6-BT' && i.targetQuantity !== 8233) ||
    (i.id === 'CAM-MT' && i.targetQuantity !== 27) ||
    (i.id === 'CAM-BT' && i.targetQuantity !== 52) ||
    (i.id === 'CAM-DATOS' && i.targetQuantity !== 45)
  );

  const missingCore = INITIAL_SCHEDULE_ITEMS.some(init => !items.some(i => i.id === init.id || i.code === init.code));

  if (isOldSchema || missingCore) {
    return INITIAL_SCHEDULE_ITEMS;
  }

  return items.map(item => {
    const desc = (item.description || '').toLowerCase();
    let newUnit = item.unit;
    if (desc.includes('camara') || desc.includes('cámara') || desc.includes('caja')) {
      newUnit = 'und';
    } else if (
      desc.includes('canalizacion') ||
      desc.includes('canalización') ||
      desc.includes('tuberia') ||
      desc.includes('tubería') ||
      desc.includes('ducto') ||
      desc.includes('tubo')
    ) {
      newUnit = 'mts';
    }

    let target = item.targetQuantity;
    const code = (item.code || '').toLowerCase();
    if (item.id === 'DUCT-4-MT' || code.includes('d-4-mt') || desc.includes('4" mt')) target = 1548;
    else if (item.id === 'DUCT-4-DATOS' || code.includes('d-4-datos') || desc.includes('4" datos')) target = 1833;
    else if (item.id === 'DUCT-6-BT' || code.includes('d-6-bt') || desc.includes('6" bt')) target = 8233;
    else if (item.id === 'CAM-MT' || code.includes('c-mt') || (desc.includes('cámara') && desc.includes('media'))) target = 27;
    else if (item.id === 'CAM-BT' || code.includes('c-bt') || (desc.includes('cámara') && desc.includes('baja'))) target = 52;
    else if (item.id === 'CAM-DATOS' || code.includes('c-datos') || (desc.includes('cámara') && desc.includes('datos'))) target = 45;

    return {
      ...item,
      unit: newUnit,
      targetQuantity: target
    };
  });
}

export const AREA_COLOR_PALETTE: AreaColor[] = [
  { fill: 'rgba(168, 85, 247, 0.22)', stroke: '#9333ea', badge: '#7e22ce' }, // Purple
  { fill: 'rgba(14, 165, 233, 0.22)', stroke: '#0284c7', badge: '#0369a1' },  // Sky
  { fill: 'rgba(245, 158, 11, 0.22)', stroke: '#d97706', badge: '#b45309' },  // Amber
  { fill: 'rgba(16, 185, 129, 0.22)', stroke: '#059669', badge: '#047857' },  // Emerald
  { fill: 'rgba(236, 72, 153, 0.22)', stroke: '#db2777', badge: '#be185d' },  // Pink
  { fill: 'rgba(99, 102, 241, 0.22)', stroke: '#4f46e5', badge: '#3730a3' }   // Indigo
];

export const INITIAL_PROJECT_META: ProjectMeta = {
  inspectorName: 'Ing. Jhean Murillo',
  contractorName: 'Consorcio Telecom & Energía Norte',
  inspectionDate: new Date().toISOString().split('T')[0],
  sectorLocation: 'Proyecto Ductado y Cámaras - Intersecciones 1, 2 y Troncal'
};

export const INITIAL_AREAS: AreaSector[] = [
  {
    id: 1,
    code: 'INT-01',
    name: 'Intersección 1',
    color: AREA_COLOR_PALETTE[0],
    points: [
      { x: 80, y: 80 },
      { x: 420, y: 80 },
      { x: 420, y: 350 },
      { x: 80, y: 350 }
    ]
  },
  {
    id: 2,
    code: 'INT-02',
    name: 'Intersección 2',
    color: AREA_COLOR_PALETTE[1],
    points: [
      { x: 460, y: 80 },
      { x: 880, y: 80 },
      { x: 880, y: 350 },
      { x: 460, y: 350 }
    ]
  },
  {
    id: 3,
    code: 'TRONCAL',
    name: 'Troncal',
    color: AREA_COLOR_PALETTE[2],
    points: [
      { x: 80, y: 390 },
      { x: 880, y: 390 },
      { x: 880, y: 680 },
      { x: 80, y: 680 }
    ]
  }
];

export const INITIAL_ELEMENTS: InspectionElement[] = [
  // Sector 1 Cameras & Lines
  {
    id: 101,
    type: 'camera',
    label: 'C-01',
    status: 'Terminado',
    x: 120,
    y: 120,
    camType: 'SB850',
    size: 10,
    voltage: 220,
    signalStrength: 98,
    scheduleItemId: 'CAM-850',
    acta: 'Acta 1',
    itemCobro: '3.63',
    itemDescripcion: 'SEI CAMPANA PVC 4"',
    itemUnidad: 'UN',
    observations: 'Cámara en concreto finalizada y probada.',
    date: '2026-07-10'
  },
  {
    id: 102,
    type: 'camera',
    label: 'C-02',
    status: 'Terminado',
    x: 380,
    y: 120,
    camType: 'SB851',
    size: 10,
    voltage: 220,
    signalStrength: 95,
    scheduleItemId: 'CAM-850',
    acta: 'Acta 1',
    itemCobro: '3.63',
    itemDescripcion: 'SEI CAMPANA PVC 4"',
    itemUnidad: 'UN',
    date: '2026-07-12'
  },
  {
    id: 103,
    type: 'line',
    label: 'Tramo T-01',
    status: 'Terminado',
    x: 120,
    y: 120,
    x2: 380,
    y2: 120,
    meters: 35,
    pipes: '6x6" PVC Schedule 40',
    cables: '3#250 F+1#500N+1#6T',
    scheduleItemId: '200503',
    acta: 'Acta 1',
    itemCobro: '6.1 D',
    itemDescripcion: 'CANALIZACIÓN SUBTERRÁNEA PVC 4" SCH 40',
    itemUnidad: 'M',
    date: '2026-07-11'
  },
  {
    id: 104,
    type: 'line',
    label: 'Tramo T-02',
    status: 'En proceso',
    x: 380,
    y: 120,
    x2: 380,
    y2: 310,
    meters: 28,
    pipes: '4" Conduit HD',
    cables: '2x12 FO Monomodo 24 hilos',
    scheduleItemId: '200502',
    acta: 'Acta 2',
    itemCobro: '3.59',
    itemDescripcion: 'CANALIZACIÓN TELECOMUNICACIONES FO',
    itemUnidad: 'M',
    date: '2026-07-15'
  },
  {
    id: 105,
    type: 'camera',
    label: 'C-03',
    status: 'En proceso',
    x: 380,
    y: 310,
    camType: 'SB853',
    size: 10,
    voltage: 110,
    signalStrength: 82,
    scheduleItemId: 'CAM-850',
    date: '2026-07-16'
  },

  // Sector 2 Cameras & Lines
  {
    id: 201,
    type: 'camera',
    label: 'C-04',
    status: 'Terminado',
    x: 500,
    y: 120,
    camType: 'SB858',
    size: 10,
    voltage: 24,
    signalStrength: 100,
    scheduleItemId: 'CAM-858',
    date: '2026-07-14'
  },
  {
    id: 202,
    type: 'camera',
    label: 'C-05',
    status: 'Pendiente',
    x: 820,
    y: 120,
    camType: 'SB850',
    size: 10,
    voltage: 0,
    signalStrength: 0,
    scheduleItemId: 'CAM-850',
    date: '2026-07-20'
  },
  {
    id: 203,
    type: 'line',
    label: 'Tramo T-03',
    status: 'Terminado',
    x: 500,
    y: 120,
    x2: 820,
    y2: 120,
    meters: 42,
    pipes: '2x 4" PVC MT',
    cables: '3#3/0 Cu 15kV XLPE',
    scheduleItemId: '200502',
    date: '2026-07-14'
  },
  {
    id: 204,
    type: 'line',
    label: 'Tramo T-04',
    status: 'Pendiente',
    x: 820,
    y: 120,
    x2: 820,
    y2: 300,
    meters: 22,
    pipes: '3" Conduit Galvanizado',
    cables: 'Cat6A UTP VDM',
    scheduleItemId: '200502',
    date: '2026-07-22'
  },

  // Sector 3 Cameras & Lines
  {
    id: 301,
    type: 'camera',
    label: 'C-06',
    status: 'Terminado',
    x: 150,
    y: 440,
    camType: 'SB850',
    size: 10,
    voltage: 220,
    signalStrength: 92,
    scheduleItemId: 'CAM-850',
    date: '2026-07-18'
  },
  {
    id: 302,
    type: 'camera',
    label: 'C-07',
    status: 'En proceso',
    x: 520,
    y: 440,
    camType: 'SB851',
    size: 10,
    voltage: 110,
    signalStrength: 75,
    scheduleItemId: 'CAM-850',
    date: '2026-07-21'
  },
  {
    id: 303,
    type: 'line',
    label: 'Tramo T-05',
    status: 'Terminado',
    x: 150,
    y: 440,
    x2: 520,
    y2: 440,
    meters: 50,
    pipes: '6x6" PVC heavy duty',
    cables: '4#500 MCM Al + 1#2/0 Cu',
    scheduleItemId: '200503',
    date: '2026-07-19'
  },
  {
    id: 304,
    type: 'line',
    label: 'Tramo T-06',
    status: 'En proceso',
    x: 520,
    y: 440,
    x2: 820,
    y2: 600,
    meters: 45,
    pipes: '4" PVC Conduit',
    cables: '3#250 F+1#500N',
    scheduleItemId: '200502',
    date: '2026-07-22'
  },
  {
    id: 305,
    type: 'camera',
    label: 'C-08',
    status: 'Pendiente',
    x: 820,
    y: 600,
    camType: 'SB853',
    size: 10,
    voltage: 0,
    signalStrength: 0,
    scheduleItemId: 'CAM-850',
    date: '2026-07-23'
  }
];

export const DEFAULT_CONTRACTUAL_ITEMS: Array<{
  item: string;
  description: string;
  unit: string;
  budgetQuantity: number;
}> = [
  { item: '0', description: 'CAMPAMENTO DE OBRA - TIPO CONTENEDOR 2 UNIDADES', unit: 'MES', budgetQuantity: 8 },
  { item: '0.2', description: '2 UNIDAD SANITARÍA MOVIL - 2 ASEOS SEMANALES', unit: 'MES', budgetQuantity: 8 },
  { item: '0.3', description: 'SEGURIDAD INDUSTRIAL Y SEÑALIZACION GENERAL DE OBRA', unit: 'GLB', budgetQuantity: 1 },
  { item: '1.1', description: 'SEI ACOMETIDA 3#1/0 XLPE 100% ALUMINIO EN CINTA +1#2 BD', unit: 'ML', budgetQuantity: 320 },
  { item: '2.1', description: 'SEI ACOMETIDA 3#250 +1#250 + 1#2 THHN PARA TABLERO CONTADORES TRAFO ZC', unit: 'ML', budgetQuantity: 14 },
  { item: '2.2', description: 'SEI ACOMETIDA 12#350 +4#350 + 1#3/0 THHN PARA TABLEROS DISTRIBUCION TRAFO MANZANA 1', unit: 'ML', budgetQuantity: 7 },
  { item: '2.3', description: 'SEI ACOMETIDA 9#350 +3#350 + 1#2/0 THHN PARA TABLEROS DISTRIBUCION TRAFO MANZANA 2', unit: 'ML', budgetQuantity: 7 },
  { item: '2.4', description: 'SEI ACOMETIDA 18#350 +6#350 + 1#4/0 THHN PARA TABLEROS DISTRIBUCION TRAFO MANZANA 3', unit: 'ML', budgetQuantity: 7 },
  { item: '2.5', description: 'SEI ACOMETIDA 18#350 +6#350 + 1#4/0 THHN PARA TABLEROS DISTRIBUCION TRAFO MANZANA 4', unit: 'ML', budgetQuantity: 7 },
  { item: '2.6', description: 'SEI ACOMETIDA 18#350 +6#350 + 1#4/0 THHN PARA TABLEROS DISTRIBUCION TRAFO MANZANA 5', unit: 'ML', budgetQuantity: 7 },
  { item: '2.7', description: 'SEI ACOMETIDA 6#250 +2#250 + 1#2 THHN PARA TABLERO CONTADORES TRAFO MANZANA 1', unit: 'ML', budgetQuantity: 10 },
  { item: '2.8', description: 'SEI ACOMETIDA 6#250 +2#250 + 1#2 THHN PARA TABLERO CONTADORES TRAFO MANZANA 3', unit: 'ML', budgetQuantity: 15 },
  { item: '2.9', description: 'SEI ACOMETIDA 6#250 +2#250 + 1#2 THHN PARA TABLERO CONTADORES TRAFO MANZANA 4', unit: 'ML', budgetQuantity: 15 },
  { item: '2.10', description: 'SEI ACOMETIDA 6#250 +2#250 + 1#2 THHN PARA TABLERO CONTADORES TRAFO MANZANA 5', unit: 'ML', budgetQuantity: 15 },
  { item: '2.11', description: 'SEI ACOMETIDA 3#4 +1#4 + 1#8 THHN PARA TABLERO OFICINAS', unit: 'ML', budgetQuantity: 55 },
  { item: '2.12', description: 'SEI ACOMETIDA 3#4 +1#4 + 1#8 THHN PARA TABLERO AIRES ACONDICIONADOS OFICINAS', unit: 'ML', budgetQuantity: 55 },
  { item: '2.13', description: 'SEI ACOMETIDA 3#8 +1#8 + 1#10 THHN PARA TABLERO ZONAS COMUNES', unit: 'ML', budgetQuantity: 5 },
  { item: '2.14', description: 'SEI ACOMETIDA 3#8 +1#8 + 1#10 THHN PARA TABLERO RED CONTRA INCENDIO', unit: 'ML', budgetQuantity: 30 },
  { item: '2.15', description: 'SEI ACOMETIDA 3#8 +1#8 + 1#10 THHN PARA TABLERO HIDROSANITARIO', unit: 'ML', budgetQuantity: 17 },
  { item: '2.16', description: 'SEI BORNA TERMINAL #350', unit: 'UN', budgetQuantity: 200 },
  { item: '2.17', description: 'SEI BORNA TERMINAL #250', unit: 'UN', budgetQuantity: 176 },
  { item: '2.18', description: 'SEI BORNA TERMINAL #4/0', unit: 'UN', budgetQuantity: 6 },
  { item: '2.19', description: 'SEI BORNA TERMINAL #3/0', unit: 'UN', budgetQuantity: 2 },
  { item: '2.20', description: 'SEI BORNA TERMINAL #2/0', unit: 'UN', budgetQuantity: 2 },
  { item: '2.21', description: 'SEI BORNA TERMINAL #2', unit: 'UN', budgetQuantity: 26 },
  { item: '2.22', description: 'SEI BORNA TERMINAL #4', unit: 'UN', budgetQuantity: 16 },
  { item: '2.23', description: 'SEI BORNA TERMINAL #8', unit: 'UN', budgetQuantity: 28 },
  { item: '2.24', description: 'SEI BORNA TERMINAL #10', unit: 'UN', budgetQuantity: 6 },
  { item: '3.1', description: 'SUMINISTRO TABLERO TRANSFERENCIA GENERAL ZONAS COMUNES 250 A CON ESPACION PARA MEDIDOR', unit: 'UN', budgetQuantity: 1 },
  { item: '3.2', description: 'INSTALACION TABLERO TRANSFERENCIA GENERAL ZONAS COMUNES 250 A CON ESPACION PARA MEDIDOR', unit: 'UN', budgetQuantity: 1 },
  { item: '3.3', description: 'SUMINISTRO TABLERO DISTRIBUCION NORMAL 1000A 220V MANZANA 1', unit: 'UN', budgetQuantity: 1 },
  { item: '3.4', description: 'INSTALACION TABLERO DISTRIBUCION NORMAL 1000A 220V MANZANA 1', unit: 'UN', budgetQuantity: 1 },
  { item: '3.5', description: 'SUMINISTRO TABLERO CONTADORES 4 SERVICIOS 600A 220V MANZANA 1', unit: 'UN', budgetQuantity: 1 },
  { item: '3.6', description: 'INSTALACION TABLERO CONTADORES 4 SERVICIOS 600A 220V MANZANA 1', unit: 'UN', budgetQuantity: 1 },
  { item: '3.7', description: 'SUMINISTRO TABLERO CONTADORES 5 SERVICIOS 600A 220V MANZANA 1', unit: 'UN', budgetQuantity: 1 },
  { item: '3.8', description: 'INSTALACION TABLERO CONTADORES 5 SERVICIOS 600A 220V MANZANA 1', unit: 'UN', budgetQuantity: 1 },
  { item: '3.15', description: 'SUMINISTRO TABLERO CONTADORES 6 SERVICIOS 800A 220V MANZANA 2', unit: 'UN', budgetQuantity: 1 },
  { item: '3.16', description: 'INSTALACION TABLERO CONTADORES 6 SERVICIOS 800A 220V MANZANA 2', unit: 'UN', budgetQuantity: 1 },
  { item: '3.19', description: 'SUMINISTRO TABLERO DISTRIBUCION NORMAL 1250A 220V MANZANA 3', unit: 'UN', budgetQuantity: 1 },
  { item: '3.20', description: 'INSTALACION TABLERO DISTRIBUCION NORMAL 1250A 220V MANZANA 3', unit: 'UN', budgetQuantity: 1 },
  { item: '3.21', description: 'SUMINISTRO TABLERO CONTADORES 6 SERVICIOS 600A 220V MANZANA 3', unit: 'UN', budgetQuantity: 1 },
  { item: '3.22', description: 'INSTALACION TABLERO CONTADORES 6 SERVICIOS 600A 220V MANZANA 3', unit: 'UN', budgetQuantity: 1 },
  { item: '3.23', description: 'SUMINISTRO TABLERO CONTADORES 5 SERVICIOS 600A 220V MANZANA 3', unit: 'UN', budgetQuantity: 2 },
  { item: '3.24', description: 'INSTALACION TABLERO CONTADORES 5 SERVICIOS 600A 220V MANZANA 3', unit: 'UN', budgetQuantity: 2 },
  { item: '3.31', description: 'SUMINISTRO TABLERO DISTRIBUCION NORMAL 1250A 220V MANZANA 4', unit: 'UN', budgetQuantity: 1 },
  { item: '3.32', description: 'INSTALACION TABLERO DISTRIBUCION NORMAL 1250A 220V MANZANA 4', unit: 'UN', budgetQuantity: 1 },
  { item: '3.33', description: 'SUMINISTRO TABLERO CONTADORES 6 SERVICIOS 600A 220V MANZANA 4', unit: 'UN', budgetQuantity: 2 },
  { item: '3.34', description: 'INSTALACION TABLERO CONTADORES 6 SERVICIOS 600A 220V MANZANA 4', unit: 'UN', budgetQuantity: 2 },
  { item: '3.35', description: 'SUMINISTRO TABLERO CONTADORES 5 SERVICIOS 600A 220V MANZANA 4', unit: 'UN', budgetQuantity: 1 },
  { item: '3.36', description: 'INSTALACION TABLERO CONTADORES 5 SERVICIOS 600A 220V MANZANA 4', unit: 'UN', budgetQuantity: 1 },
  { item: '3.43', description: 'SUMINISTRO TABLERO DISTRIBUCION NORMAL 1250A 220V MANZANA 5', unit: 'UN', budgetQuantity: 1 },
  { item: '3.44', description: 'INSTALACION TABLERO DISTRIBUCION NORMAL 1250A 220V MANZANA 5', unit: 'UN', budgetQuantity: 1 },
  { item: '3.45', description: 'SUMINISTRO TABLERO CONTADORES 6 SERVICIOS 600A 220V MANZANA 5', unit: 'UN', budgetQuantity: 3 },
  { item: '3.46', description: 'INSTALACION TABLERO CONTADORES 6 SERVICIOS 600A 220V MANZANA 5', unit: 'UN', budgetQuantity: 3 },
  { item: '3.51', description: 'SUMINISTRO PLANTA DE EMERGENCIA CABINADA 75 KVA 3F 220/127V CON ACCESORIOS - INCLUYE EXOSTO', unit: 'UN', budgetQuantity: 1 },
  { item: '3.52', description: 'INSTALACION PLANTA DE EMERGENCIA CABINADA 75 KVA 3F 220/127V CON ACCESORIOS - INCLUYE EXOSTO', unit: 'UN', budgetQuantity: 1 },
  { item: '3.59', description: 'CONSTRUCCION DE CAJA CON MARCO Y TAPA PARA CAJA SUBTERRANEA DE PASO TIPO A SB850 CELSIA 1.3X1.3X1.2 - INCLUYE EXCAVACION Y RETIRO DE MATERIAL SOBRANTE', unit: 'UN', budgetQuantity: 43 },
  { item: '3.60', description: 'CONSTRUCCION DE CAJA CON MARCO Y TAPA PARA CAJA SUBTERRANEA DE PASO TIPO A SB858 CELSIA 0,9X0,9X1 - INCLUYE EXCAVACION Y RETIRO DE MATERIAL SOBRANTE', unit: 'UN', budgetQuantity: 36 },
  { item: '3.61', description: 'SEI CURVA PVC 4\'\'', unit: 'UN', budgetQuantity: 84 },
  { item: '3.62', description: 'SEI TUBERIA PVC 4\'\' - INCLUYE EXCAVACION Y RELLENO CON MATERIAL DE SITIO', unit: 'ML', budgetQuantity: 475 },
  { item: '3.63', description: 'SEI CAMPANA PVC 4\'\'', unit: 'UN', budgetQuantity: 58 },
  { item: '3.64', description: 'SEI CURVA PVC 6\'\'', unit: 'UN', budgetQuantity: 54 },
  { item: '3.65', description: 'SEI TUBERIA PVC 6\'\' - INCLUYE EXCAVACION Y RELLENO CON MATERIAL DE SITIO', unit: 'ML', budgetQuantity: 3816 },
  { item: '3.66', description: 'SEI CAMPANA PVC 6\'\'', unit: 'UN', budgetQuantity: 332 },
  { item: '3.67', description: 'SEI TABLERO DE DISTRIBUCION TRIFASICO 18 CTOS', unit: 'UN', budgetQuantity: 1 },
  { item: '3.68', description: 'SUMINISTRO DE LUMINARIA NANO ST 60W VELNST60W.70NW66 7800LM 840 IP66 7P 100-277', unit: 'UN', budgetQuantity: 45 },
  { item: '3.69', description: 'SUMINISTRO DE LUMINARIA HIPLANE G2 75W VELHH75W.70NW66 11250LM 740 IP65 7P T3M 100-277 1-10V', unit: 'UN', budgetQuantity: 6 },
  { item: '3.70', description: 'INSTALACION DE LUMINARIA CON CARRO CANASTA, INCLUYE LA INSTALACION DE TODOS LOS ACCESORIOS', unit: "UN", budgetQuantity: 51 },
  { item: '3.71', description: 'SEI POSTE CONCRETO 12MX510KGF', unit: 'UN', budgetQuantity: 51 },
  { item: '3.72', description: 'SEI ACOMETIDA 3#10 Cu AWG THHN', unit: 'ML', budgetQuantity: 1650 },
  { item: '3.73', description: 'SEI TUBERIA PVC ¾\'\'', unit: 'ML', budgetQuantity: 1500 },
  { item: '3.74', description: 'SEI BREAKER BIFASICO 2X20A', unit: 'UN', budgetQuantity: 2 },
  { item: '4.1', description: 'SEI ESTRUCTURA RECONECTADOR A CONJUNTO CON CRUCETA CENTRADA', unit: 'UN', budgetQuantity: 1 },
  { item: '4.2', description: 'SEI FUSIBLE TIPO K DE 120AMP DE 15KV', unit: 'UN', budgetQuantity: 9 },
  { item: '4.3', description: 'SEI PUESTA A TIERRA PARARRAYOS', unit: 'UN', budgetQuantity: 1 },
  { item: '4.4', description: 'SEI DE CRUCETA AUXILIAR AUTOSOPORTADA EN T 2.4M', unit: 'UN', budgetQuantity: 1 },
  { item: '4.5', description: 'SEI SOPORTE PARA CABLE MONOPOLAR', unit: 'UN', budgetQuantity: 3 },
  { item: '4.6', description: 'SEI JUEGO TERMINAL ELASTOMERICO #1/0 15 KV EXTERIOR', unit: 'UN', budgetQuantity: 1 },
  { item: '4.7', description: 'SEI BOTA TERMOENCOGIBLE TRES SALIDAS CALIBRE 1/0 AWG', unit: 'UN', budgetQuantity: 1 },
  { item: '4.8', description: 'SEI TUBERIA GALVANIZADA IMC 4"', unit: 'ML', budgetQuantity: 6 },
  { item: '4.9', description: 'SEI CURVA PVC 4\'\'', unit: 'UN', budgetQuantity: 17 },
  { item: '4.10', description: 'SEI TUBERIA PVC 4\'\' - INCLUYE EXCAVACION Y RELLENO CON MATERIAL DE SITIO', unit: 'ML', budgetQuantity: 1554 },
  { item: '4.11', description: 'SEI CAMPANA PVC 4\'\'', unit: 'UN', budgetQuantity: 116 },
  { item: '4.12', description: 'CONSTRUCCION DE CAJA CON MARCO Y TAPA PARA CAJA SUBTERRANEA DE PASO TIPO A SB850 CELSIA 1.3X1.3X1.2MT - INCLUYE EXCAVACION Y RETIRO DE MATERIAL SOBRANTE', unit: 'UN', budgetQuantity: 19 },
  { item: '4.13', description: 'CONSTRUCCION DE CAJA CON MARCO Y TAPA PARA CAJA SUBTERRANEA DE PASO TIPO B SB851 CELSIA 1.5X1.5X1.32MT - INCLUYE EXCAVACION Y RETIRO DE MATERIAL SOBRANTE', unit: 'UN', budgetQuantity: 4 },
  { item: '4.14', description: 'CONSTRUCCION DE CAJA CON MARCO Y TAPA PARA CAJA SUBTERRANEA DE PASO TIPO 1 SB853 CELSIA 2.6X1.5X1.2 - NO INCLUYE CONSTRUCCION DE CAJA', unit: 'UN', budgetQuantity: 6 },
  { item: '4.15', description: 'SEI BARRAJE ELASTOMERICO 4 VIAS 600A 15KV', unit: 'UN', budgetQuantity: 18 },
  { item: '4.16', description: 'SEI CONECTOR TIPO CODO #1/0 15 KV EXTERIOR', unit: 'UN', budgetQuantity: 69 },
  { item: '4.17', description: 'SUMINISTRO TRANSFORMADOR PADMOUNTED DE 75 KVA 3F 13200 / 220/127V ARM', unit: 'UN', budgetQuantity: 1 },
  { item: '4.18', description: 'INSTALACION TRANSFORMADOR PADMOUNTED DE 75 KVA 3F 13200 / 220/127V CON ACCESORIOS. INCLUYE CONSTRUCCION DE TRAMPA DE ACEITE', unit: 'UN', budgetQuantity: 1 },
  { item: '4.19', description: 'SUMINISTRO TRANSFORMADOR PADMOUNTED DE 225 KVA 3F 13200 / 220/127V ARM', unit: 'UN', budgetQuantity: 1 },
  { item: '4.20', description: 'INSTALACION TRANSFORMADOR PADMOUNTED DE 225 KVA 3F 13200 / 220/127V CON ACCESORIOS. INCLUYE CONSTRUCCION DE TRAMPA DE ACEITE', unit: 'UN', budgetQuantity: 1 },
  { item: '4.21', description: 'SUMINISTRO TRANSFORMADOR PADMOUNTED DE 300 KVA 3F 13200 / 220/127V ARM', unit: 'UN', budgetQuantity: 1 },
  { item: '4.22', description: 'INSTALACION TRANSFORMADOR PADMOUNTED DE 300 KVA 3F 13200 / 220/127V CON ACCESORIOS. INCLUYE CONSTRUCCION DE TRAMPA DE ACEITE', unit: 'UN', budgetQuantity: 1 },
  { item: '4.23', description: 'SUMINISTRO TRANSFORMADOR PADMOUNTED DE 400 KVA 3F 13200 / 220/127V ARM', unit: 'UN', budgetQuantity: 3 },
  { item: '4.24', description: 'INSTALACION TRANSFORMADOR PADMOUNTED DE 400 KVA 3F 13200 / 220/127V CON ACCESORIOS. INCLUYE CONSTRUCCION DE TRAMPA DE ACEITE', unit: 'UN', budgetQuantity: 3 },
  { item: '4.25', description: 'SEI MATERIALES DELIMITACION DE SEGURIDAD EN PISO EN LA SUBESTACION', unit: 'GLB', budgetQuantity: 1 },
  { item: '4.26', description: 'SEI ACRILICOS Y MARCACION DE LA SUBESTACION', unit: 'GLB', budgetQuantity: 1 },
  { item: '4.27', description: 'SUMINISTRO CELDA DE MEDIDA INDIRECTA PARA ZONAS COMUNES INCLUYE 3 TP\'S 13200/120V CLASE 0.5', unit: 'UN', budgetQuantity: 1 },
  { item: '4.28', description: 'INSTALACION CELDA DE MEDIDA INDIRECTA PARA ZONAS COMUNES INCLUYE 3 TP\'S 13200/120V CLASE 0.5', unit: 'UN', budgetQuantity: 1 },
  { item: '5.1', description: 'SEI MALLA A TIERRA 5X4 MTS 4 ELECTRODOS EN CABLE BD #2/0', unit: 'UN', budgetQuantity: 6 },
  { item: '5.2', description: 'SEI CABLE BD #2/0 PARA EQUIPOTENCIALIZACIÓN', unit: 'ML', budgetQuantity: 18 },
  { item: '6.1', description: 'SUMINISTRO CAJA CON MARCO Y TAPA PARA CAJA SUBTERRANEA DE PASO TIPO A SB858 CELSIA 0,9X0,9X1 - INCLUYE CONSTRUCCION DE CAJA, EXCAVACION Y RETIRO DE MATERIAL SOBRANTE', unit: 'UN', budgetQuantity: 43 },
  { item: '6.2', description: 'SEI CURVA PVC 4\'\'', unit: 'UN', budgetQuantity: 70 },
  { item: '6.3', description: 'SEI TUBERIA PVC 4\'\' - INCLUYE EXCAVACION Y RELLENO CON MATERIAL DE SITIO', unit: 'ML', budgetQuantity: 1106 },
  { item: '6.4', description: 'SEI CAMPANA PVC 4\'\'', unit: 'UN', budgetQuantity: 202 },
  { item: '7', description: 'CERTIFICACION RETIE DISTRIBUCION TRANSFORMACION Y USO FINAL', unit: 'UND', budgetQuantity: 1 }
];
