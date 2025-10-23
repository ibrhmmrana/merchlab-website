'use client';
import React, { useEffect, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onAddressParsed: (addr: {
    street?: string; suburb?: string; city?: string; province?: string; postalCode?: string; country?: string;
    lat?: number; lng?: number; formattedAddress?: string;
  }) => void;
  placeholder?: string;
};

export default function AddressAutocomplete({ value, onChange, onAddressParsed, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    let cancelled = false;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
      return;
    }

    (async () => {
      try {
        // Configure the global loader **before** importing libraries
        setOptions({
          apiKey,
          key: apiKey,
          v: 'weekly',
        });

        // Load the Places library
        await importLibrary('places');

        if (cancelled || !inputRef.current) return;

        // Create the Autocomplete instance
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['address_components', 'formatted_address', 'geometry'],
          types: ['address'],
          componentRestrictions: { country: 'za' }
        });

        autocompleteRef.current = autocomplete;

        // Listen for place selection
        autocomplete.addListener('place_changed', () => {
          console.log('Place changed event triggered');
          
          // Use a small delay to ensure the place data is fully loaded
          setTimeout(() => {
            const place = autocomplete.getPlace();
            console.log('Place selected:', place);
            
            // Process if place has address components
            if (!place || !place.address_components) {
              console.log('No place or address components found');
              return;
            }

            try {
              // Create a more comprehensive mapping of all address components
              const comps = new Map();
              place.address_components.forEach((component: any) => {
                component.types.forEach((type: string) => {
                  comps.set(type, component.long_name);
                });
              });
              
              console.log('Address components:', place.address_components);
              console.log('Parsed components map:', comps);
              
              // Better mapping for South African addresses
              const streetNumber = comps.get('street_number') || '';
              const route = comps.get('route') || '';
              const street = [streetNumber, route].filter(Boolean).join(' ').trim();
              
              // Enhanced suburb detection - try multiple Google Places fields
              let suburb = comps.get('sublocality_level_1') || 
                          comps.get('sublocality_level_2') || 
                          comps.get('neighborhood') || 
                          comps.get('sublocality') ||
                          comps.get('administrative_area_level_3') ||
                          comps.get('political');
              
              // Fallback: try to extract suburb from formatted address
              if (!suburb && place.formatted_address) {
                const addressParts = place.formatted_address.split(', ');
                // For SA addresses, suburb is usually the second part
                if (addressParts.length >= 2) {
                  suburb = addressParts[1].trim();
                }
              }
              
              const parsed = {
                street: street || undefined,
                suburb: suburb,
                city: comps.get('locality') || comps.get('postal_town') || comps.get('administrative_area_level_2'),
                province: comps.get('administrative_area_level_1'),
                postalCode: comps.get('postal_code'),
                country: comps.get('country'),
                lat: place.geometry?.location?.lat(),
                lng: place.geometry?.location?.lng(),
                formattedAddress: place.formatted_address,
              };
              
              console.log('Address parsed:', parsed);
              onChange(place.formatted_address || '');
              onAddressParsed(parsed);
            } catch (e) {
              console.error('Failed to parse place data', e);
            }
          }, 100);
        });
      } catch (e) {
        console.error('Failed to initialize Google Places', e);
      }
    })();

    return () => { 
      cancelled = true;
      if (autocompleteRef.current) {
        autocompleteRef.current.unbindAll();
      }
    };
  }, [onAddressParsed, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // If the input is cleared, clear all address fields
    if (newValue === '') {
      console.log('Address search cleared - clearing all fields');
      onAddressParsed({
        street: '',
        suburb: '',
        city: '',
        province: '',
        postalCode: '',
        country: '',
        lat: undefined,
        lng: undefined,
        formattedAddress: '',
      });
    }
  };


  return (
    <div className="w-full">
      <input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder ?? 'Search address'}
        className="w-full rounded-lg border px-4 py-3 text-[15px] leading-none outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        autoComplete="off"
      />
    </div>
  );
}
