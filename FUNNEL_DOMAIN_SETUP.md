# Funnel Domain Configuration Setup

This guide explains how to configure custom domains and subdomains for your funnels.

## Overview

Users can now choose between two domain options when publishing funnels:

1. **Platform Subdomain** - Easy setup, hosted on your platform (e.g., `clientname.yourplatform.com`)
2. **Custom Domain** - Use client's own domain (e.g., `www.clientdomain.com`)

## Environment Setup

### Required Environment Variable

Add this to your `.env.local` file:

```bash
# Platform base domain (without protocol)
NEXT_PUBLIC_PLATFORM_DOMAIN=yourplatform.com

# For local development:
# NEXT_PUBLIC_PLATFORM_DOMAIN=localhost:3000
```

This variable determines:
- The base domain for subdomains (e.g., `{subdomain}.yourplatform.com`)
- The protocol (http for localhost, https for production)

## Database Schema Changes

The following fields were added to the `Funnel` model:

```prisma
enum FunnelDomainType {
  SUBDOMAIN    // Uses platform subdomain
  CUSTOM       // Uses custom domain
}

model Funnel {
  // ... existing fields ...

  domainType     FunnelDomainType @default(SUBDOMAIN)
  subdomain      String?          // e.g., "clientname"
  customDomain   String?          // e.g., "www.clientdomain.com"
  domainVerified Boolean          @default(false)
}
```

Migration: `20251206010914_add_funnel_domain_configuration`

## User Flow

### 1. Configure Domain (Funnel Editor)

Users can click the **"Domain"** button in the funnel editor top bar to open domain settings:

- **Subdomain Option**:
  - Enter desired subdomain (e.g., "clientname")
  - System validates format (3-63 chars, alphanumeric + hyphens)
  - Checks uniqueness across all funnels
  - Preview: `clientname.yourplatform.com/{page-slug}`

- **Custom Domain Option**:
  - Enter full domain (e.g., "www.clientdomain.com")
  - System validates domain format
  - Shows DNS configuration instructions
  - Checks uniqueness across all funnels

### 2. DNS Configuration (Custom Domains Only)

When using custom domains, users must add a CNAME record:

```
Type: CNAME
Name: www (or @ for root domain)
Value: yourplatform.com
TTL: 3600 (or default)
```

**Important**: DNS changes can take up to 48 hours to propagate.

### 3. Share & Publish

After domain configuration:
- Publish the funnel normally
- Use the "Share" button to get the public URL
- The share dialog shows:
  - Current domain type
  - Domain verification status (for custom domains)
  - Copy/open buttons for the public URL

## Technical Implementation

### URL Routing

The app now handles three URL patterns:

1. **Path-based (legacy fallback)**:
   - `/f/{funnelId}/{pageSlug}`
   - Used when no domain config exists

2. **Subdomain**:
   - `{subdomain}.yourplatform.com/{pageSlug}`
   - Route: `src/app/(public)/[slug]/page.tsx`

3. **Custom Domain**:
   - `{customDomain}/{pageSlug}`
   - Route: `src/app/(public)/[slug]/page.tsx`

### Domain Resolution Logic

The public route (`src/app/(public)/[slug]/page.tsx`) uses the `Host` header to determine which funnel to serve:

```typescript
// 1. Check for exact custom domain match
const funnel = await prisma.funnel.findFirst({
  where: {
    customDomain: host,
    domainType: "CUSTOM",
    status: "PUBLISHED"
  }
});

// 2. If not found, extract subdomain and check
if (!funnel && host.includes('.')) {
  const subdomain = host.split('.')[0];
  const funnel = await prisma.funnel.findFirst({
    where: {
      subdomain: subdomain,
      domainType: "SUBDOMAIN",
      status: "PUBLISHED"
    }
  });
}
```

### Subdomain Validation Rules

- **Length**: 3-63 characters
- **Format**: Lowercase letters, numbers, hyphens only
- **Start/End**: Must begin and end with alphanumeric
- **Reserved**: Cannot use `www`, `api`, `app`, `admin`, `dashboard`, `mail`, `smtp`, `ftp`
- **Unique**: Must be unique across all funnels

### Custom Domain Validation

- **Format**: Must be valid domain name (e.g., `example.com`, `www.example.com`)
- **Unique**: Must be unique across all funnels
- **Verification**: Domain is marked unverified until DNS propagates

## Server Configuration

### DNS Wildcard (For Subdomains)

Your DNS provider should have a wildcard A/CNAME record:

```
Type: A or CNAME
Name: *
Value: your-server-ip or your-platform.com
```

This allows any subdomain (e.g., `*.yourplatform.com`) to resolve to your server.

### Reverse Proxy / Load Balancer

If using nginx, Cloudflare, or similar:

1. **Accept all subdomains**:
   ```nginx
   server_name *.yourplatform.com;
   ```

2. **Pass Host header to Next.js**:
   ```nginx
   proxy_set_header Host $host;
   proxy_set_header X-Forwarded-Host $host;
   ```

3. **SSL Certificates**:
   - Use wildcard SSL for subdomains: `*.yourplatform.com`
   - For custom domains, consider services like:
     - Let's Encrypt with DNS-01 challenge
     - Cloudflare (automatic SSL)
     - AWS Certificate Manager

### Custom Domain SSL

For custom domains, you have several options:

1. **Cloudflare Proxy** (Recommended):
   - Users point domain to Cloudflare
   - Cloudflare provides SSL automatically
   - Configure Cloudflare to proxy to your server

2. **Let's Encrypt with DNS-01**:
   - Requires DNS API access
   - Automatically provision certs for custom domains
   - Tools: Certbot, acme.sh

3. **Manual SSL Upload**:
   - Users provide their own SSL certificates
   - Requires admin interface to upload certs
   - More complex to manage

## API Endpoints

### Update Funnel Domain

```typescript
// tRPC: funnelBuilder.update
await trpc.funnelBuilder.update.mutate({
  id: funnelId,
  domainType: "SUBDOMAIN" | "CUSTOM",
  subdomain: "clientname",      // For SUBDOMAIN type
  customDomain: "www.client.com" // For CUSTOM type
});
```

Validation:
- Checks subdomain/custom domain uniqueness
- Validates format
- Resets `domainVerified` when custom domain changes

## Utility Functions

### `getPublicFunnelPageUrl()`

Generates the correct public URL based on domain configuration:

```typescript
import { getPublicFunnelPageUrl } from "@/features/funnel-builder/lib/funnel-urls";

const url = getPublicFunnelPageUrl(
  funnelId,
  pageSlug,
  {
    domainType: funnel.domainType,
    subdomain: funnel.subdomain,
    customDomain: funnel.customDomain,
  }
);
```

### `validateSubdomain()` / `validateCustomDomain()`

Client and server-side validation:

```typescript
import { validateSubdomain } from "@/features/funnel-builder/lib/funnel-urls";

const result = validateSubdomain("my-client");
if (!result.valid) {
  console.error(result.error);
}
```

## UI Components

### `<DomainSettingsDialog />`

Location: `src/features/funnel-builder/components/dialogs/domain-settings-dialog.tsx`

Props:
- `funnelId` - Current funnel ID
- `currentDomainType` - Current domain type
- `currentSubdomain` - Current subdomain (if any)
- `currentCustomDomain` - Current custom domain (if any)
- `domainVerified` - Domain verification status

### `<ShareFunnelDialog />`

Location: `src/features/funnel-builder/components/dialogs/share-funnel-dialog.tsx`

Updated to:
- Show current domain type
- Display domain verification warnings
- Generate correct public URL based on domain config

## Testing

### Local Development

1. Add to `/etc/hosts` (Unix) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
   ```
   127.0.0.1 clientname.localhost
   127.0.0.1 www.testdomain.com
   ```

2. Access funnels at:
   - `http://clientname.localhost:3000/home`
   - `http://www.testdomain.com:3000/home`

### Production Testing

1. **Subdomain**:
   - Configure subdomain in funnel settings
   - Publish funnel
   - Visit `{subdomain}.yourplatform.com/{page-slug}`

2. **Custom Domain**:
   - Configure custom domain in funnel settings
   - Add CNAME record in DNS provider
   - Wait for DNS propagation (up to 48hrs)
   - Visit `{customdomain}/{page-slug}`

## Troubleshooting

### Subdomain Not Working

1. Check DNS wildcard record exists
2. Verify reverse proxy accepts wildcard subdomains
3. Check SSL certificate covers `*.yourplatform.com`
4. Ensure funnel is published
5. Verify subdomain is saved in database

### Custom Domain Not Working

1. Verify CNAME record is correct
2. Check DNS propagation: `dig {customdomain}` or `nslookup {customdomain}`
3. Ensure SSL certificate exists for custom domain
4. Verify funnel is published
5. Check database: `customDomain` and `domainType` fields

### Domain Already in Use Error

- Subdomains and custom domains must be unique
- Check if another funnel is using the same domain
- Update or delete the conflicting funnel

## Future Enhancements

Potential improvements to consider:

1. **Automated DNS Verification**:
   - Background job to check DNS records
   - Update `domainVerified` automatically
   - Notify users when domain is ready

2. **Automatic SSL Provisioning**:
   - Integration with Let's Encrypt API
   - Auto-provision certs for custom domains
   - Renewal automation

3. **Domain Analytics**:
   - Track which domains drive most traffic
   - Show domain performance in analytics

4. **Multiple Domains per Funnel**:
   - Allow funnels to be accessible from multiple domains
   - Useful for A/B testing or regional targeting

5. **Domain Transfer**:
   - Move domain from one funnel to another
   - Preserve analytics and tracking

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify environment variables are set
3. Review server logs for errors
4. Ensure database migration ran successfully
5. Test with both subdomain and custom domain examples
