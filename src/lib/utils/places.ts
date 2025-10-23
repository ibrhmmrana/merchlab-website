// lib/utils/places.ts
export type ParsedAddress = {
  fullText: string;
  street: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  lat?: number;
  lng?: number;
};

export function parsePlace(place: google.maps.places.PlaceResult): ParsedAddress {
  const comps = place.address_components || [];
  const get = (type: string) => comps.find(c => c.types.includes(type));
  const num = get("street_number")?.long_name ?? "";
  const route = get("route")?.long_name ?? "";
  const street = [num, route].filter(Boolean).join(" ").trim();

  // South Africa-friendly mappings (with good fallbacks)
  const suburb = get("sublocality_level_1")?.long_name
              ?? get("neighborhood")?.long_name
              ?? "";
  const city = get("locality")?.long_name
            ?? get("administrative_area_level_2")?.long_name
            ?? "";
  const province = get("administrative_area_level_1")?.long_name ?? "";
  const postalCode = get("postal_code")?.long_name ?? "";
  const country = get("country")?.long_name ?? "";

  const lat = place.geometry?.location?.lat();
  const lng = place.geometry?.location?.lng();

  return {
    fullText: place.formatted_address || [street, suburb, city, province, postalCode, country].filter(Boolean).join(", "),
    street,
    suburb,
    city,
    province,
    postalCode,
    country,
    ...(lat !== undefined && lng !== undefined ? { lat, lng } : {})
  };
}
