'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Building2, Briefcase, Calendar, User } from 'lucide-react';
import type { LinkedInProfile } from '@/lib/linkedinProfiles';

interface CustomerProfileModalProps {
  customerName: string;
  companyName?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerProfileModal({
  customerName,
  companyName,
  isOpen,
  onClose,
}: CustomerProfileModalProps) {
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Use refs to prevent duplicate API calls
  const fetchingRef = useRef(false);
  const lastFetchedRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen && customerName) {
      // Prevent duplicate calls - check if we're already fetching or if we've already fetched this customer
      const cacheKey = `${customerName}|${companyName || ''}`;
      if (fetchingRef.current || lastFetchedRef.current === cacheKey) {
        return;
      }
      
      fetchProfile();
    } else {
      // Cancel any ongoing requests when modal closes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setProfile(null);
      setError(null);
      setImageError(false);
      fetchingRef.current = false;
      lastFetchedRef.current = null;
    }
  }, [isOpen, customerName, companyName]);

  async function fetchProfile() {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    
    const cacheKey = `${customerName}|${companyName || ''}`;
    if (lastFetchedRef.current === cacheKey) {
      return;
    }
    
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    setSearching(false);

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(
        `/api/admin/linkedin/profile?customerName=${encodeURIComponent(customerName)}`,
        { signal: abortController.signal }
      );

      if (response.status === 404) {
        // Profile not found, try to search for it
        setSearching(true);
        const searchResponse = await fetch('/api/admin/linkedin/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            customerName,
            companyName: companyName || null,
          }),
          signal: abortController.signal,
        });

        if (!searchResponse.ok) {
          const errorData = await searchResponse.json();
          throw new Error(errorData.error || 'Failed to search LinkedIn');
        }

        const searchData = await searchResponse.json();
        setProfile(searchData.profile);
        lastFetchedRef.current = cacheKey;
      } else if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch profile');
      } else {
        const data = await response.json();
        setProfile(data.profile);
        lastFetchedRef.current = cacheKey;
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
      setSearching(false);
      fetchingRef.current = false;
      abortControllerRef.current = null;
    }
  }

  const formatTenure = (months: number | null): string => {
    if (!months) return 'Unknown';
    if (months < 12) {
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    }
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) {
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
    return `${years} ${years === 1 ? 'year' : 'years'} ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Profile</DialogTitle>
        </DialogHeader>

        {loading || searching ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-gray-600">
              {searching ? 'Searching LinkedIn...' : 'Loading profile...'}
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-red-600 text-center mb-4">{error}</p>
            <button
              onClick={fetchProfile}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Profile Photo and Name */}
            <div className="flex items-start gap-4">
              {profile.profile_photo_url && !imageError ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                  <img
                    src={profile.profile_photo_url}
                    alt={profile.customer_name}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {profile.customer_name}
                </h3>
                {profile.headline && (
                  <p className="text-gray-600">{profile.headline}</p>
                )}
              </div>
            </div>

            {/* Company Info */}
            {profile.company_name && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Building2 className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 mb-1">Company</p>
                  <p className="font-semibold text-gray-900">{profile.company_name}</p>
                </div>
              </div>
            )}

            {/* Position */}
            {profile.position && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Briefcase className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 mb-1">Position</p>
                  <p className="font-semibold text-gray-900">{profile.position}</p>
                </div>
              </div>
            )}

            {/* Tenure */}
            {profile.tenure_months !== null && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 mb-1">Tenure at Company</p>
                  <p className="font-semibold text-gray-900">
                    {formatTenure(profile.tenure_months)}
                  </p>
                </div>
              </div>
            )}

            {!profile.company_name && !profile.position && profile.tenure_months === null && (
              <div className="text-center py-8 text-gray-500">
                <p>Limited profile information available.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No profile data available.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

