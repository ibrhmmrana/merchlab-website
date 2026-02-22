# Dashboard admin authentication

The dashboard (`/dashboard-admin`) uses **Supabase Auth** with email and password. Users sign in only; there is no public sign-up.

## Supabase setup

1. **Disable sign-up**  
   In [Supabase Dashboard](https://supabase.com/dashboard) → Authentication → Providers → Email, turn **off** “Enable Sign Up”. Only existing users (created in the dashboard or via API) can sign in.

2. **Create admin users**  
   Create users in Supabase Dashboard → Authentication → Users → “Add user” (email + password). Use those credentials to sign in to the dashboard.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon (public) key  

No `ADMIN_DASH_PASSWORD` or `ADMIN_DASH_COOKIE_*` env vars are used anymore.
