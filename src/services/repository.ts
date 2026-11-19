import {
  DEMO_USERS,
  INITIAL_BUILDINGS,
  INITIAL_DOCUMENTS,
  INITIAL_ELECTRICITY_BILLS,
  INITIAL_EXPENSES,
  INITIAL_NOTIFICATIONS,
  INITIAL_PAYMENTS,
  INITIAL_RENT_LEDGER,
  INITIAL_ROOMS,
  INITIAL_SETTINGS,
  INITIAL_STUDENTS,
} from '../data/mockData';
import { PersistedHostelState } from '../types/hostel';

/**
 * Backend-ready repository contract.
 * Currently backed by LocalDemoRepository (browser localStorage).
 * Swap with a Supabase/PostgreSQL REST implementation without modifying UI components.
 */
export interface IHostelRepository {
  readonly modeLabel: string;
  loadState(): PersistedHostelState;
  saveState(state: PersistedHostelState): void;
  resetState(): PersistedHostelState;
}

const STORAGE_KEY = 'hostel_manager_v4_1_state';

export function createSeedState(): PersistedHostelState {
  return {
    buildings: INITIAL_BUILDINGS,
    rooms: INITIAL_ROOMS,
    students: INITIAL_STUDENTS,
    rentLedger: INITIAL_RENT_LEDGER,
    payments: INITIAL_PAYMENTS,
    expenses: INITIAL_EXPENSES,
    electricityBills: INITIAL_ELECTRICITY_BILLS,
    documents: INITIAL_DOCUMENTS,
    notifications: INITIAL_NOTIFICATIONS,
    settings: INITIAL_SETTINGS,
    staff: DEMO_USERS,
  };
}

export class LocalDemoRepository implements IHostelRepository {
  readonly modeLabel = 'Local Demo Storage';

  loadState(): PersistedHostelState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedHostelState>;
        const seed = createSeedState();
        return {
          ...seed,
          ...parsed,
          settings: { ...seed.settings, ...(parsed.settings || {}) },
        };
      }
    } catch {
      // Ignore malformed storage and restore seed
    }
    return createSeedState();
  }

  saveState(state: PersistedHostelState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors in sandboxed iframes
    }
  }

  resetState(): PersistedHostelState {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return createSeedState();
  }
}

export const hostelRepository: IHostelRepository = new LocalDemoRepository();
