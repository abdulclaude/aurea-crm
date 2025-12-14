# Stripe Connect Implementation Guide

This document explains the Stripe Connect implementation for invoice payments in the Aurea CRM platform.

## Overview

The platform now uses **Stripe Connect Standard Accounts** to enable each subaccount to use their own Stripe account for accepting payments. This is the industry-standard approach for multi-tenant SaaS platforms handling payments.

## Architecture

### Database Schema

**StripeConnection Model** ([schema.prisma:1617-1660](prisma/schema.prisma#L1617-L1660))
- Stores connected Stripe account information per subaccount/organization
- Tracks account status (charges_enabled, payouts_enabled, details_submitted)
- Supports optional platform fees (percentage + fixed amount)
- Uses OAuth tokens for API access to connected accounts

### Flow Diagram

```
1. Subaccount Admin → Clicks "Connect with Stripe"
2. Platform → Redirects to Stripe OAuth (/api/stripe/connect)
3. User → Authorizes connection on Stripe
4. Stripe → Redirects back to platform (/api/stripe/callback)
5. Platform → Exchanges code for tokens
6. Platform → Saves connection to database
7. Platform → Redirects to settings with success message
```

### Payment Flow

```
1. Client → Views invoice at /invoices/pay/:id
2. Client → Clicks "Pay with Stripe"
3. Platform → Fetches StripeConnection for invoice's subaccount
4. Platform → Creates Checkout Session via Stripe Connect
   - Uses platform's Stripe instance
   - Passes stripeAccount parameter
   - Payment goes directly to connected account
   - Optional platform fee deducted
5. Client → Completes payment on Stripe Checkout
6. Stripe → Sends webhook to platform
7. Platform → Updates invoice status
8. Client → Redirected back with success message
```

## Implementation Details

### 1. Database Migration

Run the migration to create the StripeConnection table:

```bash
npx prisma migrate dev --name add_stripe_connect
```

### 2. Environment Variables

Add these to your `.env.local`:

```env
# Stripe Platform Keys (your main Stripe account)
STRIPE_SECRET_KEY=sk_test_... # or sk_live_...
STRIPE_CLIENT_ID=ca_... # From Stripe Connect settings
STRIPE_WEBHOOK_SECRET=whsec_... # For invoice payment webhooks

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000 # or your production URL
```

### 3. Stripe Dashboard Setup

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Settings** → **Connect**
3. Enable **Standard accounts**
4. Copy your **client_id** to `STRIPE_CLIENT_ID`
5. Configure OAuth settings:
   - Redirect URI: `https://yourapp.com/api/stripe/callback`
   - For development: `http://localhost:3000/api/stripe/callback`

### 4. API Routes

#### OAuth Initiation ([/api/stripe/connect/route.ts](src/app/api/stripe/connect/route.ts))
- Builds Stripe OAuth URL with state parameter
- State contains: subaccountId, organizationId, userId
- Redirects user to Stripe authorization page

#### OAuth Callback ([/api/stripe/callback/route.ts](src/app/api/stripe/callback/route.ts))
- Exchanges authorization code for access tokens
- Fetches account details from Stripe
- Creates/updates StripeConnection in database
- Redirects back to settings

### 5. Stripe Library Updates

#### New Functions ([stripe.ts](src/lib/stripe.ts))

**createStripeCheckoutSessionForConnect()**
- Creates checkout session for connected account
- Accepts `stripeAccountId` parameter
- Supports optional `applicationFeeAmount` for platform fees
- Uses `{ stripeAccount: accountId }` option in Stripe SDK

**syncStripeConnectAccount()**
- Fetches latest account info from Stripe
- Updates connection status in database
- Returns account capabilities and details

**disconnectStripeConnectAccount()**
- Revokes OAuth access for connected account
- Uses `stripe.oauth.deauthorize()`

### 6. tRPC Router

#### Stripe Connect Router ([stripe-connect/server/router.ts](src/features/stripe-connect/server/router.ts))

**Procedures:**
- `getConnection` - Fetch connection status for current subaccount
- `syncAccount` - Sync account info from Stripe
- `disconnect` - Disconnect Stripe account
- `updateFeeSettings` - Configure platform fees

Registered in main router as `stripeConnect`

### 7. Invoice Payment Updates

#### generatePaymentLink Mutation ([invoices-router.ts:1158-1269](src/features/invoicing/server/invoices-router.ts#L1158-L1269))

**Changes:**
- Queries `StripeConnection` instead of `PaymentIntegration`
- Validates `chargesEnabled` before creating checkout session
- Calculates platform fee if configured
- Uses `createStripeCheckoutSessionForConnect()`
- Passes connected account ID to Stripe

**Platform Fee Calculation:**
```typescript
const feePercent = connection.applicationFeePercent || 0;
const feeFixed = connection.applicationFeeFixed || 0;
applicationFeeAmount = (amountInCents * feePercent / 100) + (feeFixed * 100);
```

### 8. UI Component

#### StripeConnectCard ([stripe-connect-card.tsx](src/features/stripe-connect/components/stripe-connect-card.tsx))

**Features:**
- Shows connection status with visual indicators
- Displays account capabilities (charges, payouts, details)
- Sync button to refresh account info from Stripe
- Disconnect button with confirmation
- Warning banner if account setup incomplete
- Links to Stripe Dashboard for completing setup

**Usage:**
```tsx
import { StripeConnectCard } from "@/features/stripe-connect/components/stripe-connect-card";

// In your settings page
<StripeConnectCard />
```

## Usage Instructions

### For Platform Administrators

1. **Set up Stripe Connect:**
   - Enable Stripe Connect in your Stripe Dashboard
   - Configure OAuth redirect URIs
   - Add environment variables to your deployment

2. **Configure Platform Fees (Optional):**
   ```typescript
   await prisma.stripeConnection.update({
     where: { id: connectionId },
     data: {
       applicationFeePercent: 2.5,  // 2.5% fee
       applicationFeeFixed: 0.30,   // + $0.30 per transaction
     },
   });
   ```

### For Subaccount Users

1. **Connect Stripe Account:**
   - Go to Settings → Payments
   - Click "Connect with Stripe"
   - Authorize on Stripe (login or create account)
   - Complete Stripe account setup if prompted

2. **Verify Connection:**
   - Check that all capabilities show as "Enabled"
   - If not, follow link to Stripe Dashboard to complete setup

3. **Send Invoices:**
   - Create invoice as normal
   - Send to client via email
   - Client can now pay with "Pay with Stripe" button

4. **Monitor Payments:**
   - Payments appear in your connected Stripe account
   - Funds are deposited according to your Stripe payout schedule
   - Platform fees (if configured) are automatically deducted

## Platform Fees

### How They Work

Platform fees allow you to earn revenue on each transaction. When enabled:

1. Customer pays full invoice amount
2. Stripe processes payment to connected account
3. Platform fee is automatically transferred to your platform Stripe account
4. Connected account receives payment minus platform fee

### Fee Structure Options

**Percentage Fee:**
- Example: 2.5% of transaction
- Set via `applicationFeePercent`

**Fixed Fee:**
- Example: $0.30 per transaction
- Set via `applicationFeeFixed`

**Combined:**
- Example: 2.5% + $0.30
- Set both fields

### Configuration

Update via tRPC:
```typescript
trpc.stripeConnect.updateFeeSettings.mutate({
  applicationFeePercent: 2.5,
  applicationFeeFixed: 0.30,
});
```

Or directly in database:
```sql
UPDATE stripe_connection
SET application_fee_percent = 2.50,
    application_fee_fixed = 0.30
WHERE id = 'connection_id';
```

## Webhook Handling

### Current Webhook

The existing webhook at `/api/webhooks/stripe-invoices/route.ts` handles:
- `checkout.session.completed` - Records payment
- `payment_intent.succeeded` - Logs success
- `payment_intent.payment_failed` - Logs failure

### Connect Account Webhooks

For production, you should also handle:
- `account.updated` - Sync account status changes
- `account.application.deauthorized` - Handle disconnections

Add webhook endpoint in Stripe Dashboard → Webhooks → Add endpoint:
- URL: `https://yourapp.com/api/webhooks/stripe-connect`
- Events: Select Connect events

## Testing

### Test Mode

1. Use Stripe test mode keys
2. Connect test Stripe account via OAuth
3. Use test cards: `4242 4242 4242 4242`
4. Check Stripe test dashboard for payments

### Verification Checklist

- [ ] OAuth flow completes successfully
- [ ] Connection saved to database correctly
- [ ] Account status syncs from Stripe
- [ ] Invoice payment creates checkout session
- [ ] Payment processes to connected account
- [ ] Platform fee deducted (if configured)
- [ ] Webhook updates invoice status
- [ ] Disconnect removes access

## Migration from PaymentIntegration

If you have existing subaccounts using the old `PaymentIntegration` model:

1. **Keep both systems running** initially for backwards compatibility
2. **Encourage migration** to Stripe Connect via UI banners
3. **Deprecate PaymentIntegration** after migration period
4. **Update code** to remove old payment flow

### Migration Script Example

```typescript
// Migrate existing integrations to Stripe Connect
const existingIntegrations = await prisma.paymentIntegration.findMany({
  where: { provider: "STRIPE", isActive: true },
});

for (const integration of existingIntegrations) {
  // Send email to subaccount admin
  // Notify them to connect via Stripe Connect OAuth
  // Deactivate old integration after successful connection
}
```

## Security Considerations

1. **OAuth State Validation:**
   - State parameter prevents CSRF attacks
   - Contains encrypted context (userId, subaccountId)
   - Validated in callback

2. **Access Tokens:**
   - Stored securely in database
   - Used for API calls on behalf of connected account
   - Can be revoked via disconnect

3. **Webhook Security:**
   - Verify signature using `STRIPE_WEBHOOK_SECRET`
   - Reject unsigned webhooks
   - Use idempotency keys

4. **PCI Compliance:**
   - No card data touches your servers
   - Stripe handles all payment data
   - You only store Stripe IDs

## Troubleshooting

### "Stripe not configured" Error
- Check `STRIPE_CLIENT_ID` is set
- Verify Stripe Connect is enabled in dashboard

### "Account cannot accept charges" Error
- Connected account setup incomplete
- User needs to complete onboarding in Stripe Dashboard

### Webhook Not Received
- Check webhook endpoint configured in Stripe
- Verify `STRIPE_WEBHOOK_SECRET` matches
- Check server logs for errors

### OAuth Redirect Error
- Verify redirect URI in Stripe Dashboard matches exactly
- Check `NEXT_PUBLIC_APP_URL` is correct
- Ensure HTTPS in production

## Best Practices

1. **Always validate account status** before creating checkout sessions
2. **Sync account info periodically** to keep status up-to-date
3. **Handle webhook retries** idempotently
4. **Log all Stripe API errors** for debugging
5. **Test with Stripe test mode** before going live
6. **Monitor platform fee revenue** for accounting
7. **Provide clear setup instructions** for users

## Additional Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Standard Accounts Guide](https://stripe.com/docs/connect/standard-accounts)
- [OAuth for Connect](https://stripe.com/docs/connect/oauth-reference)
- [Application Fees](https://stripe.com/docs/connect/direct-charges#application-fees)
- [Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)

## Support

For issues with:
- **Platform setup:** Check this guide and Stripe Dashboard
- **User connections:** Guide users to complete Stripe onboarding
- **Payment failures:** Check Stripe logs in Dashboard
- **Webhook issues:** Verify webhook configuration and secrets
