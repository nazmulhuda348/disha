
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState, TransactionType, UserRole, Client, Loan, Transaction, DPS, FDR, UserAccount, FundState, Branch, BankAccount } from './types';
import { loadInitialData, syncToCloud } from './services/db';
import { formatCurrency } from './constants';
import Dashboard from './components/Dashboard';
import ClientManager from './components/ClientManager';
import ProductManagement from './components/ProductManagement';
import TransactionLedger from './components/TransactionLedger';
import Sidebar from './components/Sidebar';
import AdminSettings from './components/AdminSettings';
import AIConsultant from './components/AIConsultant';
import BankManager from './components/BankManager';
import Login from './components/Login';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(loadInitialData());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [adminBranchFilter, setAdminBranchFilter] = useState<string>('ALL');

  useEffect(() => {
    const sync = async () => {
      setIsSyncing(true);
      await syncToCloud(state);
      setIsSyncing(false);
    };
    sync();
  }, [state]);

  const notify = (msg: string) => {
    setShowNotification(msg);
    setTimeout(() => setShowNotification(null), 3000);
  };

  const handleLogin = (user: string, pass: string): boolean => {
    const foundUser = state.users.find(u => u.username === user && u.password === pass);
    if (foundUser) {
      setState(prev => ({ ...prev, currentUser: foundUser }));
      setAdminBranchFilter(foundUser.role === UserRole.ADMIN ? 'ALL' : foundUser.branchId);
      notify(`Logged in as ${foundUser.name}`);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
    setActiveTab('dashboard');
  };

  const activeBranchId = useMemo(() => {
    if (!state.currentUser) return 'ALL';
    return state.currentUser.role === UserRole.ADMIN ? adminBranchFilter : state.currentUser.branchId;
  }, [state.currentUser, adminBranchFilter]);

  const fundData = useMemo((): FundState => {
    const targetBranchId = activeBranchId;
    const capital = targetBranchId === 'ALL' 
      ? state.branches.reduce((acc, br) => acc + br.initialCapital, 0)
      : (state.branches.find(b => b.id === targetBranchId)?.initialCapital || 0);

    let cash = capital;
    let loansOut = 0;
    let savings = 0;

    const txs = targetBranchId === 'ALL' ? state.transactions : state.transactions.filter(t => t.branchId === targetBranchId);

    txs.forEach(tx => {
      switch (tx.type) {
        case TransactionType.DISBURSEMENT: cash -= tx.amount; break;
        case TransactionType.COLLECTION: cash += tx.amount; break;
        case TransactionType.SAVINGS: cash += tx.amount; savings += tx.amount; break;
        case TransactionType.WITHDRAWAL: cash -= tx.amount; savings -= tx.amount; break;
        case TransactionType.OPEX: cash -= tx.amount; break;
        case TransactionType.BANK_DEPOSIT: cash -= tx.amount; break;
        case TransactionType.BANK_WITHDRAWAL: cash += tx.amount; break;
      }
    });

    const products = targetBranchId === 'ALL' ? state.loans : state.loans.filter(l => l.branchId === targetBranchId);
    products.forEach(loan => { if (loan.disbursed) loansOut += loan.remainingPrincipal; });

    return { totalCapital: capital, availableCash: cash, totalLoansOut: loansOut, totalSavingsLiability: savings };
  }, [state, activeBranchId]);

  const filteredData = useMemo(() => {
    const branchId = activeBranchId;
    if (branchId === 'ALL') return { ...state, fund: fundData };
    return {
      ...state,
      clients: state.clients.filter(c => c.branchId === branchId),
      bankAccounts: state.bankAccounts.filter(b => b.branchId === branchId),
      loans: state.loans.filter(l => l.branchId === branchId),
      dps: state.dps.filter(d => d.branchId === branchId),
      fdr: state.fdr.filter(f => f.branchId === branchId),
      transactions: state.transactions.filter(t => t.branchId === branchId),
      fund: fundData
    };
  }, [state, activeBranchId, fundData]);

  const addBank = (bank: Omit<BankAccount, 'id' | 'balance'>) => {
    setState(prev => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, { ...bank, id: `bnk_${Date.now()}`, balance: 0 }]
    }));
    notify("Bank Account Added");
  };

  const handleBankTx = (bankId: string, type: TransactionType, amount: number, date: string, desc: string) => {
    const branchId = state.currentUser!.branchId;
    const tx: Transaction = {
      id: `tx_bnk_${Date.now()}`,
      date: date || new Date().toISOString(),
      type,
      amount,
      interestPart: 0,
      principalPart: 0,
      bankAccountId: bankId,
      description: desc,
      performedBy: state.currentUser!.name,
      branchId
    };
    setState(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map(b => b.id === bankId ? { ...b, balance: b.balance + (type === TransactionType.BANK_DEPOSIT ? amount : -amount) } : b),
      transactions: [tx, ...prev.transactions]
    }));
    notify("Bank Transaction Recorded");
  };

  const closeSavings = (productId: string, type: 'DPS' | 'FDR', amountToReturn: number, interest: number) => {
    const branchId = state.currentUser!.branchId;
    const creator = state.currentUser!.name;
    const tx: Transaction = {
      id: `tx_close_${Date.now()}`,
      date: new Date().toISOString(),
      type: TransactionType.WITHDRAWAL,
      amount: amountToReturn + interest,
      interestPart: interest,
      principalPart: amountToReturn,
      productId,
      description: `Closing ${type} Product`,
      performedBy: creator,
      branchId
    };
    setState(prev => {
      const newState = { ...prev, transactions: [tx, ...prev.transactions] };
      if (type === 'DPS') {
        newState.dps = prev.dps.map(d => d.id === productId ? { ...d, status: 'CLOSED' } : d);
      } else {
        newState.fdr = prev.fdr.map(f => f.id === productId ? { ...f, status: 'CLOSED' } : f);
      }
      return newState;
    });
    notify(`${type} Closed Successfully`);
  };

  const addTransaction = useCallback((tx: Omit<Transaction, 'id' | 'date' | 'branchId'>) => {
    setState(prev => {
      const newTx: Transaction = { ...tx, id: `tx_${Date.now()}`, date: new Date().toISOString(), branchId: prev.currentUser!.branchId };
      return { ...prev, transactions: [newTx, ...prev.transactions] };
    });
    notify("Transaction recorded");
  }, []);

  const addClient = (client: Omit<Client, 'id' | 'joinDate' | 'status' | 'branchId' | 'createdBy'>) => {
    setState(prev => ({ ...prev, clients: [...prev.clients, { ...client, id: `c_${Date.now()}`, joinDate: new Date().toISOString(), status: 'ACTIVE', branchId: prev.currentUser!.branchId, createdBy: prev.currentUser!.name }] }));
    notify("Client registered");
  };

  const addLoan = (loan: Omit<Loan, 'id' | 'startDate' | 'disbursed' | 'remainingPrincipal' | 'branchId' | 'createdBy'>) => {
    const loanId = `l_${Date.now()}`;
    const branchId = state.currentUser!.branchId;
    const creator = state.currentUser!.name;
    setState(prev => {
      const newLoan: Loan = { ...loan, id: loanId, startDate: new Date().toISOString(), disbursed: true, remainingPrincipal: loan.principal, branchId, createdBy: creator };
      const tx: Transaction = { id: `tx_loan_${Date.now()}`, date: new Date().toISOString(), type: TransactionType.DISBURSEMENT, amount: loan.principal, interestPart: 0, principalPart: 0, clientId: loan.clientId, productId: loanId, description: `Loan Disbursement`, performedBy: creator, branchId };
      return { ...prev, loans: [...prev.loans, newLoan], transactions: [tx, ...prev.transactions] };
    });
    notify("Loan disbursed");
  };

  const addDPS = (dpsData: Omit<DPS, 'id' | 'startDate' | 'status' | 'branchId' | 'createdBy'>) => {
    const dpsId = `dps_${Date.now()}`;
    const branchId = state.currentUser!.branchId;
    setState(prev => {
      const newDPS: DPS = { ...dpsData, id: dpsId, startDate: new Date().toISOString(), status: 'ACTIVE', branchId, createdBy: state.currentUser!.name };
      const tx: Transaction = { id: `tx_dps_${Date.now()}`, date: new Date().toISOString(), type: TransactionType.SAVINGS, amount: dpsData.monthlyAmount, interestPart: 0, principalPart: 0, clientId: dpsData.clientId, productId: dpsId, description: `Initial DPS Installment`, performedBy: state.currentUser!.name, branchId };
      return { ...prev, dps: [...prev.dps, newDPS], transactions: [tx, ...prev.transactions] };
    });
    notify("DPS opened");
  };

  const addFDR = (fdrData: Omit<FDR, 'id' | 'startDate' | 'status' | 'branchId' | 'createdBy'>) => {
    const fdrId = `fdr_${Date.now()}`;
    const branchId = state.currentUser!.branchId;
    setState(prev => {
      const newFDR: FDR = { ...fdrData, id: fdrId, startDate: new Date().toISOString(), status: 'ACTIVE', branchId, createdBy: state.currentUser!.name };
      const tx: Transaction = { id: `tx_fdr_${Date.now()}`, date: new Date().toISOString(), type: TransactionType.SAVINGS, amount: fdrData.depositAmount, interestPart: 0, principalPart: 0, clientId: fdrData.clientId, productId: fdrId, description: `FDR Initial Deposit`, performedBy: state.currentUser!.name, branchId };
      return { ...prev, fdr: [...prev.fdr, newFDR], transactions: [tx, ...prev.transactions] };
    });
    notify("FDR opened");
  };

  if (!state.currentUser) return <Login onLogin={handleLogin} />;

  const currentBranchName = activeBranchId === 'ALL' ? 'Consolidated (All Branches)' : (state.branches.find(b => b.id === activeBranchId)?.name || 'Unknown');

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isSyncing={isSyncing} userRole={state.currentUser.role} onLogout={handleLogout} />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">{activeTab}</h1>
            <div className="flex items-center space-x-2 text-slate-500 text-sm">
              <span className="font-bold text-indigo-600">{currentBranchName}</span>
              <span>•</span>
              <span>{state.currentUser.name}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {state.currentUser.role === UserRole.ADMIN && (
              <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-100 p-1">
                <span className="text-[10px] font-bold text-slate-400 px-3 uppercase">Viewing</span>
                <select value={adminBranchFilter} onChange={(e) => setAdminBranchFilter(e.target.value)} className="bg-slate-50 border-none rounded-lg text-xs px-3 py-1.5 font-bold text-indigo-600 focus:ring-0">
                  <option value="ALL">All Branches</option>
                  {state.branches.map(br => <option key={br.id} value={br.id}>{br.name}</option>)}
                </select>
              </div>
            )}
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Cash Balance</span>
              <span className="text-emerald-600 font-bold">{formatCurrency(filteredData.fund.availableCash)}</span>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && <Dashboard state={filteredData} />}
        {activeTab === 'clients' && <ClientManager clients={filteredData.clients} onAddClient={addClient} state={filteredData} />}
        {activeTab === 'products' && <ProductManagement state={filteredData} onAddLoan={addLoan} onAddDPS={addDPS} onAddFDR={addFDR} onAddTx={addTransaction} onCloseSavings={closeSavings} />}
        {activeTab === 'banking' && <BankManager state={filteredData} onAddBank={addBank} onBankTx={handleBankTx} />}
        {activeTab === 'ledger' && <TransactionLedger transactions={filteredData.transactions} state={filteredData} />}
        {activeTab === 'settings' && <AdminSettings state={state} setState={setState} />}
        {activeTab === 'ai' && <AIConsultant state={filteredData} />}

        {showNotification && (
          <div className="fixed bottom-8 right-8 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3 animate-bounce z-[60]">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            <span className="text-sm font-medium">{showNotification}</span>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
