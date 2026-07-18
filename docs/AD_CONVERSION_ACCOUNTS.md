# Scoped Ad Conversion Accounts

Meta Conversions API, Google Ads conversion uploads, and TikTok Events API are
configured as `ProviderAccount` records in **Settings > Provider accounts**.
Provider secrets are encrypted and are never read from global environment
variables.

## Scope resolution

- Every account belongs to one organization and, optionally, one location.
- A location account always wins over an organization account.
- An organization account is available to locations only when its explicit
  `inheritToLocations` setting is enabled.
- Conversion processing resolves the funnel from the database and rejects a
  tracking batch whose claimed organization or location does not match it.
- The selected account is revalidated immediately before each provider request.
  User identity is never used to select an account.

## Delivery ledger

Migration `0032_scoped_ad_conversion_accounts.sql` adds
`AdConversionDelivery`. The unique event/account pair prevents duplicate local
dispatches, while the same funnel event ID is sent to Meta and TikTok and is
used as the Google Ads order ID. Successful deliveries are skipped on retry.
Provider account deletion is restricted so delivery history is not silently
removed; disconnecting an account changes its status instead.

Before applying the migration, verify that migrations through `0031` are in the
ledger and that the composite organization/location and organization/provider
account keys exist. After applying it, verify the table, enum, RLS flag, three
foreign keys, unique event/account index, and journal entry `0032`.

Protocol references:

- [Meta Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Google Ads v24 UploadClickConversions](https://developers.google.com/google-ads/api/reference/rpc/v24/ConversionUploadService/UploadClickConversions)
- [TikTok Events API for web](https://business-api.tiktok.com/portal/docs/events-api-web/v1.3)
