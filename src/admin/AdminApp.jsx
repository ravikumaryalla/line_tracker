import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { api } from '../api';
import { F, initials, tint } from '../format';
import { digits, isPhone, customerContactError, customerFormError, loanFormError, weeklyFor } from '../validate';
import { colors, cardShadowSm, cardShadowMd, cardShadowLg } from '../tokens';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Toast from '../components/Toast';
import BottomSheet from '../components/BottomSheet';
import KeypadSheet from '../components/KeypadSheet';
import PhotoPicker, { CustomerAvatar } from '../components/PhotoPicker';
import SearchSelect from '../components/SearchSelect';

const TABS = [['Dashboard', 'dashboard', 'grid'], ['Collect', 'collect', 'cash'], ['Customers', 'customers', 'people'], ['Villages', 'villages', 'location'], ['More', 'more', 'ellipsis-horizontal-circle']];
const EMPTY_CUSTOMER = { name: '', phone: '', nominee: '', photo: null, villageId: null, amt: '', weeks: '', total: '' };
const EMPTY_ADMIN = { name: '', phone: '', password: '' };
const EXPENSE_CATS = ['Travel', 'Fuel', 'Food', 'Other'];
const MORE_SCREENS = ['given', 'collections', 'expenses', 'losses', 'reports', 'users'];
// Screens that live under a tab without being one; maps them to the tab to highlight.
const PARENT_TAB = { pending: 'collect', detail: 'customers', loan: 'customers', addCustomer: 'customers', village: 'villages' };
const TITLES = {
  dashboard: 'Dashboard', collect: 'Collect', pending: 'Pending & missed', customers: 'Customers', detail: 'Customer', loan: 'Past loan', addCustomer: 'Add customer',
  villages: 'Villages', village: 'Village', more: 'More', given: 'Money given', collections: 'Collections', expenses: 'Expenses', losses: 'Losses', reports: 'Reports', users: 'Admin accounts',
};

export default function AdminApp({ user, onLogout }) {
  const [screen, setScreen] = useState('dashboard');
  const [prevScreen, setPrevScreen] = useState('customers');
  const [summary, setSummary] = useState(null);
  const [villages, setVillages] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [losses, setLosses] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [collectSearch, setCollectSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [pastLoan, setPastLoan] = useState(null);
  const [collectFor, setCollectFor] = useState(null);
  const [amt, setAmt] = useState('');
  const [saving, setSaving] = useState(false);
  const [villageOpen, setVillageOpen] = useState(false);
  const [villageName, setVillageName] = useState('');
  const [villageId, setVillageId] = useState(null);
  const [lossOpen, setLossOpen] = useState(false);
  const [lossForm, setLossForm] = useState({ name: '', remaining: '', recovered: '', reason: '' });
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [expCat, setExpCat] = useState('Fuel');
  const [expAmt, setExpAmt] = useState('');
  const [expNote, setExpNote] = useState('');
  const [addForm, setAddForm] = useState(EMPTY_CUSTOMER);
  const [editFor, setEditFor] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', nominee: '', photo: null, origPhoto: null, villageId: null });
  const [loanFor, setLoanFor] = useState(null);
  const [loanForm, setLoanForm] = useState({ amt: '', weeks: '', total: '' });
  const [range, setRange] = useState('This month');
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN);
  const [deleteUser, setDeleteUser] = useState(null);
  const [pwUser, setPwUser] = useState(null);
  const [pwValue, setPwValue] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  const loadAll = () =>
    Promise.all([
      api.dashboard.summary().then(setSummary),
      api.villages.list().then(setVillages),
      api.customers.list().then(setCustomers),
      api.expenses.list().then(setExpenses),
      api.losses.list().then(setLosses),
      api.users.list().then(setUsers),
    ]);

  // The list endpoint has no payment timeline, so the detail screen loads the full record.
  const loadDetail = (id) => api.customers.get(id).then(setDetail).catch((e) => flash(e.message));

  useEffect(() => { loadAll().finally(() => setLoading(false)); }, []);

  const go = (s) => { setScreen(s); setCollectFor(null); setAmt(''); };
  const activeTab = PARENT_TAB[screen] || (MORE_SCREENS.includes(screen) ? 'more' : screen);

  const openDetail = (id) => {
    setPrevScreen(screen);
    setSelectedId(id);
    setDetail(customers.find((c) => c.id === id) || null);
    loadDetail(id);
    go('detail');
  };

  // Earlier, cleared loan of the customer on the detail screen, with its own payment history.
  const openPastLoan = (loanNo) => {
    setPastLoan((detail.pastLoans || []).find((l) => l.loanNo === loanNo) || null);
    api.customers.pastLoan(selectedId, loanNo).then(setPastLoan).catch((e) => flash(e.message));
    go('loan');
  };

  // ---- Collections ----
  const dueList = useMemo(() => customers.filter((c) => !c.isDone), [customers]);
  const expected = dueList.reduce((s, c) => s + c.weekly, 0);
  const collectedToday = customers.reduce((s, c) => s + c.paidToday, 0);
  const pct = expected ? Math.min(100, Math.round((collectedToday / expected) * 100)) : 0;
  const leftCount = dueList.filter((c) => !c.isPaidToday).length;
  const filteredDue = dueList.filter((c) => !collectSearch || (c.name + ' ' + (c.village || '')).toLowerCase().includes(collectSearch.toLowerCase()));

  const pendingRows = [];
  customers.forEach((c) => {
    const where = c.village ? ` · ${c.village}` : '';
    (c.missedWeeks || []).forEach((w) =>
      pendingRows.push({ id: c.id, name: c.name, sub: `Week ${w}${where}`, amount: c.weekly, status: 'Missed' })
    );
    Object.keys(c.partialWeeks || {}).forEach((w) =>
      pendingRows.push({ id: c.id, name: c.name, sub: `Week ${w} · paid ${F(c.partialWeeks[w])} of ${F(c.weekly)}`, amount: c.weekly - c.partialWeeks[w], status: 'Part paid' })
    );
    if (!c.isDone && !c.isPaidToday) {
      pendingRows.push({ id: c.id, name: c.name, sub: `Week ${c.currentWeek} · due today`, amount: c.weekly, status: 'Pending' });
    }
  });

  const collectTarget = customers.find((c) => c.id === collectFor);
  const openCollect = (id) => { setCollectFor(id); setAmt(''); };
  const closeCollect = () => { setCollectFor(null); setAmt(''); };

  const saveCollect = async () => {
    const amount = parseInt(String(amt).replace(/[^0-9]/g, ''), 10);
    if (!collectTarget || !amount) { flash('Enter the amount received'); return; }
    if (amount > collectTarget.remaining) { flash(`Amount is more than the balance (${F(collectTarget.remaining)})`); return; }
    setSaving(true);
    try {
      const updated = await api.customers.collect(collectTarget.id, amount);
      await loadAll();
      if (screen === 'detail' && selectedId === collectTarget.id) await loadDetail(selectedId);
      closeCollect();
      flash(`${F(amount)} from ${collectTarget.name.split(' ')[0]} saved${updated.isDone ? ' · loan closed' : ''}`);
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

  // ---- Customers ----
  const filteredCustomers = customers.filter((c) => !search || (c.name + ' ' + (c.village || '')).toLowerCase().includes(search.toLowerCase()));
  const villageOptions = villages.map((v) => ({ id: v.id, label: v.name, sub: `${v.customerCount} customer${v.customerCount === 1 ? '' : 's'}` }));

  const saveCustomer = async () => {
    const err = customerFormError(addForm);
    if (err) { flash(err); return; }
    try {
      await api.customers.create({
        name: addForm.name.trim(), given: parseInt(addForm.amt, 10),
        weekly: weeklyFor(addForm.total, addForm.weeks), weeks: parseInt(addForm.weeks, 10),
        phone: addForm.phone, nominee: addForm.nominee.trim() || undefined, photo: addForm.photo || undefined, villageId: addForm.villageId || undefined,
      });
    } catch (e) { flash(e.message); return; }
    await loadAll();
    setAddForm(EMPTY_CUSTOMER);
    go('customers');
    flash(`Customer added — ${parseInt(addForm.weeks, 10)} weekly payments`);
  };

  const openEdit = (c) => {
    setEditFor(c.id);
    setEditForm({ name: c.name, phone: c.phone || '', nominee: c.nominee || '', photo: null, origPhoto: null, villageId: c.villageId || null });
    if (c.hasPhoto) {
      api.customers.photo(c.id).then((r) => setEditForm((f) => (f.photo === null ? { ...f, photo: r.photo, origPhoto: r.photo } : f))).catch(() => {});
    }
  };
  const closeEdit = () => setEditFor(null);

  const saveEdit = async () => {
    const err = customerContactError(editForm);
    if (err) { flash(err); return; }
    const data = { name: editForm.name.trim(), phone: editForm.phone, nominee: editForm.nominee.trim(), villageId: editForm.villageId };
    if (editForm.photo !== editForm.origPhoto) data.photo = editForm.photo || null;
    try {
      await api.customers.update(editFor, data);
    } catch (e) { flash(e.message); return; }
    await loadAll();
    if (screen === 'detail' && selectedId === editFor) await loadDetail(selectedId);
    closeEdit();
    flash('Customer updated');
  };

  // Give a customer who has cleared their loan a new one; the form starts from the previous loan's terms.
  const openNewLoan = (c) => {
    setLoanFor(c);
    setLoanForm({ amt: String(c.given), weeks: String(c.totalWeeks), total: String(c.weekly * c.totalWeeks) });
  };

  const saveNewLoan = async () => {
    const err = loanFormError(loanForm);
    if (err) { flash(err); return; }
    const c = loanFor;
    setSaving(true);
    try {
      await api.customers.newLoan(c.id, {
        given: parseInt(loanForm.amt, 10), weekly: weeklyFor(loanForm.total, loanForm.weeks), weeks: parseInt(loanForm.weeks, 10),
      });
      await loadAll();
      if (screen === 'detail' && selectedId === c.id) await loadDetail(selectedId);
      setLoanFor(null);
      flash(`New loan of ${F(parseInt(loanForm.amt, 10))} given to ${c.name.split(' ')[0]}`);
    } catch (e) {
      flash(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ---- Villages ----
  // Used by the Villages screen sheet and the village dropdown's "Add …" option; returns the new id.
  const createVillage = async (name) => {
    if (!name.trim()) { flash('Village name is required'); return null; }
    try {
      const created = await api.villages.create({ name: name.trim() });
      await loadAll();
      flash('Village added');
      return created.id;
    } catch (e) { flash(e.message); return null; }
  };

  const openVillage = (id) => { setVillageId(id); go('village'); };
  const selectedVillage = villages.find((v) => v.id === villageId);
  // Only running loans; customers whose loan is cleared are reached from the Customers tab.
  const villageCustomers = customers.filter((c) => c.villageId === villageId && !c.isDone);
  const villageExpected = villageCustomers.reduce((s, c) => s + c.weekly, 0);
  const villageCollectedToday = villageCustomers.reduce((s, c) => s + c.paidToday, 0);

  const saveVillage = async () => {
    if (await createVillage(villageName)) {
      setVillageName('');
      setVillageOpen(false);
    }
  };

  // ---- Expenses & losses ----
  const saveExpense = async () => {
    const a = parseInt(expAmt, 10);
    if (!a) { flash('Enter the amount'); return; }
    try {
      await api.expenses.create({ category: expCat, amount: a, note: expNote.trim() || undefined });
    } catch (e) { flash(e.message); return; }
    await loadAll();
    setExpAmt(''); setExpNote(''); setExpenseFormOpen(false);
    flash('Expense saved');
  };

  const expByCategory = useMemo(() => {
    const map = {};
    expenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return map;
  }, [expenses]);

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

  // ---- Admin accounts ----
  const saveAdmin = async () => {
    if (!adminForm.name.trim()) { flash('Name is required'); return; }
    if (!isPhone(adminForm.phone)) { flash('Enter a 10-digit phone number'); return; }
    if (adminForm.password.length < 6) { flash('Password must be at least 6 characters'); return; }
    try {
      await api.users.create({ name: adminForm.name.trim(), phone: adminForm.phone, password: adminForm.password });
    } catch (e) { flash(e.message); return; }
    await loadAll();
    setAdminForm(EMPTY_ADMIN);
    setAdminOpen(false);
    flash('Admin added');
  };

  const savePassword = async () => {
    if (pwValue.length < 6) { flash('Password must be at least 6 characters'); return; }
    try {
      await api.users.setPassword(pwUser.id, pwValue);
    } catch (e) {
      flash(e.message);
      return;
    }
    setPwUser(null);
    setPwValue('');
    flash('Password updated');
  };

  const confirmDeleteUser = async () => {
    const u = deleteUser;
    try {
      await api.users.remove(u.id);
    } catch (e) {
      setDeleteUser(null);
      flash(e.message);
      return;
    }
    await loadAll();
    setDeleteUser(null);
    flash(`${u.name} deleted`);
  };

  if (loading || !summary) return <Centered><ActivityIndicator color={colors.brandNavy} /></Centered>;

  const maxVillage = Math.max(1, ...villages.map((v) => v.given));
  const maxBar = Math.max(1, ...summary.weekBars.map((b) => b.amount));

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <Header
        title={TITLES[screen]}
        subtitle={`${user?.name || 'Owner'} · live data`}
        right={<TouchableOpacity onPress={onLogout}><Text style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Log out</Text></TouchableOpacity>}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 160 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
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

        {screen === 'collect' && (
          <View style={{ padding: 16, gap: 14 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, ...cardShadowMd }}>
              <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(0,0,0,.5)' }}>Today's collection</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
                <Text style={{ fontSize: 40, fontWeight: '700', color: colors.brandNavy }}>{F(collectedToday)}</Text>
                <Text style={{ fontSize: 18, fontWeight: '500', color: 'rgba(0,0,0,.45)' }}>/ {F(expected)}</Text>
              </View>
              <View style={{ height: 10, borderRadius: 9999, backgroundColor: colors.neutral200, marginTop: 14, overflow: 'hidden' }}>
                <View style={{ height: '100%', borderRadius: 9999, backgroundColor: colors.success600, width: `${pct}%` }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <View style={{ flex: 1, backgroundColor: colors.neutral100, borderRadius: 8, padding: 10 }}>
                  <Text style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: '500' }}>Still to collect</Text>
                  <Text style={{ fontSize: 19, fontWeight: '700', color: colors.warning900, marginTop: 2 }}>{F(Math.max(0, expected - collectedToday))}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.neutral100, borderRadius: 8, padding: 10 }}>
                  <Text style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: '500' }}>Customers left</Text>
                  <Text style={{ fontSize: 19, fontWeight: '700', color: 'rgba(0,0,0,.87)', marginTop: 2 }}>{leftCount}</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: 'rgba(0,0,0,.87)' }}>Due today · {dueList.length}</Text>
              <TouchableOpacity onPress={() => go('pending')}><Text style={{ fontSize: 13, fontWeight: '500', color: colors.brandPrimary600 }}>Pending &amp; missed ({pendingRows.length})</Text></TouchableOpacity>
            </View>
            <TextInput value={collectSearch} onChangeText={setCollectSearch} placeholder="Search name or village" style={inputStyle} />
            <View style={{ gap: 10 }}>
              {filteredDue.map((c, i) => (
                <CustomerRow key={c.id} c={c} i={i} onOpen={() => openDetail(c.id)} onCollect={() => openCollect(c.id)} />
              ))}
              {!filteredDue.length && <Text style={{ fontSize: 13.5, color: 'rgba(0,0,0,.5)', textAlign: 'center', paddingVertical: 20 }}>{dueList.length ? 'No matches' : 'Nothing due today'}</Text>}
            </View>
          </View>
        )}

        {screen === 'pending' && (
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BackArrow onPress={() => go('collect')} />
              <Text style={{ fontSize: 18, fontWeight: '600' }}>Pending &amp; missed</Text>
            </View>
            <View style={{ backgroundColor: colors.warning50, borderWidth: 1, borderColor: colors.warning200, borderRadius: 10, padding: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.warning900 }}>{pendingRows.length} weeks unpaid</Text>
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.warning900, marginTop: 4 }}>{F(pendingRows.reduce((s, p) => s + p.amount, 0))}</Text>
            </View>
            {pendingRows.map((p, i) => (
              <TouchableOpacity key={i} onPress={() => openDetail(p.id)} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...cardShadowSm }}>
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

        {screen === 'customers' && (
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', flex: 1 }}>Customers</Text>
              <TouchableOpacity onPress={() => go('addCustomer')} style={{ backgroundColor: colors.brandNavy, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 13 }}>
                <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '600' }}>+ Add customer</Text>
              </TouchableOpacity>
            </View>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search name or village" style={inputStyle} />
            {filteredCustomers.map((c, i) => (
              <TouchableOpacity key={c.id} onPress={() => openDetail(c.id)} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...cardShadowSm }}>
                <Avatar name={c.name} i={i} size={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '600' }}>{c.name}</Text>
                  <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{[c.village, `${F(c.weekly)}/week`].filter(Boolean).join(' · ')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.brandNavy }}>{F(c.remaining)}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: c.isDone ? colors.success800 : c.missedWeeks.length ? colors.error800 : 'rgba(0,0,0,.5)' }}>
                    {c.isDone ? 'Done' : c.missedWeeks.length ? `Missed ${c.missedWeeks.length}` : 'On time'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {screen === 'detail' && detail && (
          <DetailScreen customer={detail} onBack={() => go(prevScreen)} onCollect={() => openCollect(detail.id)} onEdit={() => openEdit(detail)} onNewLoan={() => openNewLoan(detail)} onOpenPastLoan={openPastLoan} />
        )}

        {screen === 'loan' && pastLoan && (
          <View style={{ padding: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BackArrow onPress={() => go('detail')} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '600' }}>Loan {pastLoan.loanNo}</Text>
                {!!detail && <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)' }}>{detail.name}</Text>}
              </View>
            </View>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 18, ...cardShadowSm }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, backgroundColor: colors.neutral200, borderRadius: 8, overflow: 'hidden' }}>
                <DetailTile label="Amount given" value={F(pastLoan.given)} />
                <DetailTile label="Weekly" value={F(pastLoan.weekly)} />
                <DetailTile label="Paid" value={F(pastLoan.paid)} color={colors.success800} />
                <DetailTile label="Weeks" value={String(pastLoan.totalWeeks)} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.success800, marginTop: 14 }}>
                {pastLoan.startedAt} – {pastLoan.closedAt}
                {pastLoan.timeline ? ` · paid in ${pastLoan.timeline.length} week${pastLoan.timeline.length === 1 ? '' : 's'}` : ''}
              </Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '600' }}>Payment history</Text>
            <PaymentHistory timeline={pastLoan.timeline} />
          </View>
        )}

        {screen === 'addCustomer' && (
          <View style={{ padding: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BackArrow onPress={() => go('customers')} />
              <Text style={{ fontSize: 18, fontWeight: '600' }}>Add customer</Text>
            </View>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 12, ...cardShadowSm }}>
              <Field label="Name" required>
                <TextInput value={addForm.name} onChangeText={(t) => setAddForm((f) => ({ ...f, name: t }))} placeholder="Customer name" style={inputStyle} />
              </Field>
              <Field label="Phone number" required>
                <TextInput value={addForm.phone} onChangeText={(t) => setAddForm((f) => ({ ...f, phone: digits(t) }))} placeholder="9876543210" keyboardType="phone-pad" maxLength={10} style={inputStyle} />
              </Field>
              <Field label="Nominee (optional)">
                <TextInput value={addForm.nominee} onChangeText={(t) => setAddForm((f) => ({ ...f, nominee: t }))} placeholder="Nominee name" style={inputStyle} />
              </Field>
              <Field label="Photo (optional)">
                <PhotoPicker value={addForm.photo} onChange={(p) => setAddForm((f) => ({ ...f, photo: p }))} onError={flash} />
              </Field>
              <Field label="Village (optional)">
                <SearchSelect
                  value={addForm.villageId}
                  options={villageOptions}
                  onChange={(id) => setAddForm((f) => ({ ...f, villageId: id }))}
                  onCreate={createVillage}
                  placeholder="Select village"
                  searchPlaceholder="Search or add a village"
                  radius={9999}
                />
              </Field>
              <LoanFields form={addForm} setForm={setAddForm} />
              <TouchableOpacity onPress={saveCustomer} style={{ alignItems: 'center', backgroundColor: colors.brandNavy, borderRadius: 10, padding: 15, ...cardShadowLg }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save &amp; create schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {screen === 'villages' && (
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', flex: 1 }}>Villages</Text>
              <TouchableOpacity onPress={() => setVillageOpen(true)} style={{ backgroundColor: colors.brandNavy, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 13 }}>
                <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '600' }}>+ Add village</Text>
              </TouchableOpacity>
            </View>
            {villages.map((v) => (
              <TouchableOpacity key={v.id} onPress={() => openVillage(v.id)} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, ...cardShadowSm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', flex: 1 }}>{v.name}</Text>
                  <Text style={{ fontSize: 22, color: 'rgba(0,0,0,.35)' }}>›</Text>
                </View>
                <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 2 }}>{v.activeCount} active customer{v.activeCount === 1 ? '' : 's'}</Text>
                <View style={{ flexDirection: 'row', gap: 1, backgroundColor: colors.neutral200, borderRadius: 8, overflow: 'hidden', marginTop: 14 }}>
                  <Tile label="Given" value={F(v.given)} />
                  <Tile label="Collected" value={F(v.collected)} color={colors.success800} />
                  <Tile label="Pending" value={F(v.pending)} color={colors.warning900} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {screen === 'village' && selectedVillage && (
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BackArrow onPress={() => go('villages')} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '600' }}>{selectedVillage.name}</Text>
                <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)' }}>{villageCustomers.length} customer{villageCustomers.length === 1 ? '' : 's'}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 1, backgroundColor: colors.neutral200, borderRadius: 8, overflow: 'hidden', ...cardShadowSm }}>
              <Tile label="Given" value={F(selectedVillage.given)} />
              <Tile label="Collected" value={F(selectedVillage.collected)} color={colors.success800} />
              <Tile label="Pending" value={F(selectedVillage.pending)} color={colors.warning900} />
            </View>
            <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'baseline', ...cardShadowSm }}>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: 'rgba(0,0,0,.7)', flex: 1 }}>Collected today</Text>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.success800 }}>{F(villageCollectedToday)}</Text>
              <Text style={{ fontSize: 13.5, fontWeight: '500', color: 'rgba(0,0,0,.45)' }}> / {F(villageExpected)}</Text>
            </View>
            <View style={{ gap: 10 }}>
              {villageCustomers.map((c, i) => (
                <CustomerRow key={c.id} c={c} i={i} onOpen={() => openDetail(c.id)} onCollect={() => openCollect(c.id)} />
              ))}
              {!villageCustomers.length && <Text style={{ fontSize: 13.5, color: 'rgba(0,0,0,.5)', textAlign: 'center', paddingVertical: 20 }}>No running loans in this village</Text>}
            </View>
          </View>
        )}

        {screen === 'more' && (
          <View style={{ padding: 16, gap: 10 }}>
            {[
              { label: 'Money given', sub: `${F(summary.given)} total`, key: 'given' },
              { label: 'Collections', sub: `${F(summary.weekTotal)} this week`, key: 'collections' },
              { label: 'Expenses', sub: `${F(summary.expenses)} total`, key: 'expenses' },
              { label: 'Losses', sub: `${F(summary.losses)} not recovered`, key: 'losses' },
              { label: 'Reports', sub: 'Weekly and monthly summary', key: 'reports' },
              { label: 'Admin accounts', sub: `${users.length} account${users.length === 1 ? '' : 's'}`, key: 'users' },
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
              <TouchableOpacity key={c.id} onPress={() => openDetail(c.id)} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...cardShadowSm }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '600' }}>{c.name}</Text>
                  <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{F(c.weekly)} weekly · {c.totalWeeks} weeks</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700' }}>{F(c.given)}</Text>
              </TouchableOpacity>
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
            <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(0,0,0,.7)' }}>By village</Text>
            {villages.map((v) => (
              <View key={v.id} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, ...cardShadowSm }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 15, fontWeight: '600' }}>{v.name}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.brandNavy }}>{F(v.collected)}</Text>
                </View>
                <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 2 }}>{v.activeCount} active · {F(v.pending)} pending</Text>
                <View style={{ height: 8, borderRadius: 9999, backgroundColor: colors.neutral200, marginTop: 10, overflow: 'hidden' }}>
                  <View style={{ height: '100%', borderRadius: 9999, backgroundColor: colors.success600, width: `${Math.round((v.collected / Math.max(1, v.collected + v.pending)) * 100)}%` }} />
                </View>
              </View>
            ))}
          </View>
        )}

        {screen === 'expenses' && (
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BackArrow onPress={() => go('more')} />
              <Text style={{ fontSize: 18, fontWeight: '600', flex: 1 }}>Expenses</Text>
              <TouchableOpacity onPress={() => setExpenseFormOpen((o) => !o)} style={{ backgroundColor: colors.brandNavy, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 13 }}>
                <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '600' }}>+ Add expense</Text>
              </TouchableOpacity>
            </View>
            {expenseFormOpen && (
              <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, gap: 12, ...cardShadowMd }}>
                <Field label="Category" required>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {EXPENSE_CATS.map((c) => <Chip key={c} label={c} selected={expCat === c} onPress={() => setExpCat(c)} />)}
                  </View>
                </Field>
                <Field label="Amount" required>
                  <TextInput value={expAmt} onChangeText={(t) => setExpAmt(t.replace(/[^0-9]/g, ''))} placeholder="₹ 200" keyboardType="numeric" style={{ ...inputStyle, fontSize: 20, fontWeight: '700' }} />
                </Field>
                <Field label="Note (optional)">
                  <TextInput value={expNote} onChangeText={setExpNote} placeholder="What was it for?" style={inputStyle} />
                </Field>
                <TouchableOpacity onPress={saveExpense} style={{ alignItems: 'center', backgroundColor: colors.success600, borderRadius: 8, padding: 13 }}>
                  <Text style={{ color: '#fff', fontSize: 15.5, fontWeight: '700' }}>Save expense</Text>
                </TouchableOpacity>
              </View>
            )}
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
                <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 2 }}>{l.village ? `${l.village} · ` : ''}recovered {F(l.recovered)} of {F(l.remaining)}</Text>
                <View style={{ marginTop: 8, backgroundColor: colors.neutral50, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 11 }}>
                  <Text style={{ fontSize: 13, color: 'rgba(0,0,0,.7)' }}>{l.reason}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {screen === 'users' && (
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BackArrow onPress={() => go('more')} />
              <Text style={{ fontSize: 18, fontWeight: '600', flex: 1 }}>Admin accounts</Text>
              <TouchableOpacity onPress={() => setAdminOpen(true)} style={{ backgroundColor: colors.brandNavy, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 13 }}>
                <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '600' }}>+ Add admin</Text>
              </TouchableOpacity>
            </View>
            {users.map((u) => {
              const isSelf = u.id === user?.id;
              return (
                <View key={u.id} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, gap: 10, ...cardShadowSm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 9999, backgroundColor: colors.neutral200, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(0,0,0,.6)' }}>{initials(u.name)}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 15.5, fontWeight: '600' }}>{u.name}{isSelf ? ' (you)' : ''}</Text>
                      <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{u.phone}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => { setPwUser(u); setPwValue(''); }} style={{ flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.neutral300, borderRadius: 8, paddingVertical: 10 }}>
                      <Text style={{ color: 'rgba(0,0,0,.7)', fontSize: 13.5, fontWeight: '600' }}>Reset password</Text>
                    </TouchableOpacity>
                    {!isSelf && (
                      <TouchableOpacity onPress={() => setDeleteUser(u)} style={{ flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.error200, borderRadius: 8, paddingVertical: 10 }}>
                        <Text style={{ color: colors.error800, fontSize: 13.5, fontWeight: '700' }}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
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
      </KeyboardAvoidingView>

      <BottomNav tabs={TABS} active={activeTab} onChange={go} />

      {collectFor && collectTarget && (
        <KeypadSheet
          visible={!!collectFor}
          name={collectTarget.name}
          sub={`Week ${collectTarget.currentWeek} · due ${F(collectTarget.weekly)}`}
          weekly={collectTarget.weekly}
          due={collectTarget.weekly - ((collectTarget.partialWeeks || {})[collectTarget.currentWeek] || 0)}
          remaining={collectTarget.remaining}
          amount={amt}
          onKey={onKeypad}
          onSave={saveCollect}
          onClose={closeCollect}
          saving={saving}
        />
      )}

      <BottomSheet visible={adminOpen} onClose={() => setAdminOpen(false)}>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Add admin</Text>
          <Text style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', marginTop: -6 }}>They can sign in with this phone and password right away and have full access.</Text>
          <Field label="Name" required>
            <TextInput value={adminForm.name} onChangeText={(t) => setAdminForm((f) => ({ ...f, name: t }))} placeholder="Full name" style={inputStyle} />
          </Field>
          <Field label="Phone number" required>
            <TextInput value={adminForm.phone} onChangeText={(t) => setAdminForm((f) => ({ ...f, phone: digits(t) }))} placeholder="9876543210" keyboardType="phone-pad" maxLength={10} style={inputStyle} />
          </Field>
          <Field label="Password" required>
            <TextInput value={adminForm.password} onChangeText={(t) => setAdminForm((f) => ({ ...f, password: t }))} placeholder="At least 6 characters" autoCapitalize="none" autoCorrect={false} style={inputStyle} />
          </Field>
          <TouchableOpacity onPress={saveAdmin} style={{ alignItems: 'center', backgroundColor: colors.brandNavy, borderRadius: 10, padding: 15 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save admin</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <BottomSheet visible={!!pwUser} onClose={() => setPwUser(null)}>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Reset password</Text>
          <Text style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', marginTop: -6 }}>{pwUser?.name} · {pwUser?.phone}</Text>
          <Field label="New password" required>
            <TextInput value={pwValue} onChangeText={setPwValue} placeholder="At least 6 characters" autoCapitalize="none" autoCorrect={false} style={inputStyle} />
          </Field>
          <TouchableOpacity onPress={savePassword} style={{ alignItems: 'center', backgroundColor: colors.brandNavy, borderRadius: 10, padding: 15 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save password</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <BottomSheet visible={!!deleteUser} onClose={() => setDeleteUser(null)}>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Delete {deleteUser?.name}?</Text>
          <Text style={{ fontSize: 14, color: 'rgba(0,0,0,.6)', lineHeight: 20 }}>
            This permanently removes the login for {deleteUser?.phone}. It cannot be undone. Customers and collections are not affected.
          </Text>
          <TouchableOpacity onPress={confirmDeleteUser} style={{ alignItems: 'center', backgroundColor: colors.error800, borderRadius: 10, padding: 15 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Delete permanently</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDeleteUser(null)} style={{ alignItems: 'center', borderRadius: 10, padding: 13 }}>
            <Text style={{ color: 'rgba(0,0,0,.6)', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <BottomSheet visible={villageOpen} onClose={() => setVillageOpen(false)}>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Add village</Text>
          <Field label="Village name" required>
            <TextInput value={villageName} onChangeText={setVillageName} placeholder="e.g. Kollur" style={inputStyle} />
          </Field>
          <TouchableOpacity onPress={saveVillage} style={{ alignItems: 'center', backgroundColor: colors.brandNavy, borderRadius: 10, padding: 15 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save village</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <BottomSheet visible={lossOpen} onClose={() => setLossOpen(false)}>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Record a loss</Text>
          <Field label="Customer name" required>
            <TextInput value={lossForm.name} onChangeText={(t) => setLossForm((f) => ({ ...f, name: t }))} placeholder="Customer name" style={inputStyle} />
          </Field>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Remaining" required>
                <TextInput value={lossForm.remaining} onChangeText={(t) => setLossForm((f) => ({ ...f, remaining: t.replace(/[^0-9]/g, '') }))} placeholder="₹ 5,000" keyboardType="numeric" style={inputStyle} />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Recovered">
                <TextInput value={lossForm.recovered} onChangeText={(t) => setLossForm((f) => ({ ...f, recovered: t.replace(/[^0-9]/g, '') }))} placeholder="₹ 0" keyboardType="numeric" style={inputStyle} />
              </Field>
            </View>
          </View>
          <Field label="Reason">
            <TextInput value={lossForm.reason} onChangeText={(t) => setLossForm((f) => ({ ...f, reason: t }))} placeholder="Why it can't be recovered" style={inputStyle} />
          </Field>
          <View style={{ backgroundColor: colors.error50, borderRadius: 8, padding: 13, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, color: colors.error800 }}>Loss amount</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.error900 }}>{F(Math.max(0, (parseInt(lossForm.remaining, 10) || 0) - (parseInt(lossForm.recovered, 10) || 0)))}</Text>
          </View>
          <TouchableOpacity onPress={saveLoss} style={{ alignItems: 'center', backgroundColor: colors.error800, borderRadius: 10, padding: 15 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save loss</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <BottomSheet visible={!!loanFor} onClose={() => setLoanFor(null)}>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Give new loan</Text>
          <Text style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', marginTop: -6 }}>{loanFor?.name} · previous loan cleared. Weeks start again from week 1.</Text>
          <LoanFields form={loanForm} setForm={setLoanForm} />
          <TouchableOpacity onPress={saveNewLoan} disabled={saving} style={{ alignItems: 'center', backgroundColor: colors.brandNavy, borderRadius: 10, padding: 15, opacity: saving ? 0.7 : 1 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{saving ? 'Saving…' : 'Give loan & create schedule'}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <BottomSheet visible={!!editFor} onClose={closeEdit}>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Edit customer</Text>
          <Field label="Name" required>
            <TextInput value={editForm.name} onChangeText={(t) => setEditForm((f) => ({ ...f, name: t }))} placeholder="Customer name" style={inputStyle} />
          </Field>
          <Field label="Phone number" required>
            <TextInput value={editForm.phone} onChangeText={(t) => setEditForm((f) => ({ ...f, phone: digits(t) }))} placeholder="9876543210" keyboardType="phone-pad" maxLength={10} style={inputStyle} />
          </Field>
          <Field label="Nominee (optional)">
            <TextInput value={editForm.nominee} onChangeText={(t) => setEditForm((f) => ({ ...f, nominee: t }))} placeholder="Nominee name" style={inputStyle} />
          </Field>
          <Field label="Photo (optional)">
            <PhotoPicker value={editForm.photo} onChange={(p) => setEditForm((f) => ({ ...f, photo: p }))} onError={flash} />
          </Field>
          <Field label="Village (optional)">
            <SearchSelect
              value={editForm.villageId}
              options={villageOptions}
              onChange={(id) => setEditForm((f) => ({ ...f, villageId: id }))}
              onCreate={createVillage}
              placeholder="Select village"
              searchPlaceholder="Search or add a village"
              radius={9999}
            />
          </Field>
          <TouchableOpacity onPress={saveEdit} style={{ alignItems: 'center', backgroundColor: colors.brandNavy, borderRadius: 10, padding: 15 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save changes</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <Toast message={toast} />
    </View>
  );
}

function DetailScreen({ customer: d, onBack, onCollect, onEdit, onNewLoan, onOpenPastLoan }) {
  const closedIn = d.lastPaidWeek || d.weeksPaid;
  return (
    <View style={{ padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <BackArrow onPress={onBack} />
        <Text style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', flex: 1 }}>Back</Text>
        <TouchableOpacity onPress={onEdit}><Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.brandPrimary600 }}>Edit</Text></TouchableOpacity>
      </View>
      <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 18, ...cardShadowSm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <CustomerAvatar customer={d} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 20, fontWeight: '700' }}>{d.name}</Text>
            <Text style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginTop: 2 }}>{[d.phone, d.village].filter(Boolean).join(' · ')}</Text>
            {!!d.address && <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.5)', marginTop: 1 }}>{d.address}</Text>}
            {!!d.nominee && <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.5)', marginTop: 1 }}>Nominee: {d.nominee}</Text>}
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, backgroundColor: colors.neutral200, borderRadius: 8, overflow: 'hidden', marginTop: 16 }}>
          <DetailTile label="Amount given" value={F(d.given)} />
          <DetailTile label="Weekly" value={F(d.weekly)} />
          <DetailTile label="Paid so far" value={F(d.paid)} color={colors.success800} />
          <DetailTile label="Still to pay" value={F(d.remaining)} color={colors.warning900} />
        </View>
        {d.isDone ? (
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.success800, marginTop: 14 }}>
            Loan cleared · paid in {closedIn} week{closedIn === 1 ? '' : 's'}{closedIn < d.totalWeeks ? ` of ${d.totalWeeks}` : ''}
          </Text>
        ) : (
          <Text style={{ fontSize: 13, color: 'rgba(0,0,0,.6)', marginTop: 14 }}>{d.weeksPaid} of {d.totalWeeks} weeks paid</Text>
        )}
        {d.isDone ? (
          <TouchableOpacity onPress={onNewLoan} style={{ marginTop: 16, alignItems: 'center', backgroundColor: colors.brandNavy, borderRadius: 10, padding: 15, ...cardShadowLg }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Give new loan</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onCollect} style={{ marginTop: 16, alignItems: 'center', backgroundColor: colors.brandPrimary600, borderRadius: 10, padding: 15, ...cardShadowLg }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Collect {F(d.weekly)}</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={{ fontSize: 15, fontWeight: '600' }}>{d.loanNo > 1 ? `Loan ${d.loanNo} · payment history` : 'Payment history'}</Text>
      <PaymentHistory timeline={d.timeline} />
      {!!d.pastLoans?.length && (
        <>
          <Text style={{ fontSize: 15, fontWeight: '600' }}>Past loans</Text>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, ...cardShadowSm }}>
            {d.pastLoans.map((l) => (
              <TouchableOpacity key={l.loanNo} onPress={() => onOpenPastLoan(l.loanNo)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral100 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '500', color: 'rgba(0,0,0,.75)' }}>Loan {l.loanNo} · given {F(l.given)}</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(0,0,0,.5)', marginTop: 1 }}>{l.startedAt} – {l.closedAt} · {F(l.weekly)} × {l.totalWeeks} weeks</Text>
                </View>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: colors.success800 }}>{F(l.paid)}</Text>
                <Text style={{ fontSize: 22, color: 'rgba(0,0,0,.35)' }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// Week-by-week payment list for one loan; a spinner while the timeline is still loading.
function PaymentHistory({ timeline }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, ...cardShadowSm }}>
      {!timeline && <ActivityIndicator color={colors.brandNavy} style={{ paddingVertical: 16 }} />}
      {(timeline || []).map((w) => {
        const map = { paid: [colors.success600, 'Paid'], missed: [colors.error600, 'Missed'], partial: [colors.brandPrimary600, 'Part paid'], pending: [colors.warning600, 'Pending'], upcoming: [colors.neutral300, 'Upcoming'] };
        const [dot, label] = map[w.status];
        return (
          <View key={w.week} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral100 }}>
            <View style={{ width: 9, height: 9, borderRadius: 9999, backgroundColor: dot }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '500', color: 'rgba(0,0,0,.75)' }}>Week {w.week}</Text>
              {(w.payments || []).length === 1 && (
                <Text style={{ fontSize: 12, color: 'rgba(0,0,0,.5)', marginTop: 1 }}>Paid {w.payments[0].date}</Text>
              )}
              {(w.payments || []).length > 1 && w.payments.map((p, i) => (
                <Text key={i} style={{ fontSize: 12, color: 'rgba(0,0,0,.5)', marginTop: 1 }}>{p.date} · {F(p.amount)}</Text>
              ))}
            </View>
            <Text style={{ fontSize: 14.5, fontWeight: '700', color: 'rgba(0,0,0,.87)' }}>{F(w.amount)}</Text>
            <StatusBadge status={label} />
          </View>
        );
      })}
    </View>
  );
}

function CustomerRow({ c, i, onOpen, onCollect }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...cardShadowSm }}>
      <TouchableOpacity onPress={onOpen}><Avatar name={c.name} i={i} /></TouchableOpacity>
      <TouchableOpacity onPress={onOpen} style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15.5, fontWeight: '600', color: 'rgba(0,0,0,.87)' }}>{c.name}</Text>
        <Text style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', marginTop: 1 }}>{[c.isDone ? 'Loan cleared' : `Week ${c.currentWeek} of ${c.totalWeeks}`, c.village].filter(Boolean).join(' · ')}</Text>
      </TouchableOpacity>
      {c.isDone && !c.isPaidToday ? (
        <View style={{ backgroundColor: colors.success50, borderRadius: 9999, paddingVertical: 4, paddingHorizontal: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.success800 }}>Done</Text>
        </View>
      ) : c.isPaidToday ? (
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

function Avatar({ name, i, size = 44 }) {
  const [bg, fg] = tint(i);
  return (
    <View style={{ width: size, height: size, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
      <Text style={{ fontSize: size * 0.33, fontWeight: '600', color: fg }}>{initials(name)}</Text>
    </View>
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

// Amount given / weeks / need to collect inputs, shared by Add customer and Give new loan.
function LoanFields({ form, setForm }) {
  const set = (key) => (t) => setForm((f) => ({ ...f, [key]: t.replace(/[^0-9]/g, '') }));
  return (
    <>
      <Field label="Amount given" required>
        <TextInput value={form.amt} onChangeText={set('amt')} placeholder="₹ 10,000" keyboardType="numeric" style={{ ...inputStyle, fontSize: 20, fontWeight: '700', color: colors.brandNavy }} />
      </Field>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="No. of weeks" required>
            <TextInput value={form.weeks} onChangeText={set('weeks')} placeholder="12" keyboardType="numeric" style={{ ...inputStyle, fontWeight: '600' }} />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Need to collect" required>
            <TextInput value={form.total} onChangeText={set('total')} placeholder="₹ 12,000" keyboardType="numeric" style={{ ...inputStyle, fontWeight: '600' }} />
          </Field>
        </View>
      </View>
      <WeeklyHint total={form.total} weeks={form.weeks} />
    </>
  );
}

function WeeklyHint({ total, weeks }) {
  const t = parseInt(total, 10) || 0;
  const w = parseInt(weeks, 10) || 0;
  if (!t || !w) return null;
  const weekly = weeklyFor(total, weeks);
  return (
    <View style={{ backgroundColor: weekly ? colors.brandPrimary50 : colors.warning50, borderRadius: 8, padding: 13, flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 14, color: 'rgba(0,0,0,.7)' }}>Weekly payment</Text>
      {weekly
        ? <Text style={{ fontSize: 16, fontWeight: '700', color: colors.brandNavy }}>{F(weekly)}</Text>
        : <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.warning900 }}>Doesn't divide evenly</Text>}
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

function DetailTile({ label, value, color }) {
  return (
    <View style={{ width: '49.8%', backgroundColor: '#fff', padding: 12 }}>
      <Text style={{ fontSize: 11.5, color: 'rgba(0,0,0,.55)', fontWeight: '500' }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 2, color: color || 'rgba(0,0,0,.87)' }}>{value}</Text>
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

function Field({ label, required, children }) {
  return (
    <View>
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: 'rgba(0,0,0,.6)', marginBottom: 6 }}>
        {label}{required && <Text style={{ color: colors.error600 }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

function Chip({ label, selected, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ borderRadius: 9999, paddingVertical: 9, paddingHorizontal: 15, borderWidth: 1, backgroundColor: selected ? colors.brandNavy : '#fff', borderColor: selected ? colors.brandNavy : colors.neutral300 }}>
      <Text style={{ fontSize: 13.5, fontWeight: '600', color: selected ? '#fff' : 'rgba(0,0,0,.7)' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function BackArrow({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingVertical: 2, paddingHorizontal: 6 }}>
      <Text style={{ fontSize: 22, color: 'rgba(0,0,0,.6)' }}>‹</Text>
    </TouchableOpacity>
  );
}

const inputStyle = { fontSize: 15, color: colors.fg1, borderWidth: 1, borderColor: colors.neutral300, borderRadius: 9999, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#fff' };
