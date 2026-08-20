# Supabase Dashboard Configuration Steps

## 1. Auth Redirect URLs
Go to: Dashboard → Authentication → URL Configuration

Add these to **Redirect URLs**:
```
https://agriconnect.in/**
http://localhost:5173/**
```

The `**` wildcard covers `/auth/callback`, `/auth/reset`, and any future routes.

## 2. Google OAuth (if not already configured)
Go to: Dashboard → Authentication → Providers → Google

**Google Cloud Console** (https://console.cloud.google.com/apis/credentials):
- Create OAuth 2.0 Client ID
- Authorized redirect URI: `https://yrebxnpilkfeaofykvhq.supabase.co/auth/v1/callback`

**Supabase Dashboard**:
- Paste the Google Client ID
- Paste the Google Client Secret
- Enable the provider

## 3. Site URL
Go to: Dashboard → Authentication → URL Configuration → Site URL

Set to: `https://agriconnect.in`

(For development: `http://localhost:5173`)
