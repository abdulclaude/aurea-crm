# Stripe Connect Setup Guide

Quick guide to get Stripe Connect working for invoice payments.

## Step 1: Configure Stripe Dashboard

1. **Go to Stripe Dashboard**
   - Visit [https://dashboard.stripe.com](https://dashboard.stripe.com)
   - Switch to Test mode for testing (toggle in top-right)

2. **Enable Stripe Connect**
   - Navigate to **Settings** → **Connect**
   - Click "Get started" with Connect
   - Choose **Standard** account type
   - Complete the Connect settings

3. **Get Your Client ID**
   - In Connect settings, find your **client_id**
   - It starts with `ca_`
   - Copy this - you'll need it for environment variables

4. **Configure OAuth Settings**
   - In Connect settings, go to **OAuth settings**
   - Add redirect URIs:
     - Development: `http://localhost:3000/api/stripe/callback`
     - Production: `https://yourdomain.com/api/stripe/callback`
   - Save changes

5. **Get Your API Keys**
   - Go to **Developers** → **API keys**
   - Copy your **Secret key** (starts with `sk_test_` for test mode)
   - For webhooks, you'll get the webhook secret in Step 3

## Step 2: Add Environment Variables

Add these to your `.env.local` file:

```env
# Stripe Platform Keys
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_CLIENT_ID=ca_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# App URL (important for OAuth redirect)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important Notes:**
- Use `sk_test_` keys for testing
- Use `sk_live_` keys for production
- Never commit `.env.local` to git
- Use the same Stripe account for both keys

## Step 3: Set Up Webhooks (Optional but Recommended)

1. **Create Webhook Endpoint**
   - Go to **Developers** → **Webhooks**
   - Click "Add endpoint"
   - URL: `https://yourdomain.com/api/webhooks/stripe-invoices`
     - For local testing: Use ngrok or similar tunnel
   - Select events to listen to:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
   - Click "Add endpoint"

2. **Get Webhook Secret**
   - Click on your new webhook endpoint
   - Reveal the **Signing secret**
   - Copy it to `STRIPE_WEBHOOK_SECRET` in `.env.local`

## Step 4: Test the Integration

1. **Start Your Development Server**
   ```bash
   npm run dev
   ```

2. **Navigate to Settings**
   - Go to `http://localhost:3000/settings/payments`
   - You should see the Stripe Connect card

3. **Connect a Test Account**
   - Click "Connect with Stripe"
   - You'll be redirected to Stripe
   - Use the "Skip this account form" button for testing
   - Or create a test connected account

4. **Verify Connection**
   - You should be redirected back to settings
   - Connection card should show "Stripe Connected"
   - Check that capabilities show as enabled

5. **Test Invoice Payment**
   - Create an invoice
   - Send it to a test email
   - Click the payment link
   - Click "Pay with Stripe"
   - Use test card: `4242 4242 4242 4242`
   - Any future date for expiry
   - Any 3-digit CVC
   - Complete payment

6. **Check Results**
   - Invoice should update to "Paid" status
   - Payment should appear in your connected Stripe account
   - Check webhook logs in Stripe Dashboard

## Troubleshooting

### "Stripe not configured" Error
- Check that `STRIPE_CLIENT_ID` is set correctly
- Verify Stripe Connect is enabled in your dashboard

### OAuth Redirect Error
- Verify redirect URI in Stripe Dashboard exactly matches your app URL
- Check that `NEXT_PUBLIC_APP_URL` is correct
- Make sure you're using the same protocol (http/https)

### "Account cannot accept charges" Error
- Connected account needs to complete onboarding
- In test mode, use "Skip this account form" button
- In production, user must complete Stripe onboarding

### Webhook Not Working
- Check webhook URL is accessible (use ngrok for local testing)
- Verify `STRIPE_WEBHOOK_SECRET` matches the signing secret
- Check webhook logs in Stripe Dashboard for errors

### Local Testing Tips
1. **Use ngrok for webhooks:**
   ```bash
   ngrok http 3000
   ```
   Then use the ngrok URL in webhook settings

2. **Test Mode:** Always use test mode keys during development

3. **Clear test data:** Stripe Dashboard → Developers → Clear test data

## Production Checklist

Before going live:

- [ ] Switch to live mode in Stripe Dashboard
- [ ] Update environment variables with live keys:
  - [ ] `STRIPE_SECRET_KEY` → `sk_live_...`
  - [ ] `STRIPE_CLIENT_ID` → Use live mode client ID
  - [ ] `STRIPE_WEBHOOK_SECRET` → Create new webhook with live endpoint
- [ ] Update OAuth redirect URIs to production domain
- [ ] Update webhook endpoint URL to production domain
- [ ] Test with real bank account (small amount)
- [ ] Review Stripe pricing and fees
- [ ] Set up email notifications for failed payments
- [ ] Configure platform fees (optional)

## Platform Fees (Optional)

To earn revenue on transactions:

1. **Via UI** (coming soon):
   - Go to Settings → Payments
   - Configure fee percentage and/or fixed amount

2. **Via Database:**
   ```sql
   UPDATE stripe_connection
   SET
     application_fee_percent = 2.50,  -- 2.5%
     application_fee_fixed = 0.30     -- + $0.30
   WHERE subaccount_id = 'xxx';
   ```

3. **Via tRPC:**
   ```typescript
   trpc.stripeConnect.updateFeeSettings.mutate({
     applicationFeePercent: 2.5,
     applicationFeeFixed: 0.30,
   });
   ```

**Fee Examples:**
- Invoice: $100
- Platform fee: 2.5% + $0.30 = $2.80
- Subaccount receives: $97.20
- Platform receives: $2.80

## Security Notes

✅ **What's Secure:**
- OAuth-based connection (no API keys stored)
- Payments go directly to connected accounts
- PCI compliance handled by Stripe
- Webhook signature verification

⚠️ **Important:**
- Never expose Stripe secret keys in client-side code
- Always verify webhook signatures
- Use HTTPS in production
- Keep dependencies updated

## Support Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Standard Accounts Guide](https://stripe.com/docs/connect/standard-accounts)
- [OAuth Reference](https://stripe.com/docs/connect/oauth-reference)
- [Testing Guide](https://stripe.com/docs/connect/testing)
- [API Reference](https://stripe.com/docs/api)

## Need Help?

- Check the [full implementation guide](STRIPE_CONNECT_IMPLEMENTATION.md)
- Review Stripe Dashboard logs
- Check application logs for errors
- Test with Stripe's test mode first
- Contact Stripe support for platform-specific issues
