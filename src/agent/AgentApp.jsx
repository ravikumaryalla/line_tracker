import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { F, initials, tint } from '../format';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Toast from '../components/Toast';
import KeypadSheet from '../components/KeypadSheet';

const AGENT_ID = 1; // Mani Selvam — the signed-in field agent for this prototype.
const TABS = [['Home', 'home'], ['Customers', 'customers'], ['Collections', 'collections'], ['History', 'history'], ['Expenses', 'expenses']];
const ACTIVE_TAB = { detail: 'customers', give: 'customers', pending: 'collections' };
const EXPENSE_CATS = ['Travel', 'Fuel', 'Food', 'Other'];

export default function AgentApp({ onSwitchRole }) {
  const [screen, setScreen] = useState('home');
  const [customers, setCustomers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [collectFor, setCollectFor] = useState(null);
  const [amt, setAmt] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [unsynced, setUnsynced] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [expCat, setExpCat] = useState('Fuel');
  const [expAmt, setExpAmt] = useState('');
  const [expNote, setExpNote] = useState('');
  const [give, setGive] = useState({ name: '', amt: '', weekly: '', weeks: '' });
  const [loading, setLoading] = useState(true);

  const flash = (msg) => setToast(msg) || setTimeout(() => setToast(''), 2200);

  const loadCustomers = () => api.customers.list({ agentId: AGENT_ID }).then(setCustomers);
  const loadExpenses = () => api.expenses.list(AGENT_ID).then(setExpenses);

  useEffect(() => {
    Promise.all([loadCustomers(), loadExpenses()]).finally(() => setLoading(false));
  }, []);

  const go = (s) => { setScreen(s); setCollectFor(null); setAmt(''); };
  const back = () => go(screen === 'detail' || screen === 'give' ? 'customers' : 'home');

  const dueList = useMemo(() => customers.filter((c) => !c.isDone), [customers]);
  const expected = dueList.reduce((s, c) => s + c.weekly, 0);
  const collected = customers.reduce((s, c) => s + c.paidToday, 0);
  const pct = expected ? Math.min(100, Math.round((collected / expected) * 100)) : 0;
  const leftCount = dueList.filter((c) => !c.isPaidToday).length;

  const filteredCustomers = customers.filter(
    (c) => !search || (c.name + ' ' + (c.village || '')).toLowerCase().includes(search.toLowerCase())
  );

  const pendingRows = [];
  customers.forEach((c) => {
    (c.missedWeeks || []).forEach((w) =>
      pendingRows.push({ name: c.name, sub: `Week ${w} · ${c.village}`, amount: c.weekly, status: 'Missed', open: () => { setSelectedId(c.id); go('detail'); } })
    );
    Object.keys(c.partialWeeks || {}).forEach((w) =>
      pendingRows.push({ name: c.name, sub: `Week ${w} · paid ${F(c.partialWeeks[w])} of ${F(c.weekly)}`, amount: c.weekly - c.partialWeeks[w], status: 'Part paid', open: () => { setSelectedId(c.id); go('detail'); } })
    );
    if (!c.isDone && !c.isPaidToday) {
      pendingRows.push({ name: c.name, sub: `Week ${c.currentWeek} · due today`, amount: c.weekly, status: 'Pending', open: () => { setSelectedId(c.id); go('detail'); } });
    }
  });

  const openCollect = (id) => { setCollectFor(id); setAmt(''); };
  const closeCollect = () => { setCollectFor(null); setAmt(''); };
  const collectTarget = customers.find((c) => c.id === collectFor);

  const saveCollect = async () => {
    const amount = parseInt(String(amt).replace(/[^0-9]/g, ''), 10);
    if (!collectTarget || !amount) { flash('Enter the amount received'); return; }
    setSaving(true);
    try {
      await api.customers.collect(collectTarget.id, amount);
      await loadCustomers();
      setUnsynced((n) => n + 1);
      closeCollect();
      flash(`${F(amount)} from ${collectTarget.name.split(' ')[0]} — saved on phone`);
    } catch (e) {
      flash(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onKeypad = (kind, val) => {
    if (kind === 'set') { setAmt(val); return; }
    setAmt((prev) => (val === '⌫' ? String(prev).slice(0, -1) : String(prev) + val));
  };

  const saveExpense = async () => {
    const a = parseInt(expAmt, 10);
    if (!a) { flash('Enter the amount'); return; }
    await api.expenses.create({ agentId: AGENT_ID, category: expCat, amount: a, note: expNote });
    await loadExpenses();
    setExpAmt(''); setExpNote(''); setExpenseFormOpen(false);
    flash('Expense saved');
  };

  const saveGive = async () => {
    const gAmt = parseInt(give.amt, 10) || 0;
    const gWeekly = parseInt(give.weekly, 10) || 0;
    const gWeeks = parseInt(give.weeks, 10) || 0;
    if (!give.name || !gAmt || !gWeekly || !gWeeks) { flash('Fill name, amount, weekly and weeks'); return; }
    await api.customers.create({ name: give.name, agentId: AGENT_ID, given: gAmt, weekly: gWeekly, weeks: gWeeks });
    await loadCustomers();
    setGive({ name: '', amt: '', weekly: '', weeks: '' });
    setUnsynced((n) => n + 1);
    go('customers');
    flash(`Schedule created — ${gWeeks} weekly payments`);
  };

  const selected = customers.find((c) => c.id === selectedId);
  const activeTab = ACTIVE_TAB[screen] || screen;

  if (loading) return <Centered>Loading…</Centered>;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f5f5', position: 'relative', overflow: 'hidden' }}>
      <Header
        title="Mani Selvam"
        subtitle="Kollur · Ammapet · Vadugapatti"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {unsynced > 0 && (
              <div
                onClick={() => { setUnsynced(0); flash('All collections sent to office'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.22)', borderRadius: 9999, padding: '6px 11px', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                <span style={{ width: 7, height: 7, borderRadius: 9999, background: '#ffb74d', display: 'block' }} />
                {unsynced} to sync
              </div>
            )}
            <div onClick={onSwitchRole} style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', cursor: 'pointer' }}>Switch</div>
          </div>
        }
      />

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {screen === 'home' && (
          <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-md)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,.5)' }}>Today's collection</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
                <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--brand-navy)', lineHeight: 1 }}>{F(collected)}</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: 'rgba(0,0,0,.45)' }}>/ {F(expected)}</div>
              </div>
              <div style={{ height: 10, borderRadius: 9999, background: '#eeeeee', marginTop: 14, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 9999, background: '#43a047', width: `${pct}%` }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <div style={{ flex: 1, background: '#f5f5f5', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: 500 }}>Still to collect</div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: '#e65100', marginTop: 2 }}>{F(Math.max(0, expected - collected))}</div>
                </div>
                <div style={{ flex: 1, background: '#f5f5f5', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: 500 }}>Customers left</div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: 'rgba(0,0,0,.87)', marginTop: 2 }}>{leftCount}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(0,0,0,.87)' }}>Due today · {dueList.length}</div>
              <div onClick={() => go('pending')} style={{ fontSize: 13, fontWeight: 500, color: '#1e88e5', cursor: 'pointer' }}>See pending</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dueList.map((c, i) => (
                <CustomerRow key={c.id} c={c} i={i} onOpen={() => { setSelectedId(c.id); go('detail'); }} onCollect={() => openCollect(c.id)} />
              ))}
            </div>
          </div>
        )}

        {(screen === 'collections') && (
          <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Today's collections</div>
            <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
              <Stat label="Expected" value={F(expected)} />
              <Stat label="Collected" value={F(collected)} color="#2e7d32" />
              <Stat label="Remaining" value={F(Math.max(0, expected - collected))} color="#e65100" />
            </div>
            {dueList.map((c, i) => (
              <CustomerRow key={c.id} c={c} i={i} onOpen={() => { setSelectedId(c.id); go('detail'); }} onCollect={() => openCollect(c.id)} />
            ))}
          </div>
        )}

        {screen === 'customers' && (
          <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 600, flex: 1 }}>Customers</div>
              <div onClick={() => go('give')} style={{ background: 'var(--brand-navy)', color: '#fff', borderRadius: 8, padding: '9px 13px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Give money</div>
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or village" style={inputStyle('9999px')} />
            {filteredCustomers.map((c, i) => (
              <div key={c.id} onClick={() => { setSelectedId(c.id); go('detail'); }} style={{ background: '#fff', borderRadius: 10, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                <Avatar name={c.name} i={i} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{c.village} · {F(c.weekly)}/week</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand-navy)' }}>{F(c.remaining)}</div>
                  <div style={{ fontSize: 11, color: 'rgba(0,0,0,.5)' }}>left to pay</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {screen === 'detail' && selected && (
          <DetailScreen customer={selected} onBack={back} onCollect={() => openCollect(selected.id)} />
        )}

        {screen === 'pending' && (
          <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BackArrow onClick={back} />
              <div style={{ fontSize: 18, fontWeight: 600 }}>Pending &amp; missed</div>
            </div>
            <div style={{ background: '#fff3e0', border: '1px solid #ffcc80', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e65100' }}>{pendingRows.length} weeks unpaid</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#e65100', marginTop: 4 }}>{F(pendingRows.reduce((s, p) => s + p.amount, 0))}</div>
            </div>
            {pendingRows.map((p, i) => (
              <div key={i} onClick={p.open} style={{ background: '#fff', borderRadius: 10, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{p.sub}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#e65100' }}>{F(p.amount)}</div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}

        {screen === 'history' && <HistoryScreen todayFmt={F(collected)} />}

        {screen === 'expenses' && (
          <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 600, flex: 1 }}>My expenses</div>
              <div onClick={() => setExpenseFormOpen((o) => !o)} style={{ background: 'var(--brand-navy)', color: '#fff', borderRadius: 8, padding: '9px 13px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>+ Add</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: 500 }}>This week</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--brand-navy)', marginTop: 2 }}>{F(expenses.reduce((s, e) => s + e.amount, 0))}</div>
            </div>
            {expenseFormOpen && (
              <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {EXPENSE_CATS.map((c) => (
                    <div key={c} onClick={() => setExpCat(c)} style={{ borderRadius: 9999, padding: '9px 15px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', border: '1px solid', background: expCat === c ? 'var(--brand-navy)' : '#fff', color: expCat === c ? '#fff' : 'rgba(0,0,0,.7)', borderColor: expCat === c ? 'var(--brand-navy)' : '#e0e0e0' }}>{c}</div>
                  ))}
                </div>
                <input value={expAmt} onChange={(e) => setExpAmt(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Amount ₹" inputMode="numeric" style={{ ...inputStyle(8), fontSize: 20, fontWeight: 700 }} />
                <input value={expNote} onChange={(e) => setExpNote(e.target.value)} placeholder="Note (optional)" style={inputStyle(8)} />
                <div onClick={saveExpense} style={{ textAlign: 'center', background: '#43a047', color: '#fff', borderRadius: 8, padding: 13, fontSize: 15.5, fontWeight: 700, cursor: 'pointer' }}>Save expense</div>
              </div>
            )}
            {expenses.map((e) => (
              <div key={e.id} style={{ background: '#fff', borderRadius: 10, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{e.category}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{e.expense_date}{e.note ? ` · ${e.note}` : ''}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{F(e.amount)}</div>
              </div>
            ))}
          </div>
        )}

        {screen === 'give' && (
          <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BackArrow onClick={back} />
              <div style={{ fontSize: 18, fontWeight: 600 }}>Give money</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Customer">
                <input value={give.name} onChange={(e) => setGive((g) => ({ ...g, name: e.target.value }))} placeholder="Name" style={inputStyle(8, 16)} />
              </Field>
              <Field label="Amount given">
                <input value={give.amt} onChange={(e) => setGive((g) => ({ ...g, amt: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="₹ 10,000" inputMode="numeric" style={{ ...inputStyle(8, 22), fontWeight: 700, color: 'var(--brand-navy)' }} />
              </Field>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <Field label="Weekly payment">
                    <input value={give.weekly} onChange={(e) => setGive((g) => ({ ...g, weekly: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="₹ 1,000" inputMode="numeric" style={{ ...inputStyle(8, 17), fontWeight: 600, minWidth: 0 }} />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="Total weeks">
                    <input value={give.weeks} onChange={(e) => setGive((g) => ({ ...g, weeks: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="12" inputMode="numeric" style={{ ...inputStyle(8, 17), fontWeight: 600, minWidth: 0 }} />
                  </Field>
                </div>
              </div>
              <div style={{ background: '#e3f2fd', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'rgba(0,0,0,.7)' }}>
                  <span>Total to collect</span>
                  <strong style={{ color: 'var(--brand-navy)', fontSize: 16 }}>{F((parseInt(give.weekly, 10) || 0) * (parseInt(give.weeks, 10) || 0))}</strong>
                </div>
              </div>
              <div onClick={saveGive} style={{ textAlign: 'center', background: 'var(--brand-navy)', color: '#fff', borderRadius: 10, padding: 15, fontSize: 16.5, fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-lg)' }}>Save &amp; create schedule</div>
            </div>
          </div>
        )}
      </div>

      <BottomNav tabs={TABS} active={activeTab} onChange={go} />

      {collectFor && collectTarget && (
        <KeypadSheet
          name={collectTarget.name}
          sub={`Week ${collectTarget.currentWeek} · due ${F(collectTarget.weekly)}`}
          weekly={collectTarget.weekly}
          amount={amt}
          onKey={onKeypad}
          onSave={saveCollect}
          onClose={closeCollect}
          saving={saving}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}

function Centered({ children }) {
  return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,.5)' }}>{children}</div>;
}

function Avatar({ name, i, size = 42 }) {
  const [bg, fg] = tint(i);
  return (
    <div style={{ width: size, height: size, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.33, fontWeight: 600, flex: 'none', background: bg, color: fg }}>
      {initials(name)}
    </div>
  );
}

function CustomerRow({ c, i, onOpen, onCollect }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
      <div onClick={onOpen} style={{ cursor: 'pointer' }}><Avatar name={c.name} i={i} /></div>
      <div onClick={onOpen} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
        <div style={{ fontSize: 15.5, fontWeight: 600, color: 'rgba(0,0,0,.87)' }}>{c.name}</div>
        <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>Week {c.currentWeek} of {c.totalWeeks} · {c.village}</div>
      </div>
      {c.isPaidToday ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#2e7d32' }}>{F(c.paidToday)}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#2e7d32', background: '#e8f5e9', borderRadius: 9999, padding: '2px 8px' }}>Paid</div>
        </div>
      ) : (
        <div onClick={onCollect} style={{ background: '#1e88e5', color: '#fff', borderRadius: 8, padding: '11px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: 'var(--shadow-md)' }}>Collect {F(c.weekly)}</div>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: color || 'inherit' }}>{value}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(0,0,0,.6)', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function BackArrow({ onClick }) {
  return <div onClick={onClick} style={{ fontSize: 22, color: 'rgba(0,0,0,.6)', cursor: 'pointer', lineHeight: 1, padding: '2px 6px 4px' }}>‹</div>;
}

function StatusBadge({ status }) {
  const map = {
    Paid: ['#e8f5e9', '#2e7d32'],
    Pending: ['#fff3e0', '#e65100'],
    'Part paid': ['#e3f2fd', '#1565c0'],
    Missed: ['#ffebee', '#c62828'],
  };
  const [bg, fg] = map[status] || ['#f5f5f5', 'rgba(0,0,0,.5)'];
  return <div style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '3px 9px', background: bg, color: fg }}>{status}</div>;
}

function inputStyle(radius, fontSize = 15) {
  return { width: '100%', fontSize, fontFamily: 'inherit', border: '1px solid #e0e0e0', borderRadius: radius, padding: 13, outline: 'none', background: '#fff' };
}

function DetailScreen({ customer: d, onBack, onCollect }) {
  return (
    <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <BackArrow onClick={onBack} />
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,.55)' }}>Customers</div>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 9999, background: '#eeeeee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'rgba(0,0,0,.55)', flex: 'none' }}>
            {initials(d.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.01em' }}>{d.name}</div>
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginTop: 2 }}>{d.phone} · {d.village}</div>
            <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.5)', marginTop: 1 }}>{d.address}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#eeeeee', borderRadius: 8, overflow: 'hidden', marginTop: 16 }}>
          <Tile label="Amount given" value={F(d.given)} />
          <Tile label="Weekly" value={F(d.weekly)} />
          <Tile label="Paid so far" value={F(d.paid)} color="#2e7d32" />
          <Tile label="Still to pay" value={F(d.remaining)} color="#e65100" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, fontSize: 13, color: 'rgba(0,0,0,.6)' }}>
          <span>{d.weeksPaid} of {d.totalWeeks} weeks paid</span>
        </div>
        {!d.isDone && (
          <div onClick={onCollect} style={{ marginTop: 16, textAlign: 'center', background: '#1e88e5', color: '#fff', borderRadius: 10, padding: 15, fontSize: 17, fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-lg)' }}>
            Collect {F(d.weekly)}
          </div>
        )}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, padding: '0 2px' }}>Payment history</div>
      <div style={{ background: '#fff', borderRadius: 12, padding: '6px 16px', boxShadow: 'var(--shadow-sm)' }}>
        {(d.timeline || []).map((w) => {
          const map = { paid: ['#43a047', 'Paid'], missed: ['#e53935', 'Missed'], partial: ['#1e88e5', 'Part paid'], pending: ['#fb8c00', 'Pending'], upcoming: ['#e0e0e0', 'Upcoming'] };
          const [dot, label] = map[w.status];
          return (
            <div key={w.week} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ width: 9, height: 9, borderRadius: 9999, flex: 'none', background: dot }} />
              <div style={{ flex: 1, fontSize: 14.5, fontWeight: 500, color: 'rgba(0,0,0,.75)' }}>Week {w.week}</div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'rgba(0,0,0,.87)' }}>{F(w.amount)}</div>
              <StatusBadge status={label} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tile({ label, value, color }) {
  return (
    <div style={{ background: '#fff', padding: '12px 14px' }}>
      <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: color || 'inherit' }}>{value}</div>
    </div>
  );
}

function HistoryScreen({ todayFmt }) {
  const days = [
    { date: 'Today', totalFmt: todayFmt, sub: 'live from the office ledger' },
    { date: 'Yesterday', totalFmt: F(9250), sub: '10 of 12 customers paid' },
    { date: '2 days ago', totalFmt: F(12750), sub: '15 of 15 customers paid' },
    { date: '3 days ago', totalFmt: F(6500), sub: '7 of 11 customers paid' },
  ];
  return (
    <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>History</div>
      {days.map((h) => (
        <div key={h.date} style={{ background: '#fff', borderRadius: 10, padding: 14, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>{h.date}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand-navy)' }}>{h.totalFmt}</div>
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 3 }}>{h.sub}</div>
        </div>
      ))}
    </div>
  );
}
