export type BaseCurrency = 'EUR' | 'USD' | 'GBP';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  base_currency: BaseCurrency;
  created_at: string;
  updated_at: string;
}

export type AccountType = 'bank' | 'cash' | 'broker';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  institution_name: string | null;
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  to_account_id: string | null;
  amount: number;
  type: TransactionType;
  category: string;
  description: string | null;
  date: string; // YYYY-MM-DD
  is_pending: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategorizationResult {
  category: string;
  confidence: number; // 0 to 1
  reasoning: string;
}

export interface UserFinancialSummary {
  accounts: {
    id: string;
    name: string;
    type: AccountType;
    balance: number;
    currency: string;
  }[];
  recent_categories: string[];
}
