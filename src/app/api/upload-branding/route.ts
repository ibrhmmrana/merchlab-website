import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Try SUPABASE_SERVICE_ROLE_KEY first, fallback to NEXT_PUBLIC_SUPABASE_ANON_KEY if not set
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function sanitizeFilename(filename: string): string {
  // Remove path separators and special chars, keep alphanumeric, dots, dashes, underscores
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100); // Limit length
}

function sanitizePathSegment(segment: string): string {
  // Sanitize path segments for Supabase Storage
  // Allowed: alphanumeric, hyphens, underscores, dots
  // Replace invalid chars with underscores
  return segment
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255); // Limit length per segment
}

export async function POST(request: NextRequest) {
  try {
    console.log('Upload branding API called');
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sessionToken = formData.get('sessionToken') as string | null;
    const itemKey = formData.get('itemKey') as string | null;
    const stockHeaderId = formData.get('stockHeaderId') as string | null;
    const position = formData.get('position') as string | null;
    const brandingType = formData.get('brandingType') as string | null;
    const brandingSize = formData.get('brandingSize') as string | null;
    const colorCount = formData.get('colorCount') as string | null;
    const comment = formData.get('comment') as string | null;

    console.log('Upload params:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      sessionToken: !!sessionToken,
      itemKey,
      stockHeaderId,
      position,
    });

    // Validate required fields
    if (!file || !sessionToken || !itemKey || !stockHeaderId || !position) {
      const missing = [];
      if (!file) missing.push('file');
      if (!sessionToken) missing.push('sessionToken');
      if (!itemKey) missing.push('itemKey');
      if (!stockHeaderId) missing.push('stockHeaderId');
      if (!position) missing.push('position');
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PNG, JPEG, WebP, SVG, PDF' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Generate deterministic path
    // Sanitize all path segments to ensure valid storage key
    const sanitizedSessionToken = sanitizePathSegment(sessionToken);
    const sanitizedItemKey = sanitizePathSegment(itemKey);
    const sanitizedStockHeaderId = sanitizePathSegment(stockHeaderId);
    const sanitizedFilename = sanitizeFilename(file.name);
    const timestamp = Date.now();
    const filePath = `branding/${sanitizedSessionToken}/${sanitizedItemKey}/${sanitizedStockHeaderId}/${timestamp}-${sanitizedFilename}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    console.log('Uploading to Supabase Storage:', { filePath, bucket: 'branding' });
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('branding')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        error: uploadError,
      });
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message} (Code: ${uploadError.statusCode || 'unknown'})` },
        { status: 500 }
      );
    }
    
    console.log('File uploaded successfully:', uploadData);

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('branding')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    if (!publicUrl) {
      return NextResponse.json(
        { error: 'Failed to generate public URL' },
        { status: 500 }
      );
    }

    // Save to database via RPC
    const { error: rpcError } = await supabaseAdmin.rpc('save_branding_selection', {
      p_session_token: sessionToken,
      p_item_key: itemKey,
      p_stock_header_id: parseInt(stockHeaderId, 10),
      p_branding_position: position,
      p_branding_type: brandingType || null,
      p_branding_size: brandingSize || null,
      p_color_count: colorCount ? parseInt(colorCount, 10) : null,
      p_comment: comment || null,
      p_artwork_url: publicUrl,
    });

    if (rpcError) {
      console.error('RPC save_branding_selection error:', rpcError);
      // Don't fail the upload if RPC fails - the file is already uploaded
      // But log it for debugging
    }

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Upload route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

