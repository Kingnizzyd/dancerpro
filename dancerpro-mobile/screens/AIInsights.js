import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GradientCard, GradientButton, ModernInput, TrendChart } from '../components/UI';
import BarChart from '../components/UI/BarChart';
import DonutChart from '../components/UI/DonutChart';
import { Colors } from '../constants/Colors';
import { formatCurrency, formatPercentage, formatNumber } from '../utils/formatters';
import aiEngine, { buildAiInsights, answerQuery } from '../lib/aiEngine';
import { getIntegrationStatuses } from '../lib/aiStatus';
import WebSocketService from '../services/WebSocketService';
import { getAllClients, getAllVenues, getRecentShifts, getRecentTransactions, computeTransactionTotals, getAiReports, insertAiReport, deleteAiReport } from '../lib/db';

export default function AIInsights() {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const periodDays = useMemo(() => (selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90), [selectedPeriod]);

  // Dynamic AI data
  const [loading, setLoading] = useState(false);
  // Removed legacy assignments/matches data in favor of analytics dashboard
  const [schedule, setSchedule] = useState([]);
  const [actions, setActions] = useState([]);
  const [clients, setClients] = useState([]);
  const [venues, setVenues] = useState([]);
  const [clientIdx, setClientIdx] = useState(-1); // -1 = All
  const [venueIdx, setVenueIdx] = useState(-1); // -1 = All
  const [showMA7, setShowMA7] = useState(true);
  const [showMA30, setShowMA30] = useState(false);
  // Analytics state
  const [kpis, setKpis] = useState({ income: 0, expense: 0, net: 0, shifts: 0, avgPerShift: 0, bestDow: null, projected7d: 0 });
  const [pctChanges, setPctChanges] = useState({ incomeWoW: null, expenseWoW: null, netWoW: null });
  const [reportText, setReportText] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [topVenue, setTopVenue] = useState(null);
  const [topClient, setTopClient] = useState(null);
  const [reportMode, setReportMode] = useState('concise'); // 'concise' | 'detailed'
  const [copyStatus, setCopyStatus] = useState('');
  const [dowData, setDowData] = useState([]); // earnings by day-of-week
  const [breakdownData, setBreakdownData] = useState([]); // income vs expense
  const [insightList, setInsightList] = useState([]);
  const [savedReports, setSavedReports] = useState([]);

  // Status monitoring
  const [statuses, setStatuses] = useState({ backend: {}, cloud: {}, websocket: {} });

  // Ask AI
  const [question, setQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');

  // Insights are generated dynamically in insightList via recomputeAnalytics
  // Metrics will be redefined by analytics dashboard below
  const metrics = [];

  const recomputeAnalytics = async () => {
    try {
      const days = periodDays;
      const [shifts, txns] = await Promise.all([
        getRecentShifts(null, days),
        getRecentTransactions(null, days)
      ]);
      const filteredShifts = shifts.filter(s => {
        const clientOk = clientIdx < 0 || s.clientId === clients[clientIdx]?.id;
        const venueOk = venueIdx < 0 || s.venueId === venues[venueIdx]?.id;
        return clientOk && venueOk;
      });
      // KPI totals
      const totals = computeTransactionTotals(txns);
      const income = totals?.income || 0;
      const expense = totals?.expense || 0;
      const net = income - expense;
      const shiftsCount = filteredShifts.length;
      // Day-of-week earnings
      const dowMap = { 0:0,1:0,2:0,3:0,4:0,5:0,6:0 };
      filteredShifts.forEach(s => {
        const d = new Date(s.start || s.date);
        const dow = d.getDay();
        dowMap[dow] += s.earnings || 0;
      });
      const dowLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const dowSeries = dowLabels.map((label, i) => ({ label, value: dowMap[i] }));
      // Best day-of-week
      let bestDow = null; let bestVal = -Infinity;
      dowSeries.forEach(d => { if (d.value > bestVal) { bestVal = d.value; bestDow = d.label; } });
      // Projected earnings next 7 days based on average daily
      const totalEarnings = filteredShifts.reduce((sum, s) => sum + (s.earnings || 0), 0);
      const avgPerDay = days > 0 ? totalEarnings / days : 0;
      const projected7d = Math.round(avgPerDay * 7);
      const avgPerShift = shiftsCount ? Math.round(totalEarnings / shiftsCount) : 0;
      setKpis({ income, expense, net, shifts: shiftsCount, avgPerShift, bestDow, projected7d });
      setBreakdownData([
        { label: 'Income', value: income, color: Colors.success },
        { label: 'Expense', value: expense, color: Colors.error }
      ]);
      setDowData(dowSeries);
      // Top venue computed locally
      const venueAgg = new Map();
      filteredShifts.forEach(s => {
        const key = s.venueId || 'unknown';
        venueAgg.set(key, (venueAgg.get(key) || 0) + (s.earnings || 0));
      });
      let bestVenueId = null; let bestVenueVal = -Infinity;
      for (const [vid, val] of venueAgg.entries()) {
        if (val > bestVenueVal) { bestVenueVal = val; bestVenueId = vid; }
      }
      const bestVenue = venues.find(v => v.id === bestVenueId);
      setTopVenue(bestVenue || null);
      // Build up to ten insights
      const newInsights = [];
      if (bestDow) newInsights.push({ title: 'Optimal Workday', text: `Best day to work: ${bestDow}` });
      newInsights.push({ title: 'Revenue Projection', text: `Projected earnings next 7 days: $${projected7d}` });
      // Top venue and client by earnings in filtered shifts
      const venueTotalsMap = {};
      const clientTotalsMap = {};
      for (const s of filteredShifts) {
        const amt = s.earnings || 0;
        const v = venues?.find(v => v.id === s.venueId);
        const c = clients?.find(c => c.id === s.clientId);
        const vName = v?.name || s.venueId || 'Unknown';
        const cName = c?.name || s.clientId || 'Unknown';
        venueTotalsMap[vName] = (venueTotalsMap[vName] || 0) + amt;
        clientTotalsMap[cName] = (clientTotalsMap[cName] || 0) + amt;
      }
      let topVenueEntry = null;
      Object.keys(venueTotalsMap).forEach(name => {
        const val = venueTotalsMap[name];
        if (!topVenueEntry || val > topVenueEntry.amount) topVenueEntry = { name, amount: val };
      });
      let topClientEntry = null;
      Object.keys(clientTotalsMap).forEach(name => {
        const val = clientTotalsMap[name];
        if (!topClientEntry || val > topClientEntry.amount) topClientEntry = { name, amount: val };
      });
      if (topVenueEntry) {
        setTopVenue({ ...topVenueEntry, share: income ? topVenueEntry.amount / income : 0 });
        newInsights.push({ title: 'Top Venue', text: `${topVenueEntry.name}: ${formatCurrency(topVenueEntry.amount)} (${income ? formatPercentage(topVenueEntry.amount / income) : '—'} of income)` });
      }
      if (topClientEntry) {
        setTopClient({ ...topClientEntry, share: income ? topClientEntry.amount / income : 0 });
        newInsights.push({ title: 'Top Client', text: `${topClientEntry.name}: ${formatCurrency(topClientEntry.amount)} (${income ? formatPercentage(topClientEntry.amount / income) : '—'} of income)` });
      }
      if (incomeWoW !== null) newInsights.push({ title: 'Income WoW', text: `${incomeWoW >= 0 ? 'Up' : 'Down'} ${formatPercentage(Math.abs(incomeWoW))} vs previous period` });
      if (expenseWoW !== null) newInsights.push({ title: 'Expense WoW', text: `${expenseWoW >= 0 ? 'Up' : 'Down'} ${formatPercentage(Math.abs(expenseWoW))} vs previous period` });
      if (netWoW !== null) newInsights.push({ title: 'Net WoW', text: `${netWoW >= 0 ? 'Up' : 'Down'} ${formatPercentage(Math.abs(netWoW))} vs previous period` });
      newInsights.push({ title: 'Average Per Shift', text: `Avg per shift: $${avgPerShift}` });
      newInsights.push({ title: 'Income', text: `Income: ${formatCurrency(income)}` });
      newInsights.push({ title: 'Expenses', text: `Expenses: ${formatCurrency(expense)}` });
      newInsights.push({ title: 'Net', text: `Net: ${formatCurrency(net)}` });
      // Simple anomaly detection on daily net for current period
      const byDay = {};
      for (const t of txns) {
        const d = new Date(t.date);
        const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10);
        if (!byDay[key]) byDay[key] = { income: 0, expense: 0 };
        if (t.type === 'income') byDay[key].income += (t.amount || 0);
        else if (t.type === 'expense') byDay[key].expense += (t.amount || 0);
      }
      const nets = Object.keys(byDay).sort().map(k => byDay[k].income - byDay[k].expense);
      if (nets.length >= Math.min(5, days)) {
        const mean = nets.reduce((s,v)=>s+v,0) / nets.length;
        const variance = nets.reduce((s,v)=> s + Math.pow(v - mean, 2), 0) / nets.length;
        const std = Math.sqrt(variance);
        const last = nets[nets.length - 1];
        if (std > 0 && Math.abs(last - mean) >= 1.5 * std) {
          newInsights.push({ title: 'Anomaly', text: `${last > mean ? 'Spike' : 'Drop'} detected: last day net ${formatCurrency(last)} vs avg ${formatCurrency(Math.round(mean))}` });
        }
      }
      if (net < 0) newInsights.push({ title: 'Alert', text: 'Net negative in selected period' });
      if (netWoW !== null && netWoW <= -0.2) newInsights.push({ title: 'Alert', text: 'Net earnings dropped more than 20% vs previous period' });
      if (topVenue?.name) newInsights.push({ title: 'Top Venue', text: `${topVenue.name} performs best` });
      newInsights.push({ title: 'Shifts Count', text: `${shiftsCount} shifts in period` });
      newInsights.push({ title: 'Performance Trend', text: 'See trend chart below for earnings over time.' });
      setInsightList(newInsights.slice(0,10));
    } catch (e) {
      // noop
    }
  };

  const generatePeriodReport = async () => {
    try {
      setGeneratingReport(true);
      const periodLabel = selectedPeriod === '7d' ? 'last 7 days' : selectedPeriod === '30d' ? 'last 30 days' : 'last 90 days';
      const wow = pctChanges;
      const wowStr = (v) => v === null ? '—' : `${v >= 0 ? '+' : '-'}${formatPercentage(Math.abs(v))}`;
      const highlights = (insightList || []).slice(0,3);

      // Enhanced prompt with report mode, top client/venue, and alerts
      const prompt = `Generate a ${reportMode} period report for ${periodLabel} summarizing: ` +
        `Income ${formatCurrency(kpis.income)} (WoW ${wowStr(wow.incomeWoW)}), ` +
        `Expense ${formatCurrency(kpis.expense)} (WoW ${wowStr(wow.expenseWoW)}), ` +
        `Net ${formatCurrency(kpis.net)} (WoW ${wowStr(wow.netWoW)}), ` +
        `Shifts ${formatNumber(kpis.shifts)}, Avg/Shift ${formatCurrency(kpis.avgPerShift)}, ` +
        `Best day ${kpis.bestDow || '—'}, Projection 7d ${formatCurrency(kpis.projected7d)}` +
        (topVenue ? `, Top venue: ${topVenue.venue} (${formatCurrency(topVenue.total)})` : '') +
        (topClient ? `, Top client: ${topClient.clientId} (${formatCurrency(topClient.net)})` : '') +
        (alerts.length > 0 ? `, Alerts: ${alerts.join('; ')}` : '') +
        `. Include ${reportMode === 'detailed' ? '5-7' : '2-3'} highlights and ${reportMode === 'detailed' ? '5' : '3'} actionable recommendations. ` +
        `${reportMode === 'detailed' ? 'Provide comprehensive analysis with specific numbers and trends.' : 'Keep concise under 120 words.'}`;

      let aiText = '';
      try {
        if (typeof answerQuery === 'function') {
          aiText = await answerQuery(prompt, {
            kpis,
            wow,
            highlights,
            periodDays,
            selectedPeriod,
            reportMode,
            topVenue,
            topClient,
            alerts
          });
        }
      } catch {}

      if (aiText && typeof aiText === 'string' && aiText.trim()) {
        setReportText(aiText.trim());
      } else {
        // Enhanced fallback structured summary
        const lines = [
          `AI ${reportMode === 'detailed' ? 'Detailed' : 'Concise'} Report for ${periodLabel}`,
          `Income: ${formatCurrency(kpis.income)} (WoW ${wowStr(wow.incomeWoW)})`,
          `Expense: ${formatCurrency(kpis.expense)} (WoW ${wowStr(wow.expenseWoW)})`,
          `Net: ${formatCurrency(kpis.net)} (WoW ${wowStr(wow.netWoW)})`,
          `Shifts: ${formatNumber(kpis.shifts)} | Avg/Shift: ${formatCurrency(kpis.avgPerShift)}`,
          `Best Day: ${kpis.bestDow || '—'} | Projection (7d): ${formatCurrency(kpis.projected7d)}`,
          ...(topVenue ? [`Top Venue: ${topVenue.venue} (${formatCurrency(topVenue.total)})`] : []),
          ...(topClient ? [`Top Client: ${topClient.clientId} (${formatCurrency(topClient.net)})`] : []),
          ...(alerts.length > 0 ? ['Alerts:', ...alerts.map(a => `- ${a}`)] : []),
          `Highlights:`,
          ...highlights.map(i => `- ${i.title}: ${i.text}`)
        ];
        setReportText(lines.join('\n'));
      }
    } finally {
      setGeneratingReport(false);
    }
  };

  // Load saved reports on component mount
  useEffect(() => {
    const loadSavedReports = async () => {
      try {
        const reports = await getAiReports();
        setSavedReports(reports || []);
      } catch (error) {
        console.error('Failed to load saved reports:', error);
      }
    };
    loadSavedReports();
  }, []);

  const handleCopyReport = async () => {
    try {
      if (reportText) {
        // For web compatibility
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(reportText);
        } else {
          // Fallback for environments without clipboard API
          const textArea = document.createElement('textarea');
          textArea.value = reportText;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
        setCopyStatus('Copied!');
        setTimeout(() => setCopyStatus(''), 2000);
      }
    } catch (error) {
      setCopyStatus('Copy failed');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  const handleSaveReport = async () => {
    try {
      if (reportText) {
        const periodLabel = selectedPeriod === '7d' ? 'last 7 days' : selectedPeriod === '30d' ? 'last 30 days' : 'last 90 days';
        const reportData = {
          title: `AI ${reportMode === 'detailed' ? 'Detailed' : 'Concise'} Report - ${periodLabel}`,
          content: reportText,
          period: selectedPeriod,
          mode: reportMode,
          kpis: { ...kpis },
          wow: { ...pctChanges },
          topVenue: topVenue ? { ...topVenue } : null,
          topClient: topClient ? { ...topClient } : null,
          alerts: [...alerts],
          createdAt: new Date().toISOString()
        };
        
        await insertAiReport(reportData);
        
        // Refresh saved reports list
        const reports = await getAiReports();
        setSavedReports(reports || []);
        
        setCopyStatus('Saved!');
        setTimeout(() => setCopyStatus(''), 2000);
      }
    } catch (error) {
      setCopyStatus('Save failed');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  const handleDeleteSavedReport = async (reportId) => {
    try {
      await deleteAiReport(reportId);
      // Refresh saved reports list
      const reports = await getAiReports();
      setSavedReports(reports || []);
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  useEffect(() => { recomputeAnalytics(); }, [selectedPeriod, clientIdx, venueIdx, clients, venues]);

  useEffect(() => {
    // Connect websocket if not already
    try { WebSocketService.connect?.(); } catch {}
    const poll = async () => {
      const s = await getIntegrationStatuses();
      setStatuses(s);
    };
    poll();
    const id = setInterval(poll, 8000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [c, v] = await Promise.all([getAllClients(null), getAllVenues(null)]);
        setClients(Array.isArray(c) ? c : []);
        setVenues(Array.isArray(v) ? v : []);
      } catch {}
    };
    loadMeta();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await buildAiInsights(periodDays);
        setSchedule(data.schedule || []);
        setActions(data.actions || []);
      } catch (e) {
        // Swallow, UI still works
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [periodDays]);

  const trendSeries = useMemo(() => {
    // Build daily earnings from shifts within periodDays, filtered by client/venue selections
    const build = async () => {
      const shifts = await getRecentShifts(null, periodDays);
      const filtered = shifts.filter(s => {
        const cOk = clientIdx < 0 ? true : (s.clientId === clients[clientIdx]?.id);
        const vOk = venueIdx < 0 ? true : (s.venueId === venues[venueIdx]?.id);
        return cOk && vOk;
      });
      const byDay = new Map();
      filtered.forEach(s => {
        const d = new Date(s.start || s.date || Date.now());
        const key = d.toISOString().slice(0, 10);
        byDay.set(key, (byDay.get(key) || 0) + Number(s.earnings || 0));
      });
      const arr = Array.from(byDay.entries()).sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .map(([date, val]) => ({ x: date, y: val }));
      return arr;
    };
    // Since useMemo cannot be async, we keep a local state via effect; instead, return [] here.
    return [];
  }, [periodDays, clientIdx, venueIdx, clients, venues]);

  const [series, setSeries] = useState([]);
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const arr = await (async () => {
        const shifts = await getRecentShifts(null, periodDays);
        const filtered = shifts.filter(s => {
          const cOk = clientIdx < 0 ? true : (s.clientId === clients[clientIdx]?.id);
          const vOk = venueIdx < 0 ? true : (s.venueId === venues[venueIdx]?.id);
          return cOk && vOk;
        });
        const byDay = new Map();
        filtered.forEach(s => {
          const d = new Date(s.start || s.date || Date.now());
          const key = d.toISOString().slice(0, 10);
          byDay.set(key, (byDay.get(key) || 0) + Number(s.earnings || 0));
        });
        const arr = Array.from(byDay.entries()).sort((a, b) => new Date(a[0]) - new Date(b[0]))
          .map(([date, val]) => ({ x: date, y: val }));
        return arr;
      })();
      if (mounted) setSeries(arr);
    };
    run();
    return () => { mounted = false; };
  }, [periodDays, clientIdx, venueIdx, clients, venues]);

  const handleAskAi = async () => {
    const res = await answerQuery(question, { periodDays });
    setAiAnswer(String(res || ''));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.accent]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Ionicons name="analytics-outline" size={28} color="white" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>AI Insights</Text>
              <Text style={styles.headerSubtitle}>Intelligent performance analysis</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={() => {
            setSelectedPeriod(selectedPeriod); // trigger no-op
          }}>
            <Ionicons name="refresh-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Ask Your AI Assistant - Prominent position near top */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ask Your AI Assistant</Text>
        <GradientCard variant="minimal" padding="medium" style={styles.askCard}>
          <ModernInput
            placeholder="Ask about best day, revenue projections, or performance"
            value={question}
            onChangeText={setQuestion}
            style={styles.askInput}
          />
          <GradientButton title="Ask" onPress={handleAskAi} style={styles.actionButton} />
          {aiAnswer ? (
            <View style={styles.askResponse}><Text style={styles.insightText}>{aiAnswer}</Text></View>
          ) : null}
        </GradientCard>
      </View>

      {/* Live Integration Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Integration Status</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusItem, (statuses.backend?.ok ? styles.statusOk : styles.statusBad)]}>
            <Ionicons name={statuses.backend?.ok ? 'cloud-outline' : 'cloud-offline-outline'} size={18} color={statuses.backend?.ok ? Colors.success : Colors.error} />
            <Text style={styles.statusText}>Backend</Text>
          </View>
          <View style={[styles.statusItem, (statuses.cloud?.ok ? styles.statusOk : styles.statusBad)]}>
            <Ionicons name={statuses.cloud?.ok ? 'download-outline' : 'alert-circle-outline'} size={18} color={statuses.cloud?.ok ? Colors.success : Colors.error} />
            <Text style={styles.statusText}>Cloud Snapshot</Text>
          </View>
          <View style={[styles.statusItem, (statuses.websocket?.connected ? styles.statusOk : styles.statusBad)]}>
            <Ionicons name={statuses.websocket?.connected ? 'radio-outline' : 'alert-circle-outline'} size={18} color={statuses.websocket?.connected ? Colors.success : Colors.error} />
            <Text style={styles.statusText}>WebSocket</Text>
          </View>
        </View>
      </View>

      {/* Time Period Selector */}
      <View style={styles.periodSelector}>
        <Text style={styles.sectionTitle}>Analysis Period</Text>
        <View style={styles.periodButtons}>
          {['7d', '30d', '90d'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterPill} onPress={() => {
            const next = clientIdx + 1;
            setClientIdx(next >= clients.length ? -1 : next);
          }}>
            <Text style={styles.filterText}>Client: {clientIdx < 0 ? 'All' : (clients[clientIdx]?.name || '—')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterPill} onPress={() => {
            const next = venueIdx + 1;
            setVenueIdx(next >= venues.length ? -1 : next);
          }}>
            <Text style={styles.filterText}>Venue: {venueIdx < 0 ? 'All' : (venues[venueIdx]?.name || '—')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterPill} onPress={() => setShowMA7(v => !v)}>
            <Text style={styles.filterText}>{showMA7 ? 'MA(7): On' : 'MA(7): Off'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterPill} onPress={() => setShowMA30(v => !v)}>
            <Text style={styles.filterText}>{showMA30 ? 'MA(30): On' : 'MA(30): Off'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Metrics */}
      <View style={styles.metricsContainer}>
        <GradientCard variant="minimal" padding="small" style={styles.metricCard}>
          <View style={styles.metricContent}>
            <Ionicons name="cash-outline" size={24} color={Colors.success} />
            <Text style={styles.metricValue}>{formatCurrency(kpis.income)}</Text>
            {pctChanges?.incomeWoW !== null && (
              <View style={[styles.badge, { borderColor: pctChanges.incomeWoW >= 0 ? Colors.success : Colors.error }]}> 
                <Text style={[styles.badgeText, { color: pctChanges.incomeWoW >= 0 ? Colors.success : Colors.error }]}> 
                  {pctChanges.incomeWoW >= 0 ? '↑ ' : '↓ '}{formatPercentage(Math.abs(pctChanges.incomeWoW))}
                </Text>
              </View>
            )}
            <Text style={styles.metricLabel}>Income</Text>
          </View>
        </GradientCard>
        <GradientCard variant="minimal" padding="small" style={styles.metricCard}>
          <View style={styles.metricContent}>
            <Ionicons name="card-outline" size={24} color={Colors.error} />
            <Text style={styles.metricValue}>{formatCurrency(kpis.expense)}</Text>
            {pctChanges?.expenseWoW !== null && (
              <View style={[styles.badge, { borderColor: pctChanges.expenseWoW < 0 ? Colors.success : Colors.error }]}> 
                <Text style={[styles.badgeText, { color: pctChanges.expenseWoW < 0 ? Colors.success : Colors.error }]}> 
                  {pctChanges.expenseWoW >= 0 ? '↑ ' : '↓ '}{formatPercentage(Math.abs(pctChanges.expenseWoW))}
                </Text>
              </View>
            )}
            <Text style={styles.metricLabel}>Expense</Text>
          </View>
        </GradientCard>
        <GradientCard variant="minimal" padding="small" style={styles.metricCard}>
          <View style={styles.metricContent}>
            <Ionicons name="trending-up-outline" size={24} color={Colors.primary} />
            <Text style={styles.metricValue}>{formatCurrency(kpis.net)}</Text>
            {pctChanges?.netWoW !== null && (
              <View style={[styles.badge, { borderColor: pctChanges.netWoW >= 0 ? Colors.success : Colors.error }]}> 
                <Text style={[styles.badgeText, { color: pctChanges.netWoW >= 0 ? Colors.success : Colors.error }]}> 
                  {pctChanges.netWoW >= 0 ? '↑ ' : '↓ '}{formatPercentage(Math.abs(pctChanges.netWoW))}
                </Text>
              </View>
            )}
            <Text style={styles.metricLabel}>Net</Text>
          </View>
        </GradientCard>
        <GradientCard variant="minimal" padding="small" style={styles.metricCard}>
          <View style={styles.metricContent}>
            <Ionicons name="calendar-outline" size={24} color={Colors.accent} />
            <Text style={styles.metricValue}>{formatNumber(kpis.shifts)}</Text>
            <Text style={styles.metricLabel}>Shifts</Text>
          </View>
        </GradientCard>
        <GradientCard variant="minimal" padding="small" style={styles.metricCard}>
          <View style={styles.metricContent}>
            <Ionicons name="time-outline" size={24} color={Colors.warning} />
            <Text style={styles.metricValue}>{formatCurrency(kpis.avgPerShift)}</Text>
            <Text style={styles.metricLabel}>Avg/Shift</Text>
          </View>
        </GradientCard>
        <GradientCard variant="minimal" padding="small" style={styles.metricCard}>
          <View style={styles.metricContent}>
            <Ionicons name="sunny-outline" size={24} color={Colors.success} />
            <Text style={styles.metricValue}>{kpis.bestDow || '—'}</Text>
            <Text style={styles.metricLabel}>Best Day</Text>
          </View>
        </GradientCard>
        <GradientCard variant="minimal" padding="small" style={styles.metricCard}>
          <View style={styles.metricContent}>
            <Ionicons name="stats-chart-outline" size={24} color={Colors.primary} />
            <Text style={styles.metricValue}>{formatCurrency(kpis.projected7d)}</Text>
            <Text style={styles.metricLabel}>Projected 7d</Text>
          </View>
        </GradientCard>
      </View>

      {/* Key Insights (Data-driven) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
        {/* AI Period Report */}
        <GradientCard variant="soft" padding="medium" style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>AI Period Report</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={reportMode === 'concise' ? styles.linkActive : styles.link} onPress={() => setReportMode('concise')}>Concise</Text>
              <Text style={[reportMode === 'detailed' ? styles.linkActive : styles.link, { marginLeft: 12 }]} onPress={() => setReportMode('detailed')}>Detailed</Text>
              <Text style={[styles.link, { marginLeft: 12 }]} onPress={generatePeriodReport}>{generatingReport ? 'Generating…' : 'Generate'}</Text>
              <Text style={[styles.link, { marginLeft: 12 }]} onPress={handleCopyReport}>Copy</Text>
              <Text style={[styles.link, { marginLeft: 12 }]} onPress={handleSaveReport}>Save</Text>
            </View>
          </View>
          {copyStatus ? <Text style={{ marginTop: 4, color: Colors.muted }}>{copyStatus}</Text> : null}
          {reportText ? (
            <Text selectable style={{ marginTop: 8 }}>{reportText}</Text>
          ) : (
            <Text style={{ marginTop: 8, color: Colors.muted }}>Tap Generate to produce a summary.</Text>
          )}
        </GradientCard>

        {/* Saved Reports */}
        {savedReports.length > 0 && (
          <GradientCard variant="soft" padding="medium" style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>Saved Reports</Text>
              <Text style={[styles.link, { fontSize: 12 }]} onPress={() => {
                const loadSavedReports = async () => {
                  try {
                    const reports = await getAiReports();
                    setSavedReports(reports || []);
                  } catch (error) {
                    console.error('Failed to load saved reports:', error);
                  }
                };
                loadSavedReports();
              }}>Refresh</Text>
            </View>
            {savedReports.map((report, index) => (
              <View key={report.id || index} style={[styles.savedReportItem, index > 0 && { marginTop: 12 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: Colors.text, marginBottom: 4 }}>
                      {report.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: 8 }}>
                      {new Date(report.createdAt).toLocaleDateString()} • {report.period} • {report.mode}
                    </Text>
                    <Text numberOfLines={3} style={{ fontSize: 13, color: Colors.textSecondary }}>
                      {report.content.length > 150 ? report.content.substring(0, 150) + '...' : report.content}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => handleDeleteSavedReport(report.id)}
                    style={{ padding: 6, marginLeft: 8 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  onPress={() => {
                    setReportText(report.content);
                    setReportMode(report.mode);
                    setSelectedPeriod(report.period);
                  }}
                  style={{ marginTop: 8 }}
                >
                  <Text style={[styles.link, { fontSize: 12 }]}>Load Report</Text>
                </TouchableOpacity>
              </View>
            ))}
          </GradientCard>
        )}
        {/* Alerts Section */}
        {alerts?.length > 0 && (
          <GradientCard variant="soft" padding="medium" style={{ marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Alerts</Text>
            {alerts.map((text, idx) => (
              <View key={`alert-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.warning} />
                <Text style={{ marginLeft: 8, color: Colors.warning }}>{text}</Text>
              </View>
            ))}
          </GradientCard>
        )}
        <Text style={styles.sectionTitle}>Key Insights</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {insightList.map((item, idx) => (
          <GradientCard key={idx} variant="glow" padding="medium" style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View style={styles.insightIcon}>
                <Ionicons name="bulb-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.insightTitleContainer}>
                <Text style={styles.insightTitle}>{item.title}</Text>
              </View>
            </View>
            <Text style={styles.insightText}>{item.text}</Text>
          </GradientCard>
        ))}
      </View>

      {/* Recommendations removed for streamlined UI */}

      {/* Performance Trend (Line) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Performance Trend</Text>
        </View>
        <GradientCard variant="minimal" padding="medium" style={{ padding: 12 }}>
          <TrendChart series={series} showMA7={showMA7} showMA30={showMA30} height={240} />
        </GradientCard>
      </View>

      {/* Day-of-Week Earnings (Bar) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Earnings by Day</Text>
        </View>
        <GradientCard variant="minimal" padding="medium" style={{ padding: 12 }}>
          <BarChart data={dowData} height={220} />
        </GradientCard>
      </View>

      {/* Income vs Expense (Donut) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Income vs Expense</Text>
        </View>
        <GradientCard variant="minimal" padding="medium" style={{ padding: 12, alignItems: 'center' }}>
          <DonutChart data={breakdownData} size={220} />
        </GradientCard>
      </View>

      {/* Schedule Suggestions removed for clarity */}

      {/* Compatibility Matches removed for streamlined analytics-focused UI */}

      {/* Ask AI moved to top */}

      {/* AI Learning Status */}
      <GradientCard style={styles.learningCard} variant="accent" padding="large">
        <View style={styles.learningHeader}>
          <Ionicons name="school-outline" size={24} color={Colors.primary} />
          <Text style={styles.learningTitle}>AI Learning Progress</Text>
        </View>
        <Text style={styles.learningText}>
          Your AI assistant is continuously learning from your performance data to provide better insights.
        </Text>
        <View style={styles.learningProgress}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '87%' }]} />
          </View>
          <Text style={styles.progressText}>87% Complete</Text>
        </View>
      </GradientCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  statusOk: {
    borderColor: Colors.success,
    borderWidth: 1,
  },
  statusBad: {
    borderColor: Colors.error,
    borderWidth: 1,
  },
  statusText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  periodSelector: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  periodButtons: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  periodButtonTextActive: {
    color: 'white',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  metricCard: {
    width: '48%',
    marginRight: '2%',
    marginBottom: 12,
    padding: 12,
  },
  metricContent: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  insightCard: {
    padding: 16,
    marginBottom: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightTitleContainer: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  confidenceContainer: {
    marginTop: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
  },
  insightText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  recommendationCard: {
    padding: 16,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationContent: {
    flex: 1,
    marginRight: 12,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityHigh: {
    backgroundColor: Colors.error + '20',
  },
  priorityMedium: {
    backgroundColor: Colors.warning + '20',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text,
  },
  actionButton: {
    marginTop: 8,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  askCard: {
    padding: 12,
  },
  askInput: {
    marginBottom: 8,
  },
  askResponse: {
    marginTop: 10,
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 12,
  },
  learningCard: {
    margin: 20,
    padding: 20,
  },
  learningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  learningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  learningText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  learningProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  link: {
    color: Colors.primary,
    fontWeight: '600'
  }
  ,badge: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600'
  }
});

