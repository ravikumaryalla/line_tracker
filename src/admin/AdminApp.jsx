import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { F, initials } from '../format';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Toast from '../components/Toast';

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

  const flash = (msg) => setToast(msg) || setTimeout(() => setToast(''), 2200);

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

  if (loading || !summary) return <Centered>Loading…</Centered>;

  const maxVillage = Math.max(1, ...villages.map((v) => v.given));
  const maxBar = Math.max(1, ...summary.weekBars.map((b) => b.amount));

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f5f5', position: 'relative', overflow: 'hidden' }}>
      <Header
        title={TITLES[screen]}
        subtitle="Owner · live data"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, background: 'rgba(255,255,255,.12)', borderRadius: 9999, padding: '6px 11px', whiteSpace: 'nowrap' }}>{agents.length} agents</div>
            <div onClick={onSwitchRole} style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', cursor: 'pointer' }}>Switch</div>
          </div>
        }
      />

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {screen === 'dashboard' && (
          <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--brand-navy)', color: '#fff', borderRadius: 12, padding: 18, boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>Money outside right now</div>
              <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.1, marginTop: 6 }}>{F(summary.outside)}</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.15)' }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)', fontWeight: 500 }}>Given out</div><div style={{ fontSize: 19, fontWeight: 700, marginTop: 2 }}>{F(summary.given)}</div></div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)', fontWeight: 500 }}>Collected</div><div style={{ fontSize: 19, fontWeight: 700, marginTop: 2, color: '#a5d6a7' }}>{F(summary.collected)}</div></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <DashTile label="Today's collection" value={F(summary.todayCollected)} sub={`of ${F(summary.todayExpected)} expected`} color="#2e7d32" />
              <DashTile label="This week" value={F(summary.weekTotal)} sub="last 7 days" />
              <DashTile label="Pending now" value={F(summary.pendingNow)} sub="unpaid today" color="#e65100" />
              <DashTile label="Customers" value={String(summary.customerCount)} sub={`${summary.villageCount} villages`} />
              <DashTile label="Expenses" value={F(summary.expenses)} sub="this month" />
              <DashTile label="Losses" value={F(summary.losses)} sub={`${summary.lossCount} customers`} color="#c62828" />
            </div>

            <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Collection last 7 days</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand-navy)' }}>{F(summary.weekTotal)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110, marginTop: 16 }}>
                {summary.weekBars.map((b, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(0,0,0,.5)' }}>{b.amount ? Math.round(b.amount / 1000) + 'k' : '—'}</div>
                    <div style={{ width: '100%', borderRadius: '4px 4px 0 0', minHeight: 4, height: `${Math.round((b.amount / maxBar) * 100)}%`, background: b.amount ? '#1e88e5' : '#eeeeee' }} />
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(0,0,0,.6)' }}>{b.day}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Village comparison</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
                {villages.map((v) => (
                  <div key={v.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.75)' }}>
                      <span>{v.name}</span><span style={{ color: 'rgba(0,0,0,.5)' }}>{Math.round(v.given / 1000)}k / {Math.round(v.given / 1000)}k</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 9999, background: '#eeeeee', marginTop: 6, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 9999, background: '#1e88e5', width: `${Math.round((v.given / maxVillage) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {screen === 'villages' && (
          <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Villages</div>
            {villages.map((v) => (
              <div key={v.id} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{v.name}</div>
                    <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 2 }}>{v.customerCount} customers</div>
                  </div>
                  <div onClick={() => setAssignFor(v.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e0e0e0', borderRadius: 9999, padding: '6px 10px 6px 6px', cursor: 'pointer', flex: 'none' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 9999, background: '#e3f2fd', color: '#1565c0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{initials(v.agentName)}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(0,0,0,.75)', whiteSpace: 'nowrap' }}>{v.agentName}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: '#eeeeee', borderRadius: 8, overflow: 'hidden', marginTop: 14 }}>
                  <Tile label="Given" value={F(v.given)} />
                  <Tile label="Collected" value={F(v.collected)} color="#2e7d32" />
                  <Tile label="Pending" value={F(v.pending)} color="#e65100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {screen === 'agents' && (
          <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Agents</div>
            {agents.map((a) => (
              <div key={a.id} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 9999, background: '#e3f2fd', color: '#1565c0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flex: 'none' }}>{initials(a.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16.5, fontWeight: 700 }}>{a.name}</div>
                    <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{a.villages.join(', ') || 'No village assigned'}</div>
                  </div>
                  <div onClick={() => toggleAgent(a)} style={{ fontSize: 11.5, fontWeight: 700, borderRadius: 9999, padding: '5px 11px', cursor: 'pointer', background: a.active ? '#e8f5e9' : '#f5f5f5', color: a.active ? '#2e7d32' : 'rgba(0,0,0,.5)' }}>{a.active ? 'Active' : 'Inactive'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#eeeeee', borderRadius: 8, overflow: 'hidden', marginTop: 14 }}>
                  <Tile label="Collected this week" value={F(a.collectedThisWeek)} color="#2e7d32" />
                  <Tile label="Pending" value={F(a.pending)} color="#e65100" />
                  <Tile label="Customers" value={String(a.customerCount)} />
                  <Tile label="Expenses" value={F(a.expenses)} />
                </div>
              </div>
            ))}
          </div>
        )}

        {screen === 'customers' && (
          <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Customers</div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, village or agent" style={inputStyle} />
            {filteredCustomers.map((c) => (
              <div key={c.id} style={{ background: '#fff', borderRadius: 10, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 9999, background: '#eeeeee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,.6)', flex: 'none' }}>{initials(c.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{c.village}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand-navy)' }}>{F(c.remaining)}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: c.isDone ? '#2e7d32' : c.missedWeeks.length ? '#c62828' : 'rgba(0,0,0,.5)' }}>
                    {c.isDone ? 'Done' : c.missedWeeks.length ? `Missed ${c.missedWeeks.length}` : 'On time'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {screen === 'more' && (
          <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Money given', sub: `${F(summary.given)} total`, key: 'given' },
              { label: 'Collections', sub: `${F(summary.weekTotal)} this week`, key: 'collections' },
              { label: 'Expenses', sub: `${F(summary.expenses)} this month`, key: 'expenses' },
              { label: 'Losses', sub: `${F(summary.losses)} not recovered`, key: 'losses' },
              { label: 'Reports', sub: 'Weekly and monthly summary', key: 'reports' },
            ].map((m) => (
              <div key={m.key} onClick={() => go(m.key)} style={{ background: '#fff', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{m.label}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 2 }}>{m.sub}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 300, color: 'rgba(0,0,0,.3)' }}>›</div>
              </div>
            ))}
          </div>
        )}

        {screen === 'given' && (
          <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BackArrow onClick={() => go('more')} />
              <div style={{ fontSize: 18, fontWeight: 600 }}>Money given</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: 500 }}>Given out total</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--brand-navy)', marginTop: 2 }}>{F(summary.given)}</div>
            </div>
            {[...customers].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).map((c) => (
              <div key={c.id} style={{ background: '#fff', borderRadius: 10, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{F(c.weekly)} weekly · {c.totalWeeks} weeks</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{F(c.given)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {screen === 'collections' && (
          <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BackArrow onClick={() => go('more')} />
              <div style={{ fontSize: 18, fontWeight: 600 }}>Collections</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
              <Stat label="Today" value={F(summary.todayCollected)} color="#2e7d32" />
              <Stat label="This week" value={F(summary.weekTotal)} />
              <Stat label="Pending" value={F(summary.pendingNow)} color="#e65100" />
            </div>
            {agents.map((a) => (
              <div key={a.id} style={{ background: '#fff', borderRadius: 10, padding: 14, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--brand-navy)' }}>{F(a.collectedThisWeek)}</div>
                </div>
                <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 2 }}>{a.customerCount} customers · {F(a.pending)} pending</div>
                <div style={{ height: 8, borderRadius: 9999, background: '#eeeeee', marginTop: 10, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 9999, background: '#43a047', width: `${Math.round((a.collectedThisWeek / Math.max(1, a.collectedThisWeek + a.pending)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {screen === 'expenses' && (
          <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BackArrow onClick={() => go('more')} />
              <div style={{ fontSize: 18, fontWeight: 600 }}>Expenses</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: 500 }}>Total</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--brand-navy)', marginTop: 2 }}>{F(summary.expenses)}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                {Object.entries(expByCategory).map(([label, value]) => (
                  <div key={label} style={{ flex: 1, background: '#f5f5f5', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'rgba(0,0,0,.55)', fontWeight: 500 }}>{label}</div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 2 }}>{F(value)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, padding: '0 2px', color: 'rgba(0,0,0,.7)' }}>By agent</div>
            {Object.entries(expByAgent).map(([name, value]) => (
              <div key={name} style={{ background: '#fff', borderRadius: 10, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600 }}>{name}</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{F(value)}</div>
              </div>
            ))}
          </div>
        )}

        {screen === 'losses' && (
          <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BackArrow onClick={() => go('more')} />
              <div style={{ fontSize: 18, fontWeight: 600, flex: 1 }}>Losses</div>
              <div onClick={() => setLossOpen(true)} style={{ background: '#c62828', color: '#fff', borderRadius: 8, padding: '9px 13px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>+ Record loss</div>
            </div>
            <div style={{ background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#c62828' }}>Total money not recovered</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#b71c1c', marginTop: 2 }}>{F(summary.losses)}</div>
              <div style={{ fontSize: 12, color: '#c62828', marginTop: 2 }}>{losses.length} customers · {summary.given ? Math.round((summary.losses / summary.given) * 100) : 0}% of money given</div>
            </div>
            {losses.map((l) => (
              <div key={l.id} style={{ background: '#fff', borderRadius: 10, padding: 14, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 15.5, fontWeight: 600 }}>{l.customer_name}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#c62828' }}>{F(l.remaining - l.recovered)}</div>
                </div>
                <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 2 }}>{l.village} · {l.agent_name} · recovered {F(l.recovered)} of {F(l.remaining)}</div>
                <div style={{ fontSize: 13, color: 'rgba(0,0,0,.7)', marginTop: 8, background: '#fafafa', borderRadius: 6, padding: '9px 11px' }}>{l.reason}</div>
              </div>
            ))}
          </div>
        )}

        {screen === 'reports' && (
          <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BackArrow onClick={() => go('more')} />
              <div style={{ fontSize: 18, fontWeight: 600 }}>Reports</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['This week', 'This month', 'This year'].map((r) => (
                <div key={r} onClick={() => setRange(r)} style={{ flex: 1, textAlign: 'center', borderRadius: 6, padding: '10px 4px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: range === r ? 'var(--brand-navy)' : '#fff', color: range === r ? '#fff' : 'rgba(0,0,0,.65)' }}>{r}</div>
              ))}
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{range} summary</div>
              <LedgerRow label="Money given out" value={F(summary.given)} color="var(--brand-navy)" />
              <LedgerRow label="Total to collect" value={F(summary.toCollect)} color="#1565c0" />
              <LedgerRow label="Collected so far" value={F(summary.collected)} color="#2e7d32" />
              <LedgerRow label="Still outside" value={F(summary.outside)} color="#e65100" />
              <LedgerRow label="Expenses" value={F(summary.expenses)} color="rgba(0,0,0,.6)" />
              <LedgerRow label="Losses" value={F(summary.losses)} color="#c62828" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 2px' }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Net result</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--brand-navy)' }}>{F(summary.net)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav tabs={TABS} active={activeTab} onChange={go} />

      {assignFor && (
        <BottomSheet onClose={() => setAssignFor(null)}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Agent for {villages.find((v) => v.id === assignFor)?.name}</div>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', marginTop: 2 }}>Pick who collects here</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {agents.map((a) => {
              const current = villages.find((v) => v.id === assignFor)?.agentId === a.id;
              return (
                <div key={a.id} onClick={() => assignAgent(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid', borderRadius: 10, padding: '13px 14px', cursor: 'pointer', background: current ? '#e3f2fd' : '#fff', borderColor: current ? '#1e88e5' : '#e0e0e0' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9999, background: '#e3f2fd', color: '#1565c0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700, flex: 'none' }}>{initials(a.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,.55)' }}>{a.customerCount} customers · {a.active ? 'active' : 'inactive'}</div>
                  </div>
                  {current && <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1565c0' }}>Current</div>}
                </div>
              );
            })}
          </div>
        </BottomSheet>
      )}

      {lossOpen && (
        <BottomSheet onClose={() => setLossOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Record a loss</div>
            <input value={lossForm.name} onChange={(e) => setLossForm((f) => ({ ...f, name: e.target.value }))} placeholder="Customer name" style={inputStyle} />
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={lossForm.remaining} onChange={(e) => setLossForm((f) => ({ ...f, remaining: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="Remaining ₹" inputMode="numeric" style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
              <input value={lossForm.recovered} onChange={(e) => setLossForm((f) => ({ ...f, recovered: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="Recovered ₹" inputMode="numeric" style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
            </div>
            <input value={lossForm.reason} onChange={(e) => setLossForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Reason" style={inputStyle} />
            <div style={{ background: '#ffebee', borderRadius: 8, padding: 13, display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#c62828' }}>
              <span>Loss amount</span>
              <strong style={{ fontSize: 17, color: '#b71c1c' }}>{F(Math.max(0, (parseInt(lossForm.remaining, 10) || 0) - (parseInt(lossForm.recovered, 10) || 0)))}</strong>
            </div>
            <div onClick={saveLoss} style={{ textAlign: 'center', background: '#c62828', color: '#fff', borderRadius: 10, padding: 15, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Save loss</div>
          </div>
        </BottomSheet>
      )}

      <Toast message={toast} />
    </div>
  );
}

function Centered({ children }) {
  return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,.5)' }}>{children}</div>;
}

function DashTile({ label, value, sub, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 14, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 700, marginTop: 3, color: color || 'rgba(0,0,0,.87)' }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.45)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function Tile({ label, value, color }) {
  return (
    <div style={{ background: '#fafafa', padding: '10px 12px' }}>
      <div style={{ fontSize: 11, color: 'rgba(0,0,0,.55)' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: color || 'inherit' }}>{value}</div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, marginTop: 2, color: color || 'inherit' }}>{value}</div>
    </div>
  );
}

function LedgerRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
      <div style={{ fontSize: 14, color: 'rgba(0,0,0,.7)' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function BackArrow({ onClick }) {
  return <div onClick={onClick} style={{ fontSize: 22, color: 'rgba(0,0,0,.6)', cursor: 'pointer', lineHeight: 1, padding: '2px 6px 4px' }}>‹</div>;
}

function BottomSheet({ children, onClose }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 20 }}>
      <div onClick={onClose} style={{ flex: 1 }} />
      <div style={{ background: '#fff', borderRadius: '18px 18px 0 0', padding: '18px 18px 22px' }}>{children}</div>
    </div>
  );
}

const inputStyle = { width: '100%', fontSize: 15, fontFamily: 'inherit', border: '1px solid #e0e0e0', borderRadius: 9999, padding: '12px 16px', outline: 'none', background: '#fff' };
