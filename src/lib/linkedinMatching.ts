import type { LinkedInSearchResult } from './linkedinProfiles';

/**
 * Clean company name by removing common suffixes for search queries
 * - Keeps original case for better search results
 * - Removes common legal entity suffixes
 * - Trims whitespace
 */
export function cleanCompanyNameForSearch(companyName: string): string {
  if (!companyName) return '';
  
  let cleaned = companyName.trim();
  
  // Remove common legal entity suffixes (case-insensitive)
  const suffixes = [
    /\s*\(pty\)\s*ltd\.?/gi,
    /\s*pty\s*ltd\.?/gi,
    /\s*\(pty\)\s*limited\.?/gi,
    /\s*pty\s*limited\.?/gi,
    /\s*ltd\.?/gi,
    /\s*limited\.?/gi,
    /\s*inc\.?/gi,
    /\s*incorporated\.?/gi,
    /\s*llc\.?/gi,
    /\s*corp\.?/gi,
    /\s*corporation\.?/gi,
  ];
  
  for (const suffix of suffixes) {
    cleaned = cleaned.replace(suffix, '');
  }
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Normalize a company name for matching
 * - Convert to lowercase
 * - Remove common suffixes and legal entities
 * - Remove extra whitespace
 * - Remove special characters that might vary
 */
export function normalizeCompanyName(companyName: string): string {
  if (!companyName) return '';
  
  let normalized = companyName.toLowerCase().trim();
  
  // Remove common legal entity suffixes
  const suffixes = [
    /\s*\(pty\)\s*ltd\.?/gi,
    /\s*pty\s*ltd\.?/gi,
    /\s*\(pty\)\s*limited\.?/gi,
    /\s*pty\s*limited\.?/gi,
    /\s*ltd\.?/gi,
    /\s*limited\.?/gi,
    /\s*inc\.?/gi,
    /\s*incorporated\.?/gi,
    /\s*llc\.?/gi,
    /\s*corp\.?/gi,
    /\s*corporation\.?/gi,
  ];
  
  for (const suffix of suffixes) {
    normalized = normalized.replace(suffix, '');
  }
  
  // Remove special characters that might vary
  normalized = normalized.replace(/[^\w\s]/g, ' ');
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Extract company name from LinkedIn profile
 */
function getCompanyFromProfile(profile: LinkedInSearchResult): string | null {
  // Try currentPosition first
  if (profile.currentPosition && profile.currentPosition.length > 0) {
    return profile.currentPosition[0].companyName || null;
  }
  
  // Try experience (most recent)
  if (profile.experience && profile.experience.length > 0) {
    return profile.experience[0].companyName || null;
  }
  
  return null;
}

/**
 * Calculate similarity score between two strings using word matching
 * Returns a score between 0 and 1
 * Handles abbreviations, partial matches, and word order variations
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();
  
  if (normalized1.length === 0 || normalized2.length === 0) return 0;
  
  // Exact match
  if (normalized1 === normalized2) return 1.0;
  
  // Check if one contains the other (handles partial company names)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.95;
  }
  
  const words1 = normalized1.split(/\s+/).filter(w => w.length > 0);
  const words2 = normalized2.split(/\s+/).filter(w => w.length > 0);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Check for abbreviation match (e.g., "sologistics" matches "shipped onboard logistics")
  // This handles cases where one name is an abbreviation or acronym
  const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2;
  const longer = normalized1.length >= normalized2.length ? normalized1 : normalized2;
  
  // Check if shorter is an abbreviation of longer (first letters of words)
  const longerWords = longer.split(/\s+/).filter(w => w.length > 0);
  const abbreviation = longerWords.map(w => w[0]).join('');
  
  if (shorter === abbreviation || shorter.startsWith(abbreviation) || abbreviation.startsWith(shorter)) {
    return 0.85;
  }
  
  // Check if shorter matches the start of words in longer (e.g., "sologistics" -> "shipped onboard logistics")
  // Extract first few characters of each word in longer
  const longerWordStarts = longerWords.map(w => w.substring(0, Math.min(3, w.length))).join('');
  if (shorter.includes(longerWordStarts) || longerWordStarts.includes(shorter.substring(0, Math.min(3, shorter.length)))) {
    return 0.8;
  }
  
  // Count matching words (exact or partial)
  // Also check if words are contained within other words (e.g., "logistics" in "sologistics")
  const matchingWords = words1.filter(w1 => {
    if (w1.length < 3) return false; // Ignore very short words
    return words2.some(w2 => {
      if (w1 === w2) return true;
      // Check if one word contains the other (handles partial matches like "logistics" in "sologistics")
      if (w1.length >= 4 && w2.length >= 4) {
        return w1.includes(w2) || w2.includes(w1);
      }
      // For shorter words, require exact match or strong prefix match
      return w1.startsWith(w2) || w2.startsWith(w1);
    });
  });
  
  // Also check reverse: words from str2 that match words in str1
  const matchingWords2 = words2.filter(w2 => {
    if (w2.length < 3) return false;
    return words1.some(w1 => {
      if (w1 === w2) return true;
      if (w1.length >= 4 && w2.length >= 4) {
        return w1.includes(w2) || w2.includes(w1);
      }
      return w1.startsWith(w2) || w2.startsWith(w1);
    });
  });
  
  // Use the union of matching words
  const allMatchingWords = new Set([...matchingWords, ...matchingWords2]);
  
  // Calculate score based on matching words
  const wordMatchScore = allMatchingWords.size / Math.max(words1.length, words2.length);
  
  // Check for substring matches (handles abbreviations and partial names)
  let substringScore = 0;
  const shorterWords = words1.length < words2.length ? words1 : words2;
  const longerWords2 = words1.length >= words2.length ? words1 : words2;
  
  for (const shortWord of shorterWords) {
    if (shortWord.length < 3) continue; // Skip very short words
    for (const longWord of longerWords2) {
      // Check if short word is contained in long word or vice versa
      if (longWord.includes(shortWord) || shortWord.includes(longWord)) {
        substringScore += 0.4;
        break;
      }
      // Check if short word matches start of long word (abbreviation pattern)
      if (longWord.startsWith(shortWord.substring(0, Math.min(shortWord.length, 4)))) {
        substringScore += 0.3;
        break;
      }
    }
  }
  
  substringScore = Math.min(1, substringScore / Math.max(shorterWords.length, 1));
  
  // Combine scores - prefer word match but also consider substring match
  return Math.max(wordMatchScore * 0.7, substringScore * 0.6);
}

/**
 * Match customer name (first + last)
 */
function matchCustomerName(
  profile: LinkedInSearchResult,
  targetFirstName: string,
  targetLastName: string
): number {
  const profileFirstName = (profile.firstName || '').toLowerCase().trim();
  const profileLastName = (profile.lastName || '').toLowerCase().trim();
  
  const targetFirst = targetFirstName.toLowerCase().trim();
  const targetLast = targetLastName.toLowerCase().trim();
  
  // Exact match
  if (profileFirstName === targetFirst && profileLastName === targetLast) {
    return 1.0;
  }
  
  // Partial match (handles middle names, initials, etc.)
  const firstNameMatch = profileFirstName === targetFirst || 
                         profileFirstName.startsWith(targetFirst) ||
                         targetFirst.startsWith(profileFirstName);
  const lastNameMatch = profileLastName === targetLast ||
                        profileLastName.startsWith(targetLast) ||
                        targetLast.startsWith(profileLastName);
  
  if (firstNameMatch && lastNameMatch) {
    return 0.9;
  }
  
  if (firstNameMatch || lastNameMatch) {
    return 0.5;
  }
  
  return 0;
}

/**
 * Score a LinkedIn profile against target customer name and company
 * Returns a score between 0 and 1, where 1 is a perfect match
 */
export function scoreProfileMatch(
  profile: LinkedInSearchResult,
  targetCustomerName: string,
  targetCompanyName?: string | null
): number {
  // Parse customer name
  const nameParts = targetCustomerName.trim().split(/\s+/);
  const targetFirstName = nameParts[0] || '';
  const targetLastName = nameParts.slice(1).join(' ') || '';
  
  if (!targetFirstName && !targetLastName) {
    return 0;
  }
  
  // Score name match (required, 60% weight)
  const nameScore = matchCustomerName(profile, targetFirstName, targetLastName);
  
  if (nameScore === 0) {
    return 0; // Name must match at least partially
  }
  
  // Score company match (optional, 30% weight if provided)
  let companyScore = 0;
  if (targetCompanyName && targetCompanyName.trim() !== '-' && targetCompanyName.trim() !== '') {
    const profileCompany = getCompanyFromProfile(profile);
    
    if (profileCompany) {
      const normalizedTarget = normalizeCompanyName(targetCompanyName);
      const normalizedProfile = normalizeCompanyName(profileCompany);
      
      if (normalizedTarget && normalizedProfile) {
        companyScore = calculateSimilarity(normalizedTarget, normalizedProfile);
      }
    }
    
    // If company name provided but no match found, don't penalize heavily
    // Company names can vary (abbreviations, typos, etc.), so we're lenient
    if (companyScore === 0) {
      companyScore = 0.5; // Moderate score when company doesn't match (not a deal-breaker)
    }
  } else {
    // No company provided, don't penalize
    companyScore = 1.0;
  }
  
  // Weighted combination: name is more important (70% name, 30% company)
  // This ensures we prioritize name matches even if company doesn't match perfectly
  const finalScore = nameScore * 0.7 + companyScore * 0.3;
  
  return finalScore;
}

/**
 * Find the best matching LinkedIn profile from a list of results
 */
export function findBestMatch(
  profiles: LinkedInSearchResult[],
  targetCustomerName: string,
  targetCompanyName?: string | null
): LinkedInSearchResult | null {
  if (!profiles || profiles.length === 0) {
    return null;
  }
  
  // Score all profiles
  const scoredProfiles = profiles.map(profile => ({
    profile,
    score: scoreProfileMatch(profile, targetCustomerName, targetCompanyName),
  }));
  
  // Sort by score (highest first)
  scoredProfiles.sort((a, b) => b.score - a.score);
  
  // Get the best match
  const bestMatch = scoredProfiles[0];
  
  // Only return if score is above threshold (at least 0.3 to handle partial matches)
  if (bestMatch && bestMatch.score >= 0.3) {
    return bestMatch.profile;
  }
  
  // If no good match found, return the first profile (fallback)
  // This handles cases where company name might not be available or might be different
  return profiles[0];
}

