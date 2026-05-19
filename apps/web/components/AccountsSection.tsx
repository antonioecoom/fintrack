'use client';

import React, { useState } from 'react';
import { useFinanceStore } from '../src/store/useFinanceStore';
import { AccountType } from '@repo/types';
import { AnimatedNumber } from './AnimatedNumber';
import { Trash2, Plus, X } from 'lucide-react';

export function AccountsSection() {
  const { accounts, createAccount, deleteAccount, loading } = useFinanceStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [balance, setBalance] = useState('0');
  const [currency, setCurrency] = useState('EUR');
  const [institutionName, setInstitutionName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAccount({
        name,
        type,
        balance: parseFloat(balance) || 0,
        currency,
        institution_name: institutionName || null,
      });
      setName('');
      setBalance('0');
      setInstitutionName('');
      setShowAddForm(false);
    } catch (err) {
      // Handled by store
    }
  };

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case 'bank': return 'Banco / Cuenta Corriente';
      case 'cash': return 'Efectivo';
      case 'broker': return 'Bróker / Inversiones';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <h2 className="text-lg font-medium text-textPrimary">Tus Cuentas</h2>
          <p className="text-xs text-textSecondary">Gestiona tus entidades financieras, efectivo y brokers</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-1.5 rounded border border-border bg-card px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-surface transition-colors"
        >
          <Plus size={14} />
          <span>Añadir Cuenta</span>
        </button>
      </div>

      {/* Add Account Modal Form */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
              <h3 className="text-sm font-medium text-textPrimary">Nueva Cuenta Financiera</h3>
              <button onClick={() => setShowAddForm(false)} className="text-textSecondary hover:text-textPrimary">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-medium text-textSecondary uppercase tracking-wider mb-1">Nombre de la Cuenta</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Cuenta Principal Santander"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-textSecondary uppercase tracking-wider mb-1">Tipo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AccountType)}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand transition-colors"
                  >
                    <option value="bank">Banco</option>
                    <option value="cash">Efectivo</option>
                    <option value="broker">Bróker / Inversión</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-textSecondary uppercase tracking-wider mb-1">Moneda</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand transition-colors"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-textSecondary uppercase tracking-wider mb-1">Saldo Inicial</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-textSecondary uppercase tracking-wider mb-1">Entidad (Opcional)</label>
                  <input
                    type="text"
                    placeholder="ej. Banco Santander"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
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
                  {loading ? 'Creando...' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="group relative rounded-lg border border-border bg-card p-5 hover:border-border/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-textSecondary uppercase tracking-wider">
                  {getAccountTypeLabel(account.type)}
                </span>
                <button
                  onClick={() => {
                    if (confirm(`¿Estás seguro de eliminar la cuenta "${account.name}"? Esto borrará todas sus transacciones vinculadas.`)) {
                      deleteAccount(account.id);
                    }
                  }}
                  className="text-textMuted hover:text-negative opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar Cuenta"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <h3 className="mt-1.5 text-sm font-medium text-textPrimary truncate">{account.name}</h3>
              {account.institution_name && (
                <p className="text-[11px] text-textMuted">{account.institution_name}</p>
              )}
            </div>

            <div className="mt-4 text-xl font-medium tracking-tight text-textPrimary">
              <AnimatedNumber value={Number(account.balance)} currency={account.currency} />
            </div>
          </div>
        ))}

        {accounts.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center border border-dashed border-border rounded-lg p-10 text-center">
            <p className="text-sm text-textSecondary">No tienes ninguna cuenta creada todavía.</p>
            <p className="text-xs text-textMuted mt-1">Crea una cuenta bancaria, efectivo o bróker para empezar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
