/**
 * Comprehensive size sorting utility for all size formats
 */

export function sortSizes(sizes: string[]): string[] {
  return sizes.sort((a, b) => {
    // Normalize sizes for comparison
    const normalizeSize = (size: string) => {
      const upper = size.toUpperCase().trim();
      
      // Handle common size variations and abbreviations
      const sizeMap: { [key: string]: string } = {
        'SML': 'S',
        'SMALL': 'S',
        'MED': 'M',
        'MEDIUM': 'M',
        'LAR': 'L',
        'LARGE': 'L',
        'XSMALL': 'XS',
        'X-SMALL': 'XS',
        'XSM': 'XS',
        'EXTRALARGE': 'XL',
        'X-LARGE': 'XL',
        'XXLARGE': 'XXL',
        'XX-LARGE': 'XXL',
        'XXXLARGE': 'XXXL',
        'XXX-LARGE': 'XXXL',
        'XXXXLARGE': 'XXXXL',
        'XXXX-LARGE': 'XXXXL'
      };
      
      return sizeMap[upper] || upper;
    };
    
    const normalizedA = normalizeSize(a);
    const normalizedB = normalizeSize(b);
    
    // Handle standard clothing sizes with comprehensive order
    const sizeOrder = [
      'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL',
      '2XS', '3XS', '4XS', '5XS',
      '2XL', '3XL', '4XL', '5XL'
    ];
    
    const aIndex = sizeOrder.indexOf(normalizedA);
    const bIndex = sizeOrder.indexOf(normalizedB);
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If one is in the standard order and the other isn't, prioritize the standard order
    if (aIndex !== -1 && bIndex === -1) {
      return -1; // a comes first
    }
    if (aIndex === -1 && bIndex !== -1) {
      return 1; // b comes first
    }
    
    // Handle numeric sizes (28, 30, 32, etc.)
    const aNum = parseInt(normalizedA);
    const bNum = parseInt(normalizedB);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    
    // Handle mixed numeric + letter sizes (28S, 30M, 32L, etc.)
    const aMatch = normalizedA.match(/^(\d+)([A-Z]*)$/i);
    const bMatch = normalizedB.match(/^(\d+)([A-Z]*)$/i);
    
    if (aMatch && bMatch) {
      const aNumPart = parseInt(aMatch[1]);
      const bNumPart = parseInt(bMatch[1]);
      const aLetterPart = aMatch[2].toUpperCase();
      const bLetterPart = bMatch[2].toUpperCase();
      
      if (aNumPart !== bNumPart) {
        return aNumPart - bNumPart;
      }
      
      // If numeric parts are equal, sort by letter parts
      if (aLetterPart && bLetterPart) {
        const letterOrder = ['S', 'M', 'L', 'XL'];
        const aLetterIndex = letterOrder.indexOf(aLetterPart);
        const bLetterIndex = letterOrder.indexOf(bLetterPart);
        
        if (aLetterIndex !== -1 && bLetterIndex !== -1) {
          return aLetterIndex - bLetterIndex;
        }
        
        return aLetterPart.localeCompare(bLetterPart);
      }
      
      return aLetterPart.localeCompare(bLetterPart);
    }
    
    // Handle shoe sizes (US, UK, EU formats)
    const shoeSizePattern = /^(\d+(?:\.\d+)?)\s*(US|UK|EU|CM)?$/i;
    const aShoeMatch = normalizedA.match(shoeSizePattern);
    const bShoeMatch = normalizedB.match(shoeSizePattern);
    
    if (aShoeMatch && bShoeMatch) {
      const aShoeNum = parseFloat(aShoeMatch[1]);
      const bShoeNum = parseFloat(bShoeMatch[1]);
      return aShoeNum - bShoeNum;
    }
    
    // Handle fractional sizes (1/2, 1/4, 3/4, etc.)
    const aFraction = parseFraction(normalizedA);
    const bFraction = parseFraction(normalizedB);
    
    if (aFraction !== null && bFraction !== null) {
      return aFraction - bFraction;
    }
    
    // Handle ranges (28-30, 32-34, etc.)
    const aRange = parseRange(normalizedA);
    const bRange = parseRange(normalizedB);
    
    if (aRange !== null && bRange !== null) {
      return aRange.min - bRange.min;
    }
    
    // Fallback to alphabetical for any other format
    return normalizedA.localeCompare(normalizedB);
  });
}

/**
 * Parse fractional sizes like "1/2", "3/4", etc.
 */
function parseFraction(size: string): number | null {
  const match = size.match(/^(\d+)\/(\d+)$/);
  if (match) {
    const numerator = parseInt(match[1]);
    const denominator = parseInt(match[2]);
    return denominator !== 0 ? numerator / denominator : null;
  }
  return null;
}

/**
 * Parse range sizes like "28-30", "32-34", etc.
 */
function parseRange(size: string): { min: number; max: number } | null {
  const match = size.match(/^(\d+)-(\d+)$/);
  if (match) {
    const min = parseInt(match[1]);
    const max = parseInt(match[2]);
    return { min, max };
  }
  return null;
}
