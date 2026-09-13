export interface TradeWageItem {
  id: string;
  name: string;
  dailyWage: number;
  monthlyWage: number;
  category?: string;
  description?: string;
}

export interface WageConfigData {
  registrationFee: number;
  agentRegistrationFee?: number;
  isRegistrationFeeMandatory: boolean;
  lockAgentWages: boolean;
  tradeWages: TradeWageItem[];
  updatedAt: string;
  updatedBy?: string;
}

const STORAGE_KEY = 'labor_union_wage_config_v1';
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

export const DEFAULT_WAGE_CONFIG: WageConfigData = {
  registrationFee: 500,
  agentRegistrationFee: 1000,
  isRegistrationFeeMandatory: true,
  lockAgentWages: false,
  tradeWages: [
    { id: '1', name: 'General Helper / Helper', dailyWage: 600, monthlyWage: 18000, category: 'Unskilled / Semi-skilled', description: 'General site support, material handling & cleaning' },
    { id: '2', name: 'Mason / Carpenter', dailyWage: 850, monthlyWage: 25500, category: 'Skilled Trade', description: 'Bricklaying, plastering, formwork, carpentry' },
    { id: '3', name: 'Electrician', dailyWage: 950, monthlyWage: 28500, category: 'Certified Skilled', description: 'Wiring, conduits, panels, installation & safety' },
    { id: '4', name: 'Plumber', dailyWage: 950, monthlyWage: 28500, category: 'Certified Skilled', description: 'Piping, fittings, sanitation & water supply systems' },
    { id: '5', name: 'Scaffolder', dailyWage: 900, monthlyWage: 27000, category: 'Skilled Trade', description: 'Erection, inspection, high-rise structural scaffolding' },
    { id: '6', name: 'Welder / Fabricator', dailyWage: 1000, monthlyWage: 30000, category: 'Specialized Technical', description: 'Structural welding, arc/TIG, fabrication & cutting' },
    { id: '7', name: 'Site Technician / Supervisor', dailyWage: 1100, monthlyWage: 33000, category: 'Technical Specialist', description: 'Site machinery, heavy equipment operation & quality checks' }
  ],
  updatedAt: new Date().toISOString(),
  updatedBy: 'Super Admin (Default Master)'
};

const listeners: Array<(config: WageConfigData) => void> = [];

const getToken = (): string | null => {
  return sessionStorage.getItem('token') || localStorage.getItem('token');
};

export const getWageConfig = (): WageConfigData => {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && Array.isArray(parsed.tradeWages) && parsed.tradeWages.length > 0) {
        return {
          ...DEFAULT_WAGE_CONFIG,
          ...parsed
        };
      }
    }
  } catch (err) {
    console.warn('Error reading wage config from localStorage:', err);
  }
  return DEFAULT_WAGE_CONFIG;
};

export const setLocalWageConfig = (config: WageConfigData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    // Notify all listeners
    listeners.forEach((listener) => {
      try {
        listener(config);
      } catch (e) {
        console.error('Error executing wage config listener:', e);
      }
    });
  } catch (err) {
    console.error('Error saving wage config to localStorage:', err);
  }
};

export const fetchWageConfigApi = async (): Promise<WageConfigData> => {
  try {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/settings/wage-config`, {
      method: 'GET',
      headers
    });

    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data) {
        setLocalWageConfig(json.data);
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Backend wage-config fetch failed, using local configuration:', err);
  }

  return getWageConfig();
};

export const saveWageConfigApi = async (configUpdate: Partial<WageConfigData>): Promise<WageConfigData> => {
  const current = getWageConfig();
  const updated: WageConfigData = {
    ...current,
    ...configUpdate,
    updatedAt: new Date().toISOString()
  };

  // Always save locally immediately
  setLocalWageConfig(updated);

  try {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/settings/wage-config`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updated)
    });

    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data) {
        setLocalWageConfig(json.data);
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Backend wage-config update failed, persisted in local store:', err);
  }

  return updated;
};

export const getTradeWage = (tradeName: string): { dailyWage: number; monthlyWage: number } => {
  const config = getWageConfig();
  const found = config.tradeWages.find(
    (t) => t.name.toLowerCase() === tradeName.toLowerCase() ||
           tradeName.toLowerCase().includes(t.name.toLowerCase()) ||
           t.name.toLowerCase().includes(tradeName.toLowerCase())
  );

  if (found) {
    return { dailyWage: found.dailyWage, monthlyWage: found.monthlyWage || found.dailyWage * 30 };
  }

  // Fallbacks based on keywords
  if (tradeName.toLowerCase().includes('helper')) return { dailyWage: 600, monthlyWage: 18000 };
  if (tradeName.toLowerCase().includes('electrician') || tradeName.toLowerCase().includes('plumber')) return { dailyWage: 950, monthlyWage: 28500 };
  if (tradeName.toLowerCase().includes('scaffolder')) return { dailyWage: 900, monthlyWage: 27000 };
  if (tradeName.toLowerCase().includes('welder')) return { dailyWage: 1000, monthlyWage: 30000 };
  if (tradeName.toLowerCase().includes('technician')) return { dailyWage: 1100, monthlyWage: 33000 };

  return { dailyWage: 850, monthlyWage: 25500 };
};

export const getRegistrationFee = (): number => {
  const config = getWageConfig();
  return typeof config.registrationFee === 'number' ? config.registrationFee : 500;
};

export const subscribeWageConfig = (callback: (config: WageConfigData) => void): (() => void) => {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
  };
};
