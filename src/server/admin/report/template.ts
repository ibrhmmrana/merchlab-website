function escapeHtml(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return 'N/A';
  const str = String(text);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function generateRevenueChart(data: Array<{ date: string; revenue: number }>, width: number, height: number): string {
  if (data.length === 0) {
    return '<text x="320" y="130" text-anchor="middle" fill="#94a3b8" font-size="12px">No data available</text>';
  }
  
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const padding = { top: 24, right: 28, bottom: 32, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Generate path data
  const points = data.map((d, i) => {
    const divisor = data.length > 1 ? data.length - 1 : 1;
    const x = padding.left + (i / divisor) * chartWidth;
    const y = padding.top + chartHeight - (d.revenue / maxRevenue) * chartHeight;
    return { x, y, revenue: d.revenue };
  });
  
  // Create area path
  const areaPath = points.map((p, i) => 
    i === 0 ? `M${p.x},${padding.top + chartHeight}` : `L${p.x},${p.y}`
  ).join(' ') + ` L${points[points.length - 1].x},${padding.top + chartHeight} Z`;
  
  // Create line path
  const linePath = points.map((p, i) => 
    i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`
  ).join(' ');
  
  // Generate Y-axis labels
  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const value = (maxRevenue / yTicks) * (yTicks - i);
    const y = padding.top + (i / yTicks) * chartHeight;
    return { value, y };
  });
  
  // Generate X-axis labels (show up to 4 dates)
  const divisor = data.length > 1 ? data.length - 1 : 1;
  const xLabels = data.length <= 4 
    ? data.map((d, i) => ({ date: d.date, x: padding.left + (i / divisor) * chartWidth }))
    : [0, Math.floor(data.length / 3), Math.floor(data.length * 2 / 3), data.length - 1].map(idx => ({
        date: data[idx].date,
        x: padding.left + (idx / divisor) * chartWidth,
      }));
  
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
  };
  
  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) return `R${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R${(value / 1000).toFixed(0)}k`;
    return `R${value.toFixed(0)}`;
  };
  
  return `
    <defs>
      <linearGradient id="gRev" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="var(--brand)" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="var(--brand)" stop-opacity="0"/>
      </linearGradient>
      <style>
        .axis { stroke:#cbd5e1; stroke-width:1; }
        .grid { stroke:#eef2f7; stroke-width:1; }
        .lbl  { fill:#94a3b8; font:11px Inter, sans-serif; }
      </style>
    </defs>
    ${yLabels.map((tick, i) => 
      i < yLabels.length - 1 ? `<line class="grid" x1="${padding.left}" y1="${tick.y}" x2="${width - padding.right}" y2="${tick.y}"/>` : ''
    ).join('')}
    <line class="axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"/>
    <line class="axis" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"/>
    ${yLabels.map(tick => 
      `<text class="lbl" x="${padding.left - 8}" y="${tick.y + 3}" text-anchor="end">${formatCurrencyShort(tick.value)}</text>`
    ).join('')}
    ${xLabels.map(label => 
      `<text class="lbl" x="${label.x}" y="${height - padding.bottom + 16}" text-anchor="middle">${formatDateLabel(label.date)}</text>`
    ).join('')}
    <path d="${areaPath}" fill="url(#gRev)"/>
    <path d="${linePath}" fill="none" stroke="var(--brand)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  `;
}

function generateConversionChart(data: Array<{ date: string; rate: number }>, width: number, height: number): string {
  if (data.length === 0) {
    return '<text x="320" y="130" text-anchor="middle" fill="#94a3b8" font-size="12px">No data available</text>';
  }
  
  const maxRate = Math.max(...data.map(d => d.rate), 1);
  const minRate = Math.max(0, Math.min(...data.map(d => d.rate), 0)); // Ensure min is never negative
  const rateRange = Math.max(maxRate - minRate, 1); // Ensure range is at least 1
  const padding = { top: 32, right: 28, bottom: 32, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Generate path data
  const divisor = data.length > 1 ? data.length - 1 : 1;
  const points = data.map((d, i) => {
    const x = padding.left + (i / divisor) * chartWidth;
    const y = padding.top + chartHeight - ((d.rate - minRate) / rateRange) * chartHeight;
    return { x, y, rate: d.rate };
  });
  
  // Create line path
  const linePath = points.map((p, i) => 
    i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`
  ).join(' ');
  
  // Generate Y-axis labels
  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const value = minRate + (rateRange / yTicks) * (yTicks - i);
    const y = padding.top + (i / yTicks) * chartHeight;
    return { value, y };
  });
  
  // Generate X-axis labels
  const xDivisor = data.length > 1 ? data.length - 1 : 1;
  const xLabels = data.length <= 4 
    ? data.map((d, i) => ({ date: d.date, x: padding.left + (i / xDivisor) * chartWidth }))
    : [0, Math.floor(data.length / 2), data.length - 1].map(idx => ({
        date: data[idx].date,
        x: padding.left + (idx / xDivisor) * chartWidth,
      }));
  
  const formatDateLabel = (dateStr: string) => {
    if (data.length > 10) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
    }
    return 'Start';
  };
  
  return `
    <defs>
      <style>
        .axis { stroke:#cbd5e1; stroke-width:1; }
        .grid { stroke:#eef2f7; stroke-width:1; }
        .lbl  { fill:#94a3b8; font:11px Inter, sans-serif; }
      </style>
    </defs>
    ${yLabels.map((tick, i) => 
      i < yLabels.length - 1 ? `<line class="grid" x1="${padding.left}" y1="${tick.y}" x2="${width - padding.right}" y2="${tick.y}"/>` : ''
    ).join('')}
    <line class="axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"/>
    <line class="axis" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"/>
    ${yLabels.map(tick => 
      `<text class="lbl" x="${padding.left - 8}" y="${tick.y + 3}" text-anchor="end">${tick.value.toFixed(1)}%</text>`
    ).join('')}
    ${xLabels.map((label, i) => {
      let labelText = formatDateLabel(label.date);
      if (i === 0) labelText = 'Start';
      else if (i === xLabels.length - 1) labelText = 'Today';
      else if (xLabels.length === 3 && i === 1) labelText = 'Mid';
      return `<text class="lbl" x="${label.x}" y="${height - padding.bottom + 16}" text-anchor="middle">${labelText}</text>`;
    }).join('')}
    <path d="${linePath}" fill="none" stroke="#16a34a" stroke-width="2.8" stroke-linecap="round"/>
    ${points.filter((_, i) => i === 0 || i === Math.floor(points.length / 2) || i === points.length - 1).map(p => 
      `<circle cx="${p.x}" cy="${p.y}" r="3.2" fill="#16a34a"/>`
    ).join('')}
  `;
}

export function renderExecutiveSummaryHTML(input: {
  period: { start: string; end: string; generatedAt: string };
  kpis: {
    totalRevenue: number;
    quotesCount: number;
    invoicesCount: number;
    conversionRate: number;
    brandingAdoptionPct: number;
    brandingRevenue: number;
    leadValue: number;
  };
  topItems: Array<{
    description: string;
    stockId: string | number;
    colour: string;
    size: string;
    units: number;
    revenue: number;
  }>;
  dailyRevenue: Array<{ date: string; revenue: number }>;
  conversionRateSeries: Array<{ date: string; rate: number }>;
  brandLogoUrl: string;
  sigLogoUrl: string;
  reportRef?: string;
}): string {
  const { period, kpis, topItems, brandLogoUrl, sigLogoUrl, reportRef } = input;
  
  // Calculate average order value
  const avgOrderValue = kpis.invoicesCount > 0 
    ? Math.round(kpis.totalRevenue / kpis.invoicesCount)
    : 0;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>MerchLab • Executive Summary Report</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root{
    --u:8px;                 /* base unit for all spacing */
    --brand:#1062ff;         /* MerchLab blue */
    --brand-ink:#0d4ed8;
    --ink:#0f172a;
    --muted:#64748b;
    --border:#e5e7eb;
    --bg:#ffffff;
    --bg-soft:#f7f9fc;
    --good:#16a34a;
  }

  /* A4 page & print rules */
  @page { size: A4; margin: 0; }
  html, body { background:#fff; margin:0; padding:0; }
  body { font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial; color:var(--ink); }

  .page { width:210mm; min-height:297mm; margin:0 auto; background:var(--bg);
          display:grid; grid-template-rows:auto 1fr auto; }
  .wrap { padding: calc(var(--u)*3) calc(var(--u)*3 - 2px); }

  /* Header */
  .header {
    display:grid; grid-template-columns: 1fr auto; align-items:center; gap: calc(var(--u)*2);
    padding-bottom: calc(var(--u)*2.5);
    border-bottom: 1px solid var(--border);
  }
  .brand { display:flex; align-items:center; gap: calc(var(--u)*1.25); }
  .brand img { height: 44px; }
  .title { font-weight:800; letter-spacing:.2px; font-size: 18px; }
  .meta { text-align:right; font-size:12px; color:var(--muted); line-height:1.4; }

  /* Section label above band */
  .section-hdr { margin-top: calc(var(--u)*3); margin-bottom: calc(var(--u)*1.5); }
  .section-eyebrow { font-size:10px; letter-spacing:.12em; color:var(--muted); font-weight:700; }
  .section-sub { font-size:11px; color:var(--muted); margin-top: 2px; }

  /* Band + KPIs */
  .band { background:linear-gradient(180deg,#fff,#fbfdff); border:1px solid var(--border);
          border-radius:12px; padding: calc(var(--u)*3); box-shadow:0 1px 10px rgba(16,98,255,.05); }
  .kpis { display:grid; grid-template-columns:repeat(5,1fr); gap: calc(var(--u)*3); }
  .kpi { background:#fff; border:1px solid var(--border); border-radius:12px; padding: calc(var(--u)*2.5);
         box-shadow:0 1px 6px rgba(15,23,42,.05); }
  .kpi .label { font-size:11px; color:var(--muted); letter-spacing:.2px; }
  .kpi .value { font-size:20px; font-weight:800; margin-top: calc(var(--u)*1.25); }
  .kpi .sub { font-size:11px; color:var(--muted); margin-top: calc(var(--u)*1.25); }
  .kpi .trend { font-size:11px; margin-top: calc(var(--u)*1); color:var(--good); }

  /* Charts row */
  .grid2 { display:grid; grid-template-columns: 1.1fr .9fr; gap: calc(var(--u)*3); margin-top: calc(var(--u)*3); }
  .card { background:#fff; border:1px solid var(--border); border-radius:12px; padding: calc(var(--u)*2.5);
          box-shadow:0 1px 10px rgba(2,6,23,.05); }
  .card h3 { margin:0 0 calc(var(--u)*1.5) 0; font-size:14px; font-weight:800; letter-spacing:.1px; }
  .small { font-size: 11px; color:var(--muted); }
  .tot-right { margin-top: calc(var(--u)*1.5); text-align:right; }

  /* Table on page 2 */
  table { width:100%; border-collapse:separate; border-spacing:0; }
  thead th { text-align:left; font-size:11px; color:#475569; background:#f5f8ff;
             border-bottom:1px solid var(--border); padding: 10px 0; }
  tbody td { padding: 12px 0; font-size:12px; }
  tbody tr + tr td { border-top:1px solid var(--border); }
  .num { text-align:right; font-variant-numeric: tabular-nums; padding-right: 6px; }

  /* Split row on page 2 */
  .split3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap: calc(var(--u)*3); margin-top: calc(var(--u)*3); }

  /* Quick facts & Insight divider */
  .divider { height:1px; background:var(--border); margin: calc(var(--u)*2) 0 calc(var(--u)*1.25); }
  .pill { display:inline-block; padding:2px 8px; border:1px solid var(--border); border-radius:999px;
          font-size:10px; color:var(--muted); }

  /* Footers */
  .footer { border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between;
            gap:10px; padding: calc(var(--u)*2) calc(var(--u)*3); font-size:11px; color:var(--muted); }
  .sig { display:flex; align-items:center; gap:8px; }
  .sig img { height:16px; border-radius:3px; }
</style>
</head>
<body>

<!-- ================= PAGE 1 ================= -->
<section class="page">
  <div class="wrap">
    <div class="header">
      <div class="brand">
        <img src="${escapeHtml(brandLogoUrl)}" alt="MerchLab logo" />
        <div class="title">Executive Summary — Analytics Report</div>
      </div>
      <div class="meta">
        Period: <strong>${escapeHtml(period.start)} – ${escapeHtml(period.end)}</strong><br/>
        Generated: <span>${escapeHtml(period.generatedAt)}</span>
      </div>
    </div>

    <div class="section-hdr">
      <div class="section-eyebrow">EXECUTIVE METRICS</div>
      <div class="section-sub">(Period: ${escapeHtml(period.start)} – ${escapeHtml(period.end)})</div>
    </div>

    <div class="band">
      <div class="kpis">
        <div class="kpi">
          <div class="label">Total Revenue</div>
          <div class="value">${formatCurrency(kpis.totalRevenue)}</div>
          <div class="sub">All time</div>
        </div>
        <div class="kpi">
          <div class="label">Quotes</div>
          <div class="value">${kpis.quotesCount}</div>
          <div class="sub">Lead Value: ${formatCurrency(kpis.leadValue)}</div>
        </div>
        <div class="kpi">
          <div class="label">Invoices</div>
          <div class="value">${kpis.invoicesCount}</div>
          <div class="sub">Avg. Order Value: ${formatCurrency(avgOrderValue)}</div>
        </div>
        <div class="kpi">
          <div class="label">Conversion Rate</div>
          <div class="value">${kpis.conversionRate}%</div>
          <div class="sub">Cumulative</div>
        </div>
        <div class="kpi">
          <div class="label">Branding Adoption</div>
          <div class="value">${kpis.brandingAdoptionPct}%</div>
          <div class="sub">Branding Rev: ${formatCurrency(kpis.brandingRevenue)}</div>
        </div>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <h3>Revenue Trend (Daily)</h3>
        <svg viewBox="0 0 640 260" width="100%" height="260" role="img" aria-label="Revenue area chart">
          ${generateRevenueChart(input.dailyRevenue, 640, 260)}
        </svg>
        <div class="small tot-right">Total (period): <strong>${formatCurrency(kpis.totalRevenue)}</strong></div>
      </div>

      <div class="card">
        <h3>Conversion Rate (Cumulative)</h3>
        <svg viewBox="0 0 640 260" width="100%" height="260" role="img" aria-label="Conversion line chart">
          ${generateConversionChart(input.conversionRateSeries, 640, 260)}
        </svg>
        <div class="small tot-right">Current conversion rate: <strong>${kpis.conversionRate}%</strong></div>
      </div>
    </div>

    <div class="small" style="margin-top: calc(var(--u)*3); padding: calc(var(--u)*2.25); border:1px dashed var(--border); border-radius:10px; background:#fcfdff;">
      <strong>Summary:</strong> Revenue of ${formatCurrency(kpis.totalRevenue)} from ${kpis.invoicesCount} invoices; ${kpis.conversionRate}% conversion rate with ${kpis.brandingAdoptionPct}% branding adoption.
    </div>
  </div>

  <div class="footer">
    <div>© MerchLab — Confidential analytics snapshot • Page 1 of 2</div>
    <div class="sig">
      <span>Generated by</span>
      <img src="${escapeHtml(sigLogoUrl)}" alt="Sagentics" />
    </div>
  </div>
</section>

<!-- ================= PAGE 2 ================= -->
<section class="page">
  <div class="wrap">
    <div class="header" style="padding-bottom: calc(var(--u)*2.25)">
      <div class="brand">
        <img src="${escapeHtml(brandLogoUrl)}" alt="MerchLab logo"/>
        <div class="title">Highlights & Breakdown</div>
      </div>
      <div class="meta"><span style="opacity:.8">Report Ref:</span> <strong>${escapeHtml(reportRef || 'RPT-' + new Date().toISOString().split('T')[0].replace(/-/g, '-') + '-A')}</strong></div>
    </div>

    <div class="card" style="margin-top: calc(var(--u)*3)">
      <h3>Top Sold Items (by Revenue)</h3>
      <table>
        <thead>
          <tr>
            <th>Description</th><th>Stock ID</th><th>Colour</th><th>Size</th><th class="num">Units</th><th class="num">Revenue</th>
          </tr>
        </thead>
        <tbody>
${topItems.map(item => `          <tr><td>${escapeHtml(item.description)}</td><td>${escapeHtml(String(item.stockId))}</td><td>${escapeHtml(item.colour)}</td><td>${escapeHtml(item.size)}</td><td class="num">${item.units}</td><td class="num">${formatCurrency(item.revenue)}</td></tr>`).join('\n')}
        </tbody>
      </table>
      <div class="small" style="margin-top:6px">* Top ${topItems.length} items by revenue for the selected period.</div>
    </div>

    <div class="split3">
      <div class="card">
        <h3>Revenue by Category</h3>
        <svg viewBox="0 0 220 190" width="100%" height="190" role="img" aria-label="Category donut">
          <defs><style>.lbl{fill:#475569;font:11px Inter, sans-serif}</style></defs>
          <circle cx="90" cy="95" r="58" fill="none" stroke="#e2e8f0" stroke-width="18" />
          <circle cx="90" cy="95" r="58" fill="none" stroke="var(--brand)" stroke-width="18" stroke-dasharray="125 240" stroke-dashoffset="0" />
          <circle cx="90" cy="95" r="58" fill="none" stroke="#0ea5e9" stroke-width="18" stroke-dasharray="70 295" stroke-dashoffset="-125" />
          <circle cx="90" cy="95" r="58" fill="none" stroke="#6366f1" stroke-width="18" stroke-dasharray="38 327" stroke-dashoffset="-195" />
          <circle cx="90" cy="95" r="58" fill="none" stroke="#22c55e" stroke-width="18" stroke-dasharray="27 338" stroke-dashoffset="-233" />
          <text x="90" y="92" text-anchor="middle" class="lbl" style="font-weight:700">Top Cats</text>
          <text x="90" y="110" text-anchor="middle" class="lbl">Apparel • Bags • Drinkware</text>
          <g transform="translate(150,45)" class="lbl">
            <rect x="0" y="0" width="10" height="10" fill="var(--brand)"/><text x="16" y="9">Apparel 48%</text>
            <rect x="0" y="22" width="10" height="10" fill="#0ea5e9"/><text x="16" y="31">Bags 28%</text>
            <rect x="0" y="44" width="10" height="10" fill="#6366f1"/><text x="16" y="53">Drinkware 16%</text>
            <rect x="0" y="66" width="10" height="10" fill="#22c55e"/><text x="16" y="75">Other 8%</text>
          </g>
        </svg>
      </div>

      <div class="card">
        <h3>Branding Adoption</h3>
        <svg viewBox="0 0 220 190" width="100%" height="190" role="img" aria-label="Branding adoption">
          <circle cx="90" cy="95" r="58" fill="none" stroke="#e2e8f0" stroke-width="18" />
          <circle cx="90" cy="95" r="58" fill="none" stroke="#06b6d4" stroke-width="18" stroke-dasharray="${(kpis.brandingAdoptionPct / 100) * 365} ${365 - (kpis.brandingAdoptionPct / 100) * 365}" stroke-dashoffset="0" />
          <text x="90" y="90" text-anchor="middle" style="font:700 18px Inter">${kpis.brandingAdoptionPct}%</text>
          <text x="90" y="108" text-anchor="middle" style="fill:#64748b;font:12px Inter">Orders with branding</text>
        </svg>
        <div class="small" style="text-align:right">Branding revenue: <strong>${formatCurrency(kpis.brandingRevenue)}</strong></div>
      </div>

      <div class="card">
        <h3>Quick Facts</h3>
        <div class="small" style="line-height:1.4">
          <ul style="padding-left:14px; margin:0">
            <li><strong>Total Revenue:</strong> ${formatCurrency(kpis.totalRevenue)}</li>
            <li><strong>Quotes Generated:</strong> ${kpis.quotesCount}</li>
            <li><strong>Invoices Issued:</strong> ${kpis.invoicesCount}</li>
            <li><strong>Conversion Rate:</strong> ${kpis.conversionRate}%</li>
            <li><strong>Branding Adoption:</strong> ${kpis.brandingAdoptionPct}%</li>
          </ul>
        </div>
        <div class="divider"></div>
        <span class="pill">Insight</span>
        <div class="small" style="margin-top:6px">
          ${kpis.brandingAdoptionPct > 50 ? 'Branding adoption is strong, driving significant revenue.' : 'Branding adoption has room for growth.'}
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: calc(var(--u)*3)">
      <h3>Recent Highlights</h3>
      <ul class="small" style="line-height:1.6; padding-left:14px; margin: 2mm 0 0 0;">
        <li>Period: ${escapeHtml(period.start)} to ${escapeHtml(period.end)}</li>
        <li>Total revenue of ${formatCurrency(kpis.totalRevenue)} from ${kpis.invoicesCount} invoices.</li>
        <li>Conversion rate of ${kpis.conversionRate}% with ${kpis.brandingAdoptionPct}% of orders including branding.</li>
      </ul>
    </div>
  </div>

  <div class="footer">
    <div>© MerchLab — Confidential analytics snapshot • Page 2 of 2</div>
    <div class="sig">
      <span>Generated by</span>
      <img src="${escapeHtml(sigLogoUrl)}" alt="Sagentics" />
    </div>
  </div>
</section>

</body>
</html>`;
}

