import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, G } from 'react-native-svg';
import { supabase } from './src/utils/supabase';
import { useFinanceStore } from './src/store/useFinanceStore';
import { Account, Transaction, AccountType, TransactionType } from '@repo/types';
import { formatCurrency } from '@repo/utils';

type ActiveTabType = 'overview' | 'accounts' | 'transactions' | 'advisor';
type AdvisorTabType = 'chat' | 'analysis';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  // Dashboard states
  const { profile, accounts, transactions, fetchUserData, createAccount, createTransaction, deleteTransaction, clearStore } = useFinanceStore();
  const [activeTab, setActiveTab] = useState<ActiveTabType>('overview');
  
  // Advisor states
  const [advisorTab, setAdvisorTab] = useState<AdvisorTabType>('chat');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '¡Hola! Soy tu Asesor FinTrack. ¿Qué consulta deseas hacer hoy?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const [analysisMonth, setAnalysisMonth] = useState(new Date().getMonth());
  const [analysisYear, setAnalysisYear] = useState(new Date().getFullYear());
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);

  // Modals
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  // New Account fields
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('bank');
  const [accBalance, setAccBalance] = useState('0');
  const [accCurrency, setAccCurrency] = useState('EUR');

  // New Transaction fields
  const [txAccountId, setTxAccountId] = useState('');
  const [txToAccountId, setTxToAccountId] = useState('');
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txCategory, setTxCategory] = useState('');
  const [txIsPending, setTxIsPending] = useState(false);

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserData();
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserData();
      } else {
        clearStore();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getBackendUrl = () => {
    // Resolves localhost appropriately for Android emulators vs iOS
    if (process.env.EXPO_PUBLIC_API_URL) {
      return process.env.EXPO_PUBLIC_API_URL;
    }
    return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
  };

  const handleAuth = async () => {
    setAuthError('');
    setAuthMessage('');
    setAuthLoading(true);

    try {
      if (useMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
        });
        if (error) throw error;
        setAuthMessage('¡Enlace de acceso enviado por correo!');
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setAuthMessage('Registro completado. Ya puedes iniciar sesión.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error en la autenticación');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleAddAccountSubmit = async () => {
    if (!accName.trim()) return;
    try {
      await createAccount({
        name: accName,
        type: accType,
        balance: parseFloat(accBalance) || 0,
        currency: accCurrency,
        institution_name: null,
      });
      setAccName('');
      setAccBalance('0');
      setShowAddAccount(false);
    } catch (err) {
      Alert.alert('Error', 'No se pudo crear la cuenta');
    }
  };

  const handleAddTransactionSubmit = async () => {
    if (!txAccountId || !txAmount) return;
    try {
      await createTransaction({
        account_id: txAccountId,
        to_account_id: txType === 'transfer' ? txToAccountId : null,
        amount: parseFloat(txAmount) || 0,
        type: txType,
        category: txCategory.trim() || 'Otros Gastos',
        description: txDescription.trim() || null,
        date: new Date().toISOString().split('T')[0],
        is_pending: txIsPending,
      });
      setTxAmount('');
      setTxDescription('');
      setTxCategory('');
      setShowAddTransaction(false);
    } catch (err) {
      Alert.alert('Error', 'No se pudo crear la transacción');
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userText = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userText }]);
    setChatLoading(true);

    try {
      const summary = {
        accounts: accounts.map(a => ({ name: a.name, type: a.type, balance: a.balance, currency: a.currency })),
        transactions: transactions.map(t => ({ amount: t.amount, type: t.type, category: t.category, description: t.description, date: t.date })),
      };

      const response = await fetch(`${getBackendUrl()}/api/advisor/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, { role: 'user', content: userText }],
          userSummary: summary,
        }),
      });

      if (!response.ok) throw new Error();

      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Disculpa, no he podido conectar con el backend de FinTrack.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisReport(null);

    try {
      const summary = {
        accounts: accounts.map(a => ({ name: a.name, type: a.type, balance: a.balance, currency: a.currency })),
        transactions: transactions.map(t => ({ amount: t.amount, type: t.type, category: t.category, description: t.description, date: t.date })),
      };

      const response = await fetch(`${getBackendUrl()}/api/advisor/analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: analysisMonth,
          year: analysisYear,
          userSummary: summary,
        }),
      });

      if (!response.ok) throw new Error();

      const data = await response.json();
      setAnalysisReport(data.analysis);
    } catch (err) {
      setAnalysisReport('No se pudo generar el informe. Asegúrate de que el backend de FinTrack esté levantado.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Pre-fill default account for transactions
  useEffect(() => {
    if (accounts.length > 0 && !txAccountId) {
      setTxAccountId(accounts[0].id);
      if (accounts[1]) setTxToAccountId(accounts[1].id);
    }
  }, [accounts, showAddTransaction]);

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>FinTrack se está cargando...</Text>
      </View>
    );
  }

  // --- 1. AUTH SCREEN ---
  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.authWrapper}>
          <Text style={styles.logoTitle}>FinTrack</Text>
          <Text style={styles.logoSubtitle}>
            {useMagicLink ? 'Enlace mágico sin contraseña' : isSignUp ? 'Registra tu nueva cuenta' : 'Inicia sesión en tus finanzas'}
          </Text>

          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
          {authMessage ? <Text style={styles.successText}>{authMessage}</Text> : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="nombre@ejemplo.com"
              placeholderTextColor="#6B7280"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {!useMagicLink && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#6B7280"
                secureTextEntry
                style={styles.input}
                autoCapitalize="none"
              />
            </View>
          )}

          <TouchableOpacity style={styles.primaryButton} onPress={handleAuth}>
            <Text style={styles.primaryButtonText}>
              {useMagicLink ? 'Enviar Enlace Mágico' : isSignUp ? 'Registrarse' : 'Entrar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              if (useMagicLink) {
                setUseMagicLink(false);
              } else {
                setIsSignUp(!isSignUp);
              }
            }}
          >
            <Text style={styles.linkButtonText}>
              {useMagicLink ? 'Volver al inicio clásico' : isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </Text>
          </TouchableOpacity>

          {!isSignUp && (
            <TouchableOpacity style={styles.linkButton} onPress={() => setUseMagicLink(!useMagicLink)}>
              <Text style={[styles.linkButtonText, { color: '#6366F1' }]}>
                {useMagicLink ? 'Usar email y contraseña' : 'Entrar con Enlace Mágico'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.legalDisclaimer}>
            FinTrack es una herramienta de análisis financiero personal. Toda la información y recomendaciones proporcionadas tienen carácter exclusivamente informativo y no constituyen asesoramiento financiero.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- 2. MAIN DASHBOARD SCREEN ---
  const netWorth = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  
  // Aggregate expenses for custom SVG chart
  const expenseByCategory = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const chartData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));
  const totalExpenses = chartData.reduce((sum, c) => sum + c.value, 0);

  const COLORS = ['#6366F1', '#14B8A6', '#EC4899', '#F59E0B', '#3B82F6', '#8B5CF6'];

  // SVG Donut layout variables
  const radius = 40;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  const getMonthName = (m: number): string => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[m] || '';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FinTrack</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* TAB NAVIGATION */}
        <View style={styles.tabsContainer}>
          {(['overview', 'accounts', 'transactions', 'advisor'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'overview' ? 'Resumen' : tab === 'accounts' ? 'Cuentas' : tab === 'transactions' ? 'Movimientos' : 'Asesor IA'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Patrimony Card */}
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Patrimonio Neto</Text>
              <Text style={styles.metricValue}>{formatCurrency(netWorth)}</Text>
            </View>

            {/* Custom SVG Donut Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.cardHeaderTitle}>Gastos por Categoría</Text>
              {chartData.length > 0 ? (
                <View style={styles.chartWrapper}>
                  <View style={styles.svgContainer}>
                    <Svg width="120" height="120" viewBox="0 0 100 100">
                      <G rotation="-90" origin="50, 50">
                        {chartData.map((item, idx) => {
                          const percentage = (item.value / totalExpenses) * 100;
                          const strokeOffset = circumference - (percentage / 100) * circumference;
                          const currentOffset = strokeOffset;
                          const currentRotation = accumulatedAngle;
                          accumulatedAngle += (percentage / 100) * 360;

                          return (
                            <Circle
                              key={item.name}
                              cx="50"
                              cy="50"
                              r={radius}
                              stroke={COLORS[idx % COLORS.length]}
                              strokeWidth={strokeWidth}
                              strokeDasharray={circumference}
                              strokeDashoffset={currentOffset}
                              origin="50, 50"
                              rotation={currentRotation}
                              fill="transparent"
                            />
                          );
                        })}
                      </G>
                    </Svg>
                  </View>
                  
                  {/* Chart Legend */}
                  <View style={styles.legendContainer}>
                    {chartData.slice(0, 4).map((item, idx) => (
                      <View key={item.name} style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: COLORS[idx % COLORS.length] }]} />
                        <Text style={styles.legendText} numberOfLines={1}>
                          {item.name}: {formatCurrency(item.value)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={styles.noDataText}>No hay gastos registrados este mes.</Text>
              )}
            </View>

            {/* Recent list */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeaderTitle}>Actividad Reciente</Text>
              {transactions.slice(0, 4).map((t) => {
                const account = accounts.find(a => a.id === t.account_id);
                return (
                  <View key={t.id} style={styles.listItem}>
                    <View>
                      <Text style={styles.listDesc}>{t.description || 'Sin concepto'}</Text>
                      <Text style={styles.listSub}>{t.category} • {account?.name}</Text>
                    </View>
                    <Text style={[styles.listAmount, t.type === 'income' ? styles.incomeText : styles.expenseText]}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </Text>
                  </View>
                );
              })}
              {transactions.length === 0 && <Text style={styles.noDataText}>No hay movimientos registrados.</Text>}
            </View>
          </View>
        )}

        {/* --- ACCOUNTS TAB --- */}
        {activeTab === 'accounts' && (
          <View style={styles.tabContent}>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddAccount(true)}>
              <Text style={styles.addBtnText}>+ Añadir Cuenta</Text>
            </TouchableOpacity>

            {accounts.map((acc) => (
              <View key={acc.id} style={styles.accountCard}>
                <View style={styles.accountCardHeader}>
                  <Text style={styles.accountName}>{acc.name}</Text>
                  <Text style={styles.accountType}>{acc.type.toUpperCase()}</Text>
                </View>
                <Text style={styles.accountBalance}>{formatCurrency(acc.balance, acc.currency)}</Text>
              </View>
            ))}

            {accounts.length === 0 && <Text style={styles.noDataText}>No tienes cuentas creadas.</Text>}
          </View>
        )}

        {/* --- TRANSACTIONS TAB --- */}
        {activeTab === 'transactions' && (
          <View style={styles.tabContent}>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddTransaction(true)}>
              <Text style={styles.addBtnText}>+ Nueva Transacción</Text>
            </TouchableOpacity>

            {transactions.map((t) => {
              const account = accounts.find(a => a.id === t.account_id);
              return (
                <View key={t.id} style={styles.listItemLarge}>
                  <View style={styles.listItemLeft}>
                    <Text style={styles.listDesc}>{t.description || 'Sin concepto'}</Text>
                    <Text style={styles.listSub}>{t.category} • {account?.name} • {t.date}</Text>
                  </View>
                  <View style={styles.listItemRight}>
                    <Text style={[styles.listAmount, t.type === 'income' ? styles.incomeText : styles.expenseText]}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert('Confirmación', '¿Seguro que deseas eliminar este movimiento?', [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Eliminar', style: 'destructive', onPress: () => deleteTransaction(t.id) }
                        ]);
                      }}
                    >
                      <Text style={styles.deleteLink}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {transactions.length === 0 && <Text style={styles.noDataText}>No hay movimientos registrados.</Text>}
          </View>
        )}

        {/* --- AI ADVISOR TAB --- */}
        {activeTab === 'advisor' && (
          <View style={styles.tabContent}>
            {/* Sub Tabs */}
            <View style={styles.subTabsContainer}>
              {(['chat', 'analysis'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.subTab, advisorTab === tab && styles.activeSubTab]}
                  onPress={() => setAdvisorTab(tab)}
                >
                  <Text style={[styles.subTabText, advisorTab === tab && styles.activeSubTabText]}>
                    {tab === 'chat' ? 'Preguntas' : 'Informe Mensual'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Chat View */}
            {advisorTab === 'chat' && (
              <View style={styles.chatWrapperLayout}>
                <ScrollView 
                  style={styles.chatScroll}
                  contentContainerStyle={styles.chatScrollContent}
                  nestedScrollEnabled={true}
                >
                  {chatMessages.map((m, idx) => (
                    <View 
                      key={idx} 
                      style={[
                        styles.chatBubble, 
                        m.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant
                      ]}
                    >
                      <Text style={[styles.chatBubbleText, m.role === 'user' ? styles.chatTextUser : styles.chatTextAssistant]}>
                        {m.content}
                      </Text>
                    </View>
                  ))}
                  {chatLoading && (
                    <View style={[styles.chatBubble, styles.chatBubbleAssistant, { paddingVertical: 14 }]}>
                      <ActivityIndicator size="small" color="#9CA3AF" />
                    </View>
                  )}
                </ScrollView>

                <View style={styles.chatInputRow}>
                  <TextInput
                    value={chatInput}
                    onChangeText={setChatInput}
                    placeholder="Pregúntale a Claude..."
                    placeholderTextColor="#6B7280"
                    style={styles.chatInputText}
                  />
                  <TouchableOpacity 
                    style={styles.chatSendBtn}
                    onPress={handleSendChatMessage}
                    disabled={chatLoading}
                  >
                    <Text style={styles.chatSendBtnText}>Enviar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Analysis View */}
            {advisorTab === 'analysis' && (
              <View style={styles.analysisWrapper}>
                <View style={styles.analysisHeaderRow}>
                  <Text style={styles.analysisLabel}>Mes: {getMonthName(analysisMonth)}</Text>
                  <TouchableOpacity 
                    style={styles.analysisBtn}
                    onPress={handleGenerateAnalysis}
                    disabled={analysisLoading}
                  >
                    <Text style={styles.analysisBtnText}>
                      {analysisLoading ? 'Analizando...' : 'Generar Informe IA'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {analysisReport ? (
                  <ScrollView style={styles.reportScroll} nestedScrollEnabled={true}>
                    <View style={styles.reportCard}>
                      {analysisReport.split('\n').map((line, idx) => {
                        const isTitle = line.startsWith('#');
                        const isBullet = line.startsWith('-');
                        return (
                          <Text 
                            key={idx} 
                            style={[
                              styles.reportLine,
                              isTitle ? styles.reportLineTitle : null,
                              isBullet ? styles.reportLineBullet : null
                            ]}
                          >
                            {line}
                          </Text>
                        );
                      })}
                    </View>
                  </ScrollView>
                ) : (
                  <View style={styles.reportEmpty}>
                    <Text style={styles.noDataText}>No hay informes generados.</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* --- ADD ACCOUNT MODAL --- */}
      <Modal visible={showAddAccount} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nueva Cuenta</Text>
            
            <TextInput
              placeholder="Nombre de la cuenta"
              placeholderTextColor="#6B7280"
              style={styles.modalInput}
              value={accName}
              onChangeText={setAccName}
            />

            <View style={styles.pickerWrapper}>
              <Text style={styles.pickerLabel}>Tipo: {accType === 'bank' ? 'Banco' : accType === 'cash' ? 'Efectivo' : 'Bróker'}</Text>
              <View style={styles.row}>
                {(['bank', 'cash', 'broker'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.selectorBtn, accType === t && styles.selectorActive]}
                    onPress={() => setAccType(t)}
                  >
                    <Text style={styles.selectorText}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              placeholder="Saldo Inicial"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
              style={styles.modalInput}
              value={accBalance}
              onChangeText={setAccBalance}
            />

            <View style={styles.row}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddAccount(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddAccountSubmit}>
                <Text style={styles.saveBtnText}>Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- ADD TRANSACTION MODAL --- */}
      <Modal visible={showAddTransaction} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Nuevo Movimiento</Text>

              {/* Transaction Type Select */}
              <View style={styles.row}>
                {(['expense', 'income', 'transfer'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.selectorBtn, txType === t && styles.selectorActive]}
                    onPress={() => setTxType(t)}
                  >
                    <Text style={styles.selectorText}>{t === 'expense' ? 'Gasto' : t === 'income' ? 'Ingreso' : 'Traspaso'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                placeholder="Importe"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                style={styles.modalInput}
                value={txAmount}
                onChangeText={setTxAmount}
              />

              <TextInput
                placeholder="Concepto / Descripción"
                placeholderTextColor="#6B7280"
                style={styles.modalInput}
                value={txDescription}
                onChangeText={setTxDescription}
              />

              <TextInput
                placeholder="Categoría"
                placeholderTextColor="#6B7280"
                style={styles.modalInput}
                value={txCategory}
                onChangeText={setTxCategory}
              />

              <View style={styles.switchWrapper}>
                <Text style={styles.switchLabel}>¿Pendiente de consolidar?</Text>
                <Switch value={txIsPending} onValueChange={setTxIsPending} />
              </View>

              <View style={styles.row}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddTransaction(false)}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleAddTransactionSubmit}>
                  <Text style={styles.saveBtnText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  // Auth styles
  authWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoTitle: {
    fontSize: 32,
    fontWeight: '500',
    color: '#F3F4F6',
    textAlign: 'center',
    marginBottom: 6,
  },
  logoSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 6,
    color: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#6366F1',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '500',
    fontSize: 14,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkButtonText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 10,
    borderRadius: 6,
    marginBottom: 20,
    textAlign: 'center',
  },
  successText: {
    color: '#10B981',
    fontSize: 13,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    padding: 10,
    borderRadius: 6,
    marginBottom: 20,
    textAlign: 'center',
  },
  legalDisclaimer: {
    color: '#6B7280',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(34,34,34,0.5)',
    paddingTop: 16,
  },
  // Dashboard Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#F3F4F6',
  },
  logoutText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 6,
    padding: 2,
    backgroundColor: '#111111',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 4,
  },
  activeTab: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(34,34,34,0.6)',
  },
  tabText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#6366F1',
  },
  tabContent: {
    paddingBottom: 40,
  },
  metricCard: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  },
  metricLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 26,
    color: '#F3F4F6',
    fontWeight: '500',
    marginTop: 6,
  },
  chartCard: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#F3F4F6',
    marginBottom: 16,
  },
  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  svgContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    flex: 1,
    marginLeft: 20,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 11,
    color: '#9CA3AF',
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,34,34,0.4)',
  },
  listItemLarge: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemLeft: {
    flex: 1,
  },
  listItemRight: {
    alignItems: 'flex-end',
  },
  listDesc: {
    fontSize: 13,
    color: '#F3F4F6',
    fontWeight: '500',
  },
  listSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  listAmount: {
    fontSize: 13,
    fontWeight: '500',
  },
  incomeText: {
    color: '#10B981',
  },
  expenseText: {
    color: '#EF4444',
  },
  noDataText: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 20,
  },
  deleteLink: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 8,
  },
  addBtn: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  accountCard: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  accountCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  accountName: {
    fontSize: 13,
    color: '#F3F4F6',
    fontWeight: '500',
  },
  accountType: {
    fontSize: 9,
    color: '#9CA3AF',
    backgroundColor: 'rgba(34,34,34,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  accountBalance: {
    fontSize: 20,
    color: '#F3F4F6',
    fontWeight: '500',
    marginTop: 10,
  },
  // Advisor Layout Styles
  subTabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  subTab: {
    marginRight: 16,
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeSubTab: {
    borderBottomColor: '#6366F1',
  },
  subTabText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  activeSubTabText: {
    color: '#F3F4F6',
    fontWeight: '500',
  },
  chatWrapperLayout: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 8,
    height: 360,
    justifyContent: 'space-between',
  },
  chatScroll: {
    flex: 1,
    padding: 12,
  },
  chatScrollContent: {
    paddingBottom: 20,
  },
  chatBubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  chatBubbleUser: {
    backgroundColor: '#6366F1',
    alignSelf: 'flex-end',
  },
  chatBubbleAssistant: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222222',
    alignSelf: 'flex-start',
  },
  chatBubbleText: {
    fontSize: 12,
    lineHeight: 16,
  },
  chatTextUser: {
    color: '#FFF',
    fontWeight: '500',
  },
  chatTextAssistant: {
    color: '#F3F4F6',
  },
  chatInputRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#222222',
    padding: 8,
    backgroundColor: '#161616',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    alignItems: 'center',
  },
  chatInputText: {
    flex: 1,
    color: '#F3F4F6',
    fontSize: 12,
    paddingHorizontal: 10,
    height: 36,
  },
  chatSendBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 4,
    paddingHorizontal: 12,
    height: 30,
    justifyContent: 'center',
  },
  chatSendBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '500',
  },
  analysisWrapper: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 8,
    padding: 16,
  },
  analysisHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  analysisLabel: {
    color: '#F3F4F6',
    fontSize: 12,
    fontWeight: '500',
  },
  analysisBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  analysisBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '500',
  },
  reportScroll: {
    maxHeight: 280,
  },
  reportCard: {
    backgroundColor: '#161616',
    borderRadius: 6,
    padding: 12,
  },
  reportLine: {
    color: '#9CA3AF',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  reportLineTitle: {
    color: '#F3F4F6',
    fontWeight: '500',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 6,
  },
  reportLineBullet: {
    marginLeft: 8,
  },
  reportEmpty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalScrollOverlay: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#111111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#222222',
    padding: 24,
  },
  modalTitle: {
    fontSize: 16,
    color: '#F3F4F6',
    fontWeight: '500',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 6,
    color: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  selectorBtn: {
    flex: 1,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  selectorActive: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  selectorText: {
    color: '#F3F4F6',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  pickerWrapper: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelBtnText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    marginLeft: 8,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },
  switchWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
