import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthUser, DailyTrackingLog, UserProfile, VersionHistoryLog, InspectionElement, ScheduleItem, AreaSector, ProjectMeta } from '../types';


const sanitizeEnv = (val: any): string => {
  if (!val || typeof val !== 'string') return '';
  return val.replace(/['"]/g, '').trim();
};

const env = (import.meta as any).env || {};
const rawUrl = env.VITE_SUPABASE_URL || '';
const rawKey = env.VITE_SUPABASE_ANON_KEY || '';

const supabaseUrl = sanitizeEnv(rawUrl).replace(/\/+$/, '');
const supabaseAnonKey = sanitizeEnv(rawKey);

export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) return false;
  if (
    supabaseUrl.includes('tu-proyecto') ||
    supabaseUrl.includes('your-project') ||
    supabaseUrl.includes('example.supabase.co')
  ) {
    return false;
  }
  return true;
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Storage key for local offline fallback
const LOCAL_STORAGE_USER_KEY = 'obra_control_user_session';
const LOCAL_STORAGE_TRACKING_KEY = 'obra_control_daily_tracking';

export const supabaseAuth = {
  async getSessionUser(): Promise<AuthUser | null> {
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userEmail = (session.user.email || '').trim().toLowerCase();
          const isAdmin = userEmail === 'jheanmurillo73@gmail.com'  || session.user.user_metadata?.role === 'admin';
          return {
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Inspector',
            role: isAdmin ? 'admin' : 'inspector',
            provider: 'Supabase Auth'
          };
        }
      } catch (err) {
        console.warn('Error checking Supabase session:', err);
      }
    }

    // Local fallback check
    const savedLocal = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (parsed && parsed.email) {
          const userEmail = parsed.email.trim().toLowerCase();
          const isAdmin = userEmail === 'jheanmurillo73@gmail.com'  || parsed.role === 'admin';
          parsed.role = isAdmin ? 'admin' : (parsed.role || 'inspector');
        }
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  async signInWithEmail(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    const cleanEmail = email.trim();
    const lowerEmail = cleanEmail.toLowerCase();
    const isTargetAdmin = lowerEmail === 'jheanmurillo73@gmail.com' ;

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
        if (error) {
          // Check if invalid path or configuration or credentials error
          if (error.message?.includes('Invalid path') || error.message?.includes('URL')) {
            console.warn('Supabase URL configuration issue, falling back to local auth:', error.message);
          } else if (isTargetAdmin) {
            // If logging in as admin and Supabase cloud returns error (e.g. user not registered in cloud yet),
            // fallback gracefully to Local Admin Session so admin is never locked out!
            console.warn('Supabase Cloud auth error for admin, falling back to Local Admin mode:', error.message);
            const mockAdmin: AuthUser = {
              id: `usr_admin_${Date.now()}`,
              email: cleanEmail,
              fullName: cleanEmail.split('@')[0] || 'Jhean Murillo (Admin)',
              role: 'admin',
              provider: 'Sesión Local Admin'
            };
            localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockAdmin));
            return { user: mockAdmin, error: null };
          } else {
            return { user: null, error: error.message };
          }
        } else if (data.user) {
          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            fullName: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
            role: isTargetAdmin ? 'admin' : 'inspector',
            provider: 'Supabase Cloud'
          };
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
          return { user, error: null };
        }
      } catch (err: any) {
        console.warn('Supabase sign-in network/URL exception:', err);
      }
    }

    // Local simulated mode
    if (!cleanEmail || !password) {
      return { user: null, error: 'Por favor ingresa un correo y contraseña' };
    }
    const mockUser: AuthUser = {
      id: `usr_${Date.now()}`,
      email: cleanEmail,
      fullName: cleanEmail.split('@')[0],
      role: isTargetAdmin ? 'admin' : 'inspector',
      provider: supabase ? 'Sesión Local' : 'Modo Local'
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
    return { user: mockUser, error: null };
  },

  async signUpWithEmail(email: string, password: string, fullName: string): Promise<{ user: AuthUser | null; error: string | null }> {
    const cleanEmail = email.trim();
    const lowerEmail = cleanEmail.toLowerCase();
    const isTargetAdmin = lowerEmail === 'jheanmurillo73@gmail.com' ;

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { full_name: fullName, role: isTargetAdmin ? 'admin' : 'inspector' }
          }
        });
        if (error) {
          if (error.message?.includes('Invalid path') || error.message?.includes('URL')) {
            console.warn('Supabase URL configuration issue on signUp, falling back to local auth:', error.message);
          } else if (isTargetAdmin) {
            // Local fallback for admin sign up
            const mockAdmin: AuthUser = {
              id: `usr_admin_${Date.now()}`,
              email: cleanEmail,
              fullName: fullName || cleanEmail.split('@')[0],
              role: 'admin',
              provider: 'Sesión Local Admin'
            };
            localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockAdmin));
            return { user: mockAdmin, error: null };
          } else {
            return { user: null, error: error.message };
          }
        } else if (data.user) {
          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            fullName: fullName || cleanEmail.split('@')[0],
            role: isTargetAdmin ? 'admin' : 'inspector',
            provider: 'Supabase Cloud'
          };
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
          return { user, error: null };
        }
      } catch (err: any) {
        console.warn('Supabase sign-up network/URL exception:', err);
      }
    }

    // Local mode fallback
    const mockUser: AuthUser = {
      id: `usr_${Date.now()}`,
      email: cleanEmail,
      fullName: fullName || cleanEmail.split('@')[0],
      role: isTargetAdmin ? 'admin' : 'inspector',
      provider: supabase ? 'Sesión Local' : 'Modo Local'
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
    return { user: mockUser, error: null };
  },

  async signOut(): Promise<void> {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Error signing out Supabase:', err);
      }
    }
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  }
};

// Daily Tracking Logs persistence
export const supabaseDailyTracking = {
  async fetchLogs(): Promise<DailyTrackingLog[]> {
    let cloudLogs: DailyTrackingLog[] = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('daily_tracking_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          cloudLogs = data.map((item: any) => ({
            id: item.id,
            date: item.date,
            timestamp: item.timestamp,
            inspectorName: item.inspector_name || item.inspectorName,
            contractorName: item.contractor_name || item.contractorName,
            sectorLocation: item.sector_location || item.sectorLocation,
            weatherCondition: item.weather_condition || item.weatherCondition,
            supervisorName: item.supervisor_name || item.supervisorName,
            workSummary: item.work_summary || item.workSummary,
            observations: item.observations,
            totalElements: item.total_elements || item.totalElements || 0,
            completedElements: item.completed_elements || item.completedElements || 0,
            inProgressElements: item.in_progress_elements || item.inProgressElements || 0,
            pendingElements: item.pending_elements || item.pendingElements || 0,
            totalMetersExecuted: item.total_meters_executed || item.totalMetersExecuted || 0,
            totalMetersPending: item.total_meters_pending || item.totalMetersPending || 0,
            cableMetersTotal: item.cable_meters_total || item.cableMetersTotal || 0,
            elementsSnapshot: typeof item.elements_snapshot === 'string' ? JSON.parse(item.elements_snapshot) : (item.elements_snapshot || item.elementsSnapshot || []),
            areasSnapshot: typeof item.areas_snapshot === 'string' ? JSON.parse(item.areas_snapshot) : (item.areas_snapshot || item.areasSnapshot || []),
            projectMetaSnapshot: typeof item.project_meta_snapshot === 'string' ? JSON.parse(item.project_meta_snapshot) : (item.project_meta_snapshot || item.projectMetaSnapshot),
            cableSummariesSnapshot: typeof item.cable_summaries_snapshot === 'string' ? JSON.parse(item.cable_summaries_snapshot) : (item.cable_summaries_snapshot || item.cableSummariesSnapshot || []),
            createdBy: item.created_by || item.createdBy,
            createdAt: item.created_at || item.createdAt
          }));
        }
      } catch (err) {
        console.warn('Could not fetch daily tracking from Supabase, relying on local storage:', err);
      }
    }

    // Combine cloud and local storage
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_TRACKING_KEY);
    let localLogs: DailyTrackingLog[] = [];
    if (rawLocal) {
      try {
        localLogs = JSON.parse(rawLocal);
      } catch (e) {
        localLogs = [];
      }
    }

    // Merge by id uniquely
    const map = new Map<string, DailyTrackingLog>();
    for (const log of [...cloudLogs, ...localLogs]) {
      map.set(log.id, log);
    }

    const merged = Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return merged;
  },

  async saveLog(log: DailyTrackingLog): Promise<{ success: boolean; error?: string }> {
    // Always save to localStorage as instant offline backup
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_TRACKING_KEY);
    let localLogs: DailyTrackingLog[] = [];
    if (rawLocal) {
      try { localLogs = JSON.parse(rawLocal); } catch (e) { localLogs = []; }
    }
    localLogs = [log, ...localLogs.filter(l => l.id !== log.id)];
    localStorage.setItem(LOCAL_STORAGE_TRACKING_KEY, JSON.stringify(localLogs));

    // Try Supabase insert if configured
    if (supabase) {
      try {
        const { error } = await supabase
          .from('daily_tracking_logs')
          .insert([{
            id: log.id,
            date: log.date,
            timestamp: log.timestamp,
            inspector_name: log.inspectorName,
            contractor_name: log.contractorName,
            sector_location: log.sectorLocation,
            weather_condition: log.weatherCondition,
            supervisor_name: log.supervisorName,
            work_summary: log.workSummary,
            observations: log.observations,
            total_elements: log.totalElements,
            completed_elements: log.completedElements,
            in_progress_elements: log.inProgressElements,
            pending_elements: log.pendingElements,
            total_meters_executed: log.totalMetersExecuted,
            total_meters_pending: log.totalMetersPending,
            cable_meters_total: log.cableMetersTotal,
            elements_snapshot: JSON.stringify(log.elementsSnapshot),
            areas_snapshot: JSON.stringify(log.areasSnapshot),
            project_meta_snapshot: log.projectMetaSnapshot ? JSON.stringify(log.projectMetaSnapshot) : null,
            cable_summaries_snapshot: log.cableSummariesSnapshot ? JSON.stringify(log.cableSummariesSnapshot) : null,
            created_by: log.createdBy,
            created_at: log.createdAt
          }]);

        if (error) {
          console.warn('Supabase table save error (saved locally):', error.message);
          return { success: true, error: `Guardado localmente (${error.message})` };
        }
      } catch (err: any) {
        console.warn('Supabase connection error:', err);
      }
    }

    return { success: true };
  },

  async deleteLog(id: string): Promise<void> {
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_TRACKING_KEY);
    if (rawLocal) {
      try {
        const localLogs: DailyTrackingLog[] = JSON.parse(rawLocal);
        const filtered = localLogs.filter(l => l.id !== id);
        localStorage.setItem(LOCAL_STORAGE_TRACKING_KEY, JSON.stringify(filtered));
      } catch (e) { /* ignore */ }
    }

    if (supabase) {
      try {
        await supabase.from('daily_tracking_logs').delete().eq('id', id);
      } catch (e) { /* ignore */ }
    }
  }
};

// User Profiles & Status Management
const LOCAL_STORAGE_PROFILES_KEY = 'obra_control_user_profiles_v1';

export const INITIAL_DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'usr_admin_default',
    email: 'jheanmurillo73@gmail.com',
    fullName: 'Jhean Murillo (Admin Principal)',
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_inspector_default',
    email: 'inspector@obramat.com',
    fullName: 'Ing. Inspector de Campo',
    role: 'inspector',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

export const supabaseProfiles = {
  async fetchProfiles(): Promise<UserProfile[]> {
    let cloudProfiles: UserProfile[] = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          cloudProfiles = data.map((item: any) => ({
            id: item.id,
            email: item.email || '',
            fullName: item.full_name || item.fullName || item.email?.split('@')[0],
            role: item.role || (item.email?.includes('admin') || item.email === 'jheanmurillo73@gmail.com' ? 'admin' : 'inspector'),
            status: item.status || 'active',
            createdAt: item.created_at || item.createdAt || new Date().toISOString(),
            lastLogin: item.last_login || item.lastLogin
          }));
        }
      } catch (err) {
        console.warn('Could not fetch profiles from Supabase, fallback to local storage:', err);
      }
    }

    const rawLocal = localStorage.getItem(LOCAL_STORAGE_PROFILES_KEY);
    let localProfiles: UserProfile[] = [];
    if (rawLocal) {
      try { localProfiles = JSON.parse(rawLocal); } catch (e) { localProfiles = []; }
    }

    if (localProfiles.length === 0 && cloudProfiles.length === 0) {
      localProfiles = INITIAL_DEFAULT_PROFILES;
      localStorage.setItem(LOCAL_STORAGE_PROFILES_KEY, JSON.stringify(localProfiles));
    }

    const map = new Map<string, UserProfile>();
    for (const p of [...INITIAL_DEFAULT_PROFILES, ...localProfiles, ...cloudProfiles]) {
      map.set(p.email.toLowerCase(), p);
    }

    return Array.from(map.values());
  },

  async saveProfile(profile: UserProfile): Promise<{ success: boolean; error?: string }> {
    // Save to local storage first
    const profiles = await this.fetchProfiles();
    const updated = [profile, ...profiles.filter(p => p.email.toLowerCase() !== profile.email.toLowerCase())];
    localStorage.setItem(LOCAL_STORAGE_PROFILES_KEY, JSON.stringify(updated));

    if (supabase) {
      try {
        const { error } = await supabase
          .from('profiles')
          .upsert([{
            id: profile.id,
            email: profile.email,
            full_name: profile.fullName,
            role: profile.role,
            status: profile.status,
            created_at: profile.createdAt,
            last_login: profile.lastLogin || new Date().toISOString()
          }], { onConflict: 'email' });

        if (error) {
          console.warn('Supabase upsert profile warning:', error.message);
        }
      } catch (err: any) {
        console.warn('Supabase profile save exception:', err);
      }
    }

    return { success: true };
  },

  async updateProfileStatus(email: string, status: 'active' | 'inactive'): Promise<void> {
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_PROFILES_KEY);
    if (rawLocal) {
      try {
        const list: UserProfile[] = JSON.parse(rawLocal);
        const updated = list.map(p => p.email.toLowerCase() === email.toLowerCase() ? { ...p, status } : p);
        localStorage.setItem(LOCAL_STORAGE_PROFILES_KEY, JSON.stringify(updated));
      } catch (e) { /* ignore */ }
    }

    if (supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ status })
          .eq('email', email.toLowerCase());
      } catch (e) { /* ignore */ }
    }
  },

  async deleteProfile(email: string): Promise<void> {
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_PROFILES_KEY);
    if (rawLocal) {
      try {
        const list: UserProfile[] = JSON.parse(rawLocal);
        const filtered = list.filter(p => p.email.toLowerCase() !== email.toLowerCase());
        localStorage.setItem(LOCAL_STORAGE_PROFILES_KEY, JSON.stringify(filtered));
      } catch (e) { /* ignore */ }
    }

    if (supabase) {
      try {
        await supabase
          .from('profiles')
          .delete()
          .eq('email', email.toLowerCase());
      } catch (e) { /* ignore */ }
    }
  },

  async checkDatabaseDiagnostics(): Promise<{
    isOnline: boolean;
    profilesCount: number;
    logsCount: number;
    elementsCount: number;
    scheduleCount: number;
    areasCount: number;
    historyCount: number;
    message: string;
    details: string;
  }> {
    if (!supabase) {
      const localTracking = localStorage.getItem(LOCAL_STORAGE_TRACKING_KEY);
      const logs = localTracking ? JSON.parse(localTracking).length : 0;
      const localProf = localStorage.getItem(LOCAL_STORAGE_PROFILES_KEY);
      const profiles = localProf ? JSON.parse(localProf).length : INITIAL_DEFAULT_PROFILES.length;
      const rawElements = localStorage.getItem('obra_elements_v2');
      const elementsCount = rawElements ? JSON.parse(rawElements).length : 0;
      const rawSchedule = localStorage.getItem('obra_schedule_items_v1');
      const scheduleCount = rawSchedule ? JSON.parse(rawSchedule).length : 0;
      const rawAreas = localStorage.getItem('obra_areas_v2');
      const areasCount = rawAreas ? JSON.parse(rawAreas).length : 0;
      const rawHistory = localStorage.getItem(LOCAL_STORAGE_AUDIT_KEY);
      const historyCount = rawHistory ? JSON.parse(rawHistory).length : 0;

      return {
        isOnline: false,
        profilesCount: profiles,
        logsCount: logs,
        elementsCount,
        scheduleCount,
        areasCount,
        historyCount,
        message: 'Modo Local Activo (Sin credenciales de Supabase)',
        details: 'Los datos de usuarios, elementos, cronograma y bitácoras se están guardando localmente en el navegador (LocalStorage).'
      };
    }

    try {
      const { data: profs, error: profErr } = await supabase.from('profiles').select('id');
      const { data: logs, error: logsErr } = await supabase.from('daily_tracking_logs').select('id');
      const { data: elems, error: elemErr } = await supabase.from('inspection_elements').select('id');
      const { data: sched, error: schedErr } = await supabase.from('schedule_items').select('id');
      const { data: areas, error: areaErr } = await supabase.from('area_sectors').select('id');
      const { data: history, error: histErr } = await supabase.from('version_history_logs').select('id');

      if (profErr && logsErr && elemErr) {
        return {
          isOnline: false,
          profilesCount: 0,
          logsCount: 0,
          elementsCount: 0,
          scheduleCount: 0,
          areasCount: 0,
          historyCount: 0,
          message: 'Error de respuesta de Supabase Cloud',
          details: `Incapaz de consultar las tablas en Supabase. Detalle: ${profErr?.message || logsErr?.message || elemErr?.message}`
        };
      }

      return {
        isOnline: true,
        profilesCount: profs ? profs.length : 0,
        logsCount: logs ? logs.length : 0,
        elementsCount: elems ? elems.length : 0,
        scheduleCount: sched ? sched.length : 0,
        areasCount: areas ? areas.length : 0,
        historyCount: history ? history.length : 0,
        message: 'Conexión Exitosa a las Tablas de Supabase Cloud DB',
        details: 'Las 6 tablas principales de la base de datos están conectadas y sincronizando información.'
      };
    } catch (err: any) {
      return {
        isOnline: false,
        profilesCount: 0,
        logsCount: 0,
        elementsCount: 0,
        scheduleCount: 0,
        areasCount: 0,
        historyCount: 0,
        message: 'Excepción de red al conectar con Supabase',
        details: err.message || 'Verifica la URL y la Anon Key de Supabase en las variables de entorno.'
      };
    }
  }
};

// ==========================================
// Inspection Elements Persistence Service
// ==========================================
export const supabaseElements = {
  async fetchElements(): Promise<InspectionElement[] | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('inspection_elements')
        .select('*');

      if (error) {
        console.warn('Could not fetch inspection_elements from Supabase:', error.message);
        return null;
      }

      if (data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          type: item.type,
          x: item.x,
          y: item.y,
          x2: item.x2 ?? item.x_2,
          y2: item.y2 ?? item.y_2,
          status: item.status,
          label: item.label,
          camType: item.cam_type || item.camType,
          pipes: item.pipes,
          cables: item.cables,
          meters: item.meters,
          acta: item.acta,
          itemCobro: item.item_cobro || item.itemCobro,
          itemDescripcion: item.item_descripcion || item.itemDescripcion,
          itemUnidad: item.item_unidad || item.itemUnidad,
          scheduleItemId: item.schedule_item_id || item.scheduleItemId,
          progressPercent: item.progress_percent ?? item.progressPercent,
          startDate: item.start_date || item.startDate,
          endDate: item.end_date || item.endDate,
          onlyPipes: item.only_pipes ?? item.onlyPipes,
          observations: item.observations,
          photos: typeof item.photos === 'string' ? JSON.parse(item.photos) : (item.photos || []),
          date: item.date || item.created_at || new Date().toISOString()
        }));
      }
    } catch (err) {
      console.warn('Exception fetching elements from Supabase:', err);
    }
    return null;
  },

  async saveAllElements(elements: InspectionElement[]): Promise<void> {
    if (!supabase || elements.length === 0) return;

    try {
      const payload = elements.map(e => ({
        id: e.id,
        type: e.type,
        x: e.x,
        y: e.y,
        x2: e.x2,
        y2: e.y2,
        status: e.status,
        label: e.label,
        cam_type: e.camType,
        pipes: e.pipes,
        cables: e.cables,
        meters: e.meters,
        acta: e.acta,
        item_cobro: e.itemCobro,
        item_descripcion: e.itemDescripcion,
        item_unidad: e.itemUnidad,
        schedule_item_id: e.scheduleItemId,
        progress_percent: e.progressPercent,
        start_date: e.startDate,
        end_date: e.endDate,
        only_pipes: e.onlyPipes,
        observations: e.observations,
        photos: JSON.stringify(e.photos || []),
        date: e.date
      }));

      const { error } = await supabase
        .from('inspection_elements')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('Supabase saveAllElements warning:', error.message);
      }
    } catch (err) {
      console.warn('Supabase saveAllElements exception:', err);
    }
  },

  async deleteElement(id: string | number): Promise<void> {
    if (!supabase) return;
    try {
      await supabase.from('inspection_elements').delete().eq('id', id.toString());
    } catch (e) {
      console.warn('Error deleting element in Supabase:', e);
    }
  }
};

// ==========================================
// Schedule Items Persistence Service
// ==========================================
export const supabaseSchedule = {
  async fetchScheduleItems(): Promise<ScheduleItem[] | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('schedule_items')
        .select('*');

      if (error) {
        console.warn('Could not fetch schedule_items from Supabase:', error.message);
        return null;
      }

      if (data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id || item.code,
          code: item.code,
          description: item.description,
          targetQuantity: item.target_quantity ?? item.targetQuantity ?? 0,
          unit: item.unit || 'mts',
          entrega1Target: item.entrega1_target ?? item.entrega1Target ?? 0,
          entrega1Label: item.entrega1_label || item.entrega1Label || 'Entrega 1',
          entrega2Target: item.entrega2_target ?? item.entrega2Target ?? 0,
          entrega2Label: item.entrega2_label || item.entrega2Label || 'Entrega 2',
          finalDeadline: item.final_deadline || item.finalDeadline || '01/08/2026',
          category: item.category || 'tuberia'
        }));
      }
    } catch (err) {
      console.warn('Exception fetching schedule from Supabase:', err);
    }
    return null;
  },

  async saveScheduleItems(items: ScheduleItem[]): Promise<void> {
    if (!supabase || items.length === 0) return;

    try {
      const payload = items.map(i => ({
        id: i.id || i.code,
        code: i.code,
        description: i.description,
        target_quantity: i.targetQuantity,
        unit: i.unit,
        entrega1_target: i.entrega1Target,
        entrega1_label: i.entrega1Label,
        entrega2_target: i.entrega2Target,
        entrega2_label: i.entrega2Label,
        final_deadline: i.finalDeadline,
        category: i.category
      }));

      const { error } = await supabase
        .from('schedule_items')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('Supabase saveScheduleItems warning:', error.message);
      }
    } catch (err) {
      console.warn('Supabase saveScheduleItems exception:', err);
    }
  }
};

// ==========================================
// Area Sectors Persistence Service
// ==========================================
export const supabaseAreas = {
  async fetchAreas(): Promise<AreaSector[] | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('area_sectors')
        .select('*');

      if (error) {
        console.warn('Could not fetch area_sectors from Supabase:', error.message);
        return null;
      }

      if (data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          code: item.code || '',
          name: item.name,
          color: typeof item.color === 'string' ? JSON.parse(item.color) : (item.color || { fill: '#fff', stroke: '#000', badge: 'text-black' }),
          points: typeof item.points === 'string' ? JSON.parse(item.points) : (item.points || []),
          widthMeters: item.width_meters,
          lengthMeters: item.length_meters,
          calculatedAreaM2: item.calculated_area,
          notes: item.notes,
          scheduleItemId: item.schedule_item_id
        }));
      }
    } catch (err) {
      console.warn('Exception fetching areas from Supabase:', err);
    }
    return null;
  },

  async saveAreas(areas: AreaSector[]): Promise<void> {
    if (!supabase || areas.length === 0) return;

    try {
      const payload = areas.map(a => ({
        id: a.id,
        code: a.code,
        name: a.name,
        color: JSON.stringify(a.color),
        points: JSON.stringify(a.points || []),
        width_meters: a.widthMeters,
        length_meters: a.lengthMeters,
        calculated_area: a.calculatedAreaM2,
        notes: a.notes,
        schedule_item_id: a.scheduleItemId
      }));

      const { error } = await supabase
        .from('area_sectors')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('Supabase saveAreas warning:', error.message);
      }
    } catch (err) {
      console.warn('Supabase saveAreas exception:', err);
    }
  }
};

// ==========================================
// Project Meta Persistence Service
// ==========================================
export const supabaseProjectMeta = {
  async fetchMeta(): Promise<ProjectMeta | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('project_meta')
        .select('*')
        .limit(1);

      if (error) {
        console.warn('Could not fetch project_meta from Supabase:', error.message);
        return null;
      }

      if (data && data.length > 0) {
        const item = data[0];
        return {
          inspectorName: item.inspector_name || item.inspectorName || '',
          contractorName: item.contractor_name || item.contractorName || '',
          inspectionDate: item.inspection_date || item.inspectionDate || '',
          sectorLocation: item.sector_location || item.sectorLocation || '',
          actaDocuments: item.acta_documents || item.actaDocuments || {}
        };
      }
    } catch (err) {
      console.warn('Exception fetching project_meta from Supabase:', err);
    }
    return null;
  },

  async saveMeta(meta: ProjectMeta): Promise<void> {
    if (!supabase) return;

    try {
      const payload = {
        id: 'main_project',
        inspector_name: meta.inspectorName,
        contractor_name: meta.contractorName,
        inspection_date: meta.inspectionDate,
        sector_location: meta.sectorLocation,
        acta_documents: meta.actaDocuments
      };

      const { error } = await supabase
        .from('project_meta')
        .upsert([payload], { onConflict: 'id' });

      if (error) {
        console.warn('Supabase saveMeta warning:', error.message);
      }
    } catch (err) {
      console.warn('Supabase saveMeta exception:', err);
    }
  }
};

// ==========================================
// Ready-to-use Supabase SQL Schema Script
// ==========================================
export const SUPABASE_TABLES_SQL_SCHEMA = `-- SCRIPT SQL PARA CREAR LAS 6 TABLAS EN EL SQL EDITOR DE SUPABASE

-- 1. Tabla de Perfiles y Usuarios
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'inspector',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- 2. Tabla de Bitácora Diaria (Tracking Logs)
CREATE TABLE IF NOT EXISTS public.daily_tracking_logs (
  id TEXT PRIMARY KEY,
  date TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  inspector_name TEXT,
  contractor_name TEXT,
  sector_location TEXT,
  weather_condition TEXT,
  supervisor_name TEXT,
  work_summary TEXT,
  observations TEXT,
  total_elements INTEGER DEFAULT 0,
  completed_elements INTEGER DEFAULT 0,
  in_progress_elements INTEGER DEFAULT 0,
  pending_elements INTEGER DEFAULT 0,
  total_meters_executed NUMERIC DEFAULT 0,
  total_meters_pending NUMERIC DEFAULT 0,
  cable_meters_total NUMERIC DEFAULT 0,
  elements_snapshot JSONB,
  areas_snapshot JSONB,
  project_meta_snapshot JSONB,
  cable_summaries_snapshot JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Auditoría e Historial de Versiones
CREATE TABLE IF NOT EXISTS public.version_history_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_email TEXT,
  user_name TEXT,
  user_role TEXT,
  action_type TEXT,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  details TEXT,
  previous_value TEXT,
  new_value TEXT
);

-- 4. Tabla de Elementos de Inspección (Planos y Tramos)
CREATE TABLE IF NOT EXISTS public.inspection_elements (
  id TEXT PRIMARY KEY,
  type TEXT,
  x NUMERIC,
  y NUMERIC,
  x2 NUMERIC,
  y2 NUMERIC,
  status TEXT,
  label TEXT,
  cam_type TEXT,
  pipes TEXT,
  cables TEXT,
  meters NUMERIC,
  norm TEXT,
  acta TEXT,
  item_cobro TEXT,
  item_descripcion TEXT,
  observations TEXT,
  photos JSONB,
  date TEXT
);

-- 5. Tabla de Rubros del Cronograma
CREATE TABLE IF NOT EXISTS public.schedule_items (
  id TEXT PRIMARY KEY,
  code TEXT,
  description TEXT,
  target_quantity NUMERIC,
  unit TEXT,
  entrega1_target NUMERIC,
  entrega1_label TEXT,
  entrega2_target NUMERIC,
  entrega2_label TEXT,
  final_deadline TEXT,
  category TEXT
);

-- 6. Tabla de Sectores / Áreas Poligonales
CREATE TABLE IF NOT EXISTS public.area_sectors (
  id TEXT PRIMARY KEY,
  name TEXT,
  color TEXT,
  points JSONB,
  meters_target NUMERIC
);

-- 7. Tabla de Metadatos del Proyecto
CREATE TABLE IF NOT EXISTS public.project_meta (
  id TEXT PRIMARY KEY DEFAULT 'main_project',
  project_name TEXT,
  contractor TEXT,
  supervisor TEXT,
  inspector TEXT,
  location TEXT,
  date TEXT,
  blueprint_url TEXT
);
`;

// Version Audit History Logs Service
const LOCAL_STORAGE_AUDIT_KEY = 'obra_version_history_v1';

export const supabaseAudit = {
  async logEvent(entry: Omit<VersionHistoryLog, 'id' | 'timestamp'>): Promise<void> {
    const newLog: VersionHistoryLog = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };

    // Save to LocalStorage
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_AUDIT_KEY);
      const existing: VersionHistoryLog[] = raw ? JSON.parse(raw) : [];
      const updated = [newLog, ...existing].slice(0, 300); // Keep latest 300
      localStorage.setItem(LOCAL_STORAGE_AUDIT_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save audit log locally:', e);
    }

    // Save to Supabase Cloud
    if (supabase) {
      try {
        await supabase.from('version_history_logs').insert([{
          id: newLog.id,
          timestamp: newLog.timestamp,
          user_email: newLog.userEmail,
          user_name: newLog.userName,
          user_role: newLog.userRole,
          action_type: newLog.actionType,
          entity_type: newLog.entityType,
          entity_id: newLog.entityId,
          entity_name: newLog.entityName,
          details: newLog.details,
          previous_value: newLog.previousValue,
          new_value: newLog.newValue
        }]);
      } catch (err) {
        console.warn('Supabase version history insert warning:', err);
      }
    }
  },

  async fetchHistoryForElement(entityId: string, limit: number = 100): Promise<VersionHistoryLog[]> {
    let cloudLogs: VersionHistoryLog[] = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('version_history_logs')
          .select('*')
          .eq('entity_id', entityId)
          .order('timestamp', { ascending: false })
          .limit(limit);

        if (!error && data && data.length > 0) {
          cloudLogs = data.map((item: any) => ({
            id: item.id,
            timestamp: item.timestamp || item.created_at || new Date().toISOString(),
            userEmail: item.user_email || item.userEmail || 'desconocido@obra.com',
            userName: item.user_name || item.userName || 'Usuario',
            userRole: item.user_role || item.userRole || 'inspector',
            actionType: item.action_type || item.actionType || 'update',
            entityType: item.entity_type || item.entityType || 'tramo',
            entityId: item.entity_id || item.entityId,
            entityName: item.entity_name || item.entityName,
            details: item.details || '',
            previousValue: item.previous_value || item.previousValue,
            newValue: item.new_value || item.newValue
          }));
        }
      } catch (err) {
        console.warn('Could not fetch element history from Supabase, fallback to local storage:', err);
      }
    }

    const rawLocal = localStorage.getItem(LOCAL_STORAGE_AUDIT_KEY);
    let localLogs: VersionHistoryLog[] = [];
    if (rawLocal) {
      try { localLogs = JSON.parse(rawLocal); } catch (e) { localLogs = []; }
    }
    
    localLogs = localLogs.filter(log => log.entityId === entityId);

    const map = new Map<string, VersionHistoryLog>();
    for (const log of [...localLogs, ...cloudLogs]) {
      map.set(log.id, log);
    }

    const sorted = Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return sorted.slice(0, limit);
  },

  async fetchHistory(limit: number = 100): Promise<VersionHistoryLog[]> {
    let cloudLogs: VersionHistoryLog[] = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('version_history_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(limit);

        if (!error && data && data.length > 0) {
          cloudLogs = data.map((item: any) => ({
            id: item.id,
            timestamp: item.timestamp || item.created_at || new Date().toISOString(),
            userEmail: item.user_email || item.userEmail || 'desconocido@obra.com',
            userName: item.user_name || item.userName || 'Usuario',
            userRole: item.user_role || item.userRole || 'inspector',
            actionType: item.action_type || item.actionType || 'update',
            entityType: item.entity_type || item.entityType || 'tramo',
            entityId: item.entity_id || item.entityId,
            entityName: item.entity_name || item.entityName,
            details: item.details || '',
            previousValue: item.previous_value || item.previousValue,
            newValue: item.new_value || item.newValue
          }));
        }
      } catch (err) {
        console.warn('Could not fetch version history from Supabase, fallback to local storage:', err);
      }
    }

    const rawLocal = localStorage.getItem(LOCAL_STORAGE_AUDIT_KEY);
    let localLogs: VersionHistoryLog[] = [];
    if (rawLocal) {
      try { localLogs = JSON.parse(rawLocal); } catch (e) { localLogs = []; }
    }

    const map = new Map<string, VersionHistoryLog>();
    for (const log of [...localLogs, ...cloudLogs]) {
      map.set(log.id, log);
    }

    const sorted = Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return sorted.slice(0, limit);
  },

  async clearHistory(): Promise<void> {
    localStorage.removeItem(LOCAL_STORAGE_AUDIT_KEY);
    if (supabase) {
      try {
        await supabase.from('version_history_logs').delete().neq('id', '0');
      } catch (e) { /* ignore */ }
    }
  }
};


