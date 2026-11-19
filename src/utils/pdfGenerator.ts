import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Company, EsgReport, Facility, SustainabilityProject } from '../types/models';
import { PERMANENT_ESG_DISCLAIMER } from '../constants/defaults';
import { formatInr, formatNumber } from './calculations';

export function generateEsgReportPdf(params: {
  report: EsgReport;
  company: Company | null;
  facilities: Facility[];
  projects: SustainabilityProject[];
}): void {
  const { report, company, facilities, projects } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const generatedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Top dark navy institutional header band
  doc.setFillColor(11, 23, 42); // #0B172A
  doc.rect(0, 0, pageWidth, 36, 'F');
  doc.setFillColor(5, 150, 105); // #059669 emerald rule
  doc.rect(0, 36, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('GREENYIELD CAPITAL', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  doc.text('Structured Indicative ESG & Operational Emissions Disclosure', 14, 22);
  doc.text(`Generated: ${generatedDate}  |  Status: ${report.status.replace(/_/g, ' ').toUpperCase()}`, 14, 29);

  // Right side reporting period callout
  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`REPORTING PERIOD: ${report.reportingPeriod}`, pageWidth - 14, 15, { align: 'right' });
  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Verification: ${report.verificationLabel}`, pageWidth - 14, 22, { align: 'right' });
  doc.text(`Data Completeness: ${report.dataCompletenessPct}%`, pageWidth - 14, 29, { align: 'right' });

  let y = 46;

  // Report title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(report.title, 14, y);
  y += 7;

  // 1. Company Overview Table
  doc.setFontSize(10.5);
  doc.setTextColor(5, 150, 105);
  doc.text('1. Company Overview & Organizational Boundary', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 46 } },
    head: [['Attribute', 'Reported Company Detail']],
    body: [
      ['Legal Entity Name', company?.legalName || report.companyName],
      ['Business / Trade Name', company?.businessName || report.companyName],
      ['Industry & Corridor', `${company?.industry || 'Industrial SME'} — ${company?.city || 'India'}, ${company?.state || ''}`],
      ['Export Profile', `${company?.exportStatus || 'SME'} (${company?.primaryBuyerRegion || 'Domestic & Export'})`],
      ['Organizational Boundary', report.organizationalBoundary],
      ['Facilities Covered', `${facilities.length} registered site(s): ${facilities.map((f) => f.name).join(', ') || 'See facility register'}`],
    ],
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // 2. Emissions Summary Table
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text('2. Operational Energy & Indicative Emissions Summary (Scope 1 & Scope 2)', 14, y);
  y += 3;

  const prev = report.previousPeriodTonnes ?? 0;
  const delta = prev > 0 ? prev - report.totalTonnes : 0;

  autoTable(doc, {
    startY: y,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    head: [['Metric', 'Indicative Value', 'Unit / Indicator']],
    body: [
      ['Total Electricity Consumption', formatNumber(report.totalElectricityKwh, 1), 'kWh'],
      ['Documented Renewable Electricity', formatNumber(report.renewableElectricityKwh ?? 0, 1), 'kWh (deducted from grid Scope 2)'],
      ['Estimated Scope 1 Emissions (Direct Fuel)', formatNumber(report.scope1Tonnes, 3), 'tonnes CO2e'],
      ['Estimated Scope 2 Emissions (Purchased Electricity)', formatNumber(report.scope2Tonnes, 3), 'tonnes CO2e'],
      ['Total Estimated Operational Emissions (Scope 1 + 2)', formatNumber(report.totalTonnes, 3), 'tonnes CO2e'],
      ['Previous Reporting Period Emissions', prev > 0 ? formatNumber(prev, 3) : 'Not Available', 'tonnes CO2e'],
      ['Indicative Period Variance / Reduction', prev > 0 ? `${delta >= 0 ? '-' : '+'}${formatNumber(Math.abs(delta), 3)}` : 'Baseline Period', 'tonnes CO2e'],
      ['Data Completeness & Evidence', `${report.dataCompletenessPct}% completeness`, `${report.supportingDocCount ?? 0} supporting file(s) logged`],
    ],
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Visual horizontal bar chart directly drawn onto PDF
  if (y + 36 > pageHeight - 25) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text('3. Indicative Emissions Mix Chart (Scope 1 vs Scope 2)', 14, y);
  y += 5;

  const chartX = 14;
  const chartW = pageWidth - 28;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(chartX, y, chartW, 28, 2, 2, 'FD');

  const maxVal = Math.max(report.totalTonnes, 0.001);
  const barMaxW = chartW - 76;
  const s1W = Math.max(2, (report.scope1Tonnes / maxVal) * barMaxW);
  const s2W = Math.max(2, (report.scope2Tonnes / maxVal) * barMaxW);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Scope 1 (Direct)', chartX + 4, y + 9);
  doc.setFillColor(15, 23, 42);
  doc.rect(chartX + 40, y + 4.5, s1W, 6, 'F');
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatNumber(report.scope1Tonnes, 2)} tCO2e`, chartX + 43 + s1W, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.text('Scope 2 (Grid)', chartX + 4, y + 20);
  doc.setFillColor(5, 150, 105);
  doc.rect(chartX + 40, y + 15.5, s2W, 6, 'F');
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatNumber(report.scope2Tonnes, 2)} tCO2e`, chartX + 43 + s2W, y + 20);

  y += 35;

  // 4. Sustainability Initiatives & Projects Table
  if (projects.length > 0) {
    if (y + 35 > pageHeight - 25) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text('4. Energy Reduction & Sustainability Projects', 14, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      head: [['Project', 'Category', 'Facility', 'Investment', 'Actual Savings', 'Est. CO2e Reduction', 'Status']],
      body: projects.map((p) => [
        p.name,
        p.category,
        p.facilityName,
        formatInr(p.investmentInr),
        `${formatNumber(p.actualEnergySavingsKwh, 0)} kWh`,
        `${formatNumber(p.estimatedCo2eReductionTonnes, 2)} tCO2e`,
        p.status,
      ]),
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // 5. Narrative Disclosures (Data Sources, Methodology, Limitations, Initiatives, Management Notes)
  const narrativeSections = [
    { heading: 'Sustainability Initiatives Narrative', body: report.sustainabilityInitiatives || 'No additional narrative provided.' },
    { heading: 'Energy Reduction Summary', body: report.energyReductionSummary || 'Calculated strictly from logged utility and project records.' },
    { heading: 'Data Sources & Activity Evidence', body: report.dataSources || 'Company utility bills, diesel/fuel logs, and facility meters.' },
    { heading: 'Calculation Methodology', body: report.methodology },
    { heading: 'Scope Limitations & Exclusions', body: report.limitations },
    { heading: 'Management Notes', body: report.managementNotes || 'None recorded.' },
  ];

  for (const sec of narrativeSections) {
    const wrapped = doc.splitTextToSize(sec.body, pageWidth - 28);
    const blockHeight = 7 + wrapped.length * 4.5 + 4;
    if (y + blockHeight > pageHeight - 32) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(sec.heading, 14, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(wrapped, 14, y);
    y += wrapped.length * 4.2 + 4;
  }

  // Permanent Disclaimer Box
  if (y + 26 > pageHeight - 14) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(217, 119, 6);
  doc.setFillColor(255, 251, 235);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(146, 64, 14);
  doc.text('IMPORTANT INDICATIVE REPORTING DISCLAIMER', 18, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const disclaimerLines = doc.splitTextToSize(PERMANENT_ESG_DISCLAIMER, pageWidth - 36);
  doc.text(disclaimerLines, 18, y + 11.5);

  // Page footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `GreenYield Capital — Academic Indicative ESG Output (Not Independently Certified)  |  Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const safeSlug = report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48);
  doc.save(`greenyield-esg-${safeSlug}-${report.reportingPeriod.replace(/\s+/g, '-')}.pdf`);
}
