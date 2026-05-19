'use client';

import React, { useEffect, useState } from 'react';
import { useFinanceStore } from '../../src/store/useFinanceStore';
import { createClient } from '../../src/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { DashboardOverview } from '../../components/DashboardOverview';
import { AccountsSection } from '../../components/AccountsSection';
import { TransactionsSection } from '../../components/TransactionsSection';
import { AdvisorChat } from '../../components/AdvisorChat';
import { AdvisorAnalysis } from '../../components/AdvisorAnalysis';
import { LayoutDashboard, Wallet, ArrowRightLeft, MessageSquareText, Sparkles, LogOut, Loader2 } from 'lucide-react';

type TabType = 'overview' | 'accounts' | 'transactions' | 'chat' | 'analysis';

export default function DashboardPage() {
  const { profile, fetchUserData, loading, clearStore } = useFinanceStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [initializing, setInitializing] = useState(true);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth');
          return;
        }
        await fetchUserData();
      } catch (err) {
        console.error('Error initializing user:', err);
      } finally {
        setInitializing(false);
      }
    }
    init();
  }, [fetchUserData, router, supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearStore();
    router.push('/auth');
  };

  if (initializing || (loading && !profile)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 size={32} className="animate-spin text-brand" />
        <p className="mt-4 text-sm text-textSecondary">Cargando tu panel de finanzas...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full border-b border-border bg-surface px-4 py-4 md:w-64 md:border-b-0 md:border-r md:px-6 md:py-8 flex flex-col justify-between">
        <div className="space-y-8">
          {/* Logo / Header */}
          <div className="flex items-center space-x-2 px-2">
            <span className="text-xl font-medium tracking-tight text-textPrimary">FinTrack</span>
            <span className="rounded bg-brand/10 border border-brand/20 px-1.5 py-0.5 text-[9px] font-medium text-brand">Asesor IA</span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex w-full items-center space-x-3 rounded px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-card text-brand border border-border/60'
                  : 'text-textSecondary hover:bg-card/55 hover:text-textPrimary'
              }`}
            >
              <LayoutDashboard size={15} />
              <span>Resumen General</span>
            </button>

            <button
              onClick={() => setActiveTab('accounts')}
              className={`flex w-full items-center space-x-3 rounded px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'accounts'
                  ? 'bg-card text-brand border border-border/60'
                  : 'text-textSecondary hover:bg-card/55 hover:text-textPrimary'
              }`}
            >
              <Wallet size={15} />
              <span>Cuentas</span>
            </button>

            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex w-full items-center space-x-3 rounded px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'transactions'
                  ? 'bg-card text-brand border border-border/60'
                  : 'text-textSecondary hover:bg-card/55 hover:text-textPrimary'
              }`}
            >
              <ArrowRightLeft size={15} />
              <span>Movimientos</span>
            </button>

            <div className="pt-4 pb-2 px-3 text-[10px] font-medium text-textMuted uppercase tracking-wider">Asesor IA</div>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex w-full items-center space-x-3 rounded px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'bg-card text-brand border border-border/60'
                  : 'text-textSecondary hover:bg-card/55 hover:text-textPrimary'
              }`}
            >
              <MessageSquareText size={15} />
              <span>Preguntar al Asesor</span>
            </button>

            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex w-full items-center space-x-3 rounded px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'analysis'
                  ? 'bg-card text-brand border border-border/60'
                  : 'text-textSecondary hover:bg-card/55 hover:text-textPrimary'
              }`}
            >
              <Sparkles size={15} />
              <span>Análisis Mensual</span>
            </button>
          </nav>
        </div>

        {/* User Footer / Logout */}
        <div className="border-t border-border/40 pt-4 mt-6 md:mt-0 flex items-center justify-between">
          <div className="flex flex-col truncate px-2">
            <span className="text-xs font-medium text-textPrimary truncate">
              {profile?.full_name || profile?.email || 'Usuario'}
            </span>
            <span className="text-[10px] text-textMuted uppercase mt-0.5">
              Moneda: {profile?.base_currency || 'EUR'}
            </span>
          </div>
          
          <button
            onClick={handleLogout}
            className="text-textMuted hover:text-negative p-1.5 rounded hover:bg-card transition-all"
            title="Cerrar Sesión"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12 bg-background">
        <div className="mx-auto max-w-5xl">
          {activeTab === 'overview' && <DashboardOverview />}
          {activeTab === 'accounts' && <AccountsSection />}
          {activeTab === 'transactions' && <TransactionsSection />}
          {activeTab === 'chat' && <AdvisorChat />}
          {activeTab === 'analysis' && <AdvisorAnalysis />}
        </div>
      </main>

    </div>
  );
}
