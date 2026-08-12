export type StatusType = 'Pendiente' | 'En proceso' | 'Terminado';

export type CameraNorm = 'SB858' | 'SB850' | 'SB851' | 'SB853' | 'BT' | 'MT' | 'D' | string;

export interface Point {
  x: number;
  y: number;
}

export interface AreaColor {
  fill: string;
  stroke: string;
  badge: string;
}

export interface AreaSector {
  id: number;
  code: string;
  name: string;
  points: Point[];
  color: AreaColor;
  widthMeters?: number;
  lengthMeters?: number;
  calculatedAreaM2?: number;
  notes?: string;
  scheduleItemId?: string;
}

export interface FreehandStroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

export interface ScheduleItem {
  id: string; // e.g. "200502", "200503", "CAM-01"
  code: string; // e.g. "200502"
  description: string; // e.g. "Tubo PVC Ø4\", 6mts, Conduit"
  targetQuantity: number; // e.g. 367
  unit: 'mts' | 'unidades' | 'tramos' | 'm²';
  entrega1Target: number; // e.g. 250
  entrega1Label?: string; // e.g. "Entrega 1 - Últ. semana Jul 2026"
  entrega2Target: number; // e.g. 117
  entrega2Label?: string; // e.g. "Entrega 2 - Agosto 2026"
  finalDeadline?: string; // e.g. "01/08/2026"
  category?: 'tuberia' | 'camara' | 'sector' | 'general' | string;
  notes?: string;

  // New imported cronograma fields
  duracion?: string;
  start?: string;
  finish?: string;
  porcentajeCompletado?: number;
  comienzoLineaBase?: string;
  finLineaBase?: string;
  duracionLineaBase?: string;
  rawExtras?: Record<string, string>;
}

export interface InspectionElement {
  id: number;
  type: 'camera' | 'line';
  label: string;
  status: StatusType;
  x: number;
  y: number;
  // For lines
  x2?: number;
  y2?: number;
  meters?: number;
  pipes?: string;
  cables?: string;
  onlyPipes?: boolean; // When true, this line tramo only requires conduit/tubería, no cables
  // For cameras
  camType?: CameraNorm;
  size?: number;
  // Schedule / Cronograma linkage
  scheduleItemId?: string;
  // Billing / Acta de cobro & Item Contractual
  acta?: string; // e.g. "Acta 1", "Acta 2"
  itemCobro?: string; // e.g. "3.63", "3.59", "6.1 D"
  itemDescripcion?: string; // e.g. "SEI CAMPANA PVC 4""
  itemUnidad?: string; // e.g. "UN", "M", "ML", "KG"
  progressPercent?: number; // % 0-100 when status === 'En proceso'
  observations?: string; // Observaciones / Notas de inspección o campo
  
  // Timeline tracking
  startDate?: string; // Cuando pasa a 'En proceso'
  endDate?: string; // Cuando pasa a 'Terminado'

  // Telemetry simulation fields
  voltage?: number; // e.g. 220V or 24V
  signalStrength?: number; // % 0-100
  lastUpdate?: string;
  date: string;
  rowId?: number;
  photos?: string[];
}

export interface ActaDocument {
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
}

export interface ProjectMeta {
  inspectorName: string;
  contractorName: string;
  inspectionDate: string;
  sectorLocation: string;
  actaDocuments?: Record<string, ActaDocument>;
}

export interface FilterState {
  startDate: string;
  endDate: string;
  preset: 'all' | 'last1' | 'last2' | 'last4';
  activeTab: 'all' | 'camera' | 'line';
  searchQuery: string;
  statusFilter: 'all' | StatusType;
  actaFilter?: string; // Optional filter by specific Acta (e.g. "Acta 1")
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'status_change' | 'element_added' | 'sector_created' | 'telemetry_alert';
  severity?: 'info' | 'success' | 'warning';
}

export interface DailyTrackingLog {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string;
  inspectorName: string;
  contractorName: string;
  sectorLocation: string;
  weatherCondition?: 'Despejado' | 'Lluvia' | 'Nublado' | 'Viento Fuerte';
  supervisorName?: string;
  workSummary: string;
  observations?: string;
  totalElements: number;
  completedElements: number;
  inProgressElements: number;
  pendingElements: number;
  totalMetersExecuted: number;
  totalMetersPending: number;
  cableMetersTotal: number;
  elementsSnapshot: InspectionElement[];
  areasSnapshot: AreaSector[];
  projectMetaSnapshot?: ProjectMeta;
  cableSummariesSnapshot?: Array<{
    gauge: string;
    totalMeters: number;
    totalConductors: number;
    acometidasCount: number;
  }>;
  createdBy?: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  role?: string;
  provider?: string;
  status?: 'active' | 'inactive';
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'inspector';
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}

export interface GlobalConfig {
  enableCableConsolidation: boolean;
  allowOnlyPipesOption: boolean;
  totalActas?: number; // Cantidad total de Actas de Obra configuradas (ej. 10)
  lockBlueprintLayout?: boolean; // Opción para que el admin fije el plano y los elementos
}

export interface VersionHistoryLog {
  id: string;
  timestamp: string;
  userEmail: string;
  userName: string;
  userRole: string;
  actionType: 'create' | 'update' | 'delete' | 'move' | 'status_change';
  entityType: 'tramo' | 'camara' | 'area' | 'bitacora_log' | 'config';
  entityId?: string;
  entityName?: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

export interface ContractualItem {
  item: string; // e.g. "3.63"
  description: string; // e.g. "SEI CAMPANA PVC 4""
  unit: string; // e.g. "UN", "M"
  budgetQuantity: number; // e.g. 58
}
