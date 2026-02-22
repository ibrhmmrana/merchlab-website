import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { buildExecutiveSummary, type ReportTimeframe } from '@/server/admin/report';
import { renderExecutiveSummaryHTML } from '@/server/admin/report/template';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  // Check required environment variables
  const n8nPdfUrl = process.env.N8N_PDF_URL;
  const brandLogoUrl = process.env.REPORT_BRAND_LOGO_URL;
  const sigLogoUrl = process.env.REPORT_SIG_LOGO_URL;

  if (!n8nPdfUrl || !brandLogoUrl || !sigLogoUrl) {
    return NextResponse.json(
      { error: 'Server configuration error: Missing required environment variables' },
      { status: 500, headers: noIndexHeaders() }
    );
  }

  try {
    // Parse request body
    const body = await request.json();
    const timeframe = (body.timeframe || 'last_30d') as ReportTimeframe;
    const customStart = body.start as string | undefined;
    const customEnd = body.end as string | undefined;

    // Build executive summary data
    const data = await buildExecutiveSummary(timeframe, customStart, customEnd);

    // Generate report reference
    const reportRef = `RPT-${new Date().toISOString().split('T')[0].replace(/-/g, '-')}-A`;

    // Render HTML
    const html = renderExecutiveSummaryHTML({
      ...data,
      brandLogoUrl,
      sigLogoUrl,
      reportRef,
    });

    // Prepare multipart/form-data for n8n
    // In Node.js, we need to use the global FormData and create a File object
    const formData = new FormData();
    formData.append('printBackground', 'true');
    formData.append('preferCssPageSize', 'true');
    formData.append('marginTop', '0');
    formData.append('marginBottom', '0');
    formData.append('marginLeft', '0');
    formData.append('marginRight', '0');
    formData.append('scale', '1');
    
    // Create a File object for the HTML content
    // n8n/Gotenberg expects field name 'files' and filename 'index.html'
    const htmlFile = new File([html], 'index.html', { type: 'text/html' });
    formData.append('files', htmlFile);

    // Call n8n PDF service
    const pdfResponse = await fetch(n8nPdfUrl, {
      method: 'POST',
      body: formData,
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text().catch(() => 'Unknown error');
      console.error('n8n PDF service error:', pdfResponse.status, errorText);
      return NextResponse.json(
        { error: `PDF generation failed: ${errorText}` },
        { status: 502, headers: noIndexHeaders() }
      );
    }

    // Get PDF blob
    const pdfBlob = await pdfResponse.blob();

    // Generate filename with date
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `MerchLab-Executive-Report_${dateStr}.pdf`;

    // Return PDF with appropriate headers
    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        ...noIndexHeaders(),
      },
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

