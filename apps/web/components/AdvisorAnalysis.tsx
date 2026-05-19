'use client';

import React, { useState } from 'react';
import { useFinanceStore } from '../src/store/useFinanceStore';
import { Sparkles, Calendar, Loader2 } from 'lucide-react';

export function AdvisorAnalysis() {
  const { accounts, transactions } = useFinanceStore();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  // Month and Year selector state (default to current month)
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const generateReport = async () => {
    setLoading(true);
    setReport(null);

    try {
      const summary = {
        accounts: accounts.map(a => ({ name: a.name, type: a.type, balance: a.balance, currency: a.currency })),
        transactions: transactions.map(t => ({ amount: t.amount, type: t.type, category: t.category, description: t.description, date: t.date })),
      };

      const response = await fetch('/api/advisor/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          year,
          userSummary: summary,
        }),
      });

      if (!response.ok) throw new Error('Error al generar informe');

      const data = await response.json();
      setReport(data.analysis);
    } catch (err) {
      setReport('Ocurrió un error al intentar generar tu informe mensual por IA. Por favor, asegúrate de tener transacciones registradas e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (m: number): string => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[m] || '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h2 className="text-lg font-medium text-textPrimary">Análisis de Patrones</h2>
          <p className="text-xs text-textSecondary">Genera informes inteligentes mensuales de ingresos, gastos y ahorros</p>
        </div>
      </div>

      {/* Selectors and Action */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-border bg-card">
        <div className="flex items-center space-x-2">
          <Calendar size={14} className="text-textSecondary" />
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-textPrimary outline-none focus:border-brand transition-colors"
          >
            {Array.from({ length: 12 }).map((_, idx) => (
              <option key={idx} value={idx}>{getMonthName(idx)}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-textPrimary outline-none focus:border-brand transition-colors"
          >
            {Array.from({ length: 5 }).map((_, idx) => {
              const y = now.getFullYear() - 2 + idx;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>

        <button
          onClick={generateReport}
          disabled={loading}
          className="flex items-center space-x-1.5 rounded bg-brand px-4 py-1.5 text-xs font-medium text-white hover:bg-brandHover transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Analizando...</span>
            </>
          ) : (
            <>
              <Sparkles size={13} />
              <span>Generar Informe IA</span>
            </>
          )}
        </button>
      </div>

      {/* Report Markdown Display */}
      {report && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-6 prose prose-invert prose-xs max-w-none text-xs">
          <div className="text-textPrimary whitespace-pre-wrap leading-relaxed">
            {report.split('\n').map((line, idx) => {
              // Custom basic markdown parsing for display in react
              if (line.startsWith('# ')) {
                return <h1 key={idx} className="text-base font-medium border-b border-border/40 pb-2 mt-4 mb-2 text-textPrimary">{line.substring(2)}</h1>;
              }
              if (line.startsWith('## ')) {
                return <h2 key={idx} className="text-sm font-medium mt-4 mb-2 text-textPrimary">{line.substring(3)}</h2>;
              }
              if (line.startsWith('- ')) {
                return <li key={idx} className="ml-4 list-disc text-textSecondary">{line.substring(2)}</li>;
              }
              if (line.trim() === '---') {
                return <hr key={idx} className="border-t border-border/40 my-4" />;
              }
              if (line.startsWith('*Aviso')) {
                return <p key={idx} className="text-[10px] text-textMuted leading-relaxed italic">{line.replace(/\*/g, '')}</p>;
              }
              return line.trim() ? <p key={idx} className="text-textSecondary mb-2">{line}</p> : <div key={idx} className="h-2" />;
            })}
          </div>
        </div>
      )}

      {loading && !report && (
        <div className="flex flex-col items-center justify-center border border-dashed border-border rounded-lg p-16 text-center">
          <Loader2 size={24} className="animate-spin text-brand mb-3" />
          <p className="text-xs text-textSecondary">Claude está revisando tu historial de movimientos...</p>
          <p className="text-[10px] text-textMuted mt-0.5">Esto puede tardar unos segundos.</p>
        </div>
      )}

      {!report && !loading && (
        <div className="flex flex-col items-center justify-center border border-dashed border-border rounded-lg p-16 text-center">
          <Sparkles size={24} className="text-textMuted mb-2" />
          <p className="text-xs text-textSecondary">No se ha generado ningún informe aún.</p>
          <p className="text-[10px] text-textMuted mt-0.5">Elige un mes y haz clic en "Generar Informe IA" para iniciar el análisis.</p>
        </div>
      )}
    </div>
  );
}
