import { NextRequest, NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { saveLinkedInProfile, type LinkedInSearchResult } from '@/lib/linkedinProfiles';
import { findBestMatch, cleanCompanyNameForSearch } from '@/lib/linkedinMatching';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const APIFY_ACTOR_ID = 'M2FMdjRVeF1HPGFcc';

/**
 * Webhook endpoint to trigger LinkedIn search when a quote is created
 * This can be called by the quote creation webhook service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract customer name and company from quote payload
    // The payload structure may vary, so we'll try multiple paths
    let customerName: string | null = null;
    let companyName: string | null = null;
    
    if (body.enquiryCustomer) {
      const firstName = body.enquiryCustomer.firstName || body.enquiryCustomer.first_name;
      const lastName = body.enquiryCustomer.lastName || body.enquiryCustomer.last_name;
      if (firstName && lastName) {
        customerName = `${firstName} ${lastName}`.trim();
      }
      companyName = body.enquiryCustomer.company || body.enquiryCustomer.companyName || null;
    } else if (body.customer) {
      const firstName = body.customer.firstName || body.customer.first_name;
      const lastName = body.customer.lastName || body.customer.last_name;
      if (firstName && lastName) {
        customerName = `${firstName} ${lastName}`.trim();
      }
      companyName = body.customer.company || body.customer.companyName || null;
    } else if (typeof body.customerName === 'string') {
      customerName = body.customerName;
      companyName = body.companyName || body.company || null;
    }

    if (!customerName) {
      return NextResponse.json(
        { error: 'Customer name not found in payload' },
        { status: 400 }
      );
    }

    // Check if profile already exists
    const { getLinkedInProfileByCustomerName } = await import('@/lib/linkedinProfiles');
    const existingProfile = await getLinkedInProfileByCustomerName(customerName);
    
    if (existingProfile) {
      // Profile already exists, no need to search again
      return NextResponse.json({
        success: true,
        message: 'Profile already exists',
        profile: existingProfile,
      });
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      console.error('Apify API token not configured');
      return NextResponse.json(
        { error: 'Apify API token not configured' },
        { status: 500 }
      );
    }

    // Initialize Apify client
    const client = new ApifyClient({
      token: apifyToken,
    });

    // Prepare search query with customer name and company (if available)
    // Clean company name by removing common suffixes
    let searchQuery = customerName.trim();
    if (companyName) {
      const cleanedCompany = cleanCompanyNameForSearch(companyName);
      if (cleanedCompany) {
        searchQuery = `${customerName.trim()} ${cleanedCompany}`;
      }
    }

    // Prepare Actor input
    const input = {
      maxItems: 10,
      profileScraperMode: 'Full' as const,
      recentlyChangedJobs: false,
      searchQuery: searchQuery.trim(),
      startPage: 1,
    };

    // Run the Actor and wait for it to finish
    const run = await client.actor(APIFY_ACTOR_ID).call(input);

    // Fetch results from the run's dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No LinkedIn profiles found',
      });
    }

    // Find the best match using name and company matching
    const profiles = items as LinkedInSearchResult[];
    const bestMatch = findBestMatch(profiles, customerName, companyName);
    
    if (!bestMatch) {
      return NextResponse.json({
        success: false,
        message: 'No matching LinkedIn profile found',
      });
    }

    // Save to database
    const savedProfile = await saveLinkedInProfile(customerName, bestMatch, companyName);

    if (!savedProfile) {
      console.error('Failed to save LinkedIn profile for:', customerName);
      return NextResponse.json(
        { 
          error: 'Failed to save LinkedIn profile',
          details: 'Check server logs for database error details. The headline column may need to be added to the database.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'LinkedIn profile saved',
      profile: savedProfile,
    });
  } catch (error) {
    console.error('LinkedIn webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

