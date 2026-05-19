'use client';

import React, { useEffect, useState } from 'react';
import { useFinanceStore } from '../src/store/useFinanceStore';
import { AnimatedNumber } from './AnimatedNumber';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowDownLeft, ArrowUpRight, Wallet, Activity } from 'lucide-react';
import { formatCurrency } from '@repo/utils';

const COLORS = [
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#D946EF', // Fuchsia
  '#F43F5E', // Rose
  '#10B981', // Emerald
];

export function DashboardOverview() {
  const { accounts, transactions, fetchUserData } = useFinanceStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Calculate Net Worth (EUR equivalent)
  const netWorth = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  // 2. Get current month metrics
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const currentMonthTransactions = transactions.filter((t) => {
    const tDate = new Date(t.date);
    return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
  });

  const totalIncome = currentMonthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // 3. Aggregate expenses by category for Pie Chart
  const expenseByCategory = currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const chartData = Object.entries(expenseByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalChartExpenses = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Net Worth */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between text-textSecondary">
            <span className="text-xs font-medium uppercase tracking-wider">Patrimonio Neto</span>
            <Wallet size={16} className="text-textMuted" />
          </div>
          <div className="mt-2 text-2xl font-medium tracking-tight text-textPrimary">
            <AnimatedNumber value={netWorth} />
          </div>
          <p className="mt-1 text-[10px] text-textMuted">Suma total de todos tus saldos activos</p>
        </div>

        {/* Income */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between text-textSecondary">
            <span className="text-xs font-medium uppercase tracking-wider">Ingresos de {now.toLocaleDateString('es-ES', { month: 'long' })}</span>
            <ArrowDownLeft size={16} className="text-positive" />
          </div>
          <div className="mt-2 text-2xl font-medium tracking-tight text-positive">
            <AnimatedNumber value={totalIncome} />
          </div>
          <p className="mt-1 text-[10px] text-textMuted">Ingresos percibidos este mes corriente</p>
        </div>

        {/* Expenses */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between text-textSecondary">
            <span className="text-xs font-medium uppercase tracking-wider">Gastos de {now.toLocaleDateString('es-ES', { month: 'long' })}</span>
            <ArrowUpRight size={16} className="text-negative" />
          </div>
          <div className="mt-2 text-2xl font-medium tracking-tight text-negative">
            <AnimatedNumber value={totalExpense} />
          </div>
          <p className="mt-1 text-[10px] text-textMuted">Gastos registrados este mes corriente</p>
        </div>
      </div>

      {/* Main Grid: Doughnut chart & recent activity */}
      <div className="grid gap-6 md:grid-cols-5">
        
        {/* Doughnut Chart card */}
        <div className="rounded-lg border border-border bg-card p-5 md:col-span-2 flex flex-col">
          <h3 className="text-sm font-medium text-textPrimary mb-1">Distribución de Gastos</h3>
          <p className="text-[10px] text-textSecondary mb-4">Gastos clasificados por categorías este mes</p>
          
          <div className="flex-1 min-h-[220px] flex items-center justify-center">
            {mounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#161616" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#111111', border: '1px solid #222222', borderRadius: '4px', fontSize: '11px' }}
                    itemStyle={{ color: '#F3F4F6' }}
                    formatter={(value: number) => [formatCurrency(value), 'Gasto']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-10">
                <p className="text-xs text-textSecondary">Sin gastos registrados este mes</p>
              </div>
            )}
          </div>

          {/* Chart Legend */}
          {chartData.length > 0 && (
            <div className="mt-4 space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {chartData.slice(0, 5).map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-textSecondary">{item.name}</span>
                  </div>
                  <div className="font-medium text-textPrimary">
                    {formatCurrency(item.value)} 
                    <span className="text-[10px] text-textMuted ml-1.5">
                      ({Math.round((item.value / totalChartExpenses) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
              {chartData.length > 5 && (
                <p className="text-[10px] text-textMuted text-right">
                  + {chartData.length - 5} categorías más
                </p>
              )}
            </div>
          )}
        </div>

        {/* Recent Activity card */}
        <div className="rounded-lg border border-border bg-card p-5 md:col-span-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-textPrimary">Actividad Reciente</h3>
              <Activity size={14} className="text-textMuted" />
            </div>
            <p className="text-[10px] text-textSecondary mb-4">Tus últimos 5 movimientos registrados</p>

            <div className="divide-y divide-border/20">
              {transactions.slice(0, 5).map((t) => {
                const isIncome = t.type === 'income';
                const isTransfer = t.type === 'transfer';
                const account = accounts.find((a) => a.id === t.account_id);
                
                return (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-xs font-medium text-textPrimary truncate max-w-[200px]">{t.description || 'Sin concepto'}</div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="text-[10px] text-textSecondary">{t.category}</span>
                        <span className="text-[10px] text-textMuted">•</span>
                        <span className="text-[10px] text-textMuted">{account?.name || 'Cuenta'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-medium ${isIncome ? 'text-positive' : isTransfer ? 'text-brand' : 'text-textPrimary'}`}>
                        {isIncome ? '+' : isTransfer ? '' : '-'}{formatCurrency(Number(t.amount), account?.currency || 'EUR')}
                      </div>
                      <div className="text-[9px] text-textMuted mt-0.5">
                        {new Date(t.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {transactions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-xs text-textSecondary">Aún no hay transacciones registradas.</p>
                  <p className="text-[10px] text-textMuted mt-0.5">Ve a Movimientos para añadir tu primera transacción.</p>
                </div>
              )}
            </div>
          </div>

          {transactions.length > 5 && (
            <div className="text-center border-t border-border/40 pt-3">
              <span className="text-[11px] text-brand font-medium">
                Visualizando los movimientos más recientes
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
