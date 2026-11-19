import {
  EmissionFactor,
  EnergyCategory,
  FinancialScenario,
  UtilityRecord,
} from '../types/models';
import { DEFAULT_DEMO_EMISSION_FACTORS } from '../constants/defaults';

export function sanitizeText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function validatePositiveNumber(value: number | string, label: string): number {
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num) || Number.isNaN(num)) {
    throw new Error(`${label} must be a valid numeric value.`);
  }
  if (num < 0) {
    throw new Error(`${label} cannot be negative.`);
  }
  if (num > 1_000_000_000) {
    throw new Error(`${label} exceeds the maximum permitted threshold.`);
  }
  return num;
}

export function normalizeToBaseActivityUnit(
  category: EnergyCategory,
  quantity: number,
  unit: string
): number {
  if (category === 'electricity' && unit === 'MWh') {
    return quantity * 1000;
  }
  if (category === 'lpg' && unit === 'Cylinders (19kg)') {
    return quantity * 19;
  }
  if (category === 'other_fuel' && unit === 'Tonnes') {
    return quantity * 1000;
  }
  return quantity;
}

export function getActiveFactorForCategory(
  category: EnergyCategory,
  factors: EmissionFactor[]
): { factorId: string; factorValue: number; version: string; scope: 'scope_1' | 'scope_2' } {
  const liveMatch = factors.find((f) => f.energyCategory === category && f.isActive);
  if (liveMatch) {
    return {
      factorId: liveMatch.id,
      factorValue: liveMatch.factorValue,
      version: liveMatch.version,
      scope: liveMatch.scope,
    };
  }
  const fallback =
    DEFAULT_DEMO_EMISSION_FACTORS.find((f) => f.energyCategory === category) ??
    DEFAULT_DEMO_EMISSION_FACTORS[0];
  return {
    factorId: fallback.id,
    factorValue: fallback.factorValue,
    version: fallback.version,
    scope: fallback.scope,
  };
}

/**
 * Core deterministic CO2e calculation:
 * Estimated emissions (kg CO2e) = Net Activity Data * Emission Factor
 * Tonnes CO2e = kg CO2e / 1000
 * For electricity, documented renewable/captive solar kWh reduces grid-purchased Scope 2 activity.
 */
export function calculateActivityEmissions(params: {
  energyCategory: EnergyCategory;
  quantity: number;
  unit: string;
  factorValue: number;
  renewableQuantity?: number;
}): {
  netActivityBase: number;
  estimatedKgCo2e: number;
  estimatedTonnesCo2e: number;
} {
  const qty = validatePositiveNumber(params.quantity, 'Consumption quantity');
  const factor = validatePositiveNumber(params.factorValue, 'Emission factor');
  const renewable = validatePositiveNumber(params.renewableQuantity ?? 0, 'Renewable quantity');

  const baseActivity = normalizeToBaseActivityUnit(params.energyCategory, qty, params.unit);
  const netActivityBase =
    params.energyCategory === 'electricity'
      ? Math.max(0, baseActivity - Math.min(baseActivity, renewable))
      : baseActivity;

  const estimatedKgCo2e = Number((netActivityBase * factor).toFixed(2));
  const estimatedTonnesCo2e = Number((estimatedKgCo2e / 1000).toFixed(4));

  return { netActivityBase, estimatedKgCo2e, estimatedTonnesCo2e };
}

export interface PeriodSummary {
  totalElectricityKwh: number;
  renewableElectricityKwh: number;
  totalFuelVolume: number;
  fuelRecordsCount: number;
  scope1Tonnes: number;
  scope2Tonnes: number;
  totalTonnes: number;
  byMonth: Array<{
    month: string;
    scope1: number;
    scope2: number;
    total: number;
    electricityKwh: number;
    renewableKwh: number;
    records: number;
  }>;
  byFacility: Array<{
    facilityId: string;
    facilityName: string;
    scope1: number;
    scope2: number;
    total: number;
    electricityKwh: number;
    records: number;
  }>;
  momChangePct: number | null;
  yoyChangePct: number | null;
  previousPeriodTonnes: number;
  estimatedReductionTonnes: number;
  reportedMonthsCount: number;
  missingMonthsInYear: number;
  dataCompletenessPct: number;
}

export function aggregateEmissions(records: UtilityRecord[]): PeriodSummary {
  let totalElectricityKwh = 0;
  let renewableElectricityKwh = 0;
  let totalFuelVolume = 0;
  let fuelRecordsCount = 0;
  let scope1Tonnes = 0;
  let scope2Tonnes = 0;

  const monthMap = new Map<
    string,
    { month: string; scope1: number; scope2: number; total: number; electricityKwh: number; renewableKwh: number; records: number }
  >();
  const facilityMap = new Map<
    string,
    { facilityId: string; facilityName: string; scope1: number; scope2: number; total: number; electricityKwh: number; records: number }
  >();

  for (const r of records) {
    const t = Number(r.estimatedTonnesCo2e) || 0;
    const isElec = r.energyCategory === 'electricity';
    const elecKwh = isElec ? normalizeToBaseActivityUnit('electricity', r.quantity, r.unit) : 0;
    const renewKwh = isElec ? Number(r.renewableQuantity || 0) : 0;

    if (isElec) {
      totalElectricityKwh += elecKwh;
      renewableElectricityKwh += renewKwh;
    } else {
      totalFuelVolume += Number(r.quantity) || 0;
      fuelRecordsCount += 1;
    }

    if (r.scope === 'scope_1') {
      scope1Tonnes += t;
    } else {
      scope2Tonnes += t;
    }

    const mEntry = monthMap.get(r.reportingMonth) ?? {
      month: r.reportingMonth,
      scope1: 0,
      scope2: 0,
      total: 0,
      electricityKwh: 0,
      renewableKwh: 0,
      records: 0,
    };
    if (r.scope === 'scope_1') mEntry.scope1 += t;
    else mEntry.scope2 += t;
    mEntry.total += t;
    mEntry.electricityKwh += elecKwh;
    mEntry.renewableKwh += renewKwh;
    mEntry.records += 1;
    monthMap.set(r.reportingMonth, mEntry);

    const fEntry = facilityMap.get(r.facilityId) ?? {
      facilityId: r.facilityId,
      facilityName: r.facilityName || 'Primary Facility',
      scope1: 0,
      scope2: 0,
      total: 0,
      electricityKwh: 0,
      records: 0,
    };
    if (r.scope === 'scope_1') fEntry.scope1 += t;
    else fEntry.scope2 += t;
    fEntry.total += t;
    fEntry.electricityKwh += elecKwh;
    fEntry.records += 1;
    facilityMap.set(r.facilityId, fEntry);
  }

  const byMonth = Array.from(monthMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({
      ...m,
      scope1: Number(m.scope1.toFixed(3)),
      scope2: Number(m.scope2.toFixed(3)),
      total: Number(m.total.toFixed(3)),
    }));

  const byFacility = Array.from(facilityMap.values())
    .sort((a, b) => b.total - a.total)
    .map((f) => ({
      ...f,
      scope1: Number(f.scope1.toFixed(3)),
      scope2: Number(f.scope2.toFixed(3)),
      total: Number(f.total.toFixed(3)),
    }));

  // Month-on-Month change between last two reported months
  let momChangePct: number | null = null;
  if (byMonth.length >= 2) {
    const prev = byMonth[byMonth.length - 2].total;
    const curr = byMonth[byMonth.length - 1].total;
    if (prev > 0) {
      momChangePct = Number((((curr - prev) / prev) * 100).toFixed(1));
    }
  }

  // Year-on-Year change when >= 2 distinct calendar years exist
  const yearTotals = new Map<string, number>();
  for (const m of byMonth) {
    const yr = m.month.slice(0, 4);
    yearTotals.set(yr, (yearTotals.get(yr) ?? 0) + m.total);
  }
  const sortedYears = Array.from(yearTotals.keys()).sort();
  let yoyChangePct: number | null = null;
  let previousPeriodTonnes = 0;
  let currentPeriodTonnes = Number((scope1Tonnes + scope2Tonnes).toFixed(3));

  if (sortedYears.length >= 2) {
    const prevYr = sortedYears[sortedYears.length - 2];
    const currYr = sortedYears[sortedYears.length - 1];
    previousPeriodTonnes = Number((yearTotals.get(prevYr) ?? 0).toFixed(3));
    currentPeriodTonnes = Number((yearTotals.get(currYr) ?? 0).toFixed(3));
    if (previousPeriodTonnes > 0) {
      yoyChangePct = Number((((currentPeriodTonnes - previousPeriodTonnes) / previousPeriodTonnes) * 100).toFixed(1));
    }
  } else if (byMonth.length >= 2) {
    const mid = Math.floor(byMonth.length / 2);
    previousPeriodTonnes = Number(
      byMonth.slice(0, mid).reduce((acc, m) => acc + m.total, 0).toFixed(3)
    );
    currentPeriodTonnes = Number(
      byMonth.slice(mid).reduce((acc, m) => acc + m.total, 0).toFixed(3)
    );
  }

  const estimatedReductionTonnes =
    previousPeriodTonnes > currentPeriodTonnes
      ? Number((previousPeriodTonnes - currentPeriodTonnes).toFixed(3))
      : 0;

  // Distinguish missing data months from zero emissions for the latest reporting year
  const latestYear = sortedYears[sortedYears.length - 1];
  const monthsInLatestYear = latestYear
    ? byMonth.filter((m) => m.month.startsWith(latestYear)).length
    : 0;
  const missingMonthsInYear = latestYear ? Math.max(0, 12 - monthsInLatestYear) : 12;
  const dataCompletenessPct = latestYear ? Math.min(100, Math.round((monthsInLatestYear / 12) * 100)) : 0;

  return {
    totalElectricityKwh: Number(totalElectricityKwh.toFixed(1)),
    renewableElectricityKwh: Number(renewableElectricityKwh.toFixed(1)),
    totalFuelVolume: Number(totalFuelVolume.toFixed(1)),
    fuelRecordsCount,
    scope1Tonnes: Number(scope1Tonnes.toFixed(3)),
    scope2Tonnes: Number(scope2Tonnes.toFixed(3)),
    totalTonnes: Number((scope1Tonnes + scope2Tonnes).toFixed(3)),
    byMonth,
    byFacility,
    momChangePct,
    yoyChangePct,
    previousPeriodTonnes,
    estimatedReductionTonnes,
    reportedMonthsCount: byMonth.length,
    missingMonthsInYear,
    dataCompletenessPct,
  };
}

export interface ScenarioPnL {
  expectedAnnualRevenueInr: number;
  totalVariableCostInr: number;
  annualFixedCostInr: number;
  totalOperatingCostInr: number;
  netOperatingResultInr: number;
  contributionPerCustomerInr: number;
  breakEvenCustomers: number | null;
}

export function calculateFinancialScenario(scenario: FinancialScenario): ScenarioPnL {
  const expectedAnnualRevenueInr = scenario.annualSubscriptionInr * scenario.customers;
  const totalVariableCostInr = scenario.variableCostPerCustomerInr * scenario.customers;
  const annualFixedCostInr = scenario.monthlyFixedCostInr * 12;
  const totalOperatingCostInr = totalVariableCostInr + annualFixedCostInr;
  const netOperatingResultInr = expectedAnnualRevenueInr - totalOperatingCostInr;
  const contributionPerCustomerInr =
    scenario.annualSubscriptionInr - scenario.variableCostPerCustomerInr;
  const breakEvenCustomers =
    contributionPerCustomerInr > 0
      ? Math.ceil(annualFixedCostInr / contributionPerCustomerInr)
      : null;

  return {
    expectedAnnualRevenueInr,
    totalVariableCostInr,
    annualFixedCostInr,
    totalOperatingCostInr,
    netOperatingResultInr,
    contributionPerCustomerInr,
    breakEvenCustomers,
  };
}

export function formatInr(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(Math.round(amount));
  return `${sign}₹${abs.toLocaleString('en-IN')}`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function exportToCsv(filename: string, headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>): void {
  const escapeCell = (val: string | number | boolean | null | undefined) => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ParsedCsvUtilityRow {
  reportingMonth: string;
  energyCategory: EnergyCategory;
  quantity: number;
  unit: string;
  renewableQuantity: number;
  electricitySource: string;
  notes: string;
}

export function parseUtilityCsv(csvText: string): { rows: ParsedCsvUtilityRow[]; errors: string[] } {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { rows: [], errors: ['CSV must include a header row and at least one data row.'] };
  }

  const validCategories: EnergyCategory[] = [
    'electricity',
    'diesel',
    'petrol',
    'natural_gas',
    'lpg',
    'other_fuel',
  ];

  const rows: ParsedCsvUtilityRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const [month, categoryRaw, qtyRaw, unitRaw, renewRaw, sourceRaw, notesRaw] = cols;

    if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month || '')) {
      errors.push(`Row ${i + 1}: Invalid reportingMonth "${month}" (expected YYYY-MM with month 01-12).`);
      continue;
    }
    const category = (categoryRaw || '').toLowerCase() as EnergyCategory;
    if (!validCategories.includes(category)) {
      errors.push(`Row ${i + 1}: Unsupported energyCategory "${categoryRaw}".`);
      continue;
    }
    const quantity = Number(qtyRaw);
    if (!Number.isFinite(quantity) || quantity < 0) {
      errors.push(`Row ${i + 1}: Quantity "${qtyRaw}" must be a non-negative number.`);
      continue;
    }
    const renewableQuantity = renewRaw ? Number(renewRaw) : 0;
    if (!Number.isFinite(renewableQuantity) || renewableQuantity < 0) {
      errors.push(`Row ${i + 1}: Renewable quantity "${renewRaw}" cannot be negative.`);
      continue;
    }

    rows.push({
      reportingMonth: month,
      energyCategory: category,
      quantity,
      unit: unitRaw || (category === 'electricity' ? 'kWh' : 'Litres'),
      renewableQuantity,
      electricitySource: sourceRaw || (category === 'electricity' ? 'State Grid' : ''),
      notes: notesRaw || '',
    });
  }

  return { rows, errors };
}
