import { getSupabaseAdmin } from './supabaseAdmin';
import { normalizeCompanyName } from './linkedinMatching';

export type LinkedInProfile = {
  id: number;
  customer_name: string;
  company_name: string | null;
  position: string | null;
  headline: string | null;
  profile_photo_url: string | null;
  tenure_months: number | null;
  linkedin_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type LinkedInSearchResult = {
  firstName: string;
  lastName: string;
  headline?: string | null;
  photo?: string | null;
  profilePicture?: {
    url?: string;
    sizes?: Array<{ url: string; width: number; height: number }>;
  } | null;
  currentPosition?: Array<{
    companyName: string;
    dateRange?: {
      start?: {
        month?: number;
        year?: number;
      };
      end?: null | {
        month?: number;
        year?: number;
      };
    };
  }>;
  experience?: Array<{
    companyName: string;
    position: string;
    startDate?: {
      month?: string;
      year?: number;
    };
    endDate?: {
      text?: string;
      month?: string;
      year?: number;
    };
  }>;
};

/**
 * Calculate tenure in months from current position or experience
 */
function calculateTenure(profile: LinkedInSearchResult): number | null {
  if (!profile.currentPosition || profile.currentPosition.length === 0) {
    // Try to get from experience
    if (profile.experience && profile.experience.length > 0) {
      const currentJob = profile.experience[0];
      if (currentJob.endDate?.text === 'Present' || !currentJob.endDate) {
        const startDate = currentJob.startDate;
        if (startDate?.year) {
          const start = new Date(startDate.year, (startDate.month ? new Date(`${startDate.month} 1, ${startDate.year}`).getMonth() : 0), 1);
          const now = new Date();
          const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
          return Math.max(0, months);
        }
      }
    }
    return null;
  }

  const position = profile.currentPosition[0];
  const dateRange = position.dateRange;
  
  if (!dateRange?.start) {
    return null;
  }

  const startYear = dateRange.start.year;
  const startMonth = dateRange.start.month || 1;
  
  if (!startYear) {
    return null;
  }

  const start = new Date(startYear, startMonth - 1, 1);
  const end = dateRange.end ? null : new Date(); // If end is null, it's current position
  const endDate = end || new Date();
  
  const months = (endDate.getFullYear() - start.getFullYear()) * 12 + (endDate.getMonth() - start.getMonth());
  return Math.max(0, months);
}

/**
 * Extract company name from LinkedIn profile
 */
function extractCompanyName(profile: LinkedInSearchResult): string | null {
  if (profile.currentPosition && profile.currentPosition.length > 0) {
    return profile.currentPosition[0].companyName || null;
  }
  if (profile.experience && profile.experience.length > 0) {
    return profile.experience[0].companyName || null;
  }
  return null;
}

/**
 * Extract position from LinkedIn profile
 * Prioritizes experience position that matches the company name
 */
function extractPosition(profile: LinkedInSearchResult, targetCompanyName?: string | null): string | null {
  // First, try to find position from experience that matches the company
  if (targetCompanyName && profile.experience && profile.experience.length > 0) {
    const normalizedTarget = normalizeCompanyName(targetCompanyName);
    
    // Find experience entry that matches the company
    const matchingExperience = profile.experience.find((exp) => {
      if (!exp.companyName) return false;
      const normalizedExp = normalizeCompanyName(exp.companyName);
      return normalizedExp === normalizedTarget || 
             normalizedExp.includes(normalizedTarget) || 
             normalizedTarget.includes(normalizedExp);
    });
    
    if (matchingExperience?.position) {
      return matchingExperience.position.trim();
    }
  }
  
  // Fallback: use first experience position
  if (profile.experience && profile.experience.length > 0) {
    const firstExp = profile.experience[0];
    if (firstExp.position) {
      return firstExp.position.trim();
    }
  }
  
  // Last resort: use headline
  if (profile.headline) {
    return profile.headline.trim();
  }
  
  return null;
}

/**
 * Extract profile photo URL from LinkedIn profile
 * Priority: photo field > profilePicture.url > profilePicture.sizes (largest)
 */
function extractProfilePhoto(profile: LinkedInSearchResult): string | null {
  // First priority: direct photo field (most common)
  if (profile.photo && typeof profile.photo === 'string' && profile.photo.trim() !== '') {
    return profile.photo.trim();
  }
  
  // Second priority: profilePicture.url
  if (profile.profilePicture?.url && typeof profile.profilePicture.url === 'string' && profile.profilePicture.url.trim() !== '') {
    return profile.profilePicture.url.trim();
  }
  
  // Third priority: profilePicture.sizes (get the largest)
  if (profile.profilePicture?.sizes && Array.isArray(profile.profilePicture.sizes) && profile.profilePicture.sizes.length > 0) {
    const validSizes = profile.profilePicture.sizes.filter(
      (size) => size && size.url && typeof size.url === 'string' && size.url.trim() !== ''
    );
    if (validSizes.length > 0) {
      // Get the largest size
      const sorted = [...validSizes].sort((a, b) => (b.width || 0) - (a.width || 0));
      return sorted[0].url.trim();
    }
  }
  
  return null;
}

/**
 * Save or update LinkedIn profile for a customer
 */
export async function saveLinkedInProfile(
  customerName: string,
  linkedinData: LinkedInSearchResult,
  targetCompanyName?: string | null
): Promise<LinkedInProfile | null> {
  try {
    const supabase = getSupabaseAdmin();

    const companyName = extractCompanyName(linkedinData);
    const position = extractPosition(linkedinData, targetCompanyName || companyName);
    const headline = linkedinData.headline ? linkedinData.headline.trim() : null;
    const profilePhotoUrl = extractProfilePhoto(linkedinData);
    const tenureMonths = calculateTenure(linkedinData);

    // Check if profile already exists
    const { data: existing } = await supabase
      .from('customer_linkedin_profiles')
      .select('*')
      .eq('customer_name', customerName)
      .maybeSingle();

    const profileData = {
      customer_name: customerName,
      company_name: companyName,
      position,
      headline,
      profile_photo_url: profilePhotoUrl,
      tenure_months: tenureMonths,
      linkedin_data: linkedinData as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Update existing profile
      const { data, error } = await supabase
        .from('customer_linkedin_profiles')
        .update(profileData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating LinkedIn profile:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          profileData,
        });
        // If headline column doesn't exist, try without it
        if (error.code === '42703' || error.message?.includes('headline')) {
          const { headline: _, ...profileDataWithoutHeadline } = profileData;
          const { data: retryData, error: retryError } = await supabase
            .from('customer_linkedin_profiles')
            .update(profileDataWithoutHeadline)
            .eq('id', existing.id)
            .select()
            .single();
          
          if (retryError) {
            console.error('Error updating LinkedIn profile (retry without headline):', retryError);
            return null;
          }
          return retryData as LinkedInProfile;
        }
        return null;
      }

      return data as LinkedInProfile;
    } else {
      // Insert new profile
      const { data, error } = await supabase
        .from('customer_linkedin_profiles')
        .insert({
          ...profileData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting LinkedIn profile:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          profileData,
        });
        // If headline column doesn't exist, try without it
        if (error.code === '42703' || error.message?.includes('headline')) {
          const { headline: _, ...profileDataWithoutHeadline } = profileData;
          const { data: retryData, error: retryError } = await supabase
            .from('customer_linkedin_profiles')
            .insert({
              ...profileDataWithoutHeadline,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();
          
          if (retryError) {
            console.error('Error inserting LinkedIn profile (retry without headline):', retryError);
            return null;
          }
          return retryData as LinkedInProfile;
        }
        return null;
      }

      return data as LinkedInProfile;
    }
  } catch (error) {
    console.error('Error saving LinkedIn profile (catch block):', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

/**
 * Get LinkedIn profile by customer name
 */
export async function getLinkedInProfileByCustomerName(
  customerName: string
): Promise<LinkedInProfile | null> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('customer_linkedin_profiles')
      .select('*')
      .eq('customer_name', customerName)
      .maybeSingle();

    if (error) {
      console.error('Error fetching LinkedIn profile:', error);
      return null;
    }

    return data as LinkedInProfile | null;
  } catch (error) {
    console.error('Error getting LinkedIn profile:', error);
    return null;
  }
}

