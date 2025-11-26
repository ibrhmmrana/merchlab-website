# LinkedIn Profile Feature Setup Guide

This feature automatically searches LinkedIn for customer profiles when quotes are created and displays them in a popup when clicking customer names in the quotes tables.

## Prerequisites

1. **Apify Account**: You need an Apify account with an API token
2. **Supabase Database**: Access to run SQL migrations

## Setup Steps

### 1. Create Supabase Table

Run the SQL migration file in your Supabase SQL editor:

```bash
supabase_migration_linkedin_profiles.sql
```

Or manually create the table using the SQL in that file.

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```env
APIFY_API_TOKEN=your_apify_api_token_here
```

You can get your Apify API token from: https://console.apify.com/account/integrations

### 3. Set Up Webhook (Optional but Recommended)

To automatically search LinkedIn when quotes are created, configure your quote creation webhook to call:

```
POST https://your-domain.com/api/admin/linkedin/webhook
```

The webhook expects a JSON payload with customer information. It will extract the customer name from:
- `enquiryCustomer.firstName` and `enquiryCustomer.lastName`
- `customer.firstName` and `customer.lastName`
- `customerName` (direct string)

Example payload:
```json
{
  "enquiryCustomer": {
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### 4. Manual Search

If a profile doesn't exist, clicking a customer name will automatically trigger a LinkedIn search. The search results will be saved to the database for future use.

## How It Works

1. **When a quote is created**: 
   - The webhook endpoint (`/api/admin/linkedin/webhook`) can be called to search LinkedIn
   - The search uses Apify's LinkedIn Profile Scraper actor
   - Results are saved to the `customer_linkedin_profiles` table

2. **When viewing quotes**:
   - Customer names in the quotes tables are clickable
   - Clicking a name opens a modal showing:
     - Customer's profile photo
     - Company name
     - Position/title
     - Tenure at company (calculated from start date)
   - If no profile exists, it automatically searches LinkedIn

3. **Data Storage**:
   - Profiles are cached in Supabase to avoid repeated searches
   - The full LinkedIn data is stored in JSONB format for future use
   - Profiles are updated if they already exist

## API Endpoints

### Search LinkedIn Profile
```
POST /api/admin/linkedin/search
Body: { "customerName": "John Doe" }
```

### Get LinkedIn Profile
```
GET /api/admin/linkedin/profile?customerName=John%20Doe
```

### Webhook (for quote creation)
```
POST /api/admin/linkedin/webhook
Body: { "enquiryCustomer": { "firstName": "John", "lastName": "Doe" } }
```

## Database Schema

The `customer_linkedin_profiles` table stores:
- `customer_name`: Full name (unique, used for lookups)
- `company_name`: Extracted from current position
- `position`: Job title/headline
- `profile_photo_url`: LinkedIn profile photo URL
- `tenure_months`: Calculated months at current company
- `linkedin_data`: Full JSONB data from LinkedIn
- `created_at` / `updated_at`: Timestamps

## Notes

- The Apify actor ID is hardcoded: `M2FMdjRVeF1HPGFcc`
- Search results are limited to 10 items, using the first (most relevant) match
- Profile photos are displayed directly from LinkedIn CDN URLs
- Tenure is calculated from the start date of the current position

