import { EmissionFactor, FinancialScenario, ProjectCategory } from '../types/models';

export const BOOTSTRAPPED_OWNER_EMAIL = 'ananyanegi1111@gmail.com';

export const BRAND_TAGLINE = 'Measure Your Impact. Report Your Progress. Unlock Green Value.';

export const PERMANENT_ESG_DISCLAIMER =
  'This report is generated using company-submitted activity data and configured emission factors. It is an indicative ESG reporting output and does not constitute independent verification, regulatory certification or buyer acceptance.';

export const CARBON_OPPORTUNITY_NOTICE =
  'All figures shown are indicative estimates derived from company-submitted activity records and an editable hypothetical price assumption. Estimated reductions are awaiting independent third-party verification and are not issued, registered, or tradable carbon credits.';

export const MEDIA_ASSETS = {
  heroSolarFactory: '/src/assets/images/hero_solar_factory_1795016968956.jpg',
  windEnergyCorridor: '/src/assets/images/wind_energy_corridor_1795016968775.jpg',
  efficientManufacturing: '/src/assets/images/efficient_manufacturing_floor_1795016968512.jpg',
  electricGridInfra: '/src/assets/images/electric_grid_infrastructure_1795016968673.jpg',
  sustainabilityCampus: '/src/assets/images/industrial_sustainability_campus_1795016968934.jpg',
} as const;

export type SeedEmissionFactor = Omit<EmissionFactor, 'createdAt' | 'updatedAt' | 'updatedBy'>;

/**
 * Clearly labelled demonstration emission factors for the academic MVP.
 * Never presented as officially certified current Indian government factors.
 */
export const DEFAULT_DEMO_EMISSION_FACTORS: SeedEmissionFactor[] = [
  {
    id: 'ef_demo_electricity_grid',
    energyCategory: 'electricity',
    label: 'Grid Electricity (Demonstration India Average)',
    scope: 'scope_2',
    factorValue: 0.716,
    factorUnit: 'kg CO2e / kWh',
    activityUnit: 'kWh',
    source: 'Academic Demonstration Factor (Illustrative Grid Intensity — Replace with CEA/official factor before external filing)',
    version: 'DEMO-2026.1',
    effectiveDate: '2026-01-01',
    isDemoFactor: true,
    isActive: true,
    visibility: 'platform',
  },
  {
    id: 'ef_demo_diesel',
    energyCategory: 'diesel',
    label: 'High-Speed Diesel (DG Sets & Commercial Fleet)',
    scope: 'scope_1',
    factorValue: 2.68,
    factorUnit: 'kg CO2e / litre',
    activityUnit: 'Litres',
    source: 'Academic Demonstration Factor (Illustrative Stationary & Mobile Combustion Reference)',
    version: 'DEMO-2026.1',
    effectiveDate: '2026-01-01',
    isDemoFactor: true,
    isActive: true,
    visibility: 'platform',
  },
  {
    id: 'ef_demo_petrol',
    energyCategory: 'petrol',
    label: 'Motor Spirit / Petrol (Company Fleet)',
    scope: 'scope_1',
    factorValue: 2.31,
    factorUnit: 'kg CO2e / litre',
    activityUnit: 'Litres',
    source: 'Academic Demonstration Factor (Illustrative Mobile Combustion Reference)',
    version: 'DEMO-2026.1',
    effectiveDate: '2026-01-01',
    isDemoFactor: true,
    isActive: true,
    visibility: 'platform',
  },
  {
    id: 'ef_demo_natural_gas',
    energyCategory: 'natural_gas',
    label: 'Piped Natural Gas / Industrial Furnace Gas',
    scope: 'scope_1',
    factorValue: 2.02,
    factorUnit: 'kg CO2e / SCM',
    activityUnit: 'SCM',
    source: 'Academic Demonstration Factor (Illustrative Thermal Process Reference)',
    version: 'DEMO-2026.1',
    effectiveDate: '2026-01-01',
    isDemoFactor: true,
    isActive: true,
    visibility: 'platform',
  },
  {
    id: 'ef_demo_lpg',
    energyCategory: 'lpg',
    label: 'Industrial LPG Cylinders / Manifold',
    scope: 'scope_1',
    factorValue: 2.98,
    factorUnit: 'kg CO2e / kg',
    activityUnit: 'kg',
    source: 'Academic Demonstration Factor (Illustrative LPG Reference)',
    version: 'DEMO-2026.1',
    effectiveDate: '2026-01-01',
    isDemoFactor: true,
    isActive: true,
    visibility: 'platform',
  },
  {
    id: 'ef_demo_other_fuel',
    energyCategory: 'other_fuel',
    label: 'Other Industrial Fuel (Furnace Oil / Coal Briquettes — Demo Avg)',
    scope: 'scope_1',
    factorValue: 3.12,
    factorUnit: 'kg CO2e / kg',
    activityUnit: 'kg',
    source: 'Academic Demonstration Factor (Configurable by Platform Owner per Fuel Spec)',
    version: 'DEMO-2026.1',
    effectiveDate: '2026-01-01',
    isDemoFactor: true,
    isActive: true,
    visibility: 'platform',
  },
];

export const BUSINESS_PLAN_SCENARIOS: FinancialScenario[] = [
  {
    id: 'base',
    name: 'Base Scenario',
    annualSubscriptionInr: 60000,
    customers: 10,
    variableCostPerCustomerInr: 10000,
    monthlyFixedCostInr: 250000,
  },
  {
    id: 'conservative',
    name: 'Conservative Scenario',
    annualSubscriptionInr: 50000,
    customers: 5,
    variableCostPerCustomerInr: 10000,
    monthlyFixedCostInr: 200000,
  },
  {
    id: 'ambitious',
    name: 'Ambitious Scenario',
    annualSubscriptionInr: 75000,
    customers: 25,
    variableCostPerCustomerInr: 12000,
    monthlyFixedCostInr: 450000,
  },
];

export const INDIAN_CORRIDORS = [
  { city: 'Pune', state: 'Maharashtra', focus: 'Auto components, precision machining, EV ancillaries' },
  { city: 'Mumbai', state: 'Maharashtra', focus: 'Export engineering, pharmaceuticals, cold-chain logistics' },
  { city: 'Ahmedabad', state: 'Gujarat', focus: 'Textiles, specialty chemicals, industrial machinery' },
  { city: 'Surat', state: 'Gujarat', focus: 'Apparel & weaving mills, synthetic fibres, export packaging' },
  { city: 'NCR', state: 'Delhi / Haryana / UP', focus: 'Automotive Tier-2 suppliers, electronics, logistics parks' },
];

export const INDUSTRIES = [
  'Auto Components & Ancillaries',
  'Precision Manufacturing & CNC',
  'Textiles & Apparel Export',
  'Industrial Logistics & Cold Chain',
  'Specialty Chemicals & Plastics',
  'Electrical & Engineering Goods',
  'Food & Agro Processing',
  'Packaging & Paper Products',
];

export const INDIAN_STATES = [
  'Maharashtra',
  'Gujarat',
  'Delhi NCR',
  'Haryana',
  'Uttar Pradesh',
  'Tamil Nadu',
  'Karnataka',
  'Rajasthan',
  'Punjab',
  'Telangana',
  'Madhya Pradesh',
  'West Bengal',
];

export const COMPANY_SIZES = [
  'Micro (1–15 employees)',
  'Small (16–50 employees)',
  'Medium (51–250 employees)',
  'Upper Mid-Market (251–500 employees)',
];

export const TURNOVER_RANGES = [
  'Under ₹5 Crore',
  '₹5 Crore – ₹25 Crore',
  '₹25 Crore – ₹100 Crore',
  '₹100 Crore – ₹250 Crore',
  'Above ₹250 Crore',
];

export const BUYER_REGIONS = [
  'European Union (CBAM / CSRD Buyers)',
  'United Kingdom',
  'North America',
  'Middle East & GCC',
  'Asia-Pacific & Japan',
  'Domestic Indian OEMs (BRSR Supply Chain)',
];

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  'Rooftop Solar Installation',
  'LED Lighting Upgrade',
  'Energy Efficient Machinery',
  'Waste Heat Recovery',
  'Fuel Efficiency Improvements',
  'Waste Reduction',
  'Renewable Energy Procurement',
];

export const ENERGY_CATEGORY_META: Record<
  string,
  { label: string; defaultUnit: string; scope: 'scope_1' | 'scope_2'; allowedUnits: string[] }
> = {
  electricity: {
    label: 'Electricity',
    defaultUnit: 'kWh',
    scope: 'scope_2',
    allowedUnits: ['kWh', 'MWh'],
  },
  diesel: {
    label: 'Diesel',
    defaultUnit: 'Litres',
    scope: 'scope_1',
    allowedUnits: ['Litres'],
  },
  petrol: {
    label: 'Petrol',
    defaultUnit: 'Litres',
    scope: 'scope_1',
    allowedUnits: ['Litres'],
  },
  natural_gas: {
    label: 'Natural Gas',
    defaultUnit: 'SCM',
    scope: 'scope_1',
    allowedUnits: ['SCM', 'kg', 'MMBtu'],
  },
  lpg: {
    label: 'LPG',
    defaultUnit: 'kg',
    scope: 'scope_1',
    allowedUnits: ['kg', 'Cylinders (19kg)'],
  },
  other_fuel: {
    label: 'Other Fuel',
    defaultUnit: 'kg',
    scope: 'scope_1',
    allowedUnits: ['kg', 'Litres', 'Tonnes'],
  },
};
