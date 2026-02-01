
import { AppState, UserRole } from '../types';

const STORAGE_KEY = 'MF_PRO_DB_v4';

export const syncToCloud = async (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return true;
};

export const loadInitialData = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse local storage", e);
    }
  }

  const defaultBranch = {
    id: 'br_main',
    name: 'Head Office',
    address: '123 Finance Plaza, Dhaka',
    initialCapital: 1000000,
    defaultLoanRate: 12,
    defaultDPSRate: 8,
    defaultFDRRate: 10
  };

  const defaultAdmin = {
    id: 'u_admin',
    username: 'admin',
    password: 'admin',
    name: 'Administrator',
    role: UserRole.ADMIN,
    branchId: 'br_main'
  };

  return {
    branches: [defaultBranch],
    bankAccounts: [],
    clients: [],
    loans: [],
    dps: [],
    fdr: [],
    transactions: [],
    users: [defaultAdmin],
    currentUser: null
  };
};
