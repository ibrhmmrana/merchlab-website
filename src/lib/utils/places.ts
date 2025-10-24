// lib/utils/places.ts
export type ParsedAddress = {
  street: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  lat?: number;
  lng?: number;
  formattedAddress?: string; // <-- add this
};

export function parsePlace(place: google.maps.places.PlaceResult): ParsedAddress {
  const map = new Map<string, string>();

  (place.address_components ?? []).forEach((c) => {
    for (const t of c.types) {
      map.set(t, c.long_name);
    }
  });

  const streetNumber = map.get('street_number') ?? '';
  const route = map.get('route') ?? '';
  const street =
    streetNumber && route ? `${streetNumber} ${route}` : route || streetNumber || '';

  const suburb =
    map.get('sublocality') ??
    map.get('sublocality_level_1') ??
    map.get('neighborhood') ??
    '';

  const city =
    map.get('locality') ??
    map.get('administrative_area_level_2') ??
    '';

  const province = map.get('administrative_area_level_1') ?? '';
  const postalCode = map.get('postal_code') ?? '';
  const country = map.get('country') ?? '';

  const lat = place.geometry?.location?.lat();
  const lng = place.geometry?.location?.lng();

  return {
    street,
    suburb,
    city,
    province,
    postalCode,
    country,
    lat,
    lng,
    formattedAddress: place.formatted_address ?? '', // <-- include this
  };
}
