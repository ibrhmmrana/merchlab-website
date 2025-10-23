# Google Maps Integration Setup

## Environment Variables

Create a `.env.local` file in the project root with the following:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

## Getting a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Places API** for your project
4. Go to **APIs & Services > Credentials**
5. Create a new API key
6. Restrict the API key to your domain (recommended for production)

## Features

- **Address Autocomplete**: Users can type and get Google Places suggestions
- **Country Restriction**: Limited to South Africa (ZA) by default
- **Auto-fill**: Automatically populates street, suburb, city, province, postal code
- **Coordinates**: Captures latitude and longitude for precise location data
- **Modern API**: Uses Google Maps JS API Loader v2+ with functional API
- **Visible Search Bar**: Standard input field with Google Places autocomplete
- **Guaranteed API Key**: Uses both `apiKey` and `key` parameters for maximum compatibility
- **Error Handling**: Graceful fallback with console warnings for missing API keys

## Usage

The AddressAutocomplete component is integrated into the cart page's address section. Users can:

1. Start typing an address in the "Address Search" field
2. Select from Google Places suggestions
3. All address fields will be automatically populated
4. Users can still manually edit any field if needed
