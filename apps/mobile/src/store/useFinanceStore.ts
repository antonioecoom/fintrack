import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { Account, Transaction, Profile } from '@repo/types';

interface FinanceState {
  profile: Profile | null;
  accounts: Account[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchUserData: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  
  createAccount: (account: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  
  createTransaction: (transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  clearStore: () => void;
}

export const useFinanceStore = create<FinanceState>((set, get) => {
  return {
    profile: null,
    accounts: [],
    transactions: [],
    loading: false,
    error: null,

    fetchUserData: async () => {
      set({ loading: true, error: null });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuario no autenticado');

        // Fetch Profile
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .single();

        if (profileErr) throw profileErr;

        set({ profile });
        
        // Fetch accounts and transactions
        await get().fetchAccounts();
        await get().fetchTransactions();
      } catch (err: any) {
        set({ error: err.message || 'Error al cargar datos' });
      } finally {
        set({ loading: false });
      }
    },

    fetchAccounts: async () => {
      try {
        const { data: accounts, error } = await supabase
          .from('accounts')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        set({ accounts: accounts || [] });
      } catch (err: any) {
        set({ error: err.message || 'Error al obtener cuentas' });
      }
    },

    fetchTransactions: async () => {
      try {
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false });

        if (error) throw error;
        set({ transactions: transactions || [] });
      } catch (err: any) {
        set({ error: err.message || 'Error al obtener transacciones' });
      }
    },

    createAccount: async (account) => {
      set({ loading: true, error: null });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuario no autenticado');

        const { error } = await supabase
          .from('accounts')
          .insert([{ ...account, user_id: user.id }]);

        if (error) throw error;
        await get().fetchAccounts();
      } catch (err: any) {
        set({ error: err.message || 'Error al crear cuenta' });
        throw err;
      } finally {
        set({ loading: false });
      }
    },

    deleteAccount: async (id) => {
      set({ loading: true, error: null });
      try {
        const { error } = await supabase
          .from('accounts')
          .delete()
          .eq('id', id);

        if (error) throw error;
        await get().fetchAccounts();
        await get().fetchTransactions();
      } catch (err: any) {
        set({ error: err.message || 'Error al eliminar cuenta' });
        throw err;
      } finally {
        set({ loading: false });
      }
    },

    createTransaction: async (transaction) => {
      set({ loading: true, error: null });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuario no autenticado');

        const { error } = await supabase
          .from('transactions')
          .insert([{ ...transaction, user_id: user.id }]);

        if (error) throw error;
        await get().fetchTransactions();
        await get().fetchAccounts();
      } catch (err: any) {
        set({ error: err.message || 'Error al crear transacción' });
        throw err;
      } finally {
        set({ loading: false });
      }
    },

    deleteTransaction: async (id) => {
      set({ loading: true, error: null });
      try {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);

        if (error) throw error;
        await get().fetchTransactions();
        await get().fetchAccounts();
      } catch (err: any) {
        set({ error: err.message || 'Error al eliminar transacción' });
        throw err;
      } finally {
        set({ loading: false });
      }
    },

    clearStore: () => {
      set({ profile: null, accounts: [], transactions: [], error: null });
    }
  };
});
