'use client';
import React, { useEffect, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { parsePlace, type ParsedAddress } from '@/lib/utils/places';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onAddressParsed: (addr: ParsedAddress) => void;
  placeholder?: string;
};

export default function AddressAutocomplete({ value, onChange, onAddressParsed, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placeListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const initializedRef = useRef(false);

  // Hold latest callbacks to avoid effect deps
  const onAddressParsedRef = useRef(onAddressParsed);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onAddressParsedRef.current = onAddressParsed; }, [onAddressParsed]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API key missing");
      return;
    }

    (async () => {
      try {
        // Configure loader first
        setOptions({
          key: apiKey,
          v: "weekly",
          language: "en",
          region: "ZA",
        });

        const { Autocomplete } = (await importLibrary("places")) as google.maps.PlacesLibrary;
        if (!inputRef.current) return;

        // Create once
        const ac = new Autocomplete(inputRef.current, {
          fields: ["address_components", "formatted_address", "geometry"],
          types: ["address"],
          componentRestrictions: { country: "za" },
        });
        autocompleteRef.current = ac;

        // Attach listener once
        placeListenerRef.current = ac.addListener("place_changed", () => {
          console.log('Place changed event triggered');
          const place = ac.getPlace();
          console.log('Place selected:', place);
          
          if (!place || !place.address_components) {
            console.log('No place or address components found');
            return;
          }

          // Sync the input (controlled) with Google's formatted address
          const formatted = place.formatted_address ?? "";
          onChangeRef.current?.(formatted);

          // Parse and bubble up
          const parsed = parsePlace(place);
          console.log('Address parsed:', parsed);
          onAddressParsedRef.current?.(parsed);
        });
      } catch (e) {
        console.error("Failed to initialize Google Places", e);
      }
    })();

    // Cleanup on unmount only
    return () => {
      placeListenerRef.current?.remove();
      placeListenerRef.current = null;
      autocompleteRef.current?.unbindAll?.();
      autocompleteRef.current = null;
    };
  }, []); // <-- IMPORTANT: empty deps

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
