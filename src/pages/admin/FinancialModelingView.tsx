import React, { useEffect, useMemo, useState } from 'react';
import { Edit2, Save } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BUSINESS_PLAN_SCENARIOS } from '../../constants/defaults';
import { FinancialScenario, SubscriptionRecord } from '../../types/models';
import { calculateFinancialScenario, formatInr } from '../../utils/calculations';
import {
  adminUpdateSubscription,
  fetchPlatformSetting,
  saveFinancialScenariosSetting,
} from '../../services/firestoreService';
import { Modal } from '../../components/Modal';
import { StatusText } from '../../components/StatusText';

interface FinancialModelingViewProps {
  subscriptions: SubscriptionRecord[];
}

export const FinancialModelingView: React.FC<FinancialModelingViewProps> = ({ subscriptions }) => {
  const [scenarios, setScenarios] = useState<FinancialScenario[]>(BUSINESS_PLAN_SCENARIOS);
  const [selectedId, setSelectedId] = useState<FinancialScenario['id']>('base');
  const [monthlyFixedActual, setMonthlyFixedActual] = useState(250000);
  const [savingScenarios, setSavingScenarios] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [editingSub, setEditingSub] = useState<SubscriptionRecord | null>(null);
  const [subForm, setSubForm] = useState({
    planName: 'Free Trial' as SubscriptionRecord['planName'],
    annualFeeInr: 60000,
    variableCostInr: 10000,
    paymentStatus: 'trial' as SubscriptionRecord['paymentStatus'],
    collectedAmountInr: 0,
    renewalDate: '',
    notes: '',
  });
  const [savingSub, setSavingSub] = useState(false);

  useEffect(() => {
    fetchPlatformSetting('financial_scenarios').then((payload) => {
      if (payload && Array.isArray(payload.scenarios)) {
        setScenarios(payload.scenarios as FinancialScenario[]);
      }
    });
  }, []);

  const activeScenario = scenarios.find((s) => s.id === selectedId) || scenarios[0];
  const activePnL = calculateFinancialScenario(activeScenario);

  const updateActiveScenarioField = (field: keyof FinancialScenario, value: number) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === activeScenario.id ? { ...s, [field]: Math.max(0, value) } : s))
    );
  };

  const handlePersistScenarios = async () => {
    setSavingScenarios(true);
    setSavedMsg(null);
    try {
      await saveFinancialScenariosSetting(scenarios);
      setSavedMsg('Financial modelling assumptions saved to Firestore platform_settings.');
    } finally {
      setSavingScenarios(false);
    }
  };

  const chartData = useMemo(
    () =>
      scenarios.map((s) => {
        const pnl = calculateFinancialScenario(s);
        return {
          name: s.name.replace(' Scenario', ''),
          revenue: pnl.expectedAnnualRevenueInr,
          operatingCost: pnl.totalOperatingCostInr,
          netResult: pnl.netOperatingResultInr,
        };
      }),
    [scenarios]
  );

  // Separate Real Firestore Subscription Actuals (never mixed with planning assumptions)
  const actuals = useMemo(() => {
    const expectedRevenue = subscriptions.reduce(
      (sum, s) => sum + (s.paymentStatus === 'trial' ? 0 : s.annualFeeInr),
      0
    );
    const collectedPayments = subscriptions.reduce(
      (sum, s) => sum + (s.paymentStatus === 'paid' ? s.collectedAmountInr : 0),
      0
    );
    const outstandingInvoices = subscriptions.reduce(
      (sum, s) =>
        sum +
        (s.paymentStatus === 'unpaid' || s.paymentStatus === 'overdue'
          ? Math.max(0, s.annualFeeInr - s.collectedAmountInr)
          : 0),
      0
    );
    const variableCosts = subscriptions.reduce((sum, s) => sum + s.variableCostInr, 0);
    const annualFixedCosts = monthlyFixedActual * 12;
    const netOperatingResult = collectedPayments - (variableCosts + annualFixedCosts);

    return {
      expectedRevenue,
      collectedPayments,
      outstandingInvoices,
      variableCosts,
      annualFixedCosts,
      netOperatingResult,
    };
  }, [subscriptions, monthlyFixedActual]);

  const openEditSub = (sub: SubscriptionRecord) => {
    setEditingSub(sub);
    setSubForm({
      planName: sub.planName,
      annualFeeInr: sub.annualFeeInr,
      variableCostInr: sub.variableCostInr,
      paymentStatus: sub.paymentStatus,
      collectedAmountInr: sub.collectedAmountInr,
      renewalDate: sub.renewalDate,
      notes: sub.notes || '',
    });
  };

  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    setSavingSub(true);
    try {
      await adminUpdateSubscription(editingSub, subForm);
      setEditingSub(null);
    } finally {
      setSavingSub(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* SECTION A: EDITABLE BUSINESS PLAN SCENARIO MODELLING */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <p className="text-xs font-semibold text-emerald-700">Planning Assumptions Only (Editable)</p>
            <h2 className="font-display text-lg font-bold text-slate-900">
              MBA Venture Financial Scenario Model
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex bg-slate-100 p-1 rounded-lg">
              {scenarios.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setSelectedId(sc.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    selectedId === sc.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sc.name.replace(' Scenario', '')}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handlePersistScenarios}
              disabled={savingScenarios}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0B172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {savingScenarios ? 'Saving...' : 'Save Assumptions'}
            </button>
          </div>
        </div>

        {savedMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
            {savedMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Annual Subscription (₹)</span>
                <input
                  type="number"
                  min={0}
                  value={activeScenario.annualSubscriptionInr}
                  onChange={(e) => updateActiveScenarioField('annualSubscriptionInr', Number(e.target.value) || 0)}
                  className="mt-1 w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">SME Customers</span>
                <input
                  type="number"
                  min={0}
                  value={activeScenario.customers}
                  onChange={(e) => updateActiveScenarioField('customers', Number(e.target.value) || 0)}
                  className="mt-1 w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Variable Cost / Customer (₹)</span>
                <input
                  type="number"
                  min={0}
                  value={activeScenario.variableCostPerCustomerInr}
                  onChange={(e) => updateActiveScenarioField('variableCostPerCustomerInr', Number(e.target.value) || 0)}
                  className="mt-1 w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Monthly Fixed Cost (₹)</span>
                <input
                  type="number"
                  min={0}
                  value={activeScenario.monthlyFixedCostInr}
                  onChange={(e) => updateActiveScenarioField('monthlyFixedCostInr', Number(e.target.value) || 0)}
                  className="mt-1 w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                />
              </label>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Expected Annual Subscription Revenue</span>
                <strong className="font-mono tabular-nums text-slate-900">
                  {formatInr(activePnL.expectedAnnualRevenueInr)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Annual Variable Cost</span>
                <span className="font-mono tabular-nums text-slate-700">
                  {formatInr(activePnL.totalVariableCostInr)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Annual Fixed Operating Cost (12 mos)</span>
                <span className="font-mono tabular-nums text-slate-700">
                  {formatInr(activePnL.annualFixedCostInr)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                <span className="font-semibold text-slate-900">Projected Net Operating Result</span>
                <strong
                  className={`font-mono tabular-nums ${
                    activePnL.netOperatingResultInr >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {formatInr(activePnL.netOperatingResultInr)}
                </strong>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Contribution / Customer: {formatInr(activePnL.contributionPerCustomerInr)}</span>
                <span>
                  Break-even SMEs:{' '}
                  <strong className="font-mono">
                    {activePnL.breakEvenCustomers !== null ? activePnL.breakEvenCustomers : 'N/A'}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <h3 className="text-xs font-semibold text-slate-700 mb-3">
              Scenario Comparison: Annual Revenue vs Operating Cost (₹ INR)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip formatter={(val: unknown) => formatInr(Number(val))} />
                  <Legend />
                  <Bar dataKey="revenue" name="Expected Revenue" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="operatingCost" name="Total Operating Cost" fill="#0F172A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION B: ACTUAL FIRESTORE SUBSCRIPTION LEDGER (Tracked Separately from Assumptions) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500">Live Firestore Records (Manual MVP Billing)</p>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Actual Subscription & Cashflow Ledger ({subscriptions.length} Companies)
            </h2>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <span>Actual Monthly Fixed Cost (₹):</span>
            <input
              type="number"
              min={0}
              value={monthlyFixedActual}
              onChange={(e) => setMonthlyFixedActual(Math.max(0, Number(e.target.value) || 0))}
              className="w-28 px-2.5 py-1.5 font-mono text-xs border border-slate-300 rounded-lg bg-white"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { label: 'Expected Sub Revenue', value: formatInr(actuals.expectedRevenue) },
            { label: 'Collected Payments', value: formatInr(actuals.collectedPayments), green: true },
            { label: 'Outstanding Invoices', value: formatInr(actuals.outstandingInvoices) },
            { label: 'Actual Variable Costs', value: formatInr(actuals.variableCosts) },
            { label: 'Annual Fixed Costs', value: formatInr(actuals.annualFixedCosts) },
            {
              label: 'Actual Net Result',
              value: formatInr(actuals.netOperatingResult),
              negative: actuals.netOperatingResult < 0,
            },
          ].map((m) => (
            <div key={m.label} className="p-4 bg-white border border-slate-200 rounded-xl">
              <p className="text-[11px] text-slate-500">{m.label}</p>
              <p
                className={`font-mono text-base font-bold tabular-nums mt-1 ${
                  m.green ? 'text-emerald-700' : m.negative ? 'text-red-700' : 'text-slate-900'
                }`}
              >
                {m.value}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {subscriptions.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              No company subscriptions exist yet. Subscriptions are created automatically in Free Trial status when SMEs register.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Company</th>
                    <th className="py-3 px-4 font-semibold">Plan</th>
                    <th className="py-3 px-4 font-semibold text-right">Annual Fee</th>
                    <th className="py-3 px-4 font-semibold text-right">Collected</th>
                    <th className="py-3 px-4 font-semibold">Payment Status</th>
                    <th className="py-3 px-4 font-semibold">Renewal</th>
                    <th className="py-3 px-4 font-semibold text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id}>
                      <td className="py-3 px-4 font-semibold text-slate-900">{sub.companyName}</td>
                      <td className="py-3 px-4 text-slate-700">{sub.planName}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">{formatInr(sub.annualFeeInr)}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                        {formatInr(sub.collectedAmountInr)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusText status={sub.paymentStatus} />
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{sub.renewalDate}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEditSub(sub)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(editingSub)}
        onClose={() => setEditingSub(null)}
        title={`Manage Subscription — ${editingSub?.companyName || ''}`}
        subtitle="Manual academic-MVP billing management. Never mark unpaid invoices as paid."
      >
        <form onSubmit={handleSaveSub} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Plan Name</span>
              <select
                value={subForm.planName}
                onChange={(e) => setSubForm({ ...subForm, planName: e.target.value as SubscriptionRecord['planName'] })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Free Trial">Free Trial</option>
                <option value="Standard SME Annual">Standard SME Annual</option>
                <option value="Growth Multi-Plant">Growth Multi-Plant</option>
                <option value="Academic Demo Plan">Academic Demo Plan</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Payment Status</span>
              <select
                value={subForm.paymentStatus}
                onChange={(e) => setSubForm({ ...subForm, paymentStatus: e.target.value as SubscriptionRecord['paymentStatus'] })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="trial">Trial (Free)</option>
                <option value="unpaid">Unpaid / Invoice Raised</option>
                <option value="paid">Paid (Manually Confirmed)</option>
                <option value="overdue">Overdue</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Annual Fee (₹)</span>
              <input
                type="number"
                min={0}
                value={subForm.annualFeeInr}
                onChange={(e) => setSubForm({ ...subForm, annualFeeInr: Math.max(0, Number(e.target.value) || 0) })}
                className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Collected (₹)</span>
              <input
                type="number"
                min={0}
                value={subForm.collectedAmountInr}
                onChange={(e) => setSubForm({ ...subForm, collectedAmountInr: Math.max(0, Number(e.target.value) || 0) })}
                className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Variable Cost (₹)</span>
              <input
                type="number"
                min={0}
                value={subForm.variableCostInr}
                onChange={(e) => setSubForm({ ...subForm, variableCostInr: Math.max(0, Number(e.target.value) || 0) })}
                className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Renewal Date</span>
            <input
              type="date"
              value={subForm.renewalDate}
              onChange={(e) => setSubForm({ ...subForm, renewalDate: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Internal Billing Notes</span>
            <input
              value={subForm.notes}
              onChange={(e) => setSubForm({ ...subForm, notes: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setEditingSub(null)}
              className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingSub}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              {savingSub ? 'Updating...' : 'Save Subscription'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
