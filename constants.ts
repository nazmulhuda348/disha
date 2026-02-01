
import { TransactionType } from './types';

// Added missing BANK_DEPOSIT and BANK_WITHDRAWAL keys to TRANSACTION_COLORS
export const TRANSACTION_COLORS: Record<TransactionType, string> = {
  [TransactionType.DISBURSEMENT]: 'text-rose-600 bg-rose-50',
  [TransactionType.COLLECTION]: 'text-emerald-600 bg-emerald-50',
  [TransactionType.SAVINGS]: 'text-sky-600 bg-sky-50',
  [TransactionType.WITHDRAWAL]: 'text-amber-600 bg-amber-50',
  [TransactionType.OPEX]: 'text-slate-600 bg-slate-50',
  [TransactionType.BANK_DEPOSIT]: 'text-indigo-600 bg-indigo-50',
  [TransactionType.BANK_WITHDRAWAL]: 'text-violet-600 bg-violet-50',
};

export const INITIAL_FUND_CAPITAL = 1000000; // 1M initial startup fund

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const calculateMaturityDate = (startDate: string, months: number) => {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
};
