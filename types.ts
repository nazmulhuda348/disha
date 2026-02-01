
export enum TransactionType {
  DISBURSEMENT = 'DISBURSEMENT',
  COLLECTION = 'COLLECTION',
  SAVINGS = 'SAVINGS',
  WITHDRAWAL = 'WITHDRAWAL',
  OPEX = 'OPEX',
  BANK_DEPOSIT = 'BANK_DEPOSIT',
  BANK_WITHDRAWAL = 'BANK_WITHDRAWAL'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER'
}

export enum InterestMethod {
  FLAT = 'FLAT',
  REDUCING = 'REDUCING'
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  initialCapital: number;
  defaultLoanRate: number;
  defaultDPSRate: number;
  defaultFDRRate: number;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: 'SAVINGS' | 'CURRENT' | 'FIXED';
  branchId: string;
  balance: number;
}

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  branchId: string;
}

export interface Client {
  id: string;
  name: string;
  kycId: string;
  phone: string;
  address: string;
  joinDate: string;
  status: 'ACTIVE' | 'PENDING' | 'CLOSED';
  branchId: string;
  createdBy: string;
}

export interface Loan {
  id: string;
  clientId: string;
  principal: number;
  interestRate: number;
  termMonths: number;
  method: InterestMethod;
  startDate: string;
  disbursed: boolean;
  remainingPrincipal: number;
  branchId: string;
  createdBy: string;
}

export interface DPS {
  id: string;
  clientId: string;
  monthlyAmount: number;
  interestRate: number;
  termYears: number;
  startDate: string;
  status: 'ACTIVE' | 'MATURED' | 'CLOSED';
  branchId: string;
  createdBy: string;
}

export interface FDR {
  id: string;
  clientId: string;
  depositAmount: number;
  interestRate: number;
  termMonths: number;
  startDate: string;
  status: 'ACTIVE' | 'MATURED' | 'CLOSED';
  branchId: string;
  createdBy: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  interestPart: number;
  principalPart: number;
  clientId?: string;
  productId?: string;
  bankAccountId?: string;
  description: string;
  performedBy: string;
  branchId: string;
}

export interface FundState {
  totalCapital: number;
  availableCash: number;
  totalLoansOut: number;
  totalSavingsLiability: number;
}

export interface AppState {
  branches: Branch[];
  bankAccounts: BankAccount[];
  clients: Client[];
  loans: Loan[];
  dps: DPS[];
  fdr: FDR[];
  transactions: Transaction[];
  users: UserAccount[];
  currentUser: UserAccount | null;
}
