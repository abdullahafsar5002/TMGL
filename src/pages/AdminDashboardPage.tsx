import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Trophy, Calendar, BarChart3, Database, FileText, Plus, Wallet, AlertCircle, Loader2, Power, Receipt, RefreshCw } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatsCard } from '@/components/common/StatsCard';
import { LoadingState } from '@/components/common/LoadingState';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import {
  formatPkr,
  invoiceStatusLabel,
  markInvoicePaid,
  markInvoiceUnpaid,
  settlementLabel,
  type SettlementMethod
} from '@/lib/payments';
import { useAuth } from '@/context/AuthContext';
import type { FeeProduct, FeeInvoice, UserRole } from '@/types/database';

const EMPTY_FORM = { productKey: '', amount: '', durationDays: '365', description: '' };

const ASSIGNABLE_ROLES: Array<{ value: UserRole; label: string }> = [
  { value: 'player', label: 'Player' },
  { value: 'league_manager', label: 'League Manager' },
  { value: 'super_admin', label: 'Super Admin' },
];

interface MemberRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
  membership_tier: string | null;
}

export function AdminDashboardPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, players: 0, tournaments: 0, matches: 0, scorecards: 0, courses: 0 });
  const [feeProducts, setFeeProducts] = useState<FeeProduct[]>([]);
  const [feeForm, setFeeForm] = useState(EMPTY_FORM);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeNotice, setFeeNotice] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [payingInvoice, setPayingInvoice] = useState<FeeInvoice | null>(null);
  const [settleMethod, setSettleMethod] = useState<SettlementMethod>('cash');
  const [settleReference, setSettleReference] = useState('');
  const [busyInvoiceId, setBusyInvoiceId] = useState<string | null>(null);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [ledgerNotice, setLedgerNotice] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [roleSavingId, setRoleSavingId] = useState<string | null>(null);

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at, membership_tier')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      setMembersError(getErrorMessage(error, 'Unable to load members.'));
      return;
    }
    setMembersError(null);
    setMembers((data ?? []) as MemberRow[]);
  };

  const loadInvoices = async () => {
    const { data, error } = await supabase
      .from('fee_invoices')
      .select('id, invoice_number, payer_profile_id, product_key, kind, amount_minor, currency, status, created_at, paid_at, settled_via, settled_reference, settled_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      setMembersError(getErrorMessage(error, 'Unable to load invoices.'));
      return;
    }
    setInvoices((data ?? []) as FeeInvoice[]);
  };

  const handleMarkPaid = async () => {
    if (!payingInvoice) return;
    setBusyInvoiceId(payingInvoice.id);
    setLedgerError(null);
    setLedgerNotice(null);
    try {
      await markInvoicePaid(payingInvoice.id, settleMethod, settleReference);
      setLedgerNotice(`Recorded ${formatPkr(payingInvoice.amount_minor / 100)} as paid via ${settlementLabel(settleMethod)}.`);
      setPayingInvoice(null);
      setSettleReference('');
      await loadInvoices();
    } catch (error) {
      setLedgerError(getErrorMessage(error, 'Unable to record the payment.'));
    } finally {
      setBusyInvoiceId(null);
    }
  };

  const handleUnmarkPaid = async (invoiceId: string) => {
    setBusyInvoiceId(invoiceId);
    setLedgerError(null);
    setLedgerNotice(null);
    try {
      await markInvoiceUnpaid(invoiceId);
      setLedgerNotice('Invoice reopened as unpaid.');
      await loadInvoices();
    } catch (error) {
      setLedgerError(getErrorMessage(error, 'Unable to reopen the invoice.'));
    } finally {
      setBusyInvoiceId(null);
    }
  };

  const handleRoleChange = async (member: MemberRow, role: UserRole) => {
    if (member.id === profile?.id) {
      setMembersError('You cannot change your own role.');
      return;
    }
    setRoleSavingId(member.id);
    setMembersError(null);
    const { error } = await supabase.from('profiles').update({ role }).eq('id', member.id);
    setRoleSavingId(null);
    if (error) {
      setMembersError(getErrorMessage(error, 'Unable to update that role.'));
      return;
    }
    await loadMembers();
  };

  const loadFeeProducts = async () => {
    const { data, error } = await supabase
      .from('fee_products')
      .select('id, product_key, kind, tournament_id, amount_minor, duration_days, currency, description, active, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) {
      setFeeError(getErrorMessage(error, 'Unable to load fee products.'));
      return;
    }
    setFeeProducts((data ?? []) as FeeProduct[]);
  };

  useEffect(() => {
    const load = async () => {
      const results = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('players').select('id', { count: 'exact', head: true }),
        supabase.from('tournaments').select('id', { count: 'exact', head: true }),
        supabase.from('matches').select('id', { count: 'exact', head: true }),
        supabase.from('scorecards').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        users: results[0].count ?? 0,
        players: results[1].count ?? 0,
        tournaments: results[2].count ?? 0,
        matches: results[3].count ?? 0,
        scorecards: results[4].count ?? 0,
        courses: results[5].count ?? 0,
      });
      await loadFeeProducts();
      await loadMembers();
      await loadInvoices();
      setLoading(false);
    };
    load();
  }, []);

  const handleCreateFeeProduct = async (event: FormEvent) => {
    event.preventDefault();
    setFeeError(null);
    setFeeNotice(null);
    const productKey = feeForm.productKey.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    const amount = Number(feeForm.amount);
    const durationDays = Number(feeForm.durationDays);
    if (productKey.length < 4) {
      setFeeError('Product key must be at least 4 characters (letters, numbers, underscore).');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFeeError('Enter a valid amount in PKR.');
      return;
    }
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
      setFeeError('Duration must be between 1 and 3650 days.');
      return;
    }
    setFeeSaving(true);
    const { error } = await supabase.from('fee_products').upsert({
      product_key: productKey,
      kind: 'membership',
      amount_minor: Math.round(amount * 100),
      duration_days: durationDays,
      description: feeForm.description.trim() || null,
      active: true,
    }, { onConflict: 'product_key' });
    setFeeSaving(false);
    if (error) {
      setFeeError(getErrorMessage(error, 'Unable to save the fee product.'));
      return;
    }
    setFeeForm(EMPTY_FORM);
    setFeeNotice(`Fee product "${productKey}" saved. It is now available when raising an offline invoice.`);
    await loadFeeProducts();
  };

  const handleToggleFeeProduct = async (product: FeeProduct) => {
    setFeeError(null);
    setFeeNotice(null);
    const { error } = await supabase
      .from('fee_products')
      .update({ active: !product.active })
      .eq('id', product.id);
    if (error) {
      setFeeError(getErrorMessage(error, 'Unable to update the fee product.'));
      return;
    }
    await loadFeeProducts();
  };

  if (loading) return <LoadingState message="Loading admin dashboard..." />;

  return (
    <Container className="py-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-tmgl-green-100 flex items-center justify-center">
          <Shield className="w-5 h-5 text-tmgl-green-700" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-tmgl-charcoal-900">Admin Dashboard</h1>
          <p className="text-tmgl-charcoal-600">System-wide overview and management</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatsCard label="Total Users" value={stats.users} icon={<Users className="h-5 w-5" />} />
        <StatsCard label="Players" value={stats.players} icon={<Users className="h-5 w-5" />} />
        <StatsCard label="Tournaments" value={stats.tournaments} icon={<Trophy className="h-5 w-5" />} />
        <StatsCard label="Matches" value={stats.matches} icon={<BarChart3 className="h-5 w-5" />} />
        <StatsCard label="Scorecards" value={stats.scorecards} icon={<FileText className="h-5 w-5" />} />
        <StatsCard label="Courses" value={stats.courses} icon={<Database className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-tmgl-charcoal-900">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/tournaments/new">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" /> New Tournament
                </Button>
              </Link>
              <Link to="/players/new">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" /> Add Player
                </Button>
              </Link>
              <Link to="/teams/new">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" /> Create Team
                </Button>
              </Link>
              <Link to="/courses/new">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" /> Add Course
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-tmgl-charcoal-900 mb-4">System Management</h3>
            <div className="space-y-2">
              {[
                { label: 'Manage Users', path: '/players', icon: Users },
                { label: 'Manage Tournaments', path: '/tournaments', icon: Trophy },
                { label: 'Manage Courses', path: '/courses', icon: Database },
                { label: 'View Matches', path: '/matches', icon: Calendar },
                { label: 'Announcements', path: '/announcements/manage', icon: FileText },
              ].map((item) => (
                <Link key={item.path} to={item.path} className="flex items-center gap-3 p-2 rounded-lg hover:bg-tmgl-charcoal-50 transition-colors">
                  <item.icon className="w-4 h-4 text-tmgl-green-700" />
                  <span className="text-sm font-medium text-tmgl-charcoal-700">{item.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-tmgl-charcoal-900 mb-4">Analytics</h3>
            <div className="space-y-2">
              <Link to="/analytics" className="flex items-center gap-3 p-2 rounded-lg hover:bg-tmgl-charcoal-50 transition-colors">
                <BarChart3 className="w-4 h-4 text-tmgl-green-700" />
                <span className="text-sm font-medium text-tmgl-charcoal-700">League Analytics</span>
              </Link>
              <Link to="/leaderboard" className="flex items-center gap-3 p-2 rounded-lg hover:bg-tmgl-charcoal-50 transition-colors">
                <Trophy className="w-4 h-4 text-tmgl-green-700" />
                <span className="text-sm font-medium text-tmgl-charcoal-700">Leaderboard</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-tmgl-gold-600" />
              <h3 className="text-lg font-semibold text-tmgl-charcoal-900">Membership Fees</h3>
            </div>
            <p className="mb-4 text-sm text-tmgl-charcoal-600">
              Server-priced fees for offline collection. Amounts are stored in paisa and can only be changed here, never on an issued invoice.
            </p>
            {feeError && (
              <p role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{feeError}
              </p>
            )}
            {feeNotice && (
              <p role="status" className="mb-3 rounded-lg border border-tmgl-gold-500/40 bg-tmgl-gold-500/10 p-3 text-sm text-tmgl-charcoal-800">
                {feeNotice}
              </p>
            )}
            <form onSubmit={(event) => void handleCreateFeeProduct(event)} className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="fee-key" className="mb-1 block text-xs font-medium text-tmgl-charcoal-700">Product key</label>
                <input
                  id="fee-key"
                  value={feeForm.productKey}
                  onChange={(event) => setFeeForm((form) => ({ ...form, productKey: event.target.value }))}
                  placeholder="membership_pro_annual"
                  className="min-h-[44px] w-full rounded-lg border border-tmgl-charcoal-300 px-3 py-2 text-sm focus:border-tmgl-gold-500 focus:outline-none focus:ring-2 focus:ring-tmgl-gold-500"
                />
              </div>
              <div>
                <label htmlFor="fee-amount" className="mb-1 block text-xs font-medium text-tmgl-charcoal-700">Amount (PKR)</label>
                <input
                  id="fee-amount"
                  inputMode="decimal"
                  value={feeForm.amount}
                  onChange={(event) => setFeeForm((form) => ({ ...form, amount: event.target.value }))}
                  placeholder="25000"
                  className="min-h-[44px] w-full rounded-lg border border-tmgl-charcoal-300 px-3 py-2 text-sm focus:border-tmgl-gold-500 focus:outline-none focus:ring-2 focus:ring-tmgl-gold-500"
                />
              </div>
              <div>
                <label htmlFor="fee-duration" className="mb-1 block text-xs font-medium text-tmgl-charcoal-700">Duration (days)</label>
                <input
                  id="fee-duration"
                  inputMode="numeric"
                  value={feeForm.durationDays}
                  onChange={(event) => setFeeForm((form) => ({ ...form, durationDays: event.target.value }))}
                  className="min-h-[44px] w-full rounded-lg border border-tmgl-charcoal-300 px-3 py-2 text-sm focus:border-tmgl-gold-500 focus:outline-none focus:ring-2 focus:ring-tmgl-gold-500"
                />
              </div>
              <div>
                <label htmlFor="fee-description" className="mb-1 block text-xs font-medium text-tmgl-charcoal-700">Description</label>
                <input
                  id="fee-description"
                  value={feeForm.description}
                  onChange={(event) => setFeeForm((form) => ({ ...form, description: event.target.value }))}
                  placeholder="Pro membership (annual)"
                  className="min-h-[44px] w-full rounded-lg border border-tmgl-charcoal-300 px-3 py-2 text-sm focus:border-tmgl-gold-500 focus:outline-none focus:ring-2 focus:ring-tmgl-gold-500"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <Button type="submit" variant="gold" disabled={feeSaving}>
                  {feeSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Save membership fee
                </Button>
              </div>
            </form>
            {feeProducts.length === 0 ? (
              <p className="rounded-lg border border-dashed border-tmgl-charcoal-300 p-4 text-sm text-tmgl-charcoal-600">
                No membership fee configured yet. Add one before raising an offline invoice.
              </p>
            ) : (
              <ul className="divide-y divide-tmgl-charcoal-200">
                {feeProducts.map((product) => (
                  <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-tmgl-charcoal-900">{product.product_key}</p>
                      <p className="text-sm text-tmgl-charcoal-600">
                        {formatPkr(product.amount_minor / 100)} &middot; {product.duration_days} days &middot; {product.description || 'No description'}
                      </p>
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-tmgl-gold-600" />
                <h3 className="text-lg font-semibold text-tmgl-charcoal-900">Members &amp; Roles</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => { void loadMembers(); void loadInvoices(); }}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
            {membersError && (
              <p role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{membersError}
              </p>
            )}
            {members.length === 0 ? (
              <p className="rounded-lg border border-dashed border-tmgl-charcoal-300 p-4 text-sm text-tmgl-charcoal-600">
                No members found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead>
                    <tr className="border-b border-tmgl-charcoal-200 text-left">
                      <th className="py-2 font-medium text-tmgl-charcoal-600">Member</th>
                      <th className="py-2 font-medium text-tmgl-charcoal-600">Email</th>
                      <th className="py-2 font-medium text-tmgl-charcoal-600">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tmgl-charcoal-100">
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td className="py-2 font-medium text-tmgl-charcoal-900">
                          {member.full_name || 'Unnamed player'}
                          {member.id === profile?.id && <span className="ml-2 text-xs text-tmgl-gold-700">(you)</span>}
                        </td>
                        <td className="py-2 text-tmgl-charcoal-600">{member.email || '—'}</td>
                        <td className="py-2">
                          <label className="sr-only" htmlFor={`role-${member.id}`}>Role for {member.full_name || member.id}</label>
                          <select
                            id={`role-${member.id}`}
                            value={member.role}
                            disabled={roleSavingId === member.id || member.id === profile?.id}
                            onChange={(event) => void handleRoleChange(member, event.target.value as UserRole)}
                            className="min-h-[44px] w-full rounded-lg border border-tmgl-charcoal-300 bg-white px-3 py-2 text-sm text-tmgl-charcoal-900 focus:border-tmgl-gold-500 focus:outline-none focus:ring-2 focus:ring-tmgl-gold-500 disabled:opacity-60"
                          >
                            {ASSIGNABLE_ROLES.map((role) => (
                              <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-tmgl-gold-600" />
              <h3 className="text-lg font-semibold text-tmgl-charcoal-900">Recent Payments</h3>
            </div>
            {ledgerError && (
              <p role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{ledgerError}
              </p>
            )}
            {ledgerNotice && (
              <p role="status" className="mb-3 rounded-lg border border-tmgl-gold-500/40 bg-tmgl-gold-500/10 p-3 text-sm text-tmgl-charcoal-800">
                {ledgerNotice}
              </p>
            )}
            {invoices.length === 0 ? (
              <p className="rounded-lg border border-dashed border-tmgl-charcoal-300 p-4 text-sm text-tmgl-charcoal-600">
                No invoices issued yet. Invoices are created manually when you raise a fee.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[42rem] text-sm">
                  <thead>
                    <tr className="border-b border-tmgl-charcoal-200 text-left">
                      <th className="py-2 font-medium text-tmgl-charcoal-600">Invoice</th>
                      <th className="py-2 font-medium text-tmgl-charcoal-600">Product</th>
                      <th className="py-2 font-medium text-tmgl-charcoal-600">Amount</th>
                      <th className="py-2 font-medium text-tmgl-charcoal-600">Status</th>
                      <th className="py-2 font-medium text-tmgl-charcoal-600">Settled via</th>
                      <th className="py-2 font-medium text-tmgl-charcoal-600">Created</th>
                      <th className="py-2 font-medium text-tmgl-charcoal-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tmgl-charcoal-100">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="py-2 font-mono text-xs text-tmgl-charcoal-800">{invoice.invoice_number}</td>
                        <td className="py-2 text-tmgl-charcoal-600">{invoice.product_key}</td>
                        <td className="py-2 font-medium text-tmgl-charcoal-900">{formatPkr(invoice.amount_minor / 100)}</td>
                        <td className="py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {invoiceStatusLabel(invoice.status)}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-tmgl-charcoal-600">
                          {settlementLabel(invoice.settled_via) ?? '-'}
                          {invoice.settled_reference ? ` (${invoice.settled_reference})` : ''}
                        </td>
                        <td className="py-2 text-tmgl-charcoal-600">{new Date(invoice.created_at).toLocaleDateString()}</td>
                        <td className="py-2">
                          {invoice.status === 'paid' ? (
                            <Button variant="outline" size="sm" disabled={busyInvoiceId === invoice.id}
                              onClick={() => void handleUnmarkPaid(invoice.id)}>
                              {busyInvoiceId === invoice.id ? 'Working...' : 'Undo'}
                            </Button>
                          ) : (
                            <Button variant="gold" size="sm" disabled={busyInvoiceId === invoice.id}
                              onClick={() => setPayingInvoice(invoice)}>
                              Mark paid
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
                    <Button variant="outline" onClick={() => void handleToggleFeeProduct(product)} aria-pressed={product.active}>
                      <Power className="mr-2 h-4 w-4" />
                      {product.active ? 'Active' : 'Inactive'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-tmgl-charcoal-900/60 p-4 sm:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby="settle-title"
            className="w-full max-w-md rounded-xl border border-tmgl-charcoal-200 bg-white p-5 shadow-xl">
            <h3 id="settle-title" className="text-lg font-semibold text-tmgl-charcoal-900">Record offline payment</h3>
            <p className="mt-1 text-sm text-tmgl-charcoal-600">
              {payingInvoice.invoice_number} &middot; {formatPkr(payingInvoice.amount_minor / 100)}
            </p>
            {ledgerError && (
              <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{ledgerError}
              </p>
            )}
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="settle-method" className="mb-1 block text-xs font-medium text-tmgl-charcoal-700">Method</label>
                <select id="settle-method" value={settleMethod} onChange={(event) => setSettleMethod(event.target.value as SettlementMethod)}
                  className="min-h-[44px] w-full rounded-lg border border-tmgl-charcoal-300 bg-white px-3 py-2 text-sm focus:border-tmgl-gold-500 focus:outline-none focus:ring-2 focus:ring-tmgl-gold-500">
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="settle-reference" className="mb-1 block text-xs font-medium text-tmgl-charcoal-700">
                  Receipt / reference number <span className="font-normal text-tmgl-charcoal-500">(optional)</span>
                </label>
                <input id="settle-reference" value={settleReference} onChange={(event) => setSettleReference(event.target.value)}
                  placeholder="e.g. TRX-88213"
                  className="min-h-[44px] w-full rounded-lg border border-tmgl-charcoal-300 px-3 py-2 text-sm focus:border-tmgl-gold-500 focus:outline-none focus:ring-2 focus:ring-tmgl-gold-500" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setPayingInvoice(null); setLedgerError(null); }}>Cancel</Button>
              <Button variant="gold" disabled={busyInvoiceId !== null} onClick={() => void handleMarkPaid()}>
                {busyInvoiceId !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                Mark as paid
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
