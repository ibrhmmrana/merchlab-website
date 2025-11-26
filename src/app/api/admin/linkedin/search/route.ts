import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { ApifyClient } from 'apify-client';
import { saveLinkedInProfile, type LinkedInSearchResult } from '@/lib/linkedinProfiles';
import { findBestMatch, cleanCompanyNameForSearch } from '@/lib/linkedinMatching';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const APIFY_ACTOR_ID = 'M2FMdjRVeF1HPGFcc';

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const { customerName, companyName } = await request.json();

    if (!customerName || typeof customerName !== 'string') {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      return NextResponse.json(
        { error: 'Apify API token not configured' },
        { status: 500, headers: noIndexHeaders() }
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
      return NextResponse.json(
        { error: 'No LinkedIn profiles found' },
        { status: 404, headers: noIndexHeaders() }
      );
    }

    // Find the best match using name and company matching
    const profiles = items as LinkedInSearchResult[];
    const bestMatch = findBestMatch(profiles, customerName, companyName);
    
    if (!bestMatch) {
      return NextResponse.json(
        { error: 'No matching LinkedIn profile found' },
        { status: 404, headers: noIndexHeaders() }
      );
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
        { status: 500, headers: noIndexHeaders() }
      );
    }

    return NextResponse.json(
      {
        profile: savedProfile,
        rawData: bestMatch,
      },
      {
        headers: {
          ...noIndexHeaders(),
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('LinkedIn search API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

