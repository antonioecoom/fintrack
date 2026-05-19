'use client';

import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../src/store/useFinanceStore';
import { TransactionType } from '@repo/types';
import { AnimatedNumber } from './AnimatedNumber';
import { Trash2, Plus, X, Search, Sparkles, AlertCircle, ArrowUpRight, ArrowDownLeft, ArrowRightLeft } from 'lucide-react';
import { formatCurrency } from '@repo/utils';

export function TransactionsSection() {
  const { accounts, transactions, createTransaction, deleteTransaction, loading } = useFinanceStore();
  const [showAddForm, setShowAddForm] = useState(false);

  // Form Fields
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(() => {
    const parts = new Date().toISOString().split('T');
    return parts[0] || '';
  });
  const [isPending, setIsPending] = useState(false);

  // AI Categorization State
  const [aiCategorizing, setAiCategorizing] = useState(false);
  const [aiResult, setAiResult] = useState<{ confidence: number; reasoning: string } | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Trigger default account selection
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      const firstAcc = accounts[0];
      if (firstAcc) {
        setAccountId(firstAcc.id);
      }
      const secondAcc = accounts[1];
      if (secondAcc) {
        setToAccountId(secondAcc.id);
      }
    }
  }, [accounts, accountId]);

  // AI Categorization trigger when description and amount are present
  const triggerAICategorization = async () => {
    if (!description || !amount || parseFloat(amount) <= 0) return;
    
    setAiCategorizing(true);
    setAiResult(null);
    try {
      const summary = {
        accounts: accounts.map(a => ({ id: a.id, name: a.name, type: a.type, balance: a.balance, currency: a.currency })),
        recent_categories: Array.from(new Set(transactions.map(t => t.category))).slice(0, 10),
      };

      const response = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amount: parseFloat(amount),
          type,
          userSummary: summary,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.category) {
          setCategory(data.category);
          setAiResult({
            confidence: data.confidence,
            reasoning: data.reasoning,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching AI categorization:', err);
    } finally {
      setAiCategorizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;

    try {
      await createTransaction({
        account_id: accountId,
        to_account_id: type === 'transfer' ? toAccountId : null,
        amount: parseFloat(amount) || 0,
        type,
        category: category || 'Otros Gastos',
        description: description || null,
        date,
        is_pending: isPending,
      });

      // Clear Form
      setAmount('');
      setDescription('');
      setCategory('');
      setAiResult(null);
      setShowAddForm(false);
    } catch (err) {
      // Handled by store
    }
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());
    const matchesAccount =
      filterAccount === 'all' || t.account_id === filterAccount || t.to_account_id === filterAccount;
    const matchesType = filterType === 'all' || t.type === filterType;

    return matchesSearch && matchesAccount && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h2 className="text-lg font-medium text-textPrimary">Movimientos</h2>
          <p className="text-xs text-textSecondary">Registra, categoriza y mantén al día tus transacciones</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center self-start sm:self-center space-x-1.5 rounded border border-border bg-card px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-surface transition-colors"
        >
          <Plus size={14} />
          <span>Añadir Transacción</span>
        </button>
      </div>

      {/* Add Transaction Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
              <h3 className="text-sm font-medium text-textPrimary">Nueva Transacción</h3>
              <button onClick={() => setShowAddForm(false)} className="text-textSecondary hover:text-textPrimary">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Select */}
              <div className="grid grid-cols-3 gap-2 p-1 rounded bg-card border border-border">
                {(['expense', 'income', 'transfer'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setType(t); setCategory(''); setAiResult(null); }}
                    className={`rounded py-1 text-xs font-medium capitalize transition-colors ${
                      type === t ? 'bg-surface text-textPrimary border border-border/60' : 'text-textSecondary hover:text-textPrimary'
                    }`}
                  >
                    {t === 'expense' ? 'Gasto' : t === 'income' ? 'Ingreso' : 'Traspaso'}
                  </button>
                ))}
              </div>

              {/* Accounts Select */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-textSecondary uppercase tracking-wider mb-1">
                    {type === 'transfer' ? 'Desde Cuenta' : 'Cuenta'}
                  </label>
                  <select
                    value={accountId}
                    required
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand transition-colors"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                {type === 'transfer' && (
                  <div>
                    <label className="block text-[10px] font-medium text-textSecondary uppercase tracking-wider mb-1">Hacia Cuenta</label>
                    <select
                      value={toAccountId}
                      required
                      onChange={(e) => setToAccountId(e.target.value)}
                      className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand transition-colors"
                    >
                      {accounts.filter(a => a.id !== accountId).map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-textSecondary uppercase tracking-wider mb-1">Importe (EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onBlur={triggerAICategorization}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-textSecondary uppercase tracking-wider mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand transition-colors"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-medium text-textSecondary uppercase tracking-wider mb-1">Concepto / Descripción</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="ej. Compra semanal Mercadona"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={triggerAICategorization}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={triggerAICategorization}
                    disabled={aiCategorizing || !description}
                    className="absolute right-2 top-2 text-textSecondary hover:text-brand transition-colors disabled:opacity-40"
                    title="Categorizar con Claude AI"
                  >
                    <Sparkles size={16} className={aiCategorizing ? 'animate-pulse text-brand' : ''} />
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-medium text-textSecondary uppercase tracking-wider">Categoría</label>
                  {aiResult && (
                    <span className="flex items-center text-[10px] text-positive font-medium space-x-0.5">
                      <Sparkles size={10} />
                      <span>Confianza: {Math.round(aiResult.confidence * 100)}%</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="ej. Alimentación, Transporte, Ocio..."
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setAiResult(null); // Clear AI label since user is typing manually
                  }}
                  className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand transition-colors"
                />
                {aiResult && (
                  <p className="mt-1 text-[10px] text-textSecondary leading-normal">
                    💡 <em>{aiResult.reasoning}</em>
                  </p>
                )}
              </div>

              {/* Pending and Submit */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPending}
                    onChange={(e) => setIsPending(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-card text-brand focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-xs text-textSecondary">Pendiente de consolidar</span>
                </label>
                
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded border border-border bg-transparent px-4 py-2 text-xs font-medium text-textSecondary hover:text-textPrimary hover:bg-card transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded bg-brand px-4 py-2 text-xs font-medium text-white hover:bg-brandHover transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Creando...' : 'Crear'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter and search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-2.5 text-textMuted" />
          <input
            type="text"
            placeholder="Buscar por concepto o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-border bg-card pl-9 pr-4 py-2 text-xs text-textPrimary outline-none focus:border-border/80 transition-colors"
          />
        </div>

        {/* Account Filter */}
        <select
          value={filterAccount}
          onChange={(e) => setFilterAccount(e.target.value)}
          className="rounded border border-border bg-card px-3 py-2 text-xs text-textPrimary outline-none hover:border-border/80 transition-colors"
        >
          <option value="all">Todas las cuentas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded border border-border bg-card px-3 py-2 text-xs text-textPrimary outline-none hover:border-border/80 transition-colors"
        >
          <option value="all">Todos los tipos</option>
          <option value="expense">Gastos</option>
          <option value="income">Ingresos</option>
          <option value="transfer">Traspasos</option>
        </select>
      </div>

      {/* Transaction List */}
      <div className="border border-border/80 rounded-lg overflow-hidden bg-card">
        <table className="min-w-full divide-y divide-border/40 text-left text-xs">
          <thead>
            <tr className="bg-surface/50 text-textSecondary uppercase tracking-wider text-[10px] font-medium border-b border-border/40">
              <th className="px-4 py-3">Concepto / Categoría</th>
              <th className="px-4 py-3">Cuenta</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Importe</th>
              <th className="px-4 py-3 text-right w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20 text-textPrimary">
            {filteredTransactions.map((t) => {
              const account = accounts.find((a) => a.id === t.account_id);
              const toAccount = t.to_account_id ? accounts.find((a) => a.id === t.to_account_id) : null;
              
              const isIncome = t.type === 'income';
              const isTransfer = t.type === 'transfer';
              
              return (
                <tr key={t.id} className="hover:bg-surface/30 transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center space-x-3">
                      {/* Icon type */}
                      <div className={`p-1.5 rounded-full ${
                        isIncome ? 'bg-positive/10 text-positive' : isTransfer ? 'bg-brand/10 text-brand' : 'bg-negative/10 text-negative'
                      }`}>
                        {isIncome ? <ArrowDownLeft size={14} /> : isTransfer ? <ArrowRightLeft size={14} /> : <ArrowUpRight size={14} />}
                      </div>
                      <div>
                        <div className="font-medium text-textPrimary truncate max-w-[180px]">{t.description || 'Sin concepto'}</div>
                        <div className="text-[10px] text-textSecondary mt-0.5">{t.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-textSecondary">
                    {isTransfer ? (
                      <span className="flex items-center space-x-1">
                        <span>{account?.name}</span>
                        <span>→</span>
                        <span>{toAccount?.name}</span>
                      </span>
                    ) : (
                      account?.name || 'Desconocido'
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-textSecondary">
                    {new Date(t.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium border ${
                      t.is_pending 
                        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' 
                        : 'bg-positive/10 text-positive border-positive/20'
                    }`}>
                      {t.is_pending ? 'Pendiente' : 'Consolidado'}
                    </span>
                  </td>
                  <td className={`px-4 py-3.5 text-right font-medium text-sm ${
                    isIncome ? 'text-positive' : isTransfer ? 'text-brand' : 'text-negative'
                  }`}>
                    {isIncome ? '+' : isTransfer ? '' : '-'}{formatCurrency(Number(t.amount), account?.currency || 'EUR')}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => {
                        if (confirm('¿Seguro que deseas eliminar esta transacción?')) {
                          deleteTransaction(t.id);
                        }
                      }}
                      className="text-textMuted hover:text-negative opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar Transacción"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-textSecondary">
                  No se encontraron transacciones con los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
