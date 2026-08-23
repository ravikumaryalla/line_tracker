import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { api } from '../api';
import { F, initials } from '../format';
import { colors, cardShadowSm, cardShadowMd, cardShadowLg } from '../tokens';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Toast from '../components/Toast';
import BottomSheet from '../components/BottomSheet';

const TABS = [['Dashboard', 'dashboard'], ['Villages', 'villages'], ['Agents', 'agents'], ['Customers', 'customers'], ['More', 'more']];
const MORE_SCREENS = ['given', 'collections', 'expenses', 'losses', 'reports'];
const TITLES = { dashboard: 'Dashboard', villages: 'Villages', agents: 'Agents', customers: 'Customers', more: 'More', given: 'Money given', collections: 'Collections', expenses: 'Expenses', losses: 'Losses', reports: 'Reports' };

export default function AdminApp({ onSwitchRole }) {
  const [screen, setScreen] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [agents, setAgents] = useState([]);
  const [villages, setVillages] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [losses, setLosses] = useState([]);
  const [search, setSearch] = useState('');
  const [assignFor, setAssignFor] = useState(null);
  const [lossOpen, setLossOpen] = useState(false);
  const [lossForm, setLossForm] = useState({ name: '', remaining: '', recovered: '', reason: '' });
  const [range, setRange] = useState('This month');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  const loadAll = () =>
    Promise.all([
      api.dashboard.summary().then(setSummary),
      api.agents.list().then(setAgents),
      api.villages.list().then(setVillages),
      api.customers.list().then(setCustomers),
      api.expenses.list().then(setExpenses),
      api.losses.list().then(setLosses),
    ]);

  useEffect(() => { loadAll().finally(() => setLoading(false)); }, []);

  const go = (s) => { setScreen(s); setAssignFor(null); };
  const activeTab = MORE_SCREENS.includes(screen) ? 'more' : screen;

  const assignAgent = async (agentId) => {
    const village = villages.find((v) => v.id === assignFor);
    await api.villages.assign(assignFor, agentId);
    await loadAll();
    setAssignFor(null);
    const agent = agents.find((a) => a.id === agentId);
    flash(`${agent.name.split(' ')[0]} now collects in ${village.name}`);
  };

  const toggleAgent = async (a) => {
    await api.agents.toggle(a.id, !a.active);
    await loadAll();
    flash(`${a.name.split(' ')[0]} ${a.active ? 'set to inactive' : 'set to active'}`);
  };

  const saveLoss = async () => {
    const remaining = parseInt(lossForm.remaining, 10) || 0;
    if (!lossForm.name || !remaining) { flash('Enter customer and remaining amount'); return; }
    await api.losses.create({
      customerName: lossForm.name,
      remaining,
      recovered: parseInt(lossForm.recovered, 10) || 0,
      reason: lossForm.reason || 'Not recoverable',
    });
    await loadAll();
    setLossForm({ name: '', remaining: '', recovered: '', reason: '' });
    setLossOpen(false);
    flash('Loss recorded');
  };

  const filteredCustomers = customers.filter((c) => !search || (c.name + ' ' + (c.village || '')).toLowerCase().includes(search.toLowerCase()));

  const expByCategory = useMemo(() => {
    const map = {};
    expenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return map;
  }, [expenses]);

  const expByAgent = useMemo(() => {
    const map = {};
    expenses.forEach((e) => { map[e.agent_name] = (map[e.agent_name] || 0) + e.amount; });
    return map;
  }, [expenses]);

  if (loading || !summary) return <Centered><ActivityIndicator color={colors.brandNavy} /></Centered>;

  const maxVillage = Math.max(1, ...villages.map((v) => v.given));
  const maxBar = Math.max(1, ...summary.weekBars.map((b) => b.amount));

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <Header
        title={TITLES[screen]}
        subtitle="Owner · live data"
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,.12)', borderRadius: 9999, paddingVertical: 6, paddingHorizontal: 11 }}>
              <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '600' }}>{agents.length} agents</Text>
            </View>
            <TouchableOpacity onPress={onSwitchRole}><Text style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Switch</Text></TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        {screen === 'dashboard' && (
          <View style={{ padding: 16, gap: 14 }}>
            <View style={{ backgroundColor: colors.brandNavy, borderRadius: 12, padding: 18, ...cardShadowLg }}>
              <Text style={{ fontSize: 11.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>Money outside right now</Text>
              <Text style={{ fontSize: 38, fontWeight: '700', color: '#fff', marginTop: 6 }}>{F(summary.outside)}</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.15)' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)', fontWeight: '500' }}>Given out</Text>
                  <Text style={{ fontSize: 19, fontWeight: '700', color: '#fff', marginTop: 2 }}>{F(summary.given)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)', fontWeight: '500' }}>Collected</Text>
                  <Text style={{ fontSize: 19, fontWeight: '700', color: '#a5d6a7', marginTop: 2 }}>{F(summary.collected)}</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <DashTile label="Today's collection" value={F(summary.todayCollected)} sub={`of ${F(summary.todayExpected)} expected`} color={colors.success800} />
              <DashTile label="This week" value={F(summary.weekTotal)} sub="last 7 days" />
              <DashTile label="Pending now" value={F(summary.pendingNow)} sub="unpaid today" color={colors.warning900} />
              <DashTile label="Customers" value={String(summary.customerCount)} sub={`${summary.villageCount} villages`} />
              <DashTile label="Expenses" value={F(summary.expenses)} sub="this month" />
              <DashTile label="Losses" value={F(summary.losses)} sub={`${summary.lossCount} customers`} color={colors.error800} />
            </View>

            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, ...cardShadowSm }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15, fontWeight: '600' }}>Collection last 7 days</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.brandNavy }}>{F(summary.weekTotal)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 110, marginTop: 16 }}>
                {summary.weekBars.map((b, i) => (
                  <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: 'rgba(0,0,0,.5)' }}>{b.amount ? Math.round(b.amount / 1000) + 'k' : '—'}</Text>
                    <View style={{ width: '100%', borderRadius: 4, minHeight: 4, height: `${Math.round((b.amount / maxBar) * 100)}%`, backgroundColor: b.amount ? colors.brandPrimary600 : colors.neutral200 }} />
                    <Text style={{ fontSize: 10.5, fontWeight: '600', color: 'rgba(0,0,0,.6)' }}>{b.day}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, ...cardShadowSm }}>
              <Text style={{ fontSize: 15, fontWeight: '600' }}>Village comparison</Text>
              <View style={{ gap: 12, marginTop: 14 }}>
                {villages.map((v) => (
                  <View key={v.name}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(0,0,0,.75)' }}>{v.name}</Text>
                      <Text style={{ fontSize: 13, color: 'rgba(0,0,0,.5)' }}>{Math.round(v.given / 1000)}k / {Math.round(v.given / 1000)}k</Text>
                    </View>
                    <View style={{ height: 8, borderRadius: 9999, backgroundColor: colors.neutral200, marginTop: 6, overflow: 'hidden' }}>
                      <View style={{ height: '100%', borderRadius: 9999, backgroundColor: colors.brandPrimary600, width: `${Math.round((v.given / maxVillage) * 100)}%` }} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {screen === 'villages' && (
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>Villages</Text>
            {villages.map((v) => (
              <View key={v.id} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, ...cardShadowSm }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700' }}>{v.name}</Text>
                    <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 2 }}>{v.customerCount} customers</Text>
                  </View>
                  <TouchableOpacity onPress={() => setAssignFor(v.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.neutral300, borderRadius: 9999, paddingVertical: 6, paddingHorizontal: 10 }}>
                    <View style={{ width: 26, height: 26, borderRadius: 9999, backgroundColor: colors.brandPrimary50, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brandPrimary800 }}>{initials(v.agentName)}</Text>
                    </View>
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: 'rgba(0,0,0,.75)' }}>{v.agentName}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', gap: 1, backgroundColor: colors.neutral200, borderRadius: 8, overflow: 'hidden', marginTop: 14 }}>
                  <Tile label="Given" value={F(v.given)} />
                  <Tile label="Collected" value={F(v.collected)} color={colors.success800} />
                  <Tile label="Pending" value={F(v.pending)} color={colors.warning900} />
                </View>
              </View>
            ))}
          </View>
        )}

        {screen === 'agents' && (
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>Agents</Text>
            {agents.map((a) => (
              <View key={a.id} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, ...cardShadowSm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 9999, backgroundColor: colors.brandPrimary50, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.brandPrimary800 }}>{initials(a.name)}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 16.5, fontWeight: '700' }}>{a.name}</Text>
                    <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{a.villages.join(', ') || 'No village assigned'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleAgent(a)} style={{ borderRadius: 9999, paddingVertical: 5, paddingHorizontal: 11, backgroundColor: a.active ? colors.success50 : colors.neutral100 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: a.active ? colors.success800 : 'rgba(0,0,0,.5)' }}>{a.active ? 'Active' : 'Inactive'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, backgroundColor: colors.neutral200, borderRadius: 8, overflow: 'hidden', marginTop: 14 }}>
                  <Tile label="Collected this week" value={F(a.collectedThisWeek)} color={colors.success800} />
                  <Tile label="Pending" value={F(a.pending)} color={colors.warning900} />
                  <Tile label="Customers" value={String(a.customerCount)} />
                  <Tile label="Expenses" value={F(a.expenses)} />
                </View>
              </View>
            ))}
          </View>
        )}

        {screen === 'customers' && (
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>Customers</Text>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search name, village or agent" style={inputStyle} />
            {filteredCustomers.map((c) => (
              <View key={c.id} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...cardShadowSm }}>
                <View style={{ width: 40, height: 40, borderRadius: 9999, backgroundColor: colors.neutral200, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(0,0,0,.6)' }}>{initials(c.name)}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '600' }}>{c.name}</Text>
                  <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{c.village}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.brandNavy }}>{F(c.remaining)}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: c.isDone ? colors.success800 : c.missedWeeks.length ? colors.error800 : 'rgba(0,0,0,.5)' }}>
                    {c.isDone ? 'Done' : c.missedWeeks.length ? `Missed ${c.missedWeeks.length}` : 'On time'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {screen === 'more' && (
          <View style={{ padding: 16, gap: 10 }}>
            {[
              { label: 'Money given', sub: `${F(summary.given)} total`, key: 'given' },
              { label: 'Collections', sub: `${F(summary.weekTotal)} this week`, key: 'collections' },
              { label: 'Expenses', sub: `${F(summary.expenses)} this month`, key: 'expenses' },
              { label: 'Losses', sub: `${F(summary.losses)} not recovered`, key: 'losses' },
              { label: 'Reports', sub: 'Weekly and monthly summary', key: 'reports' },
            ].map((m) => (
              <TouchableOpacity key={m.key} onPress={() => go(m.key)} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...cardShadowSm }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600' }}>{m.label}</Text>
                  <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 2 }}>{m.sub}</Text>
                </View>
                <Text style={{ fontSize: 22, fontWeight: '300', color: 'rgba(0,0,0,.3)' }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {screen === 'given' && (
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BackArrow onPress={() => go('more')} />
              <Text style={{ fontSize: 18, fontWeight: '600' }}>Money given</Text>
            </View>
            <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, ...cardShadowSm }}>
              <Text style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: '500' }}>Given out total</Text>
              <Text style={{ fontSize: 28, fontWeight: '700', color: colors.brandNavy, marginTop: 2 }}>{F(summary.given)}</Text>
            </View>
            {[...customers].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).map((c) => (
              <View key={c.id} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...cardShadowSm }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '600' }}>{c.name}</Text>
                  <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{F(c.weekly)} weekly · {c.totalWeeks} weeks</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700' }}>{F(c.given)}</Text>
              </View>
            ))}
          </View>
        )}

        {screen === 'collections' && (
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BackArrow onPress={() => go('more')} />
              <Text style={{ fontSize: 18, fontWeight: '600' }}>Collections</Text>
            </View>
            <View style={{ backgroundColor: '#fff', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', gap: 14, ...cardShadowSm }}>
              <Stat label="Today" value={F(summary.todayCollected)} color={colors.success800} />
              <Stat label="This week" value={F(summary.weekTotal)} />
              <Stat label="Pending" value={F(summary.pendingNow)} color={colors.warning900} />
            </View>
            {agents.map((a) => (
              <View key={a.id} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, ...cardShadowSm }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 15, fontWeight: '600' }}>{a.name}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.brandNavy }}>{F(a.collectedThisWeek)}</Text>
                </View>
                <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 2 }}>{a.customerCount} customers · {F(a.pending)} pending</Text>
                <View style={{ height: 8, borderRadius: 9999, backgroundColor: colors.neutral200, marginTop: 10, overflow: 'hidden' }}>
                  <View style={{ height: '100%', borderRadius: 9999, backgroundColor: colors.success600, width: `${Math.round((a.collectedThisWeek / Math.max(1, a.collectedThisWeek + a.pending)) * 100)}%` }} />
                </View>
              </View>
            ))}
          </View>
        )}

        {screen === 'expenses' && (
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BackArrow onPress={() => go('more')} />
              <Text style={{ fontSize: 18, fontWeight: '600' }}>Expenses</Text>
            </View>
            <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, ...cardShadowSm }}>
              <Text style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: '500' }}>Total</Text>
              <Text style={{ fontSize: 28, fontWeight: '700', color: colors.brandNavy, marginTop: 2 }}>{F(summary.expenses)}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                {Object.entries(expByCategory).map(([label, value]) => (
                  <View key={label} style={{ flex: 1, backgroundColor: colors.neutral100, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: 'rgba(0,0,0,.55)', fontWeight: '500' }}>{label}</Text>
                    <Text style={{ fontSize: 14.5, fontWeight: '700', marginTop: 2 }}>{F(value)}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(0,0,0,.7)' }}>By agent</Text>
            {Object.entries(expByAgent).map(([name, value]) => (
              <View key={name} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...cardShadowSm }}>
                <Text style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600' }}>{name}</Text>
                <Text style={{ fontSize: 16, fontWeight: '700' }}>{F(value)}</Text>
              </View>
            ))}
          </View>
        )}

        {screen === 'losses' && (
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BackArrow onPress={() => go('more')} />
              <Text style={{ fontSize: 18, fontWeight: '600', flex: 1 }}>Losses</Text>
              <TouchableOpacity onPress={() => setLossOpen(true)} style={{ backgroundColor: colors.error800, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 13 }}>
                <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '600' }}>+ Record loss</Text>
              </TouchableOpacity>
            </View>
            <View style={{ backgroundColor: colors.error50, borderWidth: 1, borderColor: colors.error200, borderRadius: 10, padding: 16 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.error800 }}>Total money not recovered</Text>
              <Text style={{ fontSize: 28, fontWeight: '700', color: colors.error900, marginTop: 2 }}>{F(summary.losses)}</Text>
              <Text style={{ fontSize: 12, color: colors.error800, marginTop: 2 }}>{losses.length} customers · {summary.given ? Math.round((summary.losses / summary.given) * 100) : 0}% of money given</Text>
            </View>
            {losses.map((l) => (
              <View key={l.id} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, ...cardShadowSm }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '600' }}>{l.customer_name}</Text>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.error800 }}>{F(l.remaining - l.recovered)}</Text>
                </View>
                <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 2 }}>{l.village} · {l.agent_name} · recovered {F(l.recovered)} of {F(l.remaining)}</Text>
                <View style={{ marginTop: 8, backgroundColor: colors.neutral50, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 11 }}>
                  <Text style={{ fontSize: 13, color: 'rgba(0,0,0,.7)' }}>{l.reason}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {screen === 'reports' && (
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BackArrow onPress={() => go('more')} />
              <Text style={{ fontSize: 18, fontWeight: '600' }}>Reports</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['This week', 'This month', 'This year'].map((r) => (
                <TouchableOpacity key={r} onPress={() => setRange(r)} style={{ flex: 1, alignItems: 'center', borderRadius: 6, paddingVertical: 10, backgroundColor: range === r ? colors.brandNavy : '#fff' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: range === r ? '#fff' : 'rgba(0,0,0,.65)' }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, ...cardShadowSm }}>
              <Text style={{ fontSize: 15, fontWeight: '600' }}>{range} summary</Text>
              <LedgerRow label="Money given out" value={F(summary.given)} color={colors.brandNavy} />
              <LedgerRow label="Total to collect" value={F(summary.toCollect)} color={colors.brandPrimary800} />
              <LedgerRow label="Collected so far" value={F(summary.collected)} color={colors.success800} />
              <LedgerRow label="Still outside" value={F(summary.outside)} color={colors.warning900} />
              <LedgerRow label="Expenses" value={F(summary.expenses)} color="rgba(0,0,0,.6)" />
              <LedgerRow label="Losses" value={F(summary.losses)} color={colors.error800} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14 }}>
                <Text style={{ fontSize: 15, fontWeight: '700' }}>Net result</Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.brandNavy }}>{F(summary.net)}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <BottomNav tabs={TABS} active={activeTab} onChange={go} />

      <BottomSheet visible={!!assignFor} onClose={() => setAssignFor(null)}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Agent for {villages.find((v) => v.id === assignFor)?.name}</Text>
        <Text style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', marginTop: 2 }}>Pick who collects here</Text>
        <View style={{ gap: 8, marginTop: 14 }}>
          {agents.map((a) => {
            const current = villages.find((v) => v.id === assignFor)?.agentId === a.id;
            return (
              <TouchableOpacity key={a.id} onPress={() => assignAgent(a.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 10, padding: 14, backgroundColor: current ? colors.brandPrimary50 : '#fff', borderColor: current ? colors.brandPrimary600 : colors.neutral300 }}>
                <View style={{ width: 34, height: 34, borderRadius: 9999, backgroundColor: colors.brandPrimary50, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.brandPrimary800 }}>{initials(a.name)}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600' }}>{a.name}</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(0,0,0,.55)' }}>{a.customerCount} customers · {a.active ? 'active' : 'inactive'}</Text>
                </View>
                {current && <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.brandPrimary800 }}>Current</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>

      <BottomSheet visible={lossOpen} onClose={() => setLossOpen(false)}>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Record a loss</Text>
          <TextInput value={lossForm.name} onChangeText={(t) => setLossForm((f) => ({ ...f, name: t }))} placeholder="Customer name" style={inputStyle} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput value={lossForm.remaining} onChangeText={(t) => setLossForm((f) => ({ ...f, remaining: t.replace(/[^0-9]/g, '') }))} placeholder="Remaining ₹" keyboardType="numeric" style={{ ...inputStyle, flex: 1 }} />
            <TextInput value={lossForm.recovered} onChangeText={(t) => setLossForm((f) => ({ ...f, recovered: t.replace(/[^0-9]/g, '') }))} placeholder="Recovered ₹" keyboardType="numeric" style={{ ...inputStyle, flex: 1 }} />
          </View>
          <TextInput value={lossForm.reason} onChangeText={(t) => setLossForm((f) => ({ ...f, reason: t }))} placeholder="Reason" style={inputStyle} />
          <View style={{ backgroundColor: colors.error50, borderRadius: 8, padding: 13, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, color: colors.error800 }}>Loss amount</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.error900 }}>{F(Math.max(0, (parseInt(lossForm.remaining, 10) || 0) - (parseInt(lossForm.recovered, 10) || 0)))}</Text>
          </View>
          <TouchableOpacity onPress={saveLoss} style={{ alignItems: 'center', backgroundColor: colors.error800, borderRadius: 10, padding: 15 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save loss</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <Toast message={toast} />
    </View>
  );
}

function Centered({ children }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
}

function DashTile({ label, value, sub, color }) {
  return (
    <View style={{ width: '47%', backgroundColor: '#fff', borderRadius: 10, padding: 14, ...cardShadowSm }}>
      <Text style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: '500' }}>{label}</Text>
      <Text style={{ fontSize: 21, fontWeight: '700', marginTop: 3, color: color || 'rgba(0,0,0,.87)' }}>{value}</Text>
      <Text style={{ fontSize: 11.5, color: 'rgba(0,0,0,.45)', marginTop: 2 }}>{sub}</Text>
    </View>
  );
}

function Tile({ label, value, color }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral50, padding: 10 }}>
      <Text style={{ fontSize: 11, color: 'rgba(0,0,0,.55)' }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', marginTop: 2, color: color || 'rgba(0,0,0,.87)' }}>{value}</Text>
    </View>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: '500' }}>{label}</Text>
      <Text style={{ fontSize: 19, fontWeight: '700', marginTop: 2, color: color || 'rgba(0,0,0,.87)' }}>{value}</Text>
    </View>
  );
}

function LedgerRow({ label, value, color }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral100 }}>
      <Text style={{ fontSize: 14, color: 'rgba(0,0,0,.7)' }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color }}>{value}</Text>
    </View>
  );
}

function BackArrow({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingVertical: 2, paddingHorizontal: 6 }}>
      <Text style={{ fontSize: 22, color: 'rgba(0,0,0,.6)' }}>‹</Text>
    </TouchableOpacity>
  );
}

const inputStyle = { fontSize: 15, borderWidth: 1, borderColor: colors.neutral300, borderRadius: 9999, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#fff' };
