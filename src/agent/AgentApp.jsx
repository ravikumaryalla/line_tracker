import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { api } from '../api';
import { F, initials, tint } from '../format';
import { colors, cardShadowSm, cardShadowMd, cardShadowLg } from '../tokens';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Toast from '../components/Toast';
import KeypadSheet from '../components/KeypadSheet';
import BottomSheet from '../components/BottomSheet';

const AGENT_ID = 1; // Mani Selvam — the signed-in field agent for this prototype.
const TABS = [['Home', 'home'], ['Customers', 'customers'], ['Collections', 'collections'], ['History', 'history'], ['Expenses', 'expenses']];
const ACTIVE_TAB = { detail: 'customers', give: 'customers', pending: 'collections' };
const EXPENSE_CATS = ['Travel', 'Fuel', 'Food', 'Other'];

export default function AgentApp({ user, onLogout }) {
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
  const [give, setGive] = useState({ name: '', amt: '', weekly: '', weeks: '', phone: '', address: '', nominee: '', villageId: null });
  const [villages, setVillages] = useState([]);
  const [editFor, setEditFor] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', nominee: '', villageId: null });
  const [loading, setLoading] = useState(true);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  const loadCustomers = () => api.customers.list({ agentId: AGENT_ID }).then(setCustomers);
  const loadExpenses = () => api.expenses.list(AGENT_ID).then(setExpenses);
  const loadVillages = () => api.villages.list().then((vs) => setVillages(vs.filter((v) => v.agentId === AGENT_ID)));

  useEffect(() => {
    Promise.all([loadCustomers(), loadExpenses(), loadVillages()]).finally(() => setLoading(false));
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
    await api.customers.create({
      name: give.name, agentId: AGENT_ID, given: gAmt, weekly: gWeekly, weeks: gWeeks,
      phone: give.phone || undefined, address: give.address || undefined, nominee: give.nominee || undefined, villageId: give.villageId || undefined,
    });
    await loadCustomers();
    setGive({ name: '', amt: '', weekly: '', weeks: '', phone: '', address: '', nominee: '', villageId: null });
    setUnsynced((n) => n + 1);
    go('customers');
    flash(`Schedule created — ${gWeeks} weekly payments`);
  };

  const openEdit = (c) => {
    setEditFor(c.id);
    setEditForm({ name: c.name, phone: c.phone || '', address: c.address || '', nominee: c.nominee || '', villageId: c.villageId || null });
  };
  const closeEdit = () => setEditFor(null);

  const saveEdit = async () => {
    if (!editForm.name) { flash('Name is required'); return; }
    await api.customers.update(editFor, editForm);
    await loadCustomers();
    closeEdit();
    flash('Customer updated');
  };

  const selected = customers.find((c) => c.id === selectedId);
  const activeTab = ACTIVE_TAB[screen] || screen;

  if (loading) return <Centered><ActivityIndicator color={colors.brandNavy} /></Centered>;

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <Header
        title={user?.name}
        subtitle={villages.map((v) => v.name).join(' · ')}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {unsynced > 0 && (
              <TouchableOpacity
                onPress={() => { setUnsynced(0); flash('All collections sent to office'); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,.22)', borderRadius: 9999, paddingVertical: 6, paddingHorizontal: 11 }}
              >
                <View style={{ width: 7, height: 7, borderRadius: 9999, backgroundColor: colors.warning300 }} />
                <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '500' }}>{unsynced} to sync</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onLogout}><Text style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Log out</Text></TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        {screen === 'home' && (
          <View style={{ padding: 16, gap: 14 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, ...cardShadowMd }}>
              <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(0,0,0,.5)' }}>Today's collection</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
                <Text style={{ fontSize: 40, fontWeight: '700', color: colors.brandNavy }}>{F(collected)}</Text>
                <Text style={{ fontSize: 18, fontWeight: '500', color: 'rgba(0,0,0,.45)' }}>/ {F(expected)}</Text>
              </View>
              <View style={{ height: 10, borderRadius: 9999, backgroundColor: colors.neutral200, marginTop: 14, overflow: 'hidden' }}>
                <View style={{ height: '100%', borderRadius: 9999, backgroundColor: colors.success600, width: `${pct}%` }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <View style={{ flex: 1, backgroundColor: colors.neutral100, borderRadius: 8, padding: 10 }}>
                  <Text style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: '500' }}>Still to collect</Text>
                  <Text style={{ fontSize: 19, fontWeight: '700', color: colors.warning900, marginTop: 2 }}>{F(Math.max(0, expected - collected))}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.neutral100, borderRadius: 8, padding: 10 }}>
                  <Text style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: '500' }}>Customers left</Text>
                  <Text style={{ fontSize: 19, fontWeight: '700', color: 'rgba(0,0,0,.87)', marginTop: 2 }}>{leftCount}</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: 'rgba(0,0,0,.87)' }}>Due today · {dueList.length}</Text>
              <TouchableOpacity onPress={() => go('pending')}><Text style={{ fontSize: 13, fontWeight: '500', color: colors.brandPrimary600 }}>See pending</Text></TouchableOpacity>
            </View>

            <View style={{ gap: 10 }}>
              {dueList.map((c, i) => (
                <CustomerRow key={c.id} c={c} i={i} onOpen={() => { setSelectedId(c.id); go('detail'); }} onCollect={() => openCollect(c.id)} />
              ))}
            </View>
          </View>
        )}

        {screen === 'collections' && (
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>Today's collections</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', gap: 14, ...cardShadowSm }}>
              <Stat label="Expected" value={F(expected)} />
              <Stat label="Collected" value={F(collected)} color={colors.success800} />
              <Stat label="Remaining" value={F(Math.max(0, expected - collected))} color={colors.warning900} />
            </View>
            {dueList.map((c, i) => (
              <CustomerRow key={c.id} c={c} i={i} onOpen={() => { setSelectedId(c.id); go('detail'); }} onCollect={() => openCollect(c.id)} />
            ))}
          </View>
        )}

        {screen === 'customers' && (
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', flex: 1 }}>Customers</Text>
              <TouchableOpacity onPress={() => go('give')} style={{ backgroundColor: colors.brandNavy, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 13 }}>
                <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '600' }}>+ Give money</Text>
              </TouchableOpacity>
            </View>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search name or village" style={inputStyle(9999)} />
            {filteredCustomers.map((c, i) => (
              <TouchableOpacity key={c.id} onPress={() => { setSelectedId(c.id); go('detail'); }} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...cardShadowSm }}>
                <Avatar name={c.name} i={i} size={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '600' }}>{c.name}</Text>
                  <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{c.village} · {F(c.weekly)}/week</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.brandNavy }}>{F(c.remaining)}</Text>
                  <Text style={{ fontSize: 11, color: 'rgba(0,0,0,.5)' }}>left to pay</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {screen === 'detail' && selected && (
          <DetailScreen customer={selected} onBack={back} onCollect={() => openCollect(selected.id)} onEdit={() => openEdit(selected)} />
        )}

        {screen === 'pending' && (
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BackArrow onPress={back} />
              <Text style={{ fontSize: 18, fontWeight: '600' }}>Pending &amp; missed</Text>
            </View>
            <View style={{ backgroundColor: colors.warning50, borderWidth: 1, borderColor: colors.warning200, borderRadius: 10, padding: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.warning900 }}>{pendingRows.length} weeks unpaid</Text>
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.warning900, marginTop: 4 }}>{F(pendingRows.reduce((s, p) => s + p.amount, 0))}</Text>
            </View>
            {pendingRows.map((p, i) => (
              <TouchableOpacity key={i} onPress={p.open} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...cardShadowSm }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '600' }}>{p.name}</Text>
                  <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{p.sub}</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.warning900 }}>{F(p.amount)}</Text>
                <StatusBadge status={p.status} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {screen === 'history' && <HistoryScreen todayFmt={F(collected)} />}

        {screen === 'expenses' && (
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', flex: 1 }}>My expenses</Text>
              <TouchableOpacity onPress={() => setExpenseFormOpen((o) => !o)} style={{ backgroundColor: colors.brandNavy, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 13 }}>
                <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '600' }}>+ Add</Text>
              </TouchableOpacity>
            </View>
            <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, ...cardShadowSm }}>
              <Text style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: '500' }}>This week</Text>
              <Text style={{ fontSize: 28, fontWeight: '700', color: colors.brandNavy, marginTop: 2 }}>{F(expenses.reduce((s, e) => s + e.amount, 0))}</Text>
            </View>
            {expenseFormOpen && (
              <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, gap: 12, ...cardShadowMd }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {EXPENSE_CATS.map((c) => (
                    <TouchableOpacity key={c} onPress={() => setExpCat(c)} style={{ borderRadius: 9999, paddingVertical: 9, paddingHorizontal: 15, borderWidth: 1, backgroundColor: expCat === c ? colors.brandNavy : '#fff', borderColor: expCat === c ? colors.brandNavy : colors.neutral300 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '600', color: expCat === c ? '#fff' : 'rgba(0,0,0,.7)' }}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput value={expAmt} onChangeText={(t) => setExpAmt(t.replace(/[^0-9]/g, ''))} placeholder="Amount ₹" keyboardType="numeric" style={{ ...inputStyle(8), fontSize: 20, fontWeight: '700' }} />
                <TextInput value={expNote} onChangeText={setExpNote} placeholder="Note (optional)" style={inputStyle(8)} />
                <TouchableOpacity onPress={saveExpense} style={{ alignItems: 'center', backgroundColor: colors.success600, borderRadius: 8, padding: 13 }}>
                  <Text style={{ color: '#fff', fontSize: 15.5, fontWeight: '700' }}>Save expense</Text>
                </TouchableOpacity>
              </View>
            )}
            {expenses.map((e) => (
              <View key={e.id} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...cardShadowSm }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600' }}>{e.category}</Text>
                  <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{e.expense_date}{e.note ? ` · ${e.note}` : ''}</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700' }}>{F(e.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {screen === 'give' && (
          <View style={{ padding: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BackArrow onPress={back} />
              <Text style={{ fontSize: 18, fontWeight: '600' }}>Give money</Text>
            </View>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 14, ...cardShadowSm }}>
              <Field label="Customer">
                <TextInput value={give.name} onChangeText={(t) => setGive((g) => ({ ...g, name: t }))} placeholder="Name" style={inputStyle(8, 16)} />
              </Field>
              <Field label="Phone (optional)">
                <TextInput value={give.phone} onChangeText={(t) => setGive((g) => ({ ...g, phone: t }))} placeholder="98765 43210" keyboardType="phone-pad" style={inputStyle(8, 16)} />
              </Field>
              <Field label="Address (optional)">
                <TextInput value={give.address} onChangeText={(t) => setGive((g) => ({ ...g, address: t }))} placeholder="Street, landmark" style={inputStyle(8, 16)} />
              </Field>
              <Field label="Nominee (optional)">
                <TextInput value={give.nominee} onChangeText={(t) => setGive((g) => ({ ...g, nominee: t }))} placeholder="Nominee name" style={inputStyle(8, 16)} />
              </Field>
              {villages.length > 0 && (
                <Field label="Village">
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {villages.map((v) => (
                      <TouchableOpacity key={v.id} onPress={() => setGive((g) => ({ ...g, villageId: g.villageId === v.id ? null : v.id }))} style={{ borderRadius: 9999, paddingVertical: 9, paddingHorizontal: 15, borderWidth: 1, backgroundColor: give.villageId === v.id ? colors.brandNavy : '#fff', borderColor: give.villageId === v.id ? colors.brandNavy : colors.neutral300 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '600', color: give.villageId === v.id ? '#fff' : 'rgba(0,0,0,.7)' }}>{v.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Field>
              )}
              <Field label="Amount given">
                <TextInput value={give.amt} onChangeText={(t) => setGive((g) => ({ ...g, amt: t.replace(/[^0-9]/g, '') }))} placeholder="₹ 10,000" keyboardType="numeric" style={{ ...inputStyle(8, 22), fontWeight: '700', color: colors.brandNavy }} />
              </Field>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Weekly payment">
                    <TextInput value={give.weekly} onChangeText={(t) => setGive((g) => ({ ...g, weekly: t.replace(/[^0-9]/g, '') }))} placeholder="₹ 1,000" keyboardType="numeric" style={{ ...inputStyle(8, 17), fontWeight: '600' }} />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Total weeks">
                    <TextInput value={give.weeks} onChangeText={(t) => setGive((g) => ({ ...g, weeks: t.replace(/[^0-9]/g, '') }))} placeholder="12" keyboardType="numeric" style={{ ...inputStyle(8, 17), fontWeight: '600' }} />
                  </Field>
                </View>
              </View>
              <View style={{ backgroundColor: colors.brandPrimary50, borderRadius: 8, padding: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, color: 'rgba(0,0,0,.7)' }}>Total to collect</Text>
                  <Text style={{ color: colors.brandNavy, fontSize: 16, fontWeight: '700' }}>{F((parseInt(give.weekly, 10) || 0) * (parseInt(give.weeks, 10) || 0))}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={saveGive} style={{ alignItems: 'center', backgroundColor: colors.brandNavy, borderRadius: 10, padding: 15, ...cardShadowLg }}>
                <Text style={{ color: '#fff', fontSize: 16.5, fontWeight: '700' }}>Save &amp; create schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <BottomNav tabs={TABS} active={activeTab} onChange={go} />

      {collectFor && collectTarget && (
        <KeypadSheet
          visible={!!collectFor}
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

      <BottomSheet visible={!!editFor} onClose={closeEdit}>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Edit customer</Text>
          <TextInput value={editForm.name} onChangeText={(t) => setEditForm((f) => ({ ...f, name: t }))} placeholder="Name" style={inputStyle(8)} />
          <TextInput value={editForm.phone} onChangeText={(t) => setEditForm((f) => ({ ...f, phone: t }))} placeholder="Phone" keyboardType="phone-pad" style={inputStyle(8)} />
          <TextInput value={editForm.address} onChangeText={(t) => setEditForm((f) => ({ ...f, address: t }))} placeholder="Address" style={inputStyle(8)} />
          <TextInput value={editForm.nominee} onChangeText={(t) => setEditForm((f) => ({ ...f, nominee: t }))} placeholder="Nominee" style={inputStyle(8)} />
          {villages.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {villages.map((v) => (
                <TouchableOpacity key={v.id} onPress={() => setEditForm((f) => ({ ...f, villageId: f.villageId === v.id ? null : v.id }))} style={{ borderRadius: 9999, paddingVertical: 9, paddingHorizontal: 15, borderWidth: 1, backgroundColor: editForm.villageId === v.id ? colors.brandNavy : '#fff', borderColor: editForm.villageId === v.id ? colors.brandNavy : colors.neutral300 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '600', color: editForm.villageId === v.id ? '#fff' : 'rgba(0,0,0,.7)' }}>{v.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity onPress={saveEdit} style={{ alignItems: 'center', backgroundColor: colors.brandNavy, borderRadius: 10, padding: 15 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save changes</Text>
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

function Avatar({ name, i, size = 42 }) {
  const [bg, fg] = tint(i);
  return (
    <View style={{ width: size, height: size, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
      <Text style={{ fontSize: size * 0.33, fontWeight: '600', color: fg }}>{initials(name)}</Text>
    </View>
  );
}

function CustomerRow({ c, i, onOpen, onCollect }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...cardShadowSm }}>
      <TouchableOpacity onPress={onOpen}><Avatar name={c.name} i={i} /></TouchableOpacity>
      <TouchableOpacity onPress={onOpen} style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15.5, fontWeight: '600', color: 'rgba(0,0,0,.87)' }}>{c.name}</Text>
        <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>Week {c.currentWeek} of {c.totalWeeks} · {c.village}</Text>
      </TouchableOpacity>
      {c.isPaidToday ? (
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.success800 }}>{F(c.paidToday)}</Text>
          <View style={{ backgroundColor: colors.success50, borderRadius: 9999, paddingVertical: 2, paddingHorizontal: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.success800 }}>Paid</Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity onPress={onCollect} style={{ backgroundColor: colors.brandPrimary600, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 14, ...cardShadowMd }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Collect {F(c.weekly)}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: '500' }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 2, color: color || 'rgba(0,0,0,.87)' }}>{value}</Text>
    </View>
  );
}

function Field({ label, children }) {
  return (
    <View>
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: 'rgba(0,0,0,.6)', marginBottom: 6 }}>{label}</Text>
      {children}
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

function StatusBadge({ status }) {
  const map = {
    Paid: [colors.success50, colors.success800],
    Pending: [colors.warning50, colors.warning900],
    'Part paid': [colors.brandPrimary50, colors.brandPrimary800],
    Missed: [colors.error50, colors.error800],
  };
  const [bg, fg] = map[status] || [colors.neutral100, 'rgba(0,0,0,.5)'];
  return (
    <View style={{ borderRadius: 9999, paddingVertical: 3, paddingHorizontal: 9, backgroundColor: bg }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: fg }}>{status}</Text>
    </View>
  );
}

function inputStyle(radius, fontSize = 15) {
  return { fontSize, borderWidth: 1, borderColor: colors.neutral300, borderRadius: radius, padding: 13, backgroundColor: '#fff' };
}

function DetailScreen({ customer: d, onBack, onCollect, onEdit }) {
  return (
    <View style={{ padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <BackArrow onPress={onBack} />
        <Text style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', flex: 1 }}>Customers</Text>
        <TouchableOpacity onPress={onEdit}><Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.brandPrimary600 }}>Edit</Text></TouchableOpacity>
      </View>
      <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 18, ...cardShadowSm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 56, height: 56, borderRadius: 9999, backgroundColor: colors.neutral200, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: 'rgba(0,0,0,.55)' }}>{initials(d.name)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 20, fontWeight: '700' }}>{d.name}</Text>
            <Text style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginTop: 2 }}>{d.phone} · {d.village}</Text>
            <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.5)', marginTop: 1 }}>{d.address}</Text>
            {d.nominee && <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.5)', marginTop: 1 }}>Nominee: {d.nominee}</Text>}
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, backgroundColor: colors.neutral200, borderRadius: 8, overflow: 'hidden', marginTop: 16 }}>
          <Tile label="Amount given" value={F(d.given)} />
          <Tile label="Weekly" value={F(d.weekly)} />
          <Tile label="Paid so far" value={F(d.paid)} color={colors.success800} />
          <Tile label="Still to pay" value={F(d.remaining)} color={colors.warning900} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <Text style={{ fontSize: 13, color: 'rgba(0,0,0,.6)' }}>{d.weeksPaid} of {d.totalWeeks} weeks paid</Text>
        </View>
        {!d.isDone && (
          <TouchableOpacity onPress={onCollect} style={{ marginTop: 16, alignItems: 'center', backgroundColor: colors.brandPrimary600, borderRadius: 10, padding: 15, ...cardShadowLg }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Collect {F(d.weekly)}</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={{ fontSize: 15, fontWeight: '600' }}>Payment history</Text>
      <View style={{ backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, ...cardShadowSm }}>
        {(d.timeline || []).map((w) => {
          const map = { paid: [colors.success600, 'Paid'], missed: [colors.error600, 'Missed'], partial: [colors.brandPrimary600, 'Part paid'], pending: [colors.warning600, 'Pending'], upcoming: [colors.neutral300, 'Upcoming'] };
          const [dot, label] = map[w.status];
          return (
            <View key={w.week} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral100 }}>
              <View style={{ width: 9, height: 9, borderRadius: 9999, backgroundColor: dot }} />
              <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '500', color: 'rgba(0,0,0,.75)' }}>Week {w.week}</Text>
              <Text style={{ fontSize: 14.5, fontWeight: '700', color: 'rgba(0,0,0,.87)' }}>{F(w.amount)}</Text>
              <StatusBadge status={label} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Tile({ label, value, color }) {
  return (
    <View style={{ width: '50%', backgroundColor: '#fff', padding: 12 }}>
      <Text style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: '500' }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 2, color: color || 'rgba(0,0,0,.87)' }}>{value}</Text>
    </View>
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
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>History</Text>
      {days.map((h) => (
        <View key={h.date} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, ...cardShadowSm }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14.5, fontWeight: '600' }}>{h.date}</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.brandNavy }}>{h.totalFmt}</Text>
          </View>
          <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 3 }}>{h.sub}</Text>
        </View>
      ))}
    </View>
  );
}
