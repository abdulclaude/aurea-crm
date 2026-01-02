# Mapbox Setup for Analytics Globe

## Getting Your Mapbox Token

1. Go to [mapbox.com](https://mapbox.com) and create a free account
2. Navigate to your [Account Tokens page](https://account.mapbox.com/access-tokens/)
3. Click "Create a token"
4. Name it "Aurea CRM Analytics"
5. Keep all default scopes (Public scopes are fine)
6. Click "Create token"
7. Copy the token (starts with `pk.`)

## Adding to Your Project

1. Open `/Users/abdul/Desktop/aurea-crm/.env.local`
2. Replace the placeholder token:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_actual_token_here
```

3. Restart your dev server:

```bash
npm run dev
```

## Free Tier Limits

Mapbox free tier includes:
- 50,000 map loads per month
- 100,000 geocoding requests
- More than enough for your analytics needs

## What You'll See

The analytics globe features:
- ✅ 3D globe projection with perspective
- ✅ Blue-to-violet gradient markers on countries with sessions
- ✅ Badge with count when multiple events in one country
- ✅ Floating stats dock (bottom center) with:
  - Top pages
  - Top referrers  
  - Top countries
  - Total views count
- ✅ Muted gray map style
- ✅ Grab cursor for dragging
- ✅ Smooth fade-in animations

## Architecture

Three isolated layers:

**1. Map Layer** (`Globe.tsx`)
- Mapbox GL with globe projection
- Memoized markers for performance
- No knowledge of data source

**2. Data Layer** (`use-analytics-overview.ts`)
- Single hook providing all analytics
- Transforms geography data to GeoPoints
- Prevents duplicate fetches

**3. UI Layer** (`StatsDock.tsx`)
- Floating analytics card
- Reads from analytics hook
- Independent of map

Everything flows through `useAnalyticsOverview()` - one source of truth.
