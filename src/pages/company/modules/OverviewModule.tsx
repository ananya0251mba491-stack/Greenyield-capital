import React from 'react';
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  FileText,
  Flame,
  Leaf,
  TrendingDown,
  Zap,
} from 'lucide-react';
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
import {
  Company,
  EsgReport,
  Facility,
  ReportReview,
  SustainabilityProject,
  UtilityRecord,
} from '../../../types/models';
import { aggregateEmissions, formatNumber } from '../../../utils/calculations';
import { StatusText } from '../../../components/StatusText';

interface OverviewModuleProps {
  company: Company;
  facilities: Facility[];
  utilityRecords: UtilityRecord[];
  projects: SustainabilityProject[];
  reports: EsgReport[];
  reviews: ReportReview[];
  onNavigateTab: (tab: string) => void;
}

export const OverviewModule: React.FC<OverviewModuleProps> = ({
  company,
  facilities,
  utilityRecords,
  projects,
  reports,
  reviews,
  onNavigateTab,
}) => {
  const agg = aggregateEmissions(utilityRecords);
  const activeProjects = projects.filter((p) => p.status !== 'Completed').length;
  const pendingUtilityReviews = utilityRecords.filter((r) => r.reviewStatus === 'pending_review').length;
  const pendingReportReviews = reviews.filter((r) => r.status === 'pending' || r.status === 'in_review').length;
  const totalPendingReviews = pendingUtilityReviews + pendingReportReviews;

  const kpis = [
    {
      label: 'Total Electricity Consumption',
      value: `${formatNumber(agg.totalElectricityKwh, 1)} kWh`,
      sub: `${formatNumber(agg.renewableElectricityKwh, 0)} kWh renewable offset`,
    },
    {
      label: 'Total Fuel Consumption',
      value: `${formatNumber(agg.totalFuelVolume, 1)} units`,
      sub: `${agg.fuelRecordsCount} direct fuel record(s)`,
    },
    {
      label: 'Estimated Scope 1 Emissions',
      value: `${formatNumber(agg.scope1Tonnes, 3)} tCO2e`,
      sub: 'Direct fuel combustion (indicative)',
    },
    {
      label: 'Estimated Scope 2 Emissions',
      value: `${formatNumber(agg.scope2Tonnes, 3)} tCO2e`,
      sub: 'Net purchased grid electricity',
    },
    {
      label: 'Total Estimated Emissions',
      value: `${formatNumber(agg.totalTonnes, 3)} tCO2e`,
      sub: `${agg.reportedMonthsCount} month(s) reported`,
      highlight: true,
    },
    {
      label: 'Previous Reporting Period',
      value: agg.previousPeriodTonnes > 0 ? `${formatNumber(agg.previousPeriodTonnes, 3)} tCO2e` : '0.000 tCO2e',
      sub: agg.yoyChangePct !== null ? `YoY change: ${agg.yoyChangePct > 0 ? '+' : ''}${agg.yoyChangePct}%` : 'Awaiting multi-period baseline',
    },
    {
      label: 'Estimated Emission Reduction',
      value: `${formatNumber(agg.estimatedReductionTonnes, 3)} tCO2e`,
      sub: 'Period variance estimate (unverified)',
    },
    {
      label: 'Active Sustainability Projects',
      value: String(activeProjects),
      sub: `${projects.length} total project(s) logged`,
    },
    {
      label: 'ESG Reports Generated',
      value: String(reports.length),
      sub: `${reports.filter((r) => r.status === 'approved_internally').length} approved internally`,
    },
    {
      label: 'Pending Data Reviews',
      value: String(totalPendingReviews),
      sub: `${pendingUtilityReviews} utility · ${pendingReportReviews} report review(s)`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Status Banner if pending approval */}
      {company.status !== 'active' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-950">
              Company Application Status: {company.status.toUpperCase()}
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              You can configure facilities, enter utility data, and draft ESG reports while the
              Platform Owner reviews your registration.
            </p>
          </div>
          <StatusText status={company.status} />
        </div>
      )}

      {/* 10 Real-Time Company Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((card) => (
          <div
            key={card.label}
            className={`p-4 rounded-xl border ${
              card.highlight
                ? 'bg-[#0B172A] text-white border-slate-800'
                : 'bg-white text-slate-900 border-slate-200'
            }`}
          >
            <p className={`text-xs font-medium ${card.highlight ? 'text-slate-300' : 'text-slate-500'}`}>
              {card.label}
            </p>
            <p
              className={`font-mono text-xl font-bold tabular-nums mt-1.5 ${
                card.highlight ? 'text-emerald-400' : 'text-slate-900'
              }`}
            >
              {card.value}
            </p>
            <p className={`text-[11px] mt-1 ${card.highlight ? 'text-slate-400' : 'text-slate-500'}`}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Empty State Guided Quick Start when zero utility records exist */}
      {utilityRecords.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6" />
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900 mb-2">
            No operational activity records logged yet
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6">
            All metrics above show true zero values from Cloud Firestore. Follow these three steps
            to compute your operational Scope 1 & Scope 2 footprint and generate a branded PDF ESG
            report.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab('facilities')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              1. Add Facility ({facilities.length})
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('utility')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white text-sm font-semibold rounded-lg hover:bg-emerald-800 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              2. Record Electricity / Fuel
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('reports')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-800 text-sm font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              3. Build ESG Report
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Monthly Emissions Trend Chart */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Monthly Operational Emissions Trend (tCO2e)
                </h2>
                <p className="text-xs text-slate-500">
                  Scope 1 direct fuels vs Scope 2 net purchased electricity · Indicative estimates
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('calculator')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
              >
                Full Calculator <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agg.byMonth} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      `${formatNumber(Number(value), 3)} tCO2e`,
                      name === 'scope1' ? 'Scope 1 (Fuel)' : 'Scope 2 (Grid)',
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="scope1" name="Scope 1 (Direct Fuel)" stackId="a" fill="#0F172A" />
                  <Bar dataKey="scope2" name="Scope 2 (Electricity)" stackId="a" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Facility Breakdown & Quick Actions */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 mb-1">
                Emissions by Facility
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Data completeness: {agg.dataCompletenessPct}% ({agg.missingMonthsInYear} month(s) missing in latest year)
              </p>
              <div className="divide-y divide-slate-100">
                {agg.byFacility.map((fac) => (
                  <div key={fac.facilityId} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{fac.facilityName}</p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums">
                        {formatNumber(fac.electricityKwh, 0)} kWh · {fac.records} log(s)
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                        {formatNumber(fac.total, 2)} t
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                        S1 {formatNumber(fac.scope1, 1)} / S2 {formatNumber(fac.scope2, 1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab('utility')}
                className="py-2 px-3 bg-emerald-700 text-white text-xs font-semibold rounded-lg hover:bg-emerald-800 cursor-pointer"
              >
                + Log Utility Data
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('reports')}
                className="py-2 px-3 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Module Shortcuts Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigateTab('projects')}
          className="p-4 bg-white border border-slate-200 hover:border-emerald-600 rounded-xl text-left transition-colors cursor-pointer"
        >
          <Leaf className="w-4 h-4 text-emerald-700 mb-2" />
          <p className="text-sm font-semibold text-slate-900">Sustainability Projects ({projects.length})</p>
          <p className="text-xs text-slate-500 mt-0.5">Track solar, LED, machinery & waste heat savings</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('carbon')}
          className="p-4 bg-white border border-slate-200 hover:border-emerald-600 rounded-xl text-left transition-colors cursor-pointer"
        >
          <TrendingDown className="w-4 h-4 text-emerald-700 mb-2" />
          <p className="text-sm font-semibold text-slate-900">Carbon Opportunity Estimator</p>
          <p className="text-xs text-slate-500 mt-0.5">Indicative reduction value (Not Issued / Not Tradable)</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('fuel')}
          className="p-4 bg-white border border-slate-200 hover:border-emerald-600 rounded-xl text-left transition-colors cursor-pointer"
        >
          <Flame className="w-4 h-4 text-emerald-700 mb-2" />
          <p className="text-sm font-semibold text-slate-900">Direct Fuel Consumption</p>
          <p className="text-xs text-slate-500 mt-0.5">Diesel, petrol, PNG, LPG & furnace oil logs</p>
        </button>
      </div>
    </div>
  );
};
