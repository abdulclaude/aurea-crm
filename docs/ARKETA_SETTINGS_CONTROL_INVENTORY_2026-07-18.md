# Arketa Settings Control Inventory

Date: 2026-07-18

## Safety and method

- Read-only audit of the signed-in Arketa workspace.
- No save, create, delete, send, connect, disconnect, upload, or destructive action was used.
- Text/email/phone/URL field values were not captured. Existing phone, email, and URL text was redacted.
- Selects and dropdowns were opened only to read choices; pages were navigated away without saving.
- This refresh covers 63 settings/account/integration routes and 71 visible route or tab states.
- Raw evidence contains 2714 rendered controls, 93 opened option groups, and 2394 visible text items before shell deduplication.
- Routes or controls hidden by another plan, role, tenant configuration, or feature flag cannot be proven from this workspace.

## Coverage ledger

| Route | States | Meaningful controls | Opened option groups | Outcome |
| --- | ---: | ---: | ---: | --- |
| `/dashboard/settings/business` | 7 | 994 | 42 | Inspected |
| `/dashboard/settings/public-facing` | 1 | 24 | 2 | Inspected |
| `/dashboard/settings/locations` | 1 | 20 | 0 | Inspected |
| `/dashboard/settings/team` | 1 | 14 | 2 | Inspected |
| `/dashboard/settings/taxes` | 1 | 13 | 0 | Inspected |
| `/dashboard/settings/language-customization` | 1 | 15 | 4 | Inspected |
| `/dashboard/settings/revenue-categories` | 1 | 35 | 0 | Inspected |
| `/dashboard/settings/offline-payment-types` | 1 | 21 | 0 | Inspected |
| `/dashboard/settings/faqs` | 1 | 13 | 0 | Inspected |
| `/dashboard/settings/general-clients` | 1 | 17 | 0 | Inspected |
| `/dashboard/settings/required-signup-fields` | 1 | 17 | 6 | Inspected |
| `/dashboard/settings/custom-fields` | 1 | 21 | 0 | Inspected |
| `/dashboard/settings/forms` | 1 | 22 | 0 | Inspected |
| `/dashboard/settings/family-sharing` | 1 | 15 | 0 | Inspected |
| `/dashboard/settings/tags` | 1 | 37 | 0 | Inspected |
| `/dashboard/settings/client-note-templates` | 3 | 42 | 0 | Inspected |
| `/dashboard/lifecycle-settings/stages` | 1 | 28 | 0 | Inspected |
| `/dashboard/settings/general-schedule` | 1 | 17 | 0 | Inspected |
| `/dashboard/settings/booking-windows` | 1 | 54 | 0 | Inspected |
| `/dashboard/settings/waitlist` | 1 | 58 | 0 | Inspected |
| `/dashboard/settings/no-show-late-cancel` | 1 | 39 | 0 | Inspected |
| `/dashboard/settings/guest-list-booking` | 1 | 51 | 0 | Inspected |
| `/dashboard/settings/phone` | 1 | 16 | 4 | Inspected |
| `/dashboard/settings/texting` | 1 | 13 | 2 | Inspected |
| `/dashboard/settings/sign-up-forms` | 1 | 22 | 8 | Inspected |
| `/dashboard/settings/email-settings/domains` | 1 | 38 | 0 | Inspected |
| `/dashboard/settings/transactional-emails` | 1 | 12 | 0 | Inspected |
| `/dashboard/settings/sent-transactional-messages` | 1 | 41 | 0 | Inspected |
| `/dashboard/settings/confirmation-emails` | 1 | 40 | 0 | Inspected |
| `/dashboard/settings/macros` | 1 | 14 | 0 | Inspected |
| `/dashboard/settings/email-suppression` | 1 | 45 | 0 | Inspected |
| `/dashboard/settings/payments` | 1 | 13 | 0 | Inspected |
| `/dashboard/settings/integration` | 1 | 10 | 0 | Inspected |
| `/dashboard/settings/my-plan` | 1 | 10 | 0 | Inspected |
| `/dashboard/settings/early-booking` | 1 | 12 | 0 | Inspected |
| `/dashboard/settings/discounts` | 1 | 27 | 0 | Inspected |
| `/dashboard/settings/staff/commissions` | 1 | 14 | 0 | Inspected |
| `/dashboard/settings/integration/apple-pay` | 1 | 13 | 0 | Inspected |
| `/dashboard/settings/integration/partner-api` | 1 | 14 | 0 | Inspected |
| `/dashboard/settings/integration/ai-assistants` | 1 | 12 | 0 | Inspected |
| `/dashboard/settings/integration/classpass` | 1 | 13 | 0 | Inspected |
| `/dashboard/settings/integration/facebook` | 1 | 17 | 0 | Inspected |
| `/dashboard/settings/integration/google` | 1 | 18 | 0 | Inspected |
| `/dashboard/settings/integration/kisi` | 1 | 18 | 0 | Inspected |
| `/dashboard/settings/integration/mailchimp` | 1 | 13 | 0 | Inspected |
| `/dashboard/settings/integration/spivi` | 1 | 12 | 0 | Inspected |
| `/dashboard/settings/integration/gympass` | 1 | 14 | 0 | Inspected |
| `/dashboard/settings/integration/zapier` | 1 | 15 | 0 | Inspected |
| `/dashboard/settings/integration/zoom` | 1 | 12 | 0 | Inspected |
| `/dashboard/settings/integration/gmail/blocked-emails` | 1 | 22 | 0 | Inspected |
| `/dashboard/settings/atlas` | 1 | 10 | 0 | Inspected |
| `/dashboard/settings/email-settings` | 1 | 38 | 0 | Inspected |
| `/dashboard/settings/forms/create` | 1 | 37 | 2 | Inspected |
| `/dashboard/settings/macros/new` | 1 | 18 | 0 | Inspected |
| `/dashboard/settings/payroll` | 1 | 16 | 0 | Inspected |
| `/dashboard/settings/payroll/general` | 1 | 16 | 0 | Inspected |
| `/dashboard/settings/public-page` | 1 | 44 | 4 | Inspected |
| `/dashboard/account-settings/profile` | 1 | 25 | 2 | Inspected |
| `/dashboard/account-settings/shared-notes` | 1 | 14 | 0 | Inspected |
| `/dashboard/account-settings/integrations` | 1 | 15 | 0 | Inspected |
| `/dashboard/account-settings/advanced` | 1 | 16 | 0 | Inspected |
| `/dashboard/account-settings/payroll` | 1 | 25 | 2 | Inspected |
| `/dashboard/marketing/emails` | 1 | 34 | 0 | Inspected |

## Detailed inventory

Current editable values are represented only as `configured` or `empty`. Toggle truth comes from a separate read-only ARIA state pass.

## `/dashboard/settings/business`

### default

**Visible text**

- General Business Settings
- Save changes
- General Settings
- Logo, timezone, email body, cancellation policy, and shipping
- Brand logo
- Replace
- Email timezone settings
- Confirmation emails will display this timezone
- (+01:00) Europe/London
- Date/time formats
- Choose how dates and times appear to your clients
- English (United Kingdom)
- Condensed
- Sat, 18 Jul 2026, 11:45
- Verbose
- 18 July 2026 at 11:45
- Date condensed
- 18 July 2026
- Weekday date
- Saturday 18 Jul
- Month day year
- 18 Jul 2026
- Month day
- 18 July
- Date
- 18/07/2026
- Day abbr
- Sat
- Time
- 11:45
- Europe/London
- Confirmation email body
- H1
- H3
- </>
- Write
- Preview
- Hi!
- Thank you for booking with us.
- Our cancellation policy is as follows
- Thank you!
- HTML is canonical; Markdown is exported via Turndown for APIs & docs.
- Copy HTML
- Copy Markdown
- Cancellation policy
- advanced booking windows
- hours
- Late cancel / no show policy overview
- This policy will be shown to the customer before they book
- Terms & Conditions: Classes
- Classes are always subject to availability but we will always do our best to accommodate you in your chosen class.
- All classes must be prepaid and all clients agree to our 12hr notice policy when cancelling and/or rescheduling. If you’re booked into a class, but miss it or cancel with less than 12 hours’ notice, you will be charged for it.
- Out of consideration for the Trainer and other Clients, and also for your own safety (the warm-up is an important aspect of each class) please be aware that if you are more than 10 minutes late for a class, you will not be able to train.
- Statutory Rights and Refunds and Cancellation
- Classes are sold individually, and in Packs of 5, 10, 20, 30 and 100 or such other combinations as El Estudio Pilates Boutique may introduce from time to time. Blocks of classes may be shared by arrangement. Class fees are non refundable.
- Class fees may be increased by El Estudio Pilates Boutique at any time. The Proprietor shall give Clients not less than 14 days notice prior to any such increases. The Pilates Intro Pack is valid for 30 days before the first reservation.
- The rights of cancellation and refund and any limitation expressed in these terms and conditions do not affect your statutory rights as a consumer. Refunds in relation to Products or Services may only be credited to the credit or debit card originally used to make the purchase. An administration fee of £80.00 is applicable and 3% of the return balance for payment gateway expenses.
- Remember late cancel policy agreement
- When enabled, clients only need to agree to the cancellation policy once; after agreeing, the checkbox will be hidden on future checkouts
- Waiver of liability
- Important Liability Statement
- The information available on or through this site, and the Services supplied via or in connection with this site or at any «El Estudio Pilates Boutique» do not constitute medical advice and it is your responsibility to determine, through obtaining appropriate medical advice, that you are fit and well and that such contents and services are suitable for you. It is not our responsibility to do so. Before commencing any exercise regime, you should consult your doctor.
- It is also vital that you supply us with correct information about yourself. We cannot be liable for any incorrect information supplied by you to us. We try to make sure that all information contained on this site (and provided by us to you as part of any Services or Products) is correct, but, subject to the paragraph below, we do not accept any liability for any error or omission and exclude all liability for any action you (your legal representatives, heirs) may take or loss or injury you may suffer (direct or indirect including loss of pay, profit, opportunity or time, pain and suffering, any indirect, consequential or special loss, however arising) as a result of relying on any information on this site or provided through any Service supplied by us to you.
- You, your legal representatives and your heirs release, waive, discharge and covenant, not to sue «El Estudio Pilates Boutique» and its instructors for any injury or death caused by their negligence or other acts.
- Reset waiver for all clients
- This will clear all signed waivers and agreements, requiring every client to re-sign before their next booking
- Reset
- Flat rate shipping price
- How much you will charge for shipping items
- £
- Subscription & Payment Settings
- Manage subscription behavior, payment methods, and refund policies
- Block booking when subscription fails
- Check this box if you would like to block booking with a subscription when the subscription fails
- Add action on subscription cancellation
- Check this box if you would like to add an action on subscription cancellation
- Action on subscription cancellation
- Choose what happens to existing reservations when a subscription is canceled
- Mark as unpaid
- Enable pay with account
- When enabled, clients can choose to pay with their account balance at checkout; this option is not available for subscriptions and may result in a negative balance to the account, which can be paid off later
- Enable refund with account credit
- When enabled, dollar amounts will be refunded with account credit instead of returning to the client's payment method
- Enable tipping in point of sale
- When enabled, customers will see tip options during checkout at the point of sale
- Custom payment method types
- Payment method types
- Ask for payment method
- When enabled, customers with active memberships will be prompted to add a payment method, in the mobile app only, if they don't have one on file
- Location-based tax from client's default location
- When enabled, checkout from the booking widget or branded app uses the client's default location to calculate location-based tax when the cart isn't tied to a specific location
- Allow recurring classes without payment method
- When enabled, clients can create recurring class bookings even if they don't have a payment method on file
- Allow recurring pricing option repurchase
- When enabled, staff can repurchase the same recurring pricing option for a client even if they already have an active or recently purchased instance
- Make revenue category mandatory for each offering
- When enabled, partners must select a revenue category when creating or editing pricing options and service types
- Community pack credits
- When enabled, class packs can be configured to grant community enrollments; purchasing a bundle containing such a pack at community checkout will auto-redeem one credit
- Reservation Management
- Unpaid reservation handling, double booking, and spot visibility
- Enable unpaid reservation resolver
- Check this box if you would like Arketa to automatically resolve unpaid reservations. The resolver retries from 3 days before class, but only charges or cancels within 6 hours of the class start time, rechecking roughly every 2 hours. Because it acts only inside that final 6-hour window, resolution is not guaranteed to complete before class.
- Block double booking
- When enabled, clients will not be able to book the same class twice on the widget or app. Staff can still override this when booking through the dashboard.
- Limit clients to one device at a time
- When a client signs in on a new device, sign them out of all previous devices. Reduces account sharing for on-demand video and community access. Does not apply to staff.
- Show spots remaining
- When enabled, the 'spots remaining' information will be shown on the class checkout experience
- Always show spots remaining
- Enable multiple credits required for booking
- This allows you to set a specific number of credits required for booking classes, appointments, and events
- Use package price when pack booking has no payment record
- If a class booking from a pack has no Stripe payment or order on file, use the package offering price (per credit) for revenue in reports and exports; enable for legacy pack bookings or when you need payroll or sales totals without stored payment data
- Check-in Settings
- Configure client check-in methods, gym access, and barcode scanning
- Enable client check-in
- This enables various check-in methods within your dashboard
- Enable auto check-in from email
- Automatically check in clients when they click the livestream link in the confirmation email within 30 minutes before or after the class start time
- Allow check-in for unpaid reservations
- When enabled, allows checking in clients with unpaid reservations without requiring payment to be resolved first
- Show instructor milestones on check-in
- Also show the with-this-instructor milestone count on the class check-in roster. The studio-wide milestone always shows regardless of this setting.
- Communication Settings
- Email notifications, messaging, and unsubscribe options
- Enable one-click unsubscribe for transactional emails
- This will add a one-click unsubscribe link to all transactional emails sent to clients
- Enable group messaging
- When enabled, allows partners and clients to create and participate in group conversations within the inbox and the branded mobile app
- Disable confirmation emails (group classes)
- Disable receiving a notification for each booking; clients will still be notified
- Disable confirmation emails (appointment booking)
- Disable receiving a notification for each appointment booking; clients will still be notified
- Disable confirmation emails (purchases)
- Disable receiving a notification for each purchase; clients will still be notified
- Skip duplicate email aliases in marketing sends
- When on, broadcast emails skip recipients whose canonical email (e.g. josh+guest@) duplicates another recipient in the same send. Prevents sending multiple copies to family-account aliases.
- Client Experience Settings
- Guest booking, location prompts, room names, and profile display
- Enable book for a guest
- Check this box if you would like clients to book for their friends. By checking this box your clients will be able to purchase a drop-in for guests. Please update each of your packages/subscriptions to allow clients to use these pricing options for guests
- Apply member discounts to guest bookings
- When enabled, member tier or member discounts can apply when the member books for a guest. Off by default; non-member promo codes are unaffected
- Enable guest passes for gym check-in
- Allow guest pass configuration on pricing options for front-desk gym check-in. Members can use guest passes at check-in without enabling app-based guest booking
- Enable purchasing communities for guests
- When enabled, clients can purchase communities multiple times for their guests or family members. This allows account holders to buy access for others they know
- Prompt clients for default location in branded app
- Check this box if you would like clients to be prompted to select a default location in the branded app if you have multiple locations
- Client records
- Check this box if you would like to keep track of your clients' records
- Show room name to clients
- When enabled, clients will see the name of the room after booking a class, helping them know where to go in your location
- Timezone display
- Enable to show session times in the local timezone, including the timezone abbreviation
- Show client profile images
- When enabled, client profile images will be displayed in check-in screens
- Legal & Compliance Settings
- Waivers, tax configuration, and agreement terms
- Enable signed liability waiver
- This will require clients to sign a liability waiver before booking. By disabling this clients will not have to sign, but rather will only have to click a checkbox
- Tax-inclusive pricing
- When enabled (tax-inclusive), the displayed price includes tax. For example, if a class costs $100 and tax is 10%, the displayed price will be $100 (tax included).
- When disabled (tax-exclusive), tax will be added on top of the displayed price. For example, if a class costs $100 and tax is 10%, the displayed price will be $100 + $10 tax.
- Enable signed agreement terms
- When enabled, clients will be required to sign agreement terms before booking across the application
- Staff & Access Settings
- Time clock, shift scheduling, and front desk permissions
- Enable time clock
- This will require all hourly employees to manually clock in when they start their shift and clock out when they complete their shift
- Enable shift scheduling
- When enabled, your team can use shift scheduling in the dashboard (subject to role permissions)
- Disable Front Desk & Guest team members from adding clients as free or unpaid
- When enabled, the 'Front desk' and 'Guest' Team Member roles will not be able to add clients to classes as free nor unpaid

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Save changes | available |  |
| button | Replace | available |  |
| button | Remove image | available |  |
| input:file | [unlabelled] | available |  |
| combobox | (+01:00) Europe/London | available |  |
| combobox | English (United Kingdom) | available |  |
| button | Bold | available |  |
| button | Italic | available |  |
| button | Strikethrough | available |  |
| button | Underline | available |  |
| button | Inline code | available |  |
| button | Heading 1 | available |  |
| button | Heading 2 | available |  |
| button | Heading 3 | available |  |
| button | Bullet list | available |  |
| button | Numbered list | available |  |
| button | Checklist | available |  |
| button | Quote | available |  |
| button | Align left | available |  |
| button | Align center | available |  |
| button | Align right | available |  |
| button | Justify | available |  |
| button | Link | available |  |
| button | Code block | available |  |
| button | Horizontal rule | available |  |
| button | Undo | disabled |  |
| button | Redo | disabled |  |
| tab | WriteWrite | available |  |
| tab | PreviewPreview | available |  |
| button | Copy HTML | available |  |
| button | Copy Markdown | available |  |
| input:number | [unlabelled] | value configured |  |
| switch | [unlabelled] | available |  |
| button | Copy waiver link | available |  |
| button | Reset | available |  |
| combobox | Mark as unpaid | available |  |
| combobox | Always show spots remaining | available |  |

**Opened select/dropdown options**

- Option group 1: (-10:00) Pacific/Honolulu; (-09:00) America/Adak; (-08:00) America/Anchorage; (-08:00) America/Juneau; (-08:00) America/Metlakatla; (-08:00) America/Nome; (-08:00) America/Sitka; (-08:00) America/Yakutat; (-07:00) America/Creston; (-07:00) America/Dawson; (-07:00) America/Dawson_Creek; (-07:00) America/Fort_Nelson; (-07:00) America/Hermosillo; (-07:00) America/Los_Angeles; (-07:00) America/Mazatlan; (-07:00) America/Phoenix; (-07:00) America/Tijuana; (-07:00) America/Vancouver; (-07:00) America/Whitehorse; (-06:00) America/Bahia_Banderas; (-06:00) America/Boise; (-06:00) America/Cambridge_Bay; (-06:00) America/Chihuahua; (-06:00) America/Ciudad_Juarez; (-06:00) America/Denver; (-06:00) America/Edmonton; (-06:00) America/Inuvik; (-06:00) America/Merida; (-06:00) America/Mexico_City; (-06:00) America/Monterrey; (-06:00) America/Regina; (-06:00) America/Swift_Current; (-05:00) America/Atikokan; (-05:00) America/Cancun; (-05:00) America/Chicago; (-05:00) America/Indiana/Knox; (-05:00) America/Indiana/Tell_City; (-05:00) America/Matamoros; (-05:00) America/Menominee; (-05:00) America/North_Dakota/Beulah; (-05:00) America/North_Dakota/Center; (-05:00) America/North_Dakota/New_Salem; (-05:00) America/Ojinaga; (-05:00) America/Panama; (-05:00) America/Rankin_Inlet; (-05:00) America/Resolute; (-05:00) America/Winnipeg; (-04:00) America/Blanc-Sablon; (-04:00) America/Detroit; (-04:00) America/Indiana/Indianapolis; (-04:00) America/Indiana/Marengo; (-04:00) America/Indiana/Petersburg; (-04:00) America/Indiana/Vevay; (-04:00) America/Indiana/Vincennes; (-04:00) America/Indiana/Winamac; (-04:00) America/Iqaluit; (-04:00) America/Kentucky/Louisville; (-04:00) America/Kentucky/Monticello; (-04:00) America/New_York; (-04:00) America/Puerto_Rico; (-04:00) America/Toronto; (-03:00) America/Argentina/Buenos_Aires; (-03:00) America/Argentina/Catamarca; (-03:00) America/Argentina/Cordoba; (-03:00) America/Argentina/Jujuy; (-03:00) America/Argentina/La_Rioja; (-03:00) America/Argentina/Mendoza; (-03:00) America/Argentina/Rio_Gallegos; (-03:00) America/Argentina/Salta; (-03:00) America/Argentina/San_Juan; (-03:00) America/Argentina/San_Luis; (-03:00) America/Argentina/Tucuman; (-03:00) America/Argentina/Ushuaia; (-03:00) America/Glace_Bay; (-03:00) America/Goose_Bay; (-03:00) America/Halifax; (-03:00) America/Moncton; (-02:30) America/St_Johns; (+00:00) Africa/Abidjan; (+00:00) Atlantic/Azores; (+00:00) Atlantic/Reykjavik; (+01:00) Atlantic/Canary; (+01:00) Atlantic/Madeira; (+01:00) Europe/Dublin; (+01:00) Europe/Lisbon; (+01:00) Europe/London; (+02:00) Africa/Ceuta; (+02:00) Africa/Johannesburg; (+02:00) Africa/Lusaka; (+02:00) Africa/Maputo; (+02:00) Europe/Amsterdam; (+02:00) Europe/Belgrade; (+02:00) Europe/Berlin; (+02:00) Europe/Bratislava; (+02:00) Europe/Brussels; (+02:00) Europe/Budapest; (+02:00) Europe/Busingen; (+02:00) Europe/Copenhagen; (+02:00) Europe/Kaliningrad; (+02:00) Europe/Ljubljana; (+02:00) Europe/Luxembourg; (+02:00) Europe/Madrid; (+02:00) Europe/Malta; (+02:00) Europe/Oslo; (+02:00) Europe/Prague; (+02:00) Europe/Rome; (+02:00) Europe/Stockholm; (+02:00) Europe/Vaduz; (+02:00) Europe/Vienna; (+02:00) Europe/Warsaw; (+02:00) Europe/Zagreb; (+02:00) Europe/Zurich; (+03:00) Asia/Famagusta; (+03:00) Asia/Nicosia; (+03:00) Europe/Athens; (+03:00) Europe/Bucharest; (+03:00) Europe/Helsinki; (+03:00) Europe/Kirov; (+03:00) Europe/Moscow; (+03:00) Europe/Riga; (+03:00) Europe/Simferopol; (+03:00) Europe/Sofia; (+03:00) Europe/Tallinn; (+03:00) Europe/Vilnius; (+03:00) Europe/Volgograd; (+04:00) Asia/Dubai; (+04:00) Europe/Astrakhan; (+04:00) Europe/Samara; (+04:00) Europe/Saratov; (+04:00) Europe/Ulyanovsk; (+05:00) Asia/Yekaterinburg; (+05:30) Asia/Kolkata; (+06:00) Asia/Omsk; (+07:00) Asia/Barnaul; (+07:00) Asia/Krasnoyarsk; (+07:00) Asia/Novokuznetsk; (+07:00) Asia/Novosibirsk; (+07:00) Asia/Tomsk; (+08:00) Asia/Hong_Kong; (+08:00) Asia/Irkutsk; (+08:00) Australia/Perth; (+08:45) Australia/Eucla; (+09:00) Asia/Chita; (+09:00) Asia/Khandyga; (+09:00) Asia/Yakutsk; (+09:30) Australia/Adelaide; (+09:30) Australia/Broken_Hill; (+09:30) Australia/Darwin; (+10:00) Antarctica/Macquarie; (+10:00) Asia/Ust-Nera
- Option group 2: menu was present but could not be read reliably without risking a state change.
- Option group 3: Mark as unpaid; Cancel reservations
- Option group 4: Always show spots remaining; Only show when at or below

**Settings links**

- Settings: `/dashboard/settings`
- advanced booking windows: `/dashboard/settings/booking-windows`
- Payment method types: `/dashboard/settings/offline-payment-types`

### tab:Write

**Visible text**

- General Business Settings
- Save changes
- General Settings
- Logo, timezone, email body, cancellation policy, and shipping
- Brand logo
- Replace
- Email timezone settings
- Confirmation emails will display this timezone
- (-03:00) America/Argentina/Salta
- Date/time formats
- Choose how dates and times appear to your clients
- English (United Kingdom)
- Condensed
- Sat, 18 Jul 2026, 07:45
- Verbose
- 18 July 2026 at 07:45
- Date condensed
- 18 July 2026
- Weekday date
- Saturday 18 Jul
- Month day year
- 18 Jul 2026
- Month day
- 18 July
- Date
- 18/07/2026
- Day abbr
- Sat
- Time
- 07:45
- America/Argentina/Salta
- Confirmation email body
- H1
- H3
- </>
- Write
- Preview
- Hi!
- Thank you for booking with us.
- Our cancellation policy is as follows
- Thank you!
- HTML is canonical; Markdown is exported via Turndown for APIs & docs.
- Copy HTML
- Copy Markdown
- Cancellation policy
- advanced booking windows
- hours
- Late cancel / no show policy overview
- This policy will be shown to the customer before they book
- Terms & Conditions: Classes
- Classes are always subject to availability but we will always do our best to accommodate you in your chosen class.
- All classes must be prepaid and all clients agree to our 12hr notice policy when cancelling and/or rescheduling. If you’re booked into a class, but miss it or cancel with less than 12 hours’ notice, you will be charged for it.
- Out of consideration for the Trainer and other Clients, and also for your own safety (the warm-up is an important aspect of each class) please be aware that if you are more than 10 minutes late for a class, you will not be able to train.
- Statutory Rights and Refunds and Cancellation
- Classes are sold individually, and in Packs of 5, 10, 20, 30 and 100 or such other combinations as El Estudio Pilates Boutique may introduce from time to time. Blocks of classes may be shared by arrangement. Class fees are non refundable.
- Class fees may be increased by El Estudio Pilates Boutique at any time. The Proprietor shall give Clients not less than 14 days notice prior to any such increases. The Pilates Intro Pack is valid for 30 days before the first reservation.
- The rights of cancellation and refund and any limitation expressed in these terms and conditions do not affect your statutory rights as a consumer. Refunds in relation to Products or Services may only be credited to the credit or debit card originally used to make the purchase. An administration fee of £80.00 is applicable and 3% of the return balance for payment gateway expenses.
- Remember late cancel policy agreement
- When enabled, clients only need to agree to the cancellation policy once; after agreeing, the checkbox will be hidden on future checkouts
- Waiver of liability
- Important Liability Statement
- The information available on or through this site, and the Services supplied via or in connection with this site or at any «El Estudio Pilates Boutique» do not constitute medical advice and it is your responsibility to determine, through obtaining appropriate medical advice, that you are fit and well and that such contents and services are suitable for you. It is not our responsibility to do so. Before commencing any exercise regime, you should consult your doctor.
- It is also vital that you supply us with correct information about yourself. We cannot be liable for any incorrect information supplied by you to us. We try to make sure that all information contained on this site (and provided by us to you as part of any Services or Products) is correct, but, subject to the paragraph below, we do not accept any liability for any error or omission and exclude all liability for any action you (your legal representatives, heirs) may take or loss or injury you may suffer (direct or indirect including loss of pay, profit, opportunity or time, pain and suffering, any indirect, consequential or special loss, however arising) as a result of relying on any information on this site or provided through any Service supplied by us to you.
- You, your legal representatives and your heirs release, waive, discharge and covenant, not to sue «El Estudio Pilates Boutique» and its instructors for any injury or death caused by their negligence or other acts.
- Reset waiver for all clients
- This will clear all signed waivers and agreements, requiring every client to re-sign before their next booking
- Reset
- Flat rate shipping price
- How much you will charge for shipping items
- £
- Subscription & Payment Settings
- Manage subscription behavior, payment methods, and refund policies
- Block booking when subscription fails
- Check this box if you would like to block booking with a subscription when the subscription fails
- Add action on subscription cancellation
- Check this box if you would like to add an action on subscription cancellation
- Action on subscription cancellation
- Choose what happens to existing reservations when a subscription is canceled
- Mark as unpaid
- Enable pay with account
- When enabled, clients can choose to pay with their account balance at checkout; this option is not available for subscriptions and may result in a negative balance to the account, which can be paid off later
- Enable refund with account credit
- When enabled, dollar amounts will be refunded with account credit instead of returning to the client's payment method
- Enable tipping in point of sale
- When enabled, customers will see tip options during checkout at the point of sale
- Custom payment method types
- Payment method types
- Ask for payment method
- When enabled, customers with active memberships will be prompted to add a payment method, in the mobile app only, if they don't have one on file
- Location-based tax from client's default location
- When enabled, checkout from the booking widget or branded app uses the client's default location to calculate location-based tax when the cart isn't tied to a specific location
- Allow recurring classes without payment method
- When enabled, clients can create recurring class bookings even if they don't have a payment method on file
- Allow recurring pricing option repurchase
- When enabled, staff can repurchase the same recurring pricing option for a client even if they already have an active or recently purchased instance
- Make revenue category mandatory for each offering
- When enabled, partners must select a revenue category when creating or editing pricing options and service types
- Community pack credits
- When enabled, class packs can be configured to grant community enrollments; purchasing a bundle containing such a pack at community checkout will auto-redeem one credit
- Reservation Management
- Unpaid reservation handling, double booking, and spot visibility
- Enable unpaid reservation resolver
- Check this box if you would like Arketa to automatically resolve unpaid reservations. The resolver retries from 3 days before class, but only charges or cancels within 6 hours of the class start time, rechecking roughly every 2 hours. Because it acts only inside that final 6-hour window, resolution is not guaranteed to complete before class.
- Block double booking
- When enabled, clients will not be able to book the same class twice on the widget or app. Staff can still override this when booking through the dashboard.
- Limit clients to one device at a time
- When a client signs in on a new device, sign them out of all previous devices. Reduces account sharing for on-demand video and community access. Does not apply to staff.
- Show spots remaining
- When enabled, the 'spots remaining' information will be shown on the class checkout experience
- Always show spots remaining
- Enable multiple credits required for booking
- This allows you to set a specific number of credits required for booking classes, appointments, and events
- Use package price when pack booking has no payment record
- If a class booking from a pack has no Stripe payment or order on file, use the package offering price (per credit) for revenue in reports and exports; enable for legacy pack bookings or when you need payroll or sales totals without stored payment data
- Check-in Settings
- Configure client check-in methods, gym access, and barcode scanning
- Enable client check-in
- This enables various check-in methods within your dashboard
- Enable auto check-in from email
- Automatically check in clients when they click the livestream link in the confirmation email within 30 minutes before or after the class start time
- Allow check-in for unpaid reservations
- When enabled, allows checking in clients with unpaid reservations without requiring payment to be resolved first
- Show instructor milestones on check-in
- Also show the with-this-instructor milestone count on the class check-in roster. The studio-wide milestone always shows regardless of this setting.
- Communication Settings
- Email notifications, messaging, and unsubscribe options
- Enable one-click unsubscribe for transactional emails
- This will add a one-click unsubscribe link to all transactional emails sent to clients
- Enable group messaging
- When enabled, allows partners and clients to create and participate in group conversations within the inbox and the branded mobile app
- Disable confirmation emails (group classes)
- Disable receiving a notification for each booking; clients will still be notified
- Disable confirmation emails (appointment booking)
- Disable receiving a notification for each appointment booking; clients will still be notified
- Disable confirmation emails (purchases)
- Disable receiving a notification for each purchase; clients will still be notified
- Skip duplicate email aliases in marketing sends
- When on, broadcast emails skip recipients whose canonical email (e.g. josh+guest@) duplicates another recipient in the same send. Prevents sending multiple copies to family-account aliases.
- Client Experience Settings
- Guest booking, location prompts, room names, and profile display
- Enable book for a guest
- Check this box if you would like clients to book for their friends. By checking this box your clients will be able to purchase a drop-in for guests. Please update each of your packages/subscriptions to allow clients to use these pricing options for guests
- Apply member discounts to guest bookings
- When enabled, member tier or member discounts can apply when the member books for a guest. Off by default; non-member promo codes are unaffected
- Enable guest passes for gym check-in
- Allow guest pass configuration on pricing options for front-desk gym check-in. Members can use guest passes at check-in without enabling app-based guest booking
- Enable purchasing communities for guests
- When enabled, clients can purchase communities multiple times for their guests or family members. This allows account holders to buy access for others they know
- Prompt clients for default location in branded app
- Check this box if you would like clients to be prompted to select a default location in the branded app if you have multiple locations
- Client records
- Check this box if you would like to keep track of your clients' records
- Show room name to clients
- When enabled, clients will see the name of the room after booking a class, helping them know where to go in your location
- Timezone display
- Enable to show session times in the local timezone, including the timezone abbreviation
- Show client profile images
- When enabled, client profile images will be displayed in check-in screens
- Legal & Compliance Settings
- Waivers, tax configuration, and agreement terms
- Enable signed liability waiver
- This will require clients to sign a liability waiver before booking. By disabling this clients will not have to sign, but rather will only have to click a checkbox
- Tax-inclusive pricing
- When enabled (tax-inclusive), the displayed price includes tax. For example, if a class costs $100 and tax is 10%, the displayed price will be $100 (tax included).
- When disabled (tax-exclusive), tax will be added on top of the displayed price. For example, if a class costs $100 and tax is 10%, the displayed price will be $100 + $10 tax.
- Enable signed agreement terms
- When enabled, clients will be required to sign agreement terms before booking across the application
- Staff & Access Settings
- Time clock, shift scheduling, and front desk permissions
- Enable time clock
- This will require all hourly employees to manually clock in when they start their shift and clock out when they complete their shift
- Enable shift scheduling
- When enabled, your team can use shift scheduling in the dashboard (subject to role permissions)
- Disable Front Desk & Guest team members from adding clients as free or unpaid
- When enabled, the 'Front desk' and 'Guest' Team Member roles will not be able to add clients to classes as free nor unpaid

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Save changes | available |  |
| button | Replace | available |  |
| button | Remove image | available |  |
| input:file | [unlabelled] | available |  |
| combobox | (-03:00) America/Argentina/Salta | available |  |
| combobox | English (United Kingdom) | available |  |
| button | Bold | available |  |
| button | Italic | available |  |
| button | Strikethrough | available |  |
| button | Underline | available |  |
| button | Inline code | available |  |
| button | Heading 1 | available |  |
| button | Heading 2 | available |  |
| button | Heading 3 | available |  |
| button | Bullet list | available |  |
| button | Numbered list | available |  |
| button | Checklist | available |  |
| button | Quote | available |  |
| button | Align left | available |  |
| button | Align center | available |  |
| button | Align right | available |  |
| button | Justify | available |  |
| button | Link | available |  |
| button | Code block | available |  |
| button | Horizontal rule | available |  |
| button | Undo | disabled |  |
| button | Redo | disabled |  |
| tab | WriteWrite | available |  |
| tab | PreviewPreview | available |  |
| button | Copy HTML | available |  |
| button | Copy Markdown | available |  |
| input:number | [unlabelled] | value configured |  |
| switch | [unlabelled] | available |  |
| button | Copy waiver link | available |  |
| button | Reset | available |  |
| combobox | Mark as unpaid | available |  |
| combobox | Always show spots remaining | available |  |

**Opened select/dropdown options**

- Option group 1: (-10:00) Pacific/Honolulu; (-09:00) America/Adak; (-08:00) America/Anchorage; (-08:00) America/Juneau; (-08:00) America/Metlakatla; (-08:00) America/Nome; (-08:00) America/Sitka; (-08:00) America/Yakutat; (-07:00) America/Creston; (-07:00) America/Dawson; (-07:00) America/Dawson_Creek; (-07:00) America/Fort_Nelson; (-07:00) America/Hermosillo; (-07:00) America/Los_Angeles; (-07:00) America/Mazatlan; (-07:00) America/Phoenix; (-07:00) America/Tijuana; (-07:00) America/Vancouver; (-07:00) America/Whitehorse; (-06:00) America/Bahia_Banderas; (-06:00) America/Boise; (-06:00) America/Cambridge_Bay; (-06:00) America/Chihuahua; (-06:00) America/Ciudad_Juarez; (-06:00) America/Denver; (-06:00) America/Edmonton; (-06:00) America/Inuvik; (-06:00) America/Merida; (-06:00) America/Mexico_City; (-06:00) America/Monterrey; (-06:00) America/Regina; (-06:00) America/Swift_Current; (-05:00) America/Atikokan; (-05:00) America/Cancun; (-05:00) America/Chicago; (-05:00) America/Indiana/Knox; (-05:00) America/Indiana/Tell_City; (-05:00) America/Matamoros; (-05:00) America/Menominee; (-05:00) America/North_Dakota/Beulah; (-05:00) America/North_Dakota/Center; (-05:00) America/North_Dakota/New_Salem; (-05:00) America/Ojinaga; (-05:00) America/Panama; (-05:00) America/Rankin_Inlet; (-05:00) America/Resolute; (-05:00) America/Winnipeg; (-04:00) America/Blanc-Sablon; (-04:00) America/Detroit; (-04:00) America/Indiana/Indianapolis; (-04:00) America/Indiana/Marengo; (-04:00) America/Indiana/Petersburg; (-04:00) America/Indiana/Vevay; (-04:00) America/Indiana/Vincennes; (-04:00) America/Indiana/Winamac; (-04:00) America/Iqaluit; (-04:00) America/Kentucky/Louisville; (-04:00) America/Kentucky/Monticello; (-04:00) America/New_York; (-04:00) America/Puerto_Rico; (-04:00) America/Toronto; (-03:00) America/Argentina/Buenos_Aires; (-03:00) America/Argentina/Catamarca; (-03:00) America/Argentina/Cordoba; (-03:00) America/Argentina/Jujuy; (-03:00) America/Argentina/La_Rioja; (-03:00) America/Argentina/Mendoza; (-03:00) America/Argentina/Rio_Gallegos; (-03:00) America/Argentina/Salta; (-03:00) America/Argentina/San_Juan; (-03:00) America/Argentina/San_Luis; (-03:00) America/Argentina/Tucuman; (-03:00) America/Argentina/Ushuaia; (-03:00) America/Glace_Bay; (-03:00) America/Goose_Bay; (-03:00) America/Halifax; (-03:00) America/Moncton; (-02:30) America/St_Johns; (+00:00) Africa/Abidjan; (+00:00) Atlantic/Azores; (+00:00) Atlantic/Reykjavik; (+01:00) Atlantic/Canary; (+01:00) Atlantic/Madeira; (+01:00) Europe/Dublin; (+01:00) Europe/Lisbon; (+01:00) Europe/London; (+02:00) Africa/Ceuta; (+02:00) Africa/Johannesburg; (+02:00) Africa/Lusaka; (+02:00) Africa/Maputo; (+02:00) Europe/Amsterdam; (+02:00) Europe/Belgrade; (+02:00) Europe/Berlin; (+02:00) Europe/Bratislava; (+02:00) Europe/Brussels; (+02:00) Europe/Budapest; (+02:00) Europe/Busingen; (+02:00) Europe/Copenhagen; (+02:00) Europe/Kaliningrad; (+02:00) Europe/Ljubljana; (+02:00) Europe/Luxembourg; (+02:00) Europe/Madrid; (+02:00) Europe/Malta; (+02:00) Europe/Oslo; (+02:00) Europe/Prague; (+02:00) Europe/Rome; (+02:00) Europe/Stockholm; (+02:00) Europe/Vaduz; (+02:00) Europe/Vienna; (+02:00) Europe/Warsaw; (+02:00) Europe/Zagreb; (+02:00) Europe/Zurich; (+03:00) Asia/Famagusta; (+03:00) Asia/Nicosia; (+03:00) Europe/Athens; (+03:00) Europe/Bucharest; (+03:00) Europe/Helsinki; (+03:00) Europe/Kirov; (+03:00) Europe/Moscow; (+03:00) Europe/Riga; (+03:00) Europe/Simferopol; (+03:00) Europe/Sofia; (+03:00) Europe/Tallinn; (+03:00) Europe/Vilnius; (+03:00) Europe/Volgograd; (+04:00) Asia/Dubai; (+04:00) Europe/Astrakhan; (+04:00) Europe/Samara; (+04:00) Europe/Saratov; (+04:00) Europe/Ulyanovsk; (+05:00) Asia/Yekaterinburg; (+05:30) Asia/Kolkata; (+06:00) Asia/Omsk; (+07:00) Asia/Barnaul; (+07:00) Asia/Krasnoyarsk; (+07:00) Asia/Novokuznetsk; (+07:00) Asia/Novosibirsk; (+07:00) Asia/Tomsk; (+08:00) Asia/Hong_Kong; (+08:00) Asia/Irkutsk; (+08:00) Australia/Perth; (+08:45) Australia/Eucla; (+09:00) Asia/Chita; (+09:00) Asia/Khandyga; (+09:00) Asia/Yakutsk; (+09:30) Australia/Adelaide; (+09:30) Australia/Broken_Hill; (+09:30) Australia/Darwin; (+10:00) Antarctica/Macquarie; (+10:00) Asia/Ust-Nera
- Option group 2: menu was present but could not be read reliably without risking a state change.
- Option group 3: Mark as unpaid; Cancel reservations
- Option group 4: Always show spots remaining; Only show when at or below

**Settings links**

- Settings: `/dashboard/settings`
- advanced booking windows: `/dashboard/settings/booking-windows`
- Payment method types: `/dashboard/settings/offline-payment-types`

### tab:Preview

**Visible text**

- General Business Settings
- Save changes
- General Settings
- Logo, timezone, email body, cancellation policy, and shipping
- Brand logo
- Replace
- Email timezone settings
- Confirmation emails will display this timezone
- (-04:00) America/Indiana/Petersburg
- Date/time formats
- Choose how dates and times appear to your clients
- English (United Kingdom)
- Condensed
- Sat, 18 Jul 2026, 06:45
- Verbose
- 18 July 2026 at 06:45
- Date condensed
- 18 July 2026
- Weekday date
- Saturday 18 Jul
- Month day year
- 18 Jul 2026
- Month day
- 18 July
- Date
- 18/07/2026
- Day abbr
- Sat
- Time
- 06:45
- America/Indiana/Petersburg
- Confirmation email body
- H1
- H3
- </>
- Write
- Preview
- Hi!
- Thank you for booking with us.
- Our cancellation policy is as follows
- Thank you!
- HTML is canonical; Markdown is exported via Turndown for APIs & docs.
- Copy HTML
- Copy Markdown
- Cancellation policy
- advanced booking windows
- hours
- Late cancel / no show policy overview
- This policy will be shown to the customer before they book
- Terms & Conditions: Classes
- Classes are always subject to availability but we will always do our best to accommodate you in your chosen class.
- All classes must be prepaid and all clients agree to our 12hr notice policy when cancelling and/or rescheduling. If you’re booked into a class, but miss it or cancel with less than 12 hours’ notice, you will be charged for it.
- Out of consideration for the Trainer and other Clients, and also for your own safety (the warm-up is an important aspect of each class) please be aware that if you are more than 10 minutes late for a class, you will not be able to train.
- Statutory Rights and Refunds and Cancellation
- Classes are sold individually, and in Packs of 5, 10, 20, 30 and 100 or such other combinations as El Estudio Pilates Boutique may introduce from time to time. Blocks of classes may be shared by arrangement. Class fees are non refundable.
- Class fees may be increased by El Estudio Pilates Boutique at any time. The Proprietor shall give Clients not less than 14 days notice prior to any such increases. The Pilates Intro Pack is valid for 30 days before the first reservation.
- The rights of cancellation and refund and any limitation expressed in these terms and conditions do not affect your statutory rights as a consumer. Refunds in relation to Products or Services may only be credited to the credit or debit card originally used to make the purchase. An administration fee of £80.00 is applicable and 3% of the return balance for payment gateway expenses.
- Remember late cancel policy agreement
- When enabled, clients only need to agree to the cancellation policy once; after agreeing, the checkbox will be hidden on future checkouts
- Waiver of liability
- Important Liability Statement
- The information available on or through this site, and the Services supplied via or in connection with this site or at any «El Estudio Pilates Boutique» do not constitute medical advice and it is your responsibility to determine, through obtaining appropriate medical advice, that you are fit and well and that such contents and services are suitable for you. It is not our responsibility to do so. Before commencing any exercise regime, you should consult your doctor.
- It is also vital that you supply us with correct information about yourself. We cannot be liable for any incorrect information supplied by you to us. We try to make sure that all information contained on this site (and provided by us to you as part of any Services or Products) is correct, but, subject to the paragraph below, we do not accept any liability for any error or omission and exclude all liability for any action you (your legal representatives, heirs) may take or loss or injury you may suffer (direct or indirect including loss of pay, profit, opportunity or time, pain and suffering, any indirect, consequential or special loss, however arising) as a result of relying on any information on this site or provided through any Service supplied by us to you.
- You, your legal representatives and your heirs release, waive, discharge and covenant, not to sue «El Estudio Pilates Boutique» and its instructors for any injury or death caused by their negligence or other acts.
- Reset waiver for all clients
- This will clear all signed waivers and agreements, requiring every client to re-sign before their next booking
- Reset
- Flat rate shipping price
- How much you will charge for shipping items
- £
- Subscription & Payment Settings
- Manage subscription behavior, payment methods, and refund policies
- Block booking when subscription fails
- Check this box if you would like to block booking with a subscription when the subscription fails
- Add action on subscription cancellation
- Check this box if you would like to add an action on subscription cancellation
- Action on subscription cancellation
- Choose what happens to existing reservations when a subscription is canceled
- Mark as unpaid
- Enable pay with account
- When enabled, clients can choose to pay with their account balance at checkout; this option is not available for subscriptions and may result in a negative balance to the account, which can be paid off later
- Enable refund with account credit
- When enabled, dollar amounts will be refunded with account credit instead of returning to the client's payment method
- Enable tipping in point of sale
- When enabled, customers will see tip options during checkout at the point of sale
- Custom payment method types
- Payment method types
- Ask for payment method
- When enabled, customers with active memberships will be prompted to add a payment method, in the mobile app only, if they don't have one on file
- Location-based tax from client's default location
- When enabled, checkout from the booking widget or branded app uses the client's default location to calculate location-based tax when the cart isn't tied to a specific location
- Allow recurring classes without payment method
- When enabled, clients can create recurring class bookings even if they don't have a payment method on file
- Allow recurring pricing option repurchase
- When enabled, staff can repurchase the same recurring pricing option for a client even if they already have an active or recently purchased instance
- Make revenue category mandatory for each offering
- When enabled, partners must select a revenue category when creating or editing pricing options and service types
- Community pack credits
- When enabled, class packs can be configured to grant community enrollments; purchasing a bundle containing such a pack at community checkout will auto-redeem one credit
- Reservation Management
- Unpaid reservation handling, double booking, and spot visibility
- Enable unpaid reservation resolver
- Check this box if you would like Arketa to automatically resolve unpaid reservations. The resolver retries from 3 days before class, but only charges or cancels within 6 hours of the class start time, rechecking roughly every 2 hours. Because it acts only inside that final 6-hour window, resolution is not guaranteed to complete before class.
- Block double booking
- When enabled, clients will not be able to book the same class twice on the widget or app. Staff can still override this when booking through the dashboard.
- Limit clients to one device at a time
- When a client signs in on a new device, sign them out of all previous devices. Reduces account sharing for on-demand video and community access. Does not apply to staff.
- Show spots remaining
- When enabled, the 'spots remaining' information will be shown on the class checkout experience
- Always show spots remaining
- Enable multiple credits required for booking
- This allows you to set a specific number of credits required for booking classes, appointments, and events
- Use package price when pack booking has no payment record
- If a class booking from a pack has no Stripe payment or order on file, use the package offering price (per credit) for revenue in reports and exports; enable for legacy pack bookings or when you need payroll or sales totals without stored payment data
- Check-in Settings
- Configure client check-in methods, gym access, and barcode scanning
- Enable client check-in
- This enables various check-in methods within your dashboard
- Enable auto check-in from email
- Automatically check in clients when they click the livestream link in the confirmation email within 30 minutes before or after the class start time
- Allow check-in for unpaid reservations
- When enabled, allows checking in clients with unpaid reservations without requiring payment to be resolved first
- Show instructor milestones on check-in
- Also show the with-this-instructor milestone count on the class check-in roster. The studio-wide milestone always shows regardless of this setting.
- Communication Settings
- Email notifications, messaging, and unsubscribe options
- Enable one-click unsubscribe for transactional emails
- This will add a one-click unsubscribe link to all transactional emails sent to clients
- Enable group messaging
- When enabled, allows partners and clients to create and participate in group conversations within the inbox and the branded mobile app
- Disable confirmation emails (group classes)
- Disable receiving a notification for each booking; clients will still be notified
- Disable confirmation emails (appointment booking)
- Disable receiving a notification for each appointment booking; clients will still be notified
- Disable confirmation emails (purchases)
- Disable receiving a notification for each purchase; clients will still be notified
- Skip duplicate email aliases in marketing sends
- When on, broadcast emails skip recipients whose canonical email (e.g. josh+guest@) duplicates another recipient in the same send. Prevents sending multiple copies to family-account aliases.
- Client Experience Settings
- Guest booking, location prompts, room names, and profile display
- Enable book for a guest
- Check this box if you would like clients to book for their friends. By checking this box your clients will be able to purchase a drop-in for guests. Please update each of your packages/subscriptions to allow clients to use these pricing options for guests
- Apply member discounts to guest bookings
- When enabled, member tier or member discounts can apply when the member books for a guest. Off by default; non-member promo codes are unaffected
- Enable guest passes for gym check-in
- Allow guest pass configuration on pricing options for front-desk gym check-in. Members can use guest passes at check-in without enabling app-based guest booking
- Enable purchasing communities for guests
- When enabled, clients can purchase communities multiple times for their guests or family members. This allows account holders to buy access for others they know
- Prompt clients for default location in branded app
- Check this box if you would like clients to be prompted to select a default location in the branded app if you have multiple locations
- Client records
- Check this box if you would like to keep track of your clients' records
- Show room name to clients
- When enabled, clients will see the name of the room after booking a class, helping them know where to go in your location
- Timezone display
- Enable to show session times in the local timezone, including the timezone abbreviation
- Show client profile images
- When enabled, client profile images will be displayed in check-in screens
- Legal & Compliance Settings
- Waivers, tax configuration, and agreement terms
- Enable signed liability waiver
- This will require clients to sign a liability waiver before booking. By disabling this clients will not have to sign, but rather will only have to click a checkbox
- Tax-inclusive pricing
- When enabled (tax-inclusive), the displayed price includes tax. For example, if a class costs $100 and tax is 10%, the displayed price will be $100 (tax included).
- When disabled (tax-exclusive), tax will be added on top of the displayed price. For example, if a class costs $100 and tax is 10%, the displayed price will be $100 + $10 tax.
- Enable signed agreement terms
- When enabled, clients will be required to sign agreement terms before booking across the application
- Staff & Access Settings
- Time clock, shift scheduling, and front desk permissions
- Enable time clock
- This will require all hourly employees to manually clock in when they start their shift and clock out when they complete their shift
- Enable shift scheduling
- When enabled, your team can use shift scheduling in the dashboard (subject to role permissions)
- Disable Front Desk & Guest team members from adding clients as free or unpaid
- When enabled, the 'Front desk' and 'Guest' Team Member roles will not be able to add clients to classes as free nor unpaid

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Save changes | available |  |
| button | Replace | available |  |
| button | Remove image | available |  |
| input:file | [unlabelled] | available |  |
| combobox | (-04:00) America/Indiana/Petersburg | available |  |
| combobox | English (United Kingdom) | available |  |
| button | Bold | available |  |
| button | Italic | available |  |
| button | Strikethrough | available |  |
| button | Underline | available |  |
| button | Inline code | available |  |
| button | Heading 1 | available |  |
| button | Heading 2 | available |  |
| button | Heading 3 | available |  |
| button | Bullet list | available |  |
| button | Numbered list | available |  |
| button | Checklist | available |  |
| button | Quote | available |  |
| button | Align left | available |  |
| button | Align center | available |  |
| button | Align right | available |  |
| button | Justify | available |  |
| button | Link | available |  |
| button | Code block | available |  |
| button | Horizontal rule | available |  |
| button | Undo | disabled |  |
| button | Redo | disabled |  |
| tab | WriteWrite | available |  |
| tab | PreviewPreview | available |  |
| button | Copy HTML | available |  |
| button | Copy Markdown | available |  |
| input:number | [unlabelled] | value configured |  |
| switch | [unlabelled] | available |  |
| button | Copy waiver link | available |  |
| button | Reset | available |  |
| combobox | Mark as unpaid | available |  |
| combobox | Always show spots remaining | available |  |

**Opened select/dropdown options**

- Option group 1: (-10:00) Pacific/Honolulu; (-09:00) America/Adak; (-08:00) America/Anchorage; (-08:00) America/Juneau; (-08:00) America/Metlakatla; (-08:00) America/Nome; (-08:00) America/Sitka; (-08:00) America/Yakutat; (-07:00) America/Creston; (-07:00) America/Dawson; (-07:00) America/Dawson_Creek; (-07:00) America/Fort_Nelson; (-07:00) America/Hermosillo; (-07:00) America/Los_Angeles; (-07:00) America/Mazatlan; (-07:00) America/Phoenix; (-07:00) America/Tijuana; (-07:00) America/Vancouver; (-07:00) America/Whitehorse; (-06:00) America/Bahia_Banderas; (-06:00) America/Boise; (-06:00) America/Cambridge_Bay; (-06:00) America/Chihuahua; (-06:00) America/Ciudad_Juarez; (-06:00) America/Denver; (-06:00) America/Edmonton; (-06:00) America/Inuvik; (-06:00) America/Merida; (-06:00) America/Mexico_City; (-06:00) America/Monterrey; (-06:00) America/Regina; (-06:00) America/Swift_Current; (-05:00) America/Atikokan; (-05:00) America/Cancun; (-05:00) America/Chicago; (-05:00) America/Indiana/Knox; (-05:00) America/Indiana/Tell_City; (-05:00) America/Matamoros; (-05:00) America/Menominee; (-05:00) America/North_Dakota/Beulah; (-05:00) America/North_Dakota/Center; (-05:00) America/North_Dakota/New_Salem; (-05:00) America/Ojinaga; (-05:00) America/Panama; (-05:00) America/Rankin_Inlet; (-05:00) America/Resolute; (-05:00) America/Winnipeg; (-04:00) America/Blanc-Sablon; (-04:00) America/Detroit; (-04:00) America/Indiana/Indianapolis; (-04:00) America/Indiana/Marengo; (-04:00) America/Indiana/Petersburg; (-04:00) America/Indiana/Vevay; (-04:00) America/Indiana/Vincennes; (-04:00) America/Indiana/Winamac; (-04:00) America/Iqaluit; (-04:00) America/Kentucky/Louisville; (-04:00) America/Kentucky/Monticello; (-04:00) America/New_York; (-04:00) America/Puerto_Rico; (-04:00) America/Toronto; (-03:00) America/Argentina/Buenos_Aires; (-03:00) America/Argentina/Catamarca; (-03:00) America/Argentina/Cordoba; (-03:00) America/Argentina/Jujuy; (-03:00) America/Argentina/La_Rioja; (-03:00) America/Argentina/Mendoza; (-03:00) America/Argentina/Rio_Gallegos; (-03:00) America/Argentina/Salta; (-03:00) America/Argentina/San_Juan; (-03:00) America/Argentina/San_Luis; (-03:00) America/Argentina/Tucuman; (-03:00) America/Argentina/Ushuaia; (-03:00) America/Glace_Bay; (-03:00) America/Goose_Bay; (-03:00) America/Halifax; (-03:00) America/Moncton; (-02:30) America/St_Johns; (+00:00) Africa/Abidjan; (+00:00) Atlantic/Azores; (+00:00) Atlantic/Reykjavik; (+01:00) Atlantic/Canary; (+01:00) Atlantic/Madeira; (+01:00) Europe/Dublin; (+01:00) Europe/Lisbon; (+01:00) Europe/London; (+02:00) Africa/Ceuta; (+02:00) Africa/Johannesburg; (+02:00) Africa/Lusaka; (+02:00) Africa/Maputo; (+02:00) Europe/Amsterdam; (+02:00) Europe/Belgrade; (+02:00) Europe/Berlin; (+02:00) Europe/Bratislava; (+02:00) Europe/Brussels; (+02:00) Europe/Budapest; (+02:00) Europe/Busingen; (+02:00) Europe/Copenhagen; (+02:00) Europe/Kaliningrad; (+02:00) Europe/Ljubljana; (+02:00) Europe/Luxembourg; (+02:00) Europe/Madrid; (+02:00) Europe/Malta; (+02:00) Europe/Oslo; (+02:00) Europe/Prague; (+02:00) Europe/Rome; (+02:00) Europe/Stockholm; (+02:00) Europe/Vaduz; (+02:00) Europe/Vienna; (+02:00) Europe/Warsaw; (+02:00) Europe/Zagreb; (+02:00) Europe/Zurich; (+03:00) Asia/Famagusta; (+03:00) Asia/Nicosia; (+03:00) Europe/Athens; (+03:00) Europe/Bucharest; (+03:00) Europe/Helsinki; (+03:00) Europe/Kirov; (+03:00) Europe/Moscow; (+03:00) Europe/Riga; (+03:00) Europe/Simferopol; (+03:00) Europe/Sofia; (+03:00) Europe/Tallinn; (+03:00) Europe/Vilnius; (+03:00) Europe/Volgograd; (+04:00) Asia/Dubai; (+04:00) Europe/Astrakhan; (+04:00) Europe/Samara; (+04:00) Europe/Saratov; (+04:00) Europe/Ulyanovsk; (+05:00) Asia/Yekaterinburg; (+05:30) Asia/Kolkata; (+06:00) Asia/Omsk; (+07:00) Asia/Barnaul; (+07:00) Asia/Krasnoyarsk; (+07:00) Asia/Novokuznetsk; (+07:00) Asia/Novosibirsk; (+07:00) Asia/Tomsk; (+08:00) Asia/Hong_Kong; (+08:00) Asia/Irkutsk; (+08:00) Australia/Perth; (+08:45) Australia/Eucla; (+09:00) Asia/Chita; (+09:00) Asia/Khandyga; (+09:00) Asia/Yakutsk; (+09:30) Australia/Adelaide; (+09:30) Australia/Broken_Hill; (+09:30) Australia/Darwin; (+10:00) Antarctica/Macquarie; (+10:00) Asia/Ust-Nera
- Option group 2: menu was present but could not be read reliably without risking a state change.
- Option group 3: Mark as unpaid; Cancel reservations
- Option group 4: Always show spots remaining; Only show when at or below

**Settings links**

- Settings: `/dashboard/settings`
- advanced booking windows: `/dashboard/settings/booking-windows`
- Payment method types: `/dashboard/settings/offline-payment-types`

### tab:Write

**Visible text**

- General Business Settings
- Save changes
- General Settings
- Logo, timezone, email body, cancellation policy, and shipping
- Brand logo
- Replace
- Email timezone settings
- Confirmation emails will display this timezone
- (-05:00) America/Chicago
- Date/time formats
- Choose how dates and times appear to your clients
- English (United Kingdom)
- Condensed
- Sat, 18 Jul 2026, 05:45
- Verbose
- 18 July 2026 at 05:45
- Date condensed
- 18 July 2026
- Weekday date
- Saturday 18 Jul
- Month day year
- 18 Jul 2026
- Month day
- 18 July
- Date
- 18/07/2026
- Day abbr
- Sat
- Time
- 05:45
- America/Chicago
- Confirmation email body
- H1
- H3
- </>
- Write
- Preview
- Hi!
- Thank you for booking with us.
- Our cancellation policy is as follows
- Thank you!
- HTML is canonical; Markdown is exported via Turndown for APIs & docs.
- Copy HTML
- Copy Markdown
- Cancellation policy
- advanced booking windows
- hours
- Late cancel / no show policy overview
- This policy will be shown to the customer before they book
- Terms & Conditions: Classes
- Classes are always subject to availability but we will always do our best to accommodate you in your chosen class.
- All classes must be prepaid and all clients agree to our 12hr notice policy when cancelling and/or rescheduling. If you’re booked into a class, but miss it or cancel with less than 12 hours’ notice, you will be charged for it.
- Out of consideration for the Trainer and other Clients, and also for your own safety (the warm-up is an important aspect of each class) please be aware that if you are more than 10 minutes late for a class, you will not be able to train.
- Statutory Rights and Refunds and Cancellation
- Classes are sold individually, and in Packs of 5, 10, 20, 30 and 100 or such other combinations as El Estudio Pilates Boutique may introduce from time to time. Blocks of classes may be shared by arrangement. Class fees are non refundable.
- Class fees may be increased by El Estudio Pilates Boutique at any time. The Proprietor shall give Clients not less than 14 days notice prior to any such increases. The Pilates Intro Pack is valid for 30 days before the first reservation.
- The rights of cancellation and refund and any limitation expressed in these terms and conditions do not affect your statutory rights as a consumer. Refunds in relation to Products or Services may only be credited to the credit or debit card originally used to make the purchase. An administration fee of £80.00 is applicable and 3% of the return balance for payment gateway expenses.
- Remember late cancel policy agreement
- When enabled, clients only need to agree to the cancellation policy once; after agreeing, the checkbox will be hidden on future checkouts
- Waiver of liability
- Important Liability Statement
- The information available on or through this site, and the Services supplied via or in connection with this site or at any «El Estudio Pilates Boutique» do not constitute medical advice and it is your responsibility to determine, through obtaining appropriate medical advice, that you are fit and well and that such contents and services are suitable for you. It is not our responsibility to do so. Before commencing any exercise regime, you should consult your doctor.
- It is also vital that you supply us with correct information about yourself. We cannot be liable for any incorrect information supplied by you to us. We try to make sure that all information contained on this site (and provided by us to you as part of any Services or Products) is correct, but, subject to the paragraph below, we do not accept any liability for any error or omission and exclude all liability for any action you (your legal representatives, heirs) may take or loss or injury you may suffer (direct or indirect including loss of pay, profit, opportunity or time, pain and suffering, any indirect, consequential or special loss, however arising) as a result of relying on any information on this site or provided through any Service supplied by us to you.
- You, your legal representatives and your heirs release, waive, discharge and covenant, not to sue «El Estudio Pilates Boutique» and its instructors for any injury or death caused by their negligence or other acts.
- Reset waiver for all clients
- This will clear all signed waivers and agreements, requiring every client to re-sign before their next booking
- Reset
- Flat rate shipping price
- How much you will charge for shipping items
- £
- Subscription & Payment Settings
- Manage subscription behavior, payment methods, and refund policies
- Block booking when subscription fails
- Check this box if you would like to block booking with a subscription when the subscription fails
- Add action on subscription cancellation
- Check this box if you would like to add an action on subscription cancellation
- Action on subscription cancellation
- Choose what happens to existing reservations when a subscription is canceled
- Mark as unpaid
- Enable pay with account
- When enabled, clients can choose to pay with their account balance at checkout; this option is not available for subscriptions and may result in a negative balance to the account, which can be paid off later
- Enable refund with account credit
- When enabled, dollar amounts will be refunded with account credit instead of returning to the client's payment method
- Enable tipping in point of sale
- When enabled, customers will see tip options during checkout at the point of sale
- Custom payment method types
- Payment method types
- Ask for payment method
- When enabled, customers with active memberships will be prompted to add a payment method, in the mobile app only, if they don't have one on file
- Location-based tax from client's default location
- When enabled, checkout from the booking widget or branded app uses the client's default location to calculate location-based tax when the cart isn't tied to a specific location
- Allow recurring classes without payment method
- When enabled, clients can create recurring class bookings even if they don't have a payment method on file
- Allow recurring pricing option repurchase
- When enabled, staff can repurchase the same recurring pricing option for a client even if they already have an active or recently purchased instance
- Make revenue category mandatory for each offering
- When enabled, partners must select a revenue category when creating or editing pricing options and service types
- Community pack credits
- When enabled, class packs can be configured to grant community enrollments; purchasing a bundle containing such a pack at community checkout will auto-redeem one credit
- Reservation Management
- Unpaid reservation handling, double booking, and spot visibility
- Enable unpaid reservation resolver
- Check this box if you would like Arketa to automatically resolve unpaid reservations. The resolver retries from 3 days before class, but only charges or cancels within 6 hours of the class start time, rechecking roughly every 2 hours. Because it acts only inside that final 6-hour window, resolution is not guaranteed to complete before class.
- Block double booking
- When enabled, clients will not be able to book the same class twice on the widget or app. Staff can still override this when booking through the dashboard.
- Limit clients to one device at a time
- When a client signs in on a new device, sign them out of all previous devices. Reduces account sharing for on-demand video and community access. Does not apply to staff.
- Show spots remaining
- When enabled, the 'spots remaining' information will be shown on the class checkout experience
- Always show spots remaining
- Enable multiple credits required for booking
- This allows you to set a specific number of credits required for booking classes, appointments, and events
- Use package price when pack booking has no payment record
- If a class booking from a pack has no Stripe payment or order on file, use the package offering price (per credit) for revenue in reports and exports; enable for legacy pack bookings or when you need payroll or sales totals without stored payment data
- Check-in Settings
- Configure client check-in methods, gym access, and barcode scanning
- Enable client check-in
- This enables various check-in methods within your dashboard
- Enable auto check-in from email
- Automatically check in clients when they click the livestream link in the confirmation email within 30 minutes before or after the class start time
- Allow check-in for unpaid reservations
- When enabled, allows checking in clients with unpaid reservations without requiring payment to be resolved first
- Show instructor milestones on check-in
- Also show the with-this-instructor milestone count on the class check-in roster. The studio-wide milestone always shows regardless of this setting.
- Communication Settings
- Email notifications, messaging, and unsubscribe options
- Enable one-click unsubscribe for transactional emails
- This will add a one-click unsubscribe link to all transactional emails sent to clients
- Enable group messaging
- When enabled, allows partners and clients to create and participate in group conversations within the inbox and the branded mobile app
- Disable confirmation emails (group classes)
- Disable receiving a notification for each booking; clients will still be notified
- Disable confirmation emails (appointment booking)
- Disable receiving a notification for each appointment booking; clients will still be notified
- Disable confirmation emails (purchases)
- Disable receiving a notification for each purchase; clients will still be notified
- Skip duplicate email aliases in marketing sends
- When on, broadcast emails skip recipients whose canonical email (e.g. josh+guest@) duplicates another recipient in the same send. Prevents sending multiple copies to family-account aliases.
- Client Experience Settings
- Guest booking, location prompts, room names, and profile display
- Enable book for a guest
- Check this box if you would like clients to book for their friends. By checking this box your clients will be able to purchase a drop-in for guests. Please update each of your packages/subscriptions to allow clients to use these pricing options for guests
- Apply member discounts to guest bookings
- When enabled, member tier or member discounts can apply when the member books for a guest. Off by default; non-member promo codes are unaffected
- Enable guest passes for gym check-in
- Allow guest pass configuration on pricing options for front-desk gym check-in. Members can use guest passes at check-in without enabling app-based guest booking
- Enable purchasing communities for guests
- When enabled, clients can purchase communities multiple times for their guests or family members. This allows account holders to buy access for others they know
- Prompt clients for default location in branded app
- Check this box if you would like clients to be prompted to select a default location in the branded app if you have multiple locations
- Client records
- Check this box if you would like to keep track of your clients' records
- Show room name to clients
- When enabled, clients will see the name of the room after booking a class, helping them know where to go in your location
- Timezone display
- Enable to show session times in the local timezone, including the timezone abbreviation
- Show client profile images
- When enabled, client profile images will be displayed in check-in screens
- Legal & Compliance Settings
- Waivers, tax configuration, and agreement terms
- Enable signed liability waiver
- This will require clients to sign a liability waiver before booking. By disabling this clients will not have to sign, but rather will only have to click a checkbox
- Tax-inclusive pricing
- When enabled (tax-inclusive), the displayed price includes tax. For example, if a class costs $100 and tax is 10%, the displayed price will be $100 (tax included).
- When disabled (tax-exclusive), tax will be added on top of the displayed price. For example, if a class costs $100 and tax is 10%, the displayed price will be $100 + $10 tax.
- Enable signed agreement terms
- When enabled, clients will be required to sign agreement terms before booking across the application
- Staff & Access Settings
- Time clock, shift scheduling, and front desk permissions
- Enable time clock
- This will require all hourly employees to manually clock in when they start their shift and clock out when they complete their shift
- Enable shift scheduling
- When enabled, your team can use shift scheduling in the dashboard (subject to role permissions)
- Disable Front Desk & Guest team members from adding clients as free or unpaid
- When enabled, the 'Front desk' and 'Guest' Team Member roles will not be able to add clients to classes as free nor unpaid

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Save changes | available |  |
| button | Replace | available |  |
| button | Remove image | available |  |
| input:file | [unlabelled] | available |  |
| combobox | (-05:00) America/Chicago | available |  |
| combobox | English (United Kingdom) | available |  |
| button | Bold | available |  |
| button | Italic | available |  |
| button | Strikethrough | available |  |
| button | Underline | available |  |
| button | Inline code | available |  |
| button | Heading 1 | available |  |
| button | Heading 2 | available |  |
| button | Heading 3 | available |  |
| button | Bullet list | available |  |
| button | Numbered list | available |  |
| button | Checklist | available |  |
| button | Quote | available |  |
| button | Align left | available |  |
| button | Align center | available |  |
| button | Align right | available |  |
| button | Justify | available |  |
| button | Link | available |  |
| button | Code block | available |  |
| button | Horizontal rule | available |  |
| button | Undo | disabled |  |
| button | Redo | disabled |  |
| tab | WriteWrite | available |  |
| tab | PreviewPreview | available |  |
| button | Copy HTML | available |  |
| button | Copy Markdown | available |  |
| input:number | [unlabelled] | value configured |  |
| switch | [unlabelled] | available |  |
| button | Copy waiver link | available |  |
| button | Reset | available |  |
| combobox | Mark as unpaid | available |  |
| combobox | Always show spots remaining | available |  |

**Opened select/dropdown options**

- Option group 1: (-10:00) Pacific/Honolulu; (-09:00) America/Adak; (-08:00) America/Anchorage; (-08:00) America/Juneau; (-08:00) America/Metlakatla; (-08:00) America/Nome; (-08:00) America/Sitka; (-08:00) America/Yakutat; (-07:00) America/Creston; (-07:00) America/Dawson; (-07:00) America/Dawson_Creek; (-07:00) America/Fort_Nelson; (-07:00) America/Hermosillo; (-07:00) America/Los_Angeles; (-07:00) America/Mazatlan; (-07:00) America/Phoenix; (-07:00) America/Tijuana; (-07:00) America/Vancouver; (-07:00) America/Whitehorse; (-06:00) America/Bahia_Banderas; (-06:00) America/Boise; (-06:00) America/Cambridge_Bay; (-06:00) America/Chihuahua; (-06:00) America/Ciudad_Juarez; (-06:00) America/Denver; (-06:00) America/Edmonton; (-06:00) America/Inuvik; (-06:00) America/Merida; (-06:00) America/Mexico_City; (-06:00) America/Monterrey; (-06:00) America/Regina; (-06:00) America/Swift_Current; (-05:00) America/Atikokan; (-05:00) America/Cancun; (-05:00) America/Chicago; (-05:00) America/Indiana/Knox; (-05:00) America/Indiana/Tell_City; (-05:00) America/Matamoros; (-05:00) America/Menominee; (-05:00) America/North_Dakota/Beulah; (-05:00) America/North_Dakota/Center; (-05:00) America/North_Dakota/New_Salem; (-05:00) America/Ojinaga; (-05:00) America/Panama; (-05:00) America/Rankin_Inlet; (-05:00) America/Resolute; (-05:00) America/Winnipeg; (-04:00) America/Blanc-Sablon; (-04:00) America/Detroit; (-04:00) America/Indiana/Indianapolis; (-04:00) America/Indiana/Marengo; (-04:00) America/Indiana/Petersburg; (-04:00) America/Indiana/Vevay; (-04:00) America/Indiana/Vincennes; (-04:00) America/Indiana/Winamac; (-04:00) America/Iqaluit; (-04:00) America/Kentucky/Louisville; (-04:00) America/Kentucky/Monticello; (-04:00) America/New_York; (-04:00) America/Puerto_Rico; (-04:00) America/Toronto; (-03:00) America/Argentina/Buenos_Aires; (-03:00) America/Argentina/Catamarca; (-03:00) America/Argentina/Cordoba; (-03:00) America/Argentina/Jujuy; (-03:00) America/Argentina/La_Rioja; (-03:00) America/Argentina/Mendoza; (-03:00) America/Argentina/Rio_Gallegos; (-03:00) America/Argentina/Salta; (-03:00) America/Argentina/San_Juan; (-03:00) America/Argentina/San_Luis; (-03:00) America/Argentina/Tucuman; (-03:00) America/Argentina/Ushuaia; (-03:00) America/Glace_Bay; (-03:00) America/Goose_Bay; (-03:00) America/Halifax; (-03:00) America/Moncton; (-02:30) America/St_Johns; (+00:00) Africa/Abidjan; (+00:00) Atlantic/Azores; (+00:00) Atlantic/Reykjavik; (+01:00) Atlantic/Canary; (+01:00) Atlantic/Madeira; (+01:00) Europe/Dublin; (+01:00) Europe/Lisbon; (+01:00) Europe/London; (+02:00) Africa/Ceuta; (+02:00) Africa/Johannesburg; (+02:00) Africa/Lusaka; (+02:00) Africa/Maputo; (+02:00) Europe/Amsterdam; (+02:00) Europe/Belgrade; (+02:00) Europe/Berlin; (+02:00) Europe/Bratislava; (+02:00) Europe/Brussels; (+02:00) Europe/Budapest; (+02:00) Europe/Busingen; (+02:00) Europe/Copenhagen; (+02:00) Europe/Kaliningrad; (+02:00) Europe/Ljubljana; (+02:00) Europe/Luxembourg; (+02:00) Europe/Madrid; (+02:00) Europe/Malta; (+02:00) Europe/Oslo; (+02:00) Europe/Prague; (+02:00) Europe/Rome; (+02:00) Europe/Stockholm; (+02:00) Europe/Vaduz; (+02:00) Europe/Vienna; (+02:00) Europe/Warsaw; (+02:00) Europe/Zagreb; (+02:00) Europe/Zurich; (+03:00) Asia/Famagusta; (+03:00) Asia/Nicosia; (+03:00) Europe/Athens; (+03:00) Europe/Bucharest; (+03:00) Europe/Helsinki; (+03:00) Europe/Kirov; (+03:00) Europe/Moscow; (+03:00) Europe/Riga; (+03:00) Europe/Simferopol; (+03:00) Europe/Sofia; (+03:00) Europe/Tallinn; (+03:00) Europe/Vilnius; (+03:00) Europe/Volgograd; (+04:00) Asia/Dubai; (+04:00) Europe/Astrakhan; (+04:00) Europe/Samara; (+04:00) Europe/Saratov; (+04:00) Europe/Ulyanovsk; (+05:00) Asia/Yekaterinburg; (+05:30) Asia/Kolkata; (+06:00) Asia/Omsk; (+07:00) Asia/Barnaul; (+07:00) Asia/Krasnoyarsk; (+07:00) Asia/Novokuznetsk; (+07:00) Asia/Novosibirsk; (+07:00) Asia/Tomsk; (+08:00) Asia/Hong_Kong; (+08:00) Asia/Irkutsk; (+08:00) Australia/Perth; (+08:45) Australia/Eucla; (+09:00) Asia/Chita; (+09:00) Asia/Khandyga; (+09:00) Asia/Yakutsk; (+09:30) Australia/Adelaide; (+09:30) Australia/Broken_Hill; (+09:30) Australia/Darwin; (+10:00) Antarctica/Macquarie; (+10:00) Asia/Ust-Nera
- Option group 2: menu was present but could not be read reliably without risking a state change.
- Option group 3: Mark as unpaid; Cancel reservations
- Option group 4: Always show spots remaining; Only show when at or below

**Settings links**

- Settings: `/dashboard/settings`
- advanced booking windows: `/dashboard/settings/booking-windows`
- Payment method types: `/dashboard/settings/offline-payment-types`

### tab:Preview

**Visible text**

- General Business Settings
- Save changes
- General Settings
- Logo, timezone, email body, cancellation policy, and shipping
- Brand logo
- Replace
- Email timezone settings
- Confirmation emails will display this timezone
- (-07:00) America/Vancouver
- Date/time formats
- Choose how dates and times appear to your clients
- English (United Kingdom)
- Condensed
- Sat, 18 Jul 2026, 03:45
- Verbose
- 18 July 2026 at 03:45
- Date condensed
- 18 July 2026
- Weekday date
- Saturday 18 Jul
- Month day year
- 18 Jul 2026
- Month day
- 18 July
- Date
- 18/07/2026
- Day abbr
- Sat
- Time
- 03:45
- America/Vancouver
- Confirmation email body
- H1
- H3
- </>
- Write
- Preview
- Hi!
- Thank you for booking with us.
- Our cancellation policy is as follows
- Thank you!
- HTML is canonical; Markdown is exported via Turndown for APIs & docs.
- Copy HTML
- Copy Markdown
- Cancellation policy
- advanced booking windows
- hours
- Late cancel / no show policy overview
- This policy will be shown to the customer before they book
- Terms & Conditions: Classes
- Classes are always subject to availability but we will always do our best to accommodate you in your chosen class.
- All classes must be prepaid and all clients agree to our 12hr notice policy when cancelling and/or rescheduling. If you’re booked into a class, but miss it or cancel with less than 12 hours’ notice, you will be charged for it.
- Out of consideration for the Trainer and other Clients, and also for your own safety (the warm-up is an important aspect of each class) please be aware that if you are more than 10 minutes late for a class, you will not be able to train.
- Statutory Rights and Refunds and Cancellation
- Classes are sold individually, and in Packs of 5, 10, 20, 30 and 100 or such other combinations as El Estudio Pilates Boutique may introduce from time to time. Blocks of classes may be shared by arrangement. Class fees are non refundable.
- Class fees may be increased by El Estudio Pilates Boutique at any time. The Proprietor shall give Clients not less than 14 days notice prior to any such increases. The Pilates Intro Pack is valid for 30 days before the first reservation.
- The rights of cancellation and refund and any limitation expressed in these terms and conditions do not affect your statutory rights as a consumer. Refunds in relation to Products or Services may only be credited to the credit or debit card originally used to make the purchase. An administration fee of £80.00 is applicable and 3% of the return balance for payment gateway expenses.
- Remember late cancel policy agreement
- When enabled, clients only need to agree to the cancellation policy once; after agreeing, the checkbox will be hidden on future checkouts
- Waiver of liability
- Important Liability Statement
- The information available on or through this site, and the Services supplied via or in connection with this site or at any «El Estudio Pilates Boutique» do not constitute medical advice and it is your responsibility to determine, through obtaining appropriate medical advice, that you are fit and well and that such contents and services are suitable for you. It is not our responsibility to do so. Before commencing any exercise regime, you should consult your doctor.
- It is also vital that you supply us with correct information about yourself. We cannot be liable for any incorrect information supplied by you to us. We try to make sure that all information contained on this site (and provided by us to you as part of any Services or Products) is correct, but, subject to the paragraph below, we do not accept any liability for any error or omission and exclude all liability for any action you (your legal representatives, heirs) may take or loss or injury you may suffer (direct or indirect including loss of pay, profit, opportunity or time, pain and suffering, any indirect, consequential or special loss, however arising) as a result of relying on any information on this site or provided through any Service supplied by us to you.
- You, your legal representatives and your heirs release, waive, discharge and covenant, not to sue «El Estudio Pilates Boutique» and its instructors for any injury or death caused by their negligence or other acts.
- Reset waiver for all clients
- This will clear all signed waivers and agreements, requiring every client to re-sign before their next booking
- Reset
- Flat rate shipping price
- How much you will charge for shipping items
- £
- Subscription & Payment Settings
- Manage subscription behavior, payment methods, and refund policies
- Block booking when subscription fails
- Check this box if you would like to block booking with a subscription when the subscription fails
- Add action on subscription cancellation
- Check this box if you would like to add an action on subscription cancellation
- Action on subscription cancellation
- Choose what happens to existing reservations when a subscription is canceled
- Mark as unpaid
- Enable pay with account
- When enabled, clients can choose to pay with their account balance at checkout; this option is not available for subscriptions and may result in a negative balance to the account, which can be paid off later
- Enable refund with account credit
- When enabled, dollar amounts will be refunded with account credit instead of returning to the client's payment method
- Enable tipping in point of sale
- When enabled, customers will see tip options during checkout at the point of sale
- Custom payment method types
- Payment method types
- Ask for payment method
- When enabled, customers with active memberships will be prompted to add a payment method, in the mobile app only, if they don't have one on file
- Location-based tax from client's default location
- When enabled, checkout from the booking widget or branded app uses the client's default location to calculate location-based tax when the cart isn't tied to a specific location
- Allow recurring classes without payment method
- When enabled, clients can create recurring class bookings even if they don't have a payment method on file
- Allow recurring pricing option repurchase
- When enabled, staff can repurchase the same recurring pricing option for a client even if they already have an active or recently purchased instance
- Make revenue category mandatory for each offering
- When enabled, partners must select a revenue category when creating or editing pricing options and service types
- Community pack credits
- When enabled, class packs can be configured to grant community enrollments; purchasing a bundle containing such a pack at community checkout will auto-redeem one credit
- Reservation Management
- Unpaid reservation handling, double booking, and spot visibility
- Enable unpaid reservation resolver
- Check this box if you would like Arketa to automatically resolve unpaid reservations. The resolver retries from 3 days before class, but only charges or cancels within 6 hours of the class start time, rechecking roughly every 2 hours. Because it acts only inside that final 6-hour window, resolution is not guaranteed to complete before class.
- Block double booking
- When enabled, clients will not be able to book the same class twice on the widget or app. Staff can still override this when booking through the dashboard.
- Limit clients to one device at a time
- When a client signs in on a new device, sign them out of all previous devices. Reduces account sharing for on-demand video and community access. Does not apply to staff.
- Show spots remaining
- When enabled, the 'spots remaining' information will be shown on the class checkout experience
- Always show spots remaining
- Enable multiple credits required for booking
- This allows you to set a specific number of credits required for booking classes, appointments, and events
- Use package price when pack booking has no payment record
- If a class booking from a pack has no Stripe payment or order on file, use the package offering price (per credit) for revenue in reports and exports; enable for legacy pack bookings or when you need payroll or sales totals without stored payment data
- Check-in Settings
- Configure client check-in methods, gym access, and barcode scanning
- Enable client check-in
- This enables various check-in methods within your dashboard
- Enable auto check-in from email
- Automatically check in clients when they click the livestream link in the confirmation email within 30 minutes before or after the class start time
- Allow check-in for unpaid reservations
- When enabled, allows checking in clients with unpaid reservations without requiring payment to be resolved first
- Show instructor milestones on check-in
- Also show the with-this-instructor milestone count on the class check-in roster. The studio-wide milestone always shows regardless of this setting.
- Communication Settings
- Email notifications, messaging, and unsubscribe options
- Enable one-click unsubscribe for transactional emails
- This will add a one-click unsubscribe link to all transactional emails sent to clients
- Enable group messaging
- When enabled, allows partners and clients to create and participate in group conversations within the inbox and the branded mobile app
- Disable confirmation emails (group classes)
- Disable receiving a notification for each booking; clients will still be notified
- Disable confirmation emails (appointment booking)
- Disable receiving a notification for each appointment booking; clients will still be notified
- Disable confirmation emails (purchases)
- Disable receiving a notification for each purchase; clients will still be notified
- Skip duplicate email aliases in marketing sends
- When on, broadcast emails skip recipients whose canonical email (e.g. josh+guest@) duplicates another recipient in the same send. Prevents sending multiple copies to family-account aliases.
- Client Experience Settings
- Guest booking, location prompts, room names, and profile display
- Enable book for a guest
- Check this box if you would like clients to book for their friends. By checking this box your clients will be able to purchase a drop-in for guests. Please update each of your packages/subscriptions to allow clients to use these pricing options for guests
- Apply member discounts to guest bookings
- When enabled, member tier or member discounts can apply when the member books for a guest. Off by default; non-member promo codes are unaffected
- Enable guest passes for gym check-in
- Allow guest pass configuration on pricing options for front-desk gym check-in. Members can use guest passes at check-in without enabling app-based guest booking
- Enable purchasing communities for guests
- When enabled, clients can purchase communities multiple times for their guests or family members. This allows account holders to buy access for others they know
- Prompt clients for default location in branded app
- Check this box if you would like clients to be prompted to select a default location in the branded app if you have multiple locations
- Client records
- Check this box if you would like to keep track of your clients' records
- Show room name to clients
- When enabled, clients will see the name of the room after booking a class, helping them know where to go in your location
- Timezone display
- Enable to show session times in the local timezone, including the timezone abbreviation
- Show client profile images
- When enabled, client profile images will be displayed in check-in screens
- Legal & Compliance Settings
- Waivers, tax configuration, and agreement terms
- Enable signed liability waiver
- This will require clients to sign a liability waiver before booking. By disabling this clients will not have to sign, but rather will only have to click a checkbox
- Tax-inclusive pricing
- When enabled (tax-inclusive), the displayed price includes tax. For example, if a class costs $100 and tax is 10%, the displayed price will be $100 (tax included).
- When disabled (tax-exclusive), tax will be added on top of the displayed price. For example, if a class costs $100 and tax is 10%, the displayed price will be $100 + $10 tax.
- Enable signed agreement terms
- When enabled, clients will be required to sign agreement terms before booking across the application
- Staff & Access Settings
- Time clock, shift scheduling, and front desk permissions
- Enable time clock
- This will require all hourly employees to manually clock in when they start their shift and clock out when they complete their shift
- Enable shift scheduling
- When enabled, your team can use shift scheduling in the dashboard (subject to role permissions)
- Disable Front Desk & Guest team members from adding clients as free or unpaid
- When enabled, the 'Front desk' and 'Guest' Team Member roles will not be able to add clients to classes as free nor unpaid

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Save changes | available |  |
| button | Replace | available |  |
| button | Remove image | available |  |
| input:file | [unlabelled] | available |  |
| combobox | (-07:00) America/Vancouver | available |  |
| combobox | English (United Kingdom) | available |  |
| button | Bold | available |  |
| button | Italic | available |  |
| button | Strikethrough | available |  |
| button | Underline | available |  |
| button | Inline code | available |  |
| button | Heading 1 | available |  |
| button | Heading 2 | available |  |
| button | Heading 3 | available |  |
| button | Bullet list | available |  |
| button | Numbered list | available |  |
| button | Checklist | available |  |
| button | Quote | available |  |
| button | Align left | available |  |
| button | Align center | available |  |
| button | Align right | available |  |
| button | Justify | available |  |
| button | Link | available |  |
| button | Code block | available |  |
| button | Horizontal rule | available |  |
| button | Undo | disabled |  |
| button | Redo | disabled |  |
| tab | WriteWrite | available |  |
| tab | PreviewPreview | available |  |
| button | Copy HTML | available |  |
| button | Copy Markdown | available |  |
| input:number | [unlabelled] | value configured |  |
| switch | [unlabelled] | available |  |
| button | Copy waiver link | available |  |
| button | Reset | available |  |
| combobox | Mark as unpaid | available |  |
| combobox | Always show spots remaining | available |  |

**Opened select/dropdown options**

- Option group 1: (-10:00) Pacific/Honolulu; (-09:00) America/Adak; (-08:00) America/Anchorage; (-08:00) America/Juneau; (-08:00) America/Metlakatla; (-08:00) America/Nome; (-08:00) America/Sitka; (-08:00) America/Yakutat; (-07:00) America/Creston; (-07:00) America/Dawson; (-07:00) America/Dawson_Creek; (-07:00) America/Fort_Nelson; (-07:00) America/Hermosillo; (-07:00) America/Los_Angeles; (-07:00) America/Mazatlan; (-07:00) America/Phoenix; (-07:00) America/Tijuana; (-07:00) America/Vancouver; (-07:00) America/Whitehorse; (-06:00) America/Bahia_Banderas; (-06:00) America/Boise; (-06:00) America/Cambridge_Bay; (-06:00) America/Chihuahua; (-06:00) America/Ciudad_Juarez; (-06:00) America/Denver; (-06:00) America/Edmonton; (-06:00) America/Inuvik; (-06:00) America/Merida; (-06:00) America/Mexico_City; (-06:00) America/Monterrey; (-06:00) America/Regina; (-06:00) America/Swift_Current; (-05:00) America/Atikokan; (-05:00) America/Cancun; (-05:00) America/Chicago; (-05:00) America/Indiana/Knox; (-05:00) America/Indiana/Tell_City; (-05:00) America/Matamoros; (-05:00) America/Menominee; (-05:00) America/North_Dakota/Beulah; (-05:00) America/North_Dakota/Center; (-05:00) America/North_Dakota/New_Salem; (-05:00) America/Ojinaga; (-05:00) America/Panama; (-05:00) America/Rankin_Inlet; (-05:00) America/Resolute; (-05:00) America/Winnipeg; (-04:00) America/Blanc-Sablon; (-04:00) America/Detroit; (-04:00) America/Indiana/Indianapolis; (-04:00) America/Indiana/Marengo; (-04:00) America/Indiana/Petersburg; (-04:00) America/Indiana/Vevay; (-04:00) America/Indiana/Vincennes; (-04:00) America/Indiana/Winamac; (-04:00) America/Iqaluit; (-04:00) America/Kentucky/Louisville; (-04:00) America/Kentucky/Monticello; (-04:00) America/New_York; (-04:00) America/Puerto_Rico; (-04:00) America/Toronto; (-03:00) America/Argentina/Buenos_Aires; (-03:00) America/Argentina/Catamarca; (-03:00) America/Argentina/Cordoba; (-03:00) America/Argentina/Jujuy; (-03:00) America/Argentina/La_Rioja; (-03:00) America/Argentina/Mendoza; (-03:00) America/Argentina/Rio_Gallegos; (-03:00) America/Argentina/Salta; (-03:00) America/Argentina/San_Juan; (-03:00) America/Argentina/San_Luis; (-03:00) America/Argentina/Tucuman; (-03:00) America/Argentina/Ushuaia; (-03:00) America/Glace_Bay; (-03:00) America/Goose_Bay; (-03:00) America/Halifax; (-03:00) America/Moncton; (-02:30) America/St_Johns; (+00:00) Africa/Abidjan; (+00:00) Atlantic/Azores; (+00:00) Atlantic/Reykjavik; (+01:00) Atlantic/Canary; (+01:00) Atlantic/Madeira; (+01:00) Europe/Dublin; (+01:00) Europe/Lisbon; (+01:00) Europe/London; (+02:00) Africa/Ceuta; (+02:00) Africa/Johannesburg; (+02:00) Africa/Lusaka; (+02:00) Africa/Maputo; (+02:00) Europe/Amsterdam; (+02:00) Europe/Belgrade; (+02:00) Europe/Berlin; (+02:00) Europe/Bratislava; (+02:00) Europe/Brussels; (+02:00) Europe/Budapest; (+02:00) Europe/Busingen; (+02:00) Europe/Copenhagen; (+02:00) Europe/Kaliningrad; (+02:00) Europe/Ljubljana; (+02:00) Europe/Luxembourg; (+02:00) Europe/Madrid; (+02:00) Europe/Malta; (+02:00) Europe/Oslo; (+02:00) Europe/Prague; (+02:00) Europe/Rome; (+02:00) Europe/Stockholm; (+02:00) Europe/Vaduz; (+02:00) Europe/Vienna; (+02:00) Europe/Warsaw; (+02:00) Europe/Zagreb; (+02:00) Europe/Zurich; (+03:00) Asia/Famagusta; (+03:00) Asia/Nicosia; (+03:00) Europe/Athens; (+03:00) Europe/Bucharest; (+03:00) Europe/Helsinki; (+03:00) Europe/Kirov; (+03:00) Europe/Moscow; (+03:00) Europe/Riga; (+03:00) Europe/Simferopol; (+03:00) Europe/Sofia; (+03:00) Europe/Tallinn; (+03:00) Europe/Vilnius; (+03:00) Europe/Volgograd; (+04:00) Asia/Dubai; (+04:00) Europe/Astrakhan; (+04:00) Europe/Samara; (+04:00) Europe/Saratov; (+04:00) Europe/Ulyanovsk; (+05:00) Asia/Yekaterinburg; (+05:30) Asia/Kolkata; (+06:00) Asia/Omsk; (+07:00) Asia/Barnaul; (+07:00) Asia/Krasnoyarsk; (+07:00) Asia/Novokuznetsk; (+07:00) Asia/Novosibirsk; (+07:00) Asia/Tomsk; (+08:00) Asia/Hong_Kong; (+08:00) Asia/Irkutsk; (+08:00) Australia/Perth; (+08:45) Australia/Eucla; (+09:00) Asia/Chita; (+09:00) Asia/Khandyga; (+09:00) Asia/Yakutsk; (+09:30) Australia/Adelaide; (+09:30) Australia/Broken_Hill; (+09:30) Australia/Darwin; (+10:00) Antarctica/Macquarie; (+10:00) Asia/Ust-Nera
- Option group 2: menu was present but could not be read reliably without risking a state change.
- Option group 3: Mark as unpaid; Cancel reservations
- Option group 4: Always show spots remaining; Only show when at or below

**Settings links**

- Settings: `/dashboard/settings`
- advanced booking windows: `/dashboard/settings/booking-windows`
- Payment method types: `/dashboard/settings/offline-payment-types`

### tab:Write

**Visible text**

- General Business Settings
- Save changes
- General Settings
- Logo, timezone, email body, cancellation policy, and shipping
- Brand logo
- Replace
- Email timezone settings
- Confirmation emails will display this timezone
- (-09:00) America/Adak
- Date/time formats
- Choose how dates and times appear to your clients
- English (United Kingdom)
- Condensed
- Sat, 18 Jul 2026, 01:45
- Verbose
- 18 July 2026 at 01:45
- Date condensed
- 18 July 2026
- Weekday date
- Saturday 18 Jul
- Month day year
- 18 Jul 2026
- Month day
- 18 July
- Date
- 18/07/2026
- Day abbr
- Sat
- Time
- 01:45
- America/Adak
- Confirmation email body
- H1
- H3
- </>
- Write
- Preview
- Hi!
- Thank you for booking with us.
- Our cancellation policy is as follows
- Thank you!
- HTML is canonical; Markdown is exported via Turndown for APIs & docs.
- Copy HTML
- Copy Markdown
- Cancellation policy
- advanced booking windows
- hours
- Late cancel / no show policy overview
- This policy will be shown to the customer before they book
- Terms & Conditions: Classes
- Classes are always subject to availability but we will always do our best to accommodate you in your chosen class.
- All classes must be prepaid and all clients agree to our 12hr notice policy when cancelling and/or rescheduling. If you’re booked into a class, but miss it or cancel with less than 12 hours’ notice, you will be charged for it.
- Out of consideration for the Trainer and other Clients, and also for your own safety (the warm-up is an important aspect of each class) please be aware that if you are more than 10 minutes late for a class, you will not be able to train.
- Statutory Rights and Refunds and Cancellation
- Classes are sold individually, and in Packs of 5, 10, 20, 30 and 100 or such other combinations as El Estudio Pilates Boutique may introduce from time to time. Blocks of classes may be shared by arrangement. Class fees are non refundable.
- Class fees may be increased by El Estudio Pilates Boutique at any time. The Proprietor shall give Clients not less than 14 days notice prior to any such increases. The Pilates Intro Pack is valid for 30 days before the first reservation.
- The rights of cancellation and refund and any limitation expressed in these terms and conditions do not affect your statutory rights as a consumer. Refunds in relation to Products or Services may only be credited to the credit or debit card originally used to make the purchase. An administration fee of £80.00 is applicable and 3% of the return balance for payment gateway expenses.
- Remember late cancel policy agreement
- When enabled, clients only need to agree to the cancellation policy once; after agreeing, the checkbox will be hidden on future checkouts
- Waiver of liability
- Important Liability Statement
- The information available on or through this site, and the Services supplied via or in connection with this site or at any «El Estudio Pilates Boutique» do not constitute medical advice and it is your responsibility to determine, through obtaining appropriate medical advice, that you are fit and well and that such contents and services are suitable for you. It is not our responsibility to do so. Before commencing any exercise regime, you should consult your doctor.
- It is also vital that you supply us with correct information about yourself. We cannot be liable for any incorrect information supplied by you to us. We try to make sure that all information contained on this site (and provided by us to you as part of any Services or Products) is correct, but, subject to the paragraph below, we do not accept any liability for any error or omission and exclude all liability for any action you (your legal representatives, heirs) may take or loss or injury you may suffer (direct or indirect including loss of pay, profit, opportunity or time, pain and suffering, any indirect, consequential or special loss, however arising) as a result of relying on any information on this site or provided through any Service supplied by us to you.
- You, your legal representatives and your heirs release, waive, discharge and covenant, not to sue «El Estudio Pilates Boutique» and its instructors for any injury or death caused by their negligence or other acts.
- Reset waiver for all clients
- This will clear all signed waivers and agreements, requiring every client to re-sign before their next booking
- Reset
- Flat rate shipping price
- How much you will charge for shipping items
- £
- Subscription & Payment Settings
- Manage subscription behavior, payment methods, and refund policies
- Block booking when subscription fails
- Check this box if you would like to block booking with a subscription when the subscription fails
- Add action on subscription cancellation
- Check this box if you would like to add an action on subscription cancellation
- Action on subscription cancellation
- Choose what happens to existing reservations when a subscription is canceled
- Mark as unpaid
- Enable pay with account
- When enabled, clients can choose to pay with their account balance at checkout; this option is not available for subscriptions and may result in a negative balance to the account, which can be paid off later
- Enable refund with account credit
- When enabled, dollar amounts will be refunded with account credit instead of returning to the client's payment method
- Enable tipping in point of sale
- When enabled, customers will see tip options during checkout at the point of sale
- Custom payment method types
- Payment method types
- Ask for payment method
- When enabled, customers with active memberships will be prompted to add a payment method, in the mobile app only, if they don't have one on file
- Location-based tax from client's default location
- When enabled, checkout from the booking widget or branded app uses the client's default location to calculate location-based tax when the cart isn't tied to a specific location
- Allow recurring classes without payment method
- When enabled, clients can create recurring class bookings even if they don't have a payment method on file
- Allow recurring pricing option repurchase
- When enabled, staff can repurchase the same recurring pricing option for a client even if they already have an active or recently purchased instance
- Make revenue category mandatory for each offering
- When enabled, partners must select a revenue category when creating or editing pricing options and service types
- Community pack credits
- When enabled, class packs can be configured to grant community enrollments; purchasing a bundle containing such a pack at community checkout will auto-redeem one credit
- Reservation Management
- Unpaid reservation handling, double booking, and spot visibility
- Enable unpaid reservation resolver
- Check this box if you would like Arketa to automatically resolve unpaid reservations. The resolver retries from 3 days before class, but only charges or cancels within 6 hours of the class start time, rechecking roughly every 2 hours. Because it acts only inside that final 6-hour window, resolution is not guaranteed to complete before class.
- Block double booking
- When enabled, clients will not be able to book the same class twice on the widget or app. Staff can still override this when booking through the dashboard.
- Limit clients to one device at a time
- When a client signs in on a new device, sign them out of all previous devices. Reduces account sharing for on-demand video and community access. Does not apply to staff.
- Show spots remaining
- When enabled, the 'spots remaining' information will be shown on the class checkout experience
- Always show spots remaining
- Enable multiple credits required for booking
- This allows you to set a specific number of credits required for booking classes, appointments, and events
- Use package price when pack booking has no payment record
- If a class booking from a pack has no Stripe payment or order on file, use the package offering price (per credit) for revenue in reports and exports; enable for legacy pack bookings or when you need payroll or sales totals without stored payment data
- Check-in Settings
- Configure client check-in methods, gym access, and barcode scanning
- Enable client check-in
- This enables various check-in methods within your dashboard
- Enable auto check-in from email
- Automatically check in clients when they click the livestream link in the confirmation email within 30 minutes before or after the class start time
- Allow check-in for unpaid reservations
- When enabled, allows checking in clients with unpaid reservations without requiring payment to be resolved first
- Show instructor milestones on check-in
- Also show the with-this-instructor milestone count on the class check-in roster. The studio-wide milestone always shows regardless of this setting.
- Communication Settings
- Email notifications, messaging, and unsubscribe options
- Enable one-click unsubscribe for transactional emails
- This will add a one-click unsubscribe link to all transactional emails sent to clients
- Enable group messaging
- When enabled, allows partners and clients to create and participate in group conversations within the inbox and the branded mobile app
- Disable confirmation emails (group classes)
- Disable receiving a notification for each booking; clients will still be notified
- Disable confirmation emails (appointment booking)
- Disable receiving a notification for each appointment booking; clients will still be notified
- Disable confirmation emails (purchases)
- Disable receiving a notification for each purchase; clients will still be notified
- Skip duplicate email aliases in marketing sends
- When on, broadcast emails skip recipients whose canonical email (e.g. josh+guest@) duplicates another recipient in the same send. Prevents sending multiple copies to family-account aliases.
- Client Experience Settings
- Guest booking, location prompts, room names, and profile display
- Enable book for a guest
- Check this box if you would like clients to book for their friends. By checking this box your clients will be able to purchase a drop-in for guests. Please update each of your packages/subscriptions to allow clients to use these pricing options for guests
- Apply member discounts to guest bookings
- When enabled, member tier or member discounts can apply when the member books for a guest. Off by default; non-member promo codes are unaffected
- Enable guest passes for gym check-in
- Allow guest pass configuration on pricing options for front-desk gym check-in. Members can use guest passes at check-in without enabling app-based guest booking
- Enable purchasing communities for guests
- When enabled, clients can purchase communities multiple times for their guests or family members. This allows account holders to buy access for others they know
- Prompt clients for default location in branded app
- Check this box if you would like clients to be prompted to select a default location in the branded app if you have multiple locations
- Client records
- Check this box if you would like to keep track of your clients' records
- Show room name to clients
- When enabled, clients will see the name of the room after booking a class, helping them know where to go in your location
- Timezone display
- Enable to show session times in the local timezone, including the timezone abbreviation
- Show client profile images
- When enabled, client profile images will be displayed in check-in screens
- Legal & Compliance Settings
- Waivers, tax configuration, and agreement terms
- Enable signed liability waiver
- This will require clients to sign a liability waiver before booking. By disabling this clients will not have to sign, but rather will only have to click a checkbox
- Tax-inclusive pricing
- When enabled (tax-inclusive), the displayed price includes tax. For example, if a class costs $100 and tax is 10%, the displayed price will be $100 (tax included).
- When disabled (tax-exclusive), tax will be added on top of the displayed price. For example, if a class costs $100 and tax is 10%, the displayed price will be $100 + $10 tax.
- Enable signed agreement terms
- When enabled, clients will be required to sign agreement terms before booking across the application
- Staff & Access Settings
- Time clock, shift scheduling, and front desk permissions
- Enable time clock
- This will require all hourly employees to manually clock in when they start their shift and clock out when they complete their shift
- Enable shift scheduling
- When enabled, your team can use shift scheduling in the dashboard (subject to role permissions)
- Disable Front Desk & Guest team members from adding clients as free or unpaid
- When enabled, the 'Front desk' and 'Guest' Team Member roles will not be able to add clients to classes as free nor unpaid

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Save changes | available |  |
| button | Replace | available |  |
| button | Remove image | available |  |
| input:file | [unlabelled] | available |  |
| combobox | (-09:00) America/Adak | available |  |
| combobox | English (United Kingdom) | available |  |
| button | Bold | available |  |
| button | Italic | available |  |
| button | Strikethrough | available |  |
| button | Underline | available |  |
| button | Inline code | available |  |
| button | Heading 1 | available |  |
| button | Heading 2 | available |  |
| button | Heading 3 | available |  |
| button | Bullet list | available |  |
| button | Numbered list | available |  |
| button | Checklist | available |  |
| button | Quote | available |  |
| button | Align left | available |  |
| button | Align center | available |  |
| button | Align right | available |  |
| button | Justify | available |  |
| button | Link | available |  |
| button | Code block | available |  |
| button | Horizontal rule | available |  |
| button | Undo | disabled |  |
| button | Redo | disabled |  |
| tab | WriteWrite | available |  |
| tab | PreviewPreview | available |  |
| button | Copy HTML | available |  |
| button | Copy Markdown | available |  |
| input:number | [unlabelled] | value configured |  |
| switch | [unlabelled] | available |  |
| button | Copy waiver link | available |  |
| button | Reset | available |  |
| combobox | Mark as unpaid | available |  |
| combobox | Always show spots remaining | available |  |

**Opened select/dropdown options**

- Option group 1: (-10:00) Pacific/Honolulu; (-09:00) America/Adak; (-08:00) America/Anchorage; (-08:00) America/Juneau; (-08:00) America/Metlakatla; (-08:00) America/Nome; (-08:00) America/Sitka; (-08:00) America/Yakutat; (-07:00) America/Creston; (-07:00) America/Dawson; (-07:00) America/Dawson_Creek; (-07:00) America/Fort_Nelson; (-07:00) America/Hermosillo; (-07:00) America/Los_Angeles; (-07:00) America/Mazatlan; (-07:00) America/Phoenix; (-07:00) America/Tijuana; (-07:00) America/Vancouver; (-07:00) America/Whitehorse; (-06:00) America/Bahia_Banderas; (-06:00) America/Boise; (-06:00) America/Cambridge_Bay; (-06:00) America/Chihuahua; (-06:00) America/Ciudad_Juarez; (-06:00) America/Denver; (-06:00) America/Edmonton; (-06:00) America/Inuvik; (-06:00) America/Merida; (-06:00) America/Mexico_City; (-06:00) America/Monterrey; (-06:00) America/Regina; (-06:00) America/Swift_Current; (-05:00) America/Atikokan; (-05:00) America/Cancun; (-05:00) America/Chicago; (-05:00) America/Indiana/Knox; (-05:00) America/Indiana/Tell_City; (-05:00) America/Matamoros; (-05:00) America/Menominee; (-05:00) America/North_Dakota/Beulah; (-05:00) America/North_Dakota/Center; (-05:00) America/North_Dakota/New_Salem; (-05:00) America/Ojinaga; (-05:00) America/Panama; (-05:00) America/Rankin_Inlet; (-05:00) America/Resolute; (-05:00) America/Winnipeg; (-04:00) America/Blanc-Sablon; (-04:00) America/Detroit; (-04:00) America/Indiana/Indianapolis; (-04:00) America/Indiana/Marengo; (-04:00) America/Indiana/Petersburg; (-04:00) America/Indiana/Vevay; (-04:00) America/Indiana/Vincennes; (-04:00) America/Indiana/Winamac; (-04:00) America/Iqaluit; (-04:00) America/Kentucky/Louisville; (-04:00) America/Kentucky/Monticello; (-04:00) America/New_York; (-04:00) America/Puerto_Rico; (-04:00) America/Toronto; (-03:00) America/Argentina/Buenos_Aires; (-03:00) America/Argentina/Catamarca; (-03:00) America/Argentina/Cordoba; (-03:00) America/Argentina/Jujuy; (-03:00) America/Argentina/La_Rioja; (-03:00) America/Argentina/Mendoza; (-03:00) America/Argentina/Rio_Gallegos; (-03:00) America/Argentina/Salta; (-03:00) America/Argentina/San_Juan; (-03:00) America/Argentina/San_Luis; (-03:00) America/Argentina/Tucuman; (-03:00) America/Argentina/Ushuaia; (-03:00) America/Glace_Bay; (-03:00) America/Goose_Bay; (-03:00) America/Halifax; (-03:00) America/Moncton; (-02:30) America/St_Johns; (+00:00) Africa/Abidjan; (+00:00) Atlantic/Azores; (+00:00) Atlantic/Reykjavik; (+01:00) Atlantic/Canary; (+01:00) Atlantic/Madeira; (+01:00) Europe/Dublin; (+01:00) Europe/Lisbon; (+01:00) Europe/London; (+02:00) Africa/Ceuta; (+02:00) Africa/Johannesburg; (+02:00) Africa/Lusaka; (+02:00) Africa/Maputo; (+02:00) Europe/Amsterdam; (+02:00) Europe/Belgrade; (+02:00) Europe/Berlin; (+02:00) Europe/Bratislava; (+02:00) Europe/Brussels; (+02:00) Europe/Budapest; (+02:00) Europe/Busingen; (+02:00) Europe/Copenhagen; (+02:00) Europe/Kaliningrad; (+02:00) Europe/Ljubljana; (+02:00) Europe/Luxembourg; (+02:00) Europe/Madrid; (+02:00) Europe/Malta; (+02:00) Europe/Oslo; (+02:00) Europe/Prague; (+02:00) Europe/Rome; (+02:00) Europe/Stockholm; (+02:00) Europe/Vaduz; (+02:00) Europe/Vienna; (+02:00) Europe/Warsaw; (+02:00) Europe/Zagreb; (+02:00) Europe/Zurich; (+03:00) Asia/Famagusta; (+03:00) Asia/Nicosia; (+03:00) Europe/Athens; (+03:00) Europe/Bucharest; (+03:00) Europe/Helsinki; (+03:00) Europe/Kirov; (+03:00) Europe/Moscow; (+03:00) Europe/Riga; (+03:00) Europe/Simferopol; (+03:00) Europe/Sofia; (+03:00) Europe/Tallinn; (+03:00) Europe/Vilnius; (+03:00) Europe/Volgograd; (+04:00) Asia/Dubai; (+04:00) Europe/Astrakhan; (+04:00) Europe/Samara; (+04:00) Europe/Saratov; (+04:00) Europe/Ulyanovsk; (+05:00) Asia/Yekaterinburg; (+05:30) Asia/Kolkata; (+06:00) Asia/Omsk; (+07:00) Asia/Barnaul; (+07:00) Asia/Krasnoyarsk; (+07:00) Asia/Novokuznetsk; (+07:00) Asia/Novosibirsk; (+07:00) Asia/Tomsk; (+08:00) Asia/Hong_Kong; (+08:00) Asia/Irkutsk; (+08:00) Australia/Perth; (+08:45) Australia/Eucla; (+09:00) Asia/Chita; (+09:00) Asia/Khandyga; (+09:00) Asia/Yakutsk; (+09:30) Australia/Adelaide; (+09:30) Australia/Broken_Hill; (+09:30) Australia/Darwin; (+10:00) Antarctica/Macquarie; (+10:00) Asia/Ust-Nera
- Option group 2: menu was present but could not be read reliably without risking a state change.
- Option group 3: Mark as unpaid; Cancel reservations
- Option group 4: Always show spots remaining; Only show when at or below

**Settings links**

- Settings: `/dashboard/settings`
- advanced booking windows: `/dashboard/settings/booking-windows`
- Payment method types: `/dashboard/settings/offline-payment-types`

### tab:Preview

**Visible text**

- General Business Settings
- Save changes
- General Settings
- Logo, timezone, email body, cancellation policy, and shipping
- Brand logo
- Replace
- Email timezone settings
- Confirmation emails will display this timezone
- (-09:00) America/Adak
- Date/time formats
- Choose how dates and times appear to your clients
- English (United Kingdom)
- Condensed
- Sat, 18 Jul 2026, 01:45
- Verbose
- 18 July 2026 at 01:45
- Date condensed
- 18 July 2026
- Weekday date
- Saturday 18 Jul
- Month day year
- 18 Jul 2026
- Month day
- 18 July
- Date
- 18/07/2026
- Day abbr
- Sat
- Time
- 01:45
- America/Adak
- Confirmation email body
- H1
- H3
- </>
- Write
- Preview
- Hi!
- Thank you for booking with us.
- Our cancellation policy is as follows
- Thank you!
- HTML is canonical; Markdown is exported via Turndown for APIs & docs.
- Copy HTML
- Copy Markdown
- Cancellation policy
- advanced booking windows
- hours
- Late cancel / no show policy overview
- This policy will be shown to the customer before they book
- Terms & Conditions: Classes
- Classes are always subject to availability but we will always do our best to accommodate you in your chosen class.
- All classes must be prepaid and all clients agree to our 12hr notice policy when cancelling and/or rescheduling. If you’re booked into a class, but miss it or cancel with less than 12 hours’ notice, you will be charged for it.
- Out of consideration for the Trainer and other Clients, and also for your own safety (the warm-up is an important aspect of each class) please be aware that if you are more than 10 minutes late for a class, you will not be able to train.
- Statutory Rights and Refunds and Cancellation
- Classes are sold individually, and in Packs of 5, 10, 20, 30 and 100 or such other combinations as El Estudio Pilates Boutique may introduce from time to time. Blocks of classes may be shared by arrangement. Class fees are non refundable.
- Class fees may be increased by El Estudio Pilates Boutique at any time. The Proprietor shall give Clients not less than 14 days notice prior to any such increases. The Pilates Intro Pack is valid for 30 days before the first reservation.
- The rights of cancellation and refund and any limitation expressed in these terms and conditions do not affect your statutory rights as a consumer. Refunds in relation to Products or Services may only be credited to the credit or debit card originally used to make the purchase. An administration fee of £80.00 is applicable and 3% of the return balance for payment gateway expenses.
- Remember late cancel policy agreement
- When enabled, clients only need to agree to the cancellation policy once; after agreeing, the checkbox will be hidden on future checkouts
- Waiver of liability
- Important Liability Statement
- The information available on or through this site, and the Services supplied via or in connection with this site or at any «El Estudio Pilates Boutique» do not constitute medical advice and it is your responsibility to determine, through obtaining appropriate medical advice, that you are fit and well and that such contents and services are suitable for you. It is not our responsibility to do so. Before commencing any exercise regime, you should consult your doctor.
- It is also vital that you supply us with correct information about yourself. We cannot be liable for any incorrect information supplied by you to us. We try to make sure that all information contained on this site (and provided by us to you as part of any Services or Products) is correct, but, subject to the paragraph below, we do not accept any liability for any error or omission and exclude all liability for any action you (your legal representatives, heirs) may take or loss or injury you may suffer (direct or indirect including loss of pay, profit, opportunity or time, pain and suffering, any indirect, consequential or special loss, however arising) as a result of relying on any information on this site or provided through any Service supplied by us to you.
- You, your legal representatives and your heirs release, waive, discharge and covenant, not to sue «El Estudio Pilates Boutique» and its instructors for any injury or death caused by their negligence or other acts.
- Reset waiver for all clients
- This will clear all signed waivers and agreements, requiring every client to re-sign before their next booking
- Reset
- Flat rate shipping price
- How much you will charge for shipping items
- £
- Subscription & Payment Settings
- Manage subscription behavior, payment methods, and refund policies
- Block booking when subscription fails
- Check this box if you would like to block booking with a subscription when the subscription fails
- Add action on subscription cancellation
- Check this box if you would like to add an action on subscription cancellation
- Action on subscription cancellation
- Choose what happens to existing reservations when a subscription is canceled
- Mark as unpaid
- Enable pay with account
- When enabled, clients can choose to pay with their account balance at checkout; this option is not available for subscriptions and may result in a negative balance to the account, which can be paid off later
- Enable refund with account credit
- When enabled, dollar amounts will be refunded with account credit instead of returning to the client's payment method
- Enable tipping in point of sale
- When enabled, customers will see tip options during checkout at the point of sale
- Custom payment method types
- Payment method types
- Ask for payment method
- When enabled, customers with active memberships will be prompted to add a payment method, in the mobile app only, if they don't have one on file
- Location-based tax from client's default location
- When enabled, checkout from the booking widget or branded app uses the client's default location to calculate location-based tax when the cart isn't tied to a specific location
- Allow recurring classes without payment method
- When enabled, clients can create recurring class bookings even if they don't have a payment method on file
- Allow recurring pricing option repurchase
- When enabled, staff can repurchase the same recurring pricing option for a client even if they already have an active or recently purchased instance
- Make revenue category mandatory for each offering
- When enabled, partners must select a revenue category when creating or editing pricing options and service types
- Community pack credits
- When enabled, class packs can be configured to grant community enrollments; purchasing a bundle containing such a pack at community checkout will auto-redeem one credit
- Reservation Management
- Unpaid reservation handling, double booking, and spot visibility
- Enable unpaid reservation resolver
- Check this box if you would like Arketa to automatically resolve unpaid reservations. The resolver retries from 3 days before class, but only charges or cancels within 6 hours of the class start time, rechecking roughly every 2 hours. Because it acts only inside that final 6-hour window, resolution is not guaranteed to complete before class.
- Block double booking
- When enabled, clients will not be able to book the same class twice on the widget or app. Staff can still override this when booking through the dashboard.
- Limit clients to one device at a time
- When a client signs in on a new device, sign them out of all previous devices. Reduces account sharing for on-demand video and community access. Does not apply to staff.
- Show spots remaining
- When enabled, the 'spots remaining' information will be shown on the class checkout experience
- Always show spots remaining
- Enable multiple credits required for booking
- This allows you to set a specific number of credits required for booking classes, appointments, and events
- Use package price when pack booking has no payment record
- If a class booking from a pack has no Stripe payment or order on file, use the package offering price (per credit) for revenue in reports and exports; enable for legacy pack bookings or when you need payroll or sales totals without stored payment data
- Check-in Settings
- Configure client check-in methods, gym access, and barcode scanning
- Enable client check-in
- This enables various check-in methods within your dashboard
- Enable auto check-in from email
- Automatically check in clients when they click the livestream link in the confirmation email within 30 minutes before or after the class start time
- Allow check-in for unpaid reservations
- When enabled, allows checking in clients with unpaid reservations without requiring payment to be resolved first
- Show instructor milestones on check-in
- Also show the with-this-instructor milestone count on the class check-in roster. The studio-wide milestone always shows regardless of this setting.
- Communication Settings
- Email notifications, messaging, and unsubscribe options
- Enable one-click unsubscribe for transactional emails
- This will add a one-click unsubscribe link to all transactional emails sent to clients
- Enable group messaging
- When enabled, allows partners and clients to create and participate in group conversations within the inbox and the branded mobile app
- Disable confirmation emails (group classes)
- Disable receiving a notification for each booking; clients will still be notified
- Disable confirmation emails (appointment booking)
- Disable receiving a notification for each appointment booking; clients will still be notified
- Disable confirmation emails (purchases)
- Disable receiving a notification for each purchase; clients will still be notified
- Skip duplicate email aliases in marketing sends
- When on, broadcast emails skip recipients whose canonical email (e.g. josh+guest@) duplicates another recipient in the same send. Prevents sending multiple copies to family-account aliases.
- Client Experience Settings
- Guest booking, location prompts, room names, and profile display
- Enable book for a guest
- Check this box if you would like clients to book for their friends. By checking this box your clients will be able to purchase a drop-in for guests. Please update each of your packages/subscriptions to allow clients to use these pricing options for guests
- Apply member discounts to guest bookings
- When enabled, member tier or member discounts can apply when the member books for a guest. Off by default; non-member promo codes are unaffected
- Enable guest passes for gym check-in
- Allow guest pass configuration on pricing options for front-desk gym check-in. Members can use guest passes at check-in without enabling app-based guest booking
- Enable purchasing communities for guests
- When enabled, clients can purchase communities multiple times for their guests or family members. This allows account holders to buy access for others they know
- Prompt clients for default location in branded app
- Check this box if you would like clients to be prompted to select a default location in the branded app if you have multiple locations
- Client records
- Check this box if you would like to keep track of your clients' records
- Show room name to clients
- When enabled, clients will see the name of the room after booking a class, helping them know where to go in your location
- Timezone display
- Enable to show session times in the local timezone, including the timezone abbreviation
- Show client profile images
- When enabled, client profile images will be displayed in check-in screens
- Legal & Compliance Settings
- Waivers, tax configuration, and agreement terms
- Enable signed liability waiver
- This will require clients to sign a liability waiver before booking. By disabling this clients will not have to sign, but rather will only have to click a checkbox
- Tax-inclusive pricing
- When enabled (tax-inclusive), the displayed price includes tax. For example, if a class costs $100 and tax is 10%, the displayed price will be $100 (tax included).
- When disabled (tax-exclusive), tax will be added on top of the displayed price. For example, if a class costs $100 and tax is 10%, the displayed price will be $100 + $10 tax.
- Enable signed agreement terms
- When enabled, clients will be required to sign agreement terms before booking across the application
- Staff & Access Settings
- Time clock, shift scheduling, and front desk permissions
- Enable time clock
- This will require all hourly employees to manually clock in when they start their shift and clock out when they complete their shift
- Enable shift scheduling
- When enabled, your team can use shift scheduling in the dashboard (subject to role permissions)
- Disable Front Desk & Guest team members from adding clients as free or unpaid
- When enabled, the 'Front desk' and 'Guest' Team Member roles will not be able to add clients to classes as free nor unpaid

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Save changes | available |  |
| button | Replace | available |  |
| button | Remove image | available |  |
| input:file | [unlabelled] | available |  |
| combobox | (-09:00) America/Adak | available |  |
| combobox | English (United Kingdom) | available |  |
| button | Bold | available |  |
| button | Italic | available |  |
| button | Strikethrough | available |  |
| button | Underline | available |  |
| button | Inline code | available |  |
| button | Heading 1 | available |  |
| button | Heading 2 | available |  |
| button | Heading 3 | available |  |
| button | Bullet list | available |  |
| button | Numbered list | available |  |
| button | Checklist | available |  |
| button | Quote | available |  |
| button | Align left | available |  |
| button | Align center | available |  |
| button | Align right | available |  |
| button | Justify | available |  |
| button | Link | available |  |
| button | Code block | available |  |
| button | Horizontal rule | available |  |
| button | Undo | disabled |  |
| button | Redo | disabled |  |
| tab | WriteWrite | available |  |
| tab | PreviewPreview | available |  |
| button | Copy HTML | available |  |
| button | Copy Markdown | available |  |
| input:number | [unlabelled] | value configured |  |
| switch | [unlabelled] | available |  |
| button | Copy waiver link | available |  |
| button | Reset | available |  |
| combobox | Mark as unpaid | available |  |
| combobox | Always show spots remaining | available |  |

**Opened select/dropdown options**

- Option group 1: (-10:00) Pacific/Honolulu; (-09:00) America/Adak; (-08:00) America/Anchorage; (-08:00) America/Juneau; (-08:00) America/Metlakatla; (-08:00) America/Nome; (-08:00) America/Sitka; (-08:00) America/Yakutat; (-07:00) America/Creston; (-07:00) America/Dawson; (-07:00) America/Dawson_Creek; (-07:00) America/Fort_Nelson; (-07:00) America/Hermosillo; (-07:00) America/Los_Angeles; (-07:00) America/Mazatlan; (-07:00) America/Phoenix; (-07:00) America/Tijuana; (-07:00) America/Vancouver; (-07:00) America/Whitehorse; (-06:00) America/Bahia_Banderas; (-06:00) America/Boise; (-06:00) America/Cambridge_Bay; (-06:00) America/Chihuahua; (-06:00) America/Ciudad_Juarez; (-06:00) America/Denver; (-06:00) America/Edmonton; (-06:00) America/Inuvik; (-06:00) America/Merida; (-06:00) America/Mexico_City; (-06:00) America/Monterrey; (-06:00) America/Regina; (-06:00) America/Swift_Current; (-05:00) America/Atikokan; (-05:00) America/Cancun; (-05:00) America/Chicago; (-05:00) America/Indiana/Knox; (-05:00) America/Indiana/Tell_City; (-05:00) America/Matamoros; (-05:00) America/Menominee; (-05:00) America/North_Dakota/Beulah; (-05:00) America/North_Dakota/Center; (-05:00) America/North_Dakota/New_Salem; (-05:00) America/Ojinaga; (-05:00) America/Panama; (-05:00) America/Rankin_Inlet; (-05:00) America/Resolute; (-05:00) America/Winnipeg; (-04:00) America/Blanc-Sablon; (-04:00) America/Detroit; (-04:00) America/Indiana/Indianapolis; (-04:00) America/Indiana/Marengo; (-04:00) America/Indiana/Petersburg; (-04:00) America/Indiana/Vevay; (-04:00) America/Indiana/Vincennes; (-04:00) America/Indiana/Winamac; (-04:00) America/Iqaluit; (-04:00) America/Kentucky/Louisville; (-04:00) America/Kentucky/Monticello; (-04:00) America/New_York; (-04:00) America/Puerto_Rico; (-04:00) America/Toronto; (-03:00) America/Argentina/Buenos_Aires; (-03:00) America/Argentina/Catamarca; (-03:00) America/Argentina/Cordoba; (-03:00) America/Argentina/Jujuy; (-03:00) America/Argentina/La_Rioja; (-03:00) America/Argentina/Mendoza; (-03:00) America/Argentina/Rio_Gallegos; (-03:00) America/Argentina/Salta; (-03:00) America/Argentina/San_Juan; (-03:00) America/Argentina/San_Luis; (-03:00) America/Argentina/Tucuman; (-03:00) America/Argentina/Ushuaia; (-03:00) America/Glace_Bay; (-03:00) America/Goose_Bay; (-03:00) America/Halifax; (-03:00) America/Moncton; (-02:30) America/St_Johns; (+00:00) Africa/Abidjan; (+00:00) Atlantic/Azores; (+00:00) Atlantic/Reykjavik; (+01:00) Atlantic/Canary; (+01:00) Atlantic/Madeira; (+01:00) Europe/Dublin; (+01:00) Europe/Lisbon; (+01:00) Europe/London; (+02:00) Africa/Ceuta; (+02:00) Africa/Johannesburg; (+02:00) Africa/Lusaka; (+02:00) Africa/Maputo; (+02:00) Europe/Amsterdam; (+02:00) Europe/Belgrade; (+02:00) Europe/Berlin; (+02:00) Europe/Bratislava; (+02:00) Europe/Brussels; (+02:00) Europe/Budapest; (+02:00) Europe/Busingen; (+02:00) Europe/Copenhagen; (+02:00) Europe/Kaliningrad; (+02:00) Europe/Ljubljana; (+02:00) Europe/Luxembourg; (+02:00) Europe/Madrid; (+02:00) Europe/Malta; (+02:00) Europe/Oslo; (+02:00) Europe/Prague; (+02:00) Europe/Rome; (+02:00) Europe/Stockholm; (+02:00) Europe/Vaduz; (+02:00) Europe/Vienna; (+02:00) Europe/Warsaw; (+02:00) Europe/Zagreb; (+02:00) Europe/Zurich; (+03:00) Asia/Famagusta; (+03:00) Asia/Nicosia; (+03:00) Europe/Athens; (+03:00) Europe/Bucharest; (+03:00) Europe/Helsinki; (+03:00) Europe/Kirov; (+03:00) Europe/Moscow; (+03:00) Europe/Riga; (+03:00) Europe/Simferopol; (+03:00) Europe/Sofia; (+03:00) Europe/Tallinn; (+03:00) Europe/Vilnius; (+03:00) Europe/Volgograd; (+04:00) Asia/Dubai; (+04:00) Europe/Astrakhan; (+04:00) Europe/Samara; (+04:00) Europe/Saratov; (+04:00) Europe/Ulyanovsk; (+05:00) Asia/Yekaterinburg; (+05:30) Asia/Kolkata; (+06:00) Asia/Omsk; (+07:00) Asia/Barnaul; (+07:00) Asia/Krasnoyarsk; (+07:00) Asia/Novokuznetsk; (+07:00) Asia/Novosibirsk; (+07:00) Asia/Tomsk; (+08:00) Asia/Hong_Kong; (+08:00) Asia/Irkutsk; (+08:00) Australia/Perth; (+08:45) Australia/Eucla; (+09:00) Asia/Chita; (+09:00) Asia/Khandyga; (+09:00) Asia/Yakutsk; (+09:30) Australia/Adelaide; (+09:30) Australia/Broken_Hill; (+09:30) Australia/Darwin; (+10:00) Antarctica/Macquarie; (+10:00) Asia/Ust-Nera
- Option group 2: menu was present but could not be read reliably without risking a state change.
- Option group 3: Mark as unpaid; Cancel reservations
- Option group 4: Always show spots remaining; Only show when at or below

**Settings links**

- Settings: `/dashboard/settings`
- advanced booking windows: `/dashboard/settings/booking-windows`
- Payment method types: `/dashboard/settings/offline-payment-types`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| switch | true | no | Remember late cancel policy agreementWhen enabled, clients only need to agree to the cancellation policy once; after agreeing, the checkbox will be hidden on future checkouts |
| switch | true | no | Block booking when subscription failsCheck this box if you would like to block booking with a subscription when the subscription fails |
| switch | true | no | Add action on subscription cancellationCheck this box if you would like to add an action on subscription cancellation |
| switch | false | no | Enable pay with accountWhen enabled, clients can choose to pay with their account balance at checkout; this option is not available for subscriptions and may result in a negative balance to the account, which can be paid off later |
| switch | false | no | Enable refund with account creditWhen enabled, dollar amounts will be refunded with account credit instead of returning to the client's payment method |
| switch | true | no | Enable tipping in point of saleWhen enabled, customers will see tip options during checkout at the point of sale |
| switch | false | no | Custom payment method typesWhen enabled, staff can select custom types (for example Check or Zelle) when recording cash or offline subscription payments at the point of sale. After saving, add your types on the Payment method types settings |
| switch | true | no | Ask for payment methodWhen enabled, customers with active memberships will be prompted to add a payment method, in the mobile app only, if they don't have one on file |
| switch | false | no | Location-based tax from client's default locationWhen enabled, checkout from the booking widget or branded app uses the client's default location to calculate location-based tax when the cart isn't tied to a specific location |
| switch | false | no | Allow recurring classes without payment methodWhen enabled, clients can create recurring class bookings even if they don't have a payment method on file |
| switch | false | no | Allow recurring pricing option repurchaseWhen enabled, staff can repurchase the same recurring pricing option for a client even if they already have an active or recently purchased instance |
| switch | false | no | Make revenue category mandatory for each offeringWhen enabled, partners must select a revenue category when creating or editing pricing options and service types |
| switch | false | no | Community pack creditsWhen enabled, class packs can be configured to grant community enrollments; purchasing a bundle containing such a pack at community checkout will auto-redeem one credit |
| switch | false | no | Enable unpaid reservation resolverCheck this box if you would like Arketa to automatically resolve unpaid reservations. The resolver retries from 3 days before class, but only charges or cancels within 6 hours of the class start time, reche |
| switch | true | no | Block double bookingWhen enabled, clients will not be able to book the same class twice on the widget or app. Staff can still override this when booking through the dashboard. |
| switch | false | no | Limit clients to one device at a timeWhen a client signs in on a new device, sign them out of all previous devices. Reduces account sharing for on-demand video and community access. Does not apply to staff. |
| switch | true | no | Show spots remainingWhen enabled, the 'spots remaining' information will be shown on the class checkout experience |
| switch | false | no | Enable multiple credits required for bookingThis allows you to set a specific number of credits required for booking classes, appointments, and events |
| switch | false | no | Use package price when pack booking has no payment recordIf a class booking from a pack has no Stripe payment or order on file, use the package offering price (per credit) for revenue in reports and exports; enable for legacy pack bookings |
| switch | false | no | Enable client check-inThis enables various check-in methods within your dashboard |
| switch | false | no | Enable auto check-in from emailAutomatically check in clients when they click the livestream link in the confirmation email within 30 minutes before or after the class start time |
| switch | false | no | Allow check-in for unpaid reservationsWhen enabled, allows checking in clients with unpaid reservations without requiring payment to be resolved first |
| switch | false | no | Show instructor milestones on check-inAlso show the with-this-instructor milestone count on the class check-in roster. The studio-wide milestone always shows regardless of this setting. |
| switch | true | no | Enable one-click unsubscribe for transactional emailsThis will add a one-click unsubscribe link to all transactional emails sent to clients |
| switch | true | no | Enable group messagingWhen enabled, allows partners and clients to create and participate in group conversations within the inbox and the branded mobile app |
| switch | false | no | Disable confirmation emails (group classes)Disable receiving a notification for each booking; clients will still be notified |
| switch | false | no | Disable confirmation emails (appointment booking)Disable receiving a notification for each appointment booking; clients will still be notified |
| switch | false | no | Disable confirmation emails (purchases)Disable receiving a notification for each purchase; clients will still be notified |
| switch | false | no | Skip duplicate email aliases in marketing sendsWhen on, broadcast emails skip recipients whose canonical email (e.g. josh+guest@) duplicates another recipient in the same send. Prevents sending multiple copies to family-account aliases. |
| switch | false | no | Enable book for a guestCheck this box if you would like clients to book for their friends. By checking this box your clients will be able to purchase a drop-in for guests. Please update each of your packages/subscriptions to allow clients t |
| switch | false | no | Apply member discounts to guest bookingsWhen enabled, member tier or member discounts can apply when the member books for a guest. Off by default; non-member promo codes are unaffected |
| switch | false | no | Enable guest passes for gym check-inAllow guest pass configuration on pricing options for front-desk gym check-in. Members can use guest passes at check-in without enabling app-based guest booking |
| switch | false | no | Enable purchasing communities for guestsWhen enabled, clients can purchase communities multiple times for their guests or family members. This allows account holders to buy access for others they know |
| switch | true | no | Prompt clients for default location in branded appCheck this box if you would like clients to be prompted to select a default location in the branded app if you have multiple locations |
| switch | true | no | Client recordsCheck this box if you would like to keep track of your clients' records |
| switch | true | no | Show room name to clientsWhen enabled, clients will see the name of the room after booking a class, helping them know where to go in your location |
| switch | false | no | Timezone displayEnable to show session times in the local timezone, including the timezone abbreviation |
| switch | false | no | Show client profile imagesWhen enabled, client profile images will be displayed in check-in screens |
| switch | true | no | Enable signed liability waiverThis will require clients to sign a liability waiver before booking. By disabling this clients will not have to sign, but rather will only have to click a checkbox |
| switch | false | no | Tax-inclusive pricingWhen enabled (tax-inclusive), the displayed price includes tax. For example, if a class costs $100 and tax is 10%, the displayed price will be $100 (tax included).When disabled (tax-exclusive), tax will be added on top |
| switch | true | no | Enable signed agreement termsWhen enabled, clients will be required to sign agreement terms before booking across the application |
| switch | false | no | Enable time clockThis will require all hourly employees to manually clock in when they start their shift and clock out when they complete their shift |
| switch | false | no | Enable shift schedulingWhen enabled, your team can use shift scheduling in the dashboard (subject to role permissions) |
| switch | true | no | Disable Front Desk & Guest team members from adding clients as free or unpaidWhen enabled, the 'Front desk' and 'Guest' Team Member roles will not be able to add clients to classes as free nor unpaid |

## `/dashboard/settings/public-facing`

**Visible text**

- Public Facing Settings
- Save changes
- Profile
- Your public-facing business identity
- Profile photo
- Replace
- Page name
- Scheduling URL
- Changing your scheduling URL will change the links to your public page, including embeddable widgets
- app.arketa.co/
- Contact email
- Used for client inquiries and notifications
- Business Info
- Tell clients about your business and where to find you
- About
- Include information about your business, what you offer, and more
- Come join us at our studio, where we offer Reformer Pilates, Tower Pilates and Chair Pilates! If it's your first time, please book a Pilates Intro Pack class, regardless of experience!
- Website address
- Used in automated emails to direct clients back to your website
- Region
- Where your business is based
- London
- Mailing address
- Used for marketing emails and compliance
- Social
- Connect your social media links to your profile
- Instagram
- @
- Spotify

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Save changes | disabled |  |
| button | Replace | available |  |
| button | Remove image | available |  |
| input:file | [unlabelled] | available |  |
| input:text | Enter a name... | available |  |
| input:text | Domain or URL | available |  |
| input:text | Enter your contact email... | available |  |
| textarea | Come join us at our studio, where we offer Reformer Pilates, Tower Pilates and Chair Pilates! If it's your first time, please book a Pilates Intro Pack class, regardless of experience! | value configured |  |
| input:text | [url redacted] | available |  |
| combobox | London | available |  |
| combobox | Search for a mailing address… | value configured |  |
| input:text | Enter your username... | available |  |

**Opened select/dropdown options**

- Option group 1: Adelaide; Albuquerque; Anaheim; Anchorage; Appleton; Arlington; Atlanta; Auckland, New Zealand; Aurora; Austin; Bakersfield; Baltimore; Berlin; Birmingham, Alabama; Boise; Boston; Boulder; Buffalo; Calgary; Cape Cod; Chandler; Charleston; Charlotte; Chesapeake; Chicago; Chula Vista; Cincinnati; Cleveland; Colorado Springs; Columbus; Corpus Christi; Dallas; Denver; Detroit; Devon, England; Durham; El Paso; Fort Wayne; Fort Worth; Fremont; Fresno; Garland; Gilbert; Glendale; Gothenburg, Sweden; Greensboro; Halifax; Henderson; Hialeah; Honolulu; Houston; Indianapolis; Ireland; Irvine; Irving; Jacksonville; Jersey City; Kansas City; Laredo; Las Vegas; Lexington; Lincoln; London; Long Beach; Los Angeles; Louisville; Lubbock; Madison; Melbourne; Memphis; Mesa; Miami; Milwaukee; Minneapolis; Monterey; Nashville; New Orleans; New York; Newark; Norfolk; North Carolina; North Las Vegas; Oakland; Oklahoma City; Omaha; Orlando; Paradise; Paris; Philadelphia; Phoenix; Pittsburgh; Plano; Portland; Quito, Ecuador; Raleigh; Regina, Saskatchewan; Reno; Richmond; Riverside; Sacramento; Salem; San Antonio; San Diego; San Francisco; San Jose; San Juan Zona Urbana; Santa Ana; Scottsdale; Seattle; Sedona; Singapore; St. Louis; St. Paul; St. Petersburg; Stockton; Tampa; Toledo; Toronto; Tucson; Tulsa; Vancouver; Virginia Beach; Washington; Washington, D.C.; Wichita; Winston Salem
- Option group 2: menu was present but could not be read reliably without risking a state change.

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/locations`

**Visible text**

- Locations
- Name
- Address
- Phone
- Status

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Add new | available |  |
| input:checkbox | Column with Header Selection | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/team`

**Visible text**

- Sub Management
- Save changes
- Enable auto substitution management
- This will allow the team member to request substitute instructors when they have a scheduling conflict, vacation or illness.
- Manager approvals
- Require manager approval of accepted substitutions

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View FAQ | available |  |
| button | Save changes | available |  |
| switch | [unlabelled] | available |  |
| combobox | Require manager approval of accepted substitutions | available |  |

**Opened select/dropdown options**

- Option group 1: Auto approve requested substitutions; Require manager approval of accepted substitutions
- Option group 2: menu was present but could not be read reliably without risking a state change.

**Settings links**

- Settings: `/dashboard/settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| switch | true | no |  |

## `/dashboard/settings/taxes`

**Visible text**

- Taxes
- Add your sales taxes
- Add taxes to your products. The tax amount will be calculated at purchase.
- Create a tax

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View FAQ | available |  |
| button | Create a tax | available |  |

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/language-customization`

**Visible text**

- Language Customization
- Language Customizations
- Save changes
- Customize 'Appointment'
- private
- Customize 'Subscription'
- membership
- Customize 'Instructor'
- instructor

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View FAQ | available |  |
| button | Save changes | available |  |
| combobox | private | available |  |
| combobox | membership | available |  |
| combobox | instructor | available |  |

**Opened select/dropdown options**

- Option group 1: appointment; session; private; lesson
- Option group 2: menu was present but could not be read reliably without risking a state change.
- Option group 3: instructor; practitioner; guide; clinician; staff member; service; coach; teacher

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/revenue-categories`

**Visible text**

- Revenue Categories
- Categories
- Assignments
- Name
- Description
- Created
- Pilates Intro Pack
- All Pilates Intro Pack Purchases
- 3/24/2026
- Off-Peak
- All off-peak members
- Private Classes
- All Private Session purchases
- Pay-As-You-Go
- All PAYG members
- On-Peak
- All PAYG and MM
- 4/22/2026
- Monthly Membership
- All monthly members

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| radio | Categories | available |  |
| radio | Assignments | available |  |
| input:text | Search categories... | available |  |
| button | Add new | available |  |
| input:checkbox | Column with Header Selection | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |
| input:text | [unlabelled] | value configured |  |

**Settings links**

- Settings: `/dashboard/settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| radio | true | no | CategoriesAssignments |
| radio | false | no | CategoriesAssignments |
| checkbox | false | no | Column with Header Selection |

## `/dashboard/settings/offline-payment-types`

**Visible text**

- Payment Method Types
- Business settings
- Payment method types
- Active
- Archived
- Name
- Created
- No rows to show
- No payment method types yet
- 1 of 1 page

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| input:text | Search payment method types... | available |  |
| radio | Active | available |  |
| radio | Archived | available |  |
| input:checkbox | Column with Header Selection | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |
| input:text | [unlabelled] | value configured |  |

**Settings links**

- Settings: `/dashboard/settings`
- Business settings: `/dashboard/settings/business`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| radio | true | no | ActiveArchived |
| radio | false | no | ActiveArchived |
| checkbox | false | no | Column with Header Selection |

## `/dashboard/settings/faqs`

**Visible text**

- FAQs
- Answer client questions upfront
- Add frequently asked questions so clients can find answers about your studio, policies, and services on their own.
- Add New
- Setting Up the AI Chat Bot

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Add new | available |  |
| button | Add New | available |  |
| button | Setting Up the AI Chat Bot | available |  |

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/general-clients`

**Visible text**

- General Client Settings
- Save changes
- Milestone Preferences
- Configure how activities count toward client milestones
- Check-in Requirements
- Count only checked-in clients
- Enable this setting to count only checked-in clients towards your milestone celebrations
- Activity Types
- Count group classes
- Count appointments
- Count on-demand video views
- Count livestream experiences
- Marketing
- Default marketing preferences for new clients
- Opt-in clients to marketing emails by default
- Enable this setting to opt-in clients to marketing emails by default. Clients can still opt-out at any time. EU GDPR requires explicit consent for marketing emails, so make sure you have the right permissions before enabling this setting

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Save changes | available |  |
| switch | [unlabelled] | available |  |

**Settings links**

- Settings: `/dashboard/settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| switch | true | no |  |
| switch | false | no |  |

## `/dashboard/settings/required-signup-fields`

**Visible text**

- Required Sign-Up Fields
- Save changes
- Choose which fields are shown during client registration
- Phone Number
- Required
- Shipping Address
- Birthday
- Location
- ID Verification Upload
- Not included

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View FAQ | available |  |
| button | Save changes | disabled |  |
| combobox | Required | available |  |
| combobox | Not included | available |  |

**Opened select/dropdown options**

- Option group 1: Not included; Optional; Required
- Option group 2: menu was present but could not be read reliably without risking a state change.

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/custom-fields`

**Visible text**

- Custom Fields
- Ask customers for specific information at checkout so you can keep track of what's important to you
- Field
- Type
- Ask at Checkout
- Ask in Account Settings
- Preferred Studio
- Dropdown options
- Yes
- (Required)

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Add new | available |  |
| input:checkbox | Column with Header Selection | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/forms`

**Visible text**

- Forms
- Name
- Created
- Landing Page Link
- Brent Cross Town
- 01/07/2026
- [url redacted]
- PIP Lead Form
- 07/05/2026
- Showing 1 - 2 of 2 forms
- 1 of 1 page

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Add new | available |  |
| input:checkbox | Column with Header Selection | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |
| input:text | [unlabelled] | value configured |  |

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/family-sharing`

**Visible text**

- Family Sharing
- Save changes
- Control what can be shared and manage family relationships
- Enable family accounts
- This allows for select family members & friends to book and cancel scheduled events for one another
- Enable sharing of payment types
- This allows for the sharing of packages, memberships, and drop-ins, amongst select family members & friends
- Applies to
- Family sharing will only apply to what you select here
- All Offerings

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Save changes | disabled |  |
| switch | [unlabelled] | available |  |
| button | All Offerings | available |  |
| button | Remove All Offerings | available |  |

**Settings links**

- Settings: `/dashboard/settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| switch | true | no |  |

## `/dashboard/settings/tags`

**Visible text**

- Tags
- Name
- # Clients
- Check-in
- Brent Cross
- —
- Visible
- Cliente Pasivo
- Ex Client
- First Timers
- Ladies Only
- Lead Uninterested
- Level 1
- Level 2
- Level 3
- MD - TEST
- Off Peak
- PIP
- PIP Completed
- test
- Transition 2
- Transition 3
- Showing 1–16 of 16
- 1 of 1 page

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| input:text | Search tags... | available |  |
| button | Add new | available |  |
| input:checkbox | Column with Header Selection | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |
| input:text | [unlabelled] | value configured |  |

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/client-note-templates`

### default

**Visible text**

- Client note templates
- Open Clients
- Organization
- My templates
- New organization template
- No templates in this category
- Create a template your whole team can use when charting client notes.
- Create template

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| tab | OrganizationOrganization | available |  |
| tab | My templatesMy templates | available |  |
| button | New organization template | available |  |
| button | Create template | available |  |

**Settings links**

- Settings: `/dashboard/settings`

### tab:Organization

**Visible text**

- Client note templates
- Open Clients
- Organization
- My templates
- New organization template
- No templates in this category
- Create a template your whole team can use when charting client notes.
- Create template

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| tab | OrganizationOrganization | available |  |
| tab | My templatesMy templates | available |  |
| button | New organization template | available |  |
| button | Create template | available |  |

**Settings links**

- Settings: `/dashboard/settings`

### tab:My templates

**Visible text**

- Client note templates
- Open Clients
- Organization
- My templates
- New personal template
- No personal templates yet
- Save your own snippets for faster notes. Only you can see these.
- Create template

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| tab | OrganizationOrganization | available |  |
| tab | My templatesMy templates | available |  |
| button | New personal template | available |  |
| button | Create template | available |  |

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/lifecycle-settings/stages`

**Visible text**

- Lifecycle
- Stages
- Transitions
- Default
- Name
- Description
- Color
- First class done
- Did their first class
- First PIP Class Booked
- Booked PIP
- Fresh Lead

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| radio | Stages | available |  |
| radio | Transitions | available |  |
| button | Add new | available |  |
| input:checkbox | Column with Header Selection | available |  |
| radio | [unlabelled] | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |

**Settings links**

- Settings: `/dashboard/settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| radio | true | no | StagesTransitionsAdd new |
| radio | false | no | StagesTransitionsAdd new |
| checkbox | false | no | Column with Header Selection |
| radio | false | no |  |

## `/dashboard/settings/general-schedule`

**Visible text**

- General Schedule Settings
- Save changes
- Group Classes
- Privates
- Dashboard Calendar
- Display delayed classes on group class schedule
- This will display delayed classes on the group class schedule marked as 'Unavailable'. You may want to do this to show your clients that classes are coming soon, but not yet bookable
- Days in advance to create class series
- The number of days in advance to create class series. New classes are created daily at noon Pacific Time
- days
- Membership cancellation alert threshold
- Show cancellation alerts on the class roster for memberships canceling within this many days. Set to 0 to disable

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Save changes | available |  |
| radio | Group Classes | available |  |
| radio | Privates | available |  |
| radio | Dashboard Calendar | available |  |
| switch | [unlabelled] | available |  |
| input:number | [unlabelled] | value configured |  |

**Settings links**

- Settings: `/dashboard/settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| radio | true | no | Group ClassesPrivatesDashboard Calendar |
| radio | false | no | Group ClassesPrivatesDashboard Calendar |
| switch | false | no |  |

## `/dashboard/settings/booking-windows`

**Visible text**

- Booking Windows
- Manage scheduling windows and cancellation policies
- In-Person
- Livestream
- Appointments
- Service
- Booking Opens
- Booking Closes
- Cancel Closes
- Block Cancel
- Pilates Intro Pack Reformer
- 90
- days prior to start
- 0
- minutes prior to start
- 720
- Level 3 Reformer
- All Levels Tower
- Level 2 Tower
- Level 1 Reformer
- Level 2 Athletic Conditioning
- Level 3 Tower
- Level 2 Reformer
- Mix & Match
- Pilates Intro Pack Tower
- Level 2 Tower Off-Peak
- Pilates Barre
- Level 1 Athletic Conditioning
- All Levels Reformer
- Level 1 Reformer Off-Peak
- 1–15 of 19 services
- 1 of 2 pages

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| radio | In-Person | available |  |
| radio | Livestream | available |  |
| radio | Appointments | available |  |
| input:checkbox | Column with Header Selection | available |  |
| input:checkbox | Press Space to toggle row selection (unchecked) | available |  |
| checkbox | [unlabelled] | disabled |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |
| input:text | [unlabelled] | value configured |  |

**Settings links**

- Settings: `/dashboard/settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| radio | true | no | In-PersonLivestreamAppointments |
| radio | false | no | In-PersonLivestreamAppointments |
| checkbox | false | no | Column with Header Selection |
| checkbox | false | no | Press Space to toggle row selection (unchecked) |
| checkbox | false | yes |  |

## `/dashboard/settings/waitlist`

**Visible text**

- Waitlist
- Set how many clients can join the waitlist for each class
- Save changes
- Enable automated waitlist
- If a spot opens up before class, the next student on the list will be automatically enrolled
- Waitlist close window
- How long before class clients will be automatically enrolled. Set to 0 to auto-enroll at any time.
- min
- Waitlist credit hold
- Hold a credit when a client joins the waitlist, preventing them from booking other classes with the same credit
- Auto-assign spot when converting from waitlist
- Enable spot booking on your account to use this setting
- Hide waitlist position from clients
- Clients on the waitlist will see that they're waitlisted, but not their number in line
- In-Person
- Livestream
- Service
- Waitlist Limit
- Pilates Intro Pack Reformer
- 4
- spots
- Edit
- Level 3 Reformer
- All Levels Tower
- Level 2 Tower
- Level 1 Reformer
- Level 2 Athletic Conditioning
- Level 3 Tower
- Level 2 Reformer
- Mix & Match
- Pilates Intro Pack Tower
- Level 2 Tower Off-Peak
- Pilates Barre
- Level 1 Athletic Conditioning
- All Levels Reformer
- Level 1 Reformer Off-Peak
- 1–15 of 19 services
- 1 of 2 pages

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View FAQ | available |  |
| button | Save changes | disabled |  |
| switch | [unlabelled] | available |  |
| input:number | [unlabelled] | value configured |  |
| switch | [unlabelled] | disabled |  |
| radio | In-Person | available |  |
| radio | Livestream | available |  |
| input:checkbox | Column with Header Selection | available |  |
| input:checkbox | Press Space to toggle row selection (unchecked) | available |  |
| button | Edit | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |
| input:text | [unlabelled] | value configured |  |

**Settings links**

- Settings: `/dashboard/settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| switch | true | no |  |
| switch | false | no |  |
| switch | false | yes |  |
| radio | true | no | In-PersonLivestream |
| radio | false | no | In-PersonLivestream |
| checkbox | false | no | Column with Header Selection |
| checkbox | false | no | Press Space to toggle row selection (unchecked) |

## `/dashboard/settings/no-show-late-cancel`

**Visible text**

- No Show/Late Cancel Fees
- Save changes
- Track Late Cancel No Show
- Automatically apply policies every day at 12:00pm ET
- Required for policies to take effect
- Disable Report Emails
- Stop receiving daily email reports for late cancel and no show data
- Name
- Type
- Status
- Location
- 10 Class FLC
- Late Cancel
- —
- 100/30 for 6/20 for 4 FLC
- 40/30/20 Class FLC
- 50 Classes FLC
- Monthly Membership FLC
- 1–5 of 5 policies
- 1 of 1 page

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View report | available |  |
| button | View FAQ | available |  |
| button | Save changes | disabled |  |
| switch | [unlabelled] | available |  |
| input:text | Search policies... | available |  |
| button | Filters | available |  |
| button | Add new | available |  |
| input:checkbox | Column with Header Selection | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |
| input:text | [unlabelled] | value configured |  |

**Settings links**

- Settings: `/dashboard/settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| switch | true | no |  |
| switch | false | no |  |
| checkbox | false | no | Column with Header Selection |
| switch | true | no | 10 Class FLCLate Cancel— |
| switch | true | no | 100/30 for 6/20 for 4 FLCLate Cancel— |
| switch | true | no | 40/30/20 Class FLCLate Cancel— |
| switch | true | no | 50 Classes FLCLate Cancel— |
| switch | true | no | Monthly Membership FLCLate Cancel— |

## `/dashboard/settings/guest-list-booking`

**Visible text**

- Guest List Booking
- Manage which services allow guest list booking
- In-Person
- Livestream
- Service
- Guest List Access
- Pilates Intro Pack Reformer
- Level 3 Reformer
- All Levels Tower
- Level 2 Tower
- Level 1 Reformer
- Level 2 Athletic Conditioning
- Level 3 Tower
- Level 2 Reformer
- Mix & Match
- Pilates Intro Pack Tower
- Level 2 Tower Off-Peak
- Pilates Barre
- Level 1 Athletic Conditioning
- All Levels Reformer
- Level 1 Reformer Off-Peak
- 1–15 of 19 services
- 1 of 2 pages

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View FAQ | available |  |
| radio | In-Person | available |  |
| radio | Livestream | available |  |
| input:checkbox | Column with Header Selection | available |  |
| input:checkbox | Press Space to toggle row selection (unchecked) | available |  |
| switch | [unlabelled] | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |
| input:text | [unlabelled] | value configured |  |

**Settings links**

- Settings: `/dashboard/settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| radio | true | no | In-PersonLivestream |
| radio | false | no | In-PersonLivestream |
| checkbox | false | no | Column with Header Selection |
| checkbox | false | no | Press Space to toggle row selection (unchecked) |
| switch | true | no |  |
| switch | false | no |  |

## `/dashboard/settings/phone`

**Visible text**

- Phone Number
- Save changes
- Your phone number
- [phone redacted]
- Incoming calls
- Choose what happens when someone calls your number.
- Forward to a phone number
- United Kingdom (+44)
- Voicemail greeting
- Choose what callers hear before they leave a message. If you do not set a custom greeting, we will play the default Arketa message.
- Use text-to-speech
- Leave blank to use the default Arketa voicemail message.

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Save changes | available |  |
| combobox | Forward to a phone number | available |  |
| button | United Kingdom (+44) | available |  |
| input:text | Enter phone number | available |  |
| combobox | Use text-to-speech | available |  |
| textarea | We're sorry, the phone number you are calling can only receive text messages at this time. | value empty |  |

**Opened select/dropdown options**

- Option group 1: Answer in dashboard; Forward to a phone number; Send to voicemail
- Option group 2: menu was present but could not be read reliably without risking a state change.

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/texting`

**Visible text**

- Text Reminders
- Save changes
- Enable text reminders and notifications
- Clients with valid phone numbers who have opted in will receive text reminders and notifications
- Phone number requirement
- Choose whether clients are asked for a phone number during sign-up.
- Required

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Save changes | available |  |
| switch | [unlabelled] | available |  |
| combobox | Required | available |  |

**Opened select/dropdown options**

- Option group 1: Not included; Optional; Required
- Option group 2: menu was present but could not be read reliably without risking a state change.

**Settings links**

- Settings: `/dashboard/settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| switch | true | no |  |

## `/dashboard/settings/sign-up-forms`

**Visible text**

- Lead Form
- Save changes
- Customize
- Style your lead form to match your brand
- Colors
- Button color
- Background color
- Text color
- Fonts
- Primary (headings)
- Used for your booking widget heading and on-demand titles
- Playfair Display
- Secondary (body text)
- Used for everything else
- Marketing
- Lifecycle stage
- Fresh Lead
- Lead source
- Select a source
- Embed code
- Copy and paste to embed your marketing subscription form into your own website
- <iframe id="formIframe" src="[url redacted] width="100%" frameBorder="0" allow="payment;fullscreen" allowfullscreen></iframe> <script src="[url redacted]

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Save changes | disabled |  |
| input:color | [unlabelled] | available |  |
| input:text | [unlabelled] | value configured |  |
| combobox | Playfair Display | available |  |
| combobox | Fresh Lead | available |  |
| combobox | Select a source | available |  |
| button | Copy code | available |  |

**Opened select/dropdown options**

- Option group 1: Abeezee; Abel; Abhaya Libre; Abril Fatface; Aclonica; Acme; Actor; Adamina; Advent Pro; Aguafina Script; Aileron; Akaya Kanadaka; Akaya Telivigala; Akronim; Aladin; Alata; Alatsi; Aldrich; Alef; Alegreya; Alegreya Sans; Alegreya Sans Sc; Alegreya Sc; Aleo; Alex Brush; Alfa Slab One; Alice; Alike; Alike Angular; Allan; Allerta; Allerta Stencil; Allura; Almarai; Almendra; Almendra Display; Almendra Sc; Amarante; Amaranth; Amatic Sc; Amethysta; Amiko; Amiri; Amita; Anaheim; Andada; Andika; Andika New Basic; Angkor; Annie Use Your Telescope; Anonymous Pro; Antic; Antic Didone; Antic Slab; Anton; Arapey; Arbutus; Arbutus Slab; Architects Daughter; Archivo; Archivo Black; Archivo Narrow; Aref Ruqaa; Arima Madurai; Arimo; Arizonia; Armata; Arsenal; Artifika; Arvo; Arya; Asap; Asap Condensed; Asar; Asset; Assistant; Astloch; Asul; Athiti; Atma; Atomic Age; Aubrey; Audiowide; Autour One; Average; Average Sans; Averia Gruesa Libre; Averia Libre; Averia Sans Libre; Averia Serif Libre; B612; B612 Mono; Bad Script; Bahiana; Bahianita; Bai Jamjuree; Ballet; Baloo 2; Baloo Bhai 2; Baloo Bhaina 2; Baloo Chettan 2; Baloo Da 2; Baloo Paaji 2; Baloo Tamma 2; Baloo Tammudu 2; Baloo Thambi 2; Balsamiq Sans; Balthazar; Bangers; Barlow; Barlow Condensed; Barlow Semi Condensed; Barriecito; Barrio; Basic; Baskervville; Battambang; Baumans; Bayon; Be Vietnam; Bebas Neue; Belgrano; Bellefair; Belleza; Bellota; Bellota Text; Benchnine; Benne; Bentham; Berkshire Swash; Beth Ellen; Bevan; Big Shoulders Display; Big Shoulders Inline Display; Big Shoulders Inline Text; Big Shoulders Stencil Display; Big Shoulders Stencil Text; Big Shoulders Text; Bigelow Rules; Bigshot One; Bilbo; Bilbo Swash Caps; Biorhyme; Biorhyme Expanded; Biryani; Bitter; Black And White Picture; Black Han Sans; Black Ops One; Blackout Midnight
- Option group 2: menu was present but could not be read reliably without risking a state change.
- Option group 3: First class done; First PIP Class Booked; Fresh Lead
- Option group 4: Facebook; Google; Organic Search; Walk-in; Referral; Direct Traffic; Chat Bot; Guest Reservation

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/email-settings/domains`

**Visible text**

- Email Settings
- At least one verified domain and one verified sender address are required for outbound emails
- Addresses & Domains
- Design & Details
- Sender Domains
- Add and verify domains for outbound email
- Domain
- Subdomain
- Status
- elestudio.uk
- ark20114
- Verified
- Sender Addresses
- Add and verify email sender addresses
- Address
- Default sender name
- [email redacted]
- el Estudio Pilates
- El Estudio Wembley Park

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| radio | Addresses & Domains | available |  |
| radio | Design & Details | available |  |
| button | Refresh domains | available |  |
| button | Add domain | available |  |
| input:checkbox | Column with Header Selection | available |  |
| button | elestudio.uk | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |
| button | Refresh addresses | available |  |
| button | Add address | available |  |
| button | [email redacted] | available |  |

**Settings links**

- Settings: `/dashboard/settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| radio | true | no | Addresses & DomainsDesign & Details |
| radio | false | no | Addresses & DomainsDesign & Details |
| checkbox | false | no | Column with Header Selection |

## `/dashboard/settings/transactional-emails`

**Visible text**

- Transactional Emails
- 1 of 0 page

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| input:text | Search emails... | available |  |
| input:text | [unlabelled] | value configured |  |

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/sent-transactional-messages`

**Visible text**

- Sent Transactional Messages
- Transactional emails
- Sent at
- Channel
- Recipient
- Subject/Content
- Status
- 18 Jul 2026, 11:16 BST
- SMS
- Satvinder Kaur Oberoi [phone redacted]
- Reminder, you're booked for Level 2 Tower with Anna Zurowska in 45 minutes
- Sent
- safinah lubega [phone redacted]
- Romana Izakovicova [phone redacted]
- Stephanie Hyun [phone redacted]
- Joanne Reba Philip [phone redacted]
- Anna Mietkowska [phone redacted]
- Najwa Saleh [phone redacted]
- Matthew Johnson [phone redacted]
- 18 Jul 2026, 11:01 BST
- Rohini Mukerji [phone redacted]
- Reminder, you're booked for Level 1 Tower with Anna Zurowska in 24 hours
- Peri Yersen [phone redacted]
- 18 Jul 2026, 10:16 BST
- Aditi Agrawal [phone redacted]
- Reminder, you're booked for Level 1 Athletic Conditioning with Anna Zurowska in 45 minutes
- Patrycja Wnuk [phone redacted]
- Nana Balser [phone redacted]
- Sarah Jones [phone redacted]
- 18 Jul 2026, 10:01 BST
- Nivetha Premanand [phone redacted]
- Reminder, you're booked for Level 2 Athletic Conditioning with Anna Zurowska in 24 hours
- SYLVIE GENEVIEVE BOJ [phone redacted]
- 18 Jul 2026, 09:16 BST
- Ahmed Noor Hossain [phone redacted]
- Reminder, you're booked for Level 1 Tower with Anna Zurowska in 45 minutes
- Showing 1 to 20 of 20+ rows
- 1 of 1 page

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| input:text | Search by recipient... | available |  |
| button | Filters | available |  |
| input:checkbox | Column with Header Selection | available |  |
| button | Satvinder Kaur Oberoi [phone redacted] | available |  |
| button | safinah lubega [phone redacted] | available |  |
| button | Romana Izakovicova [phone redacted] | available |  |
| button | Stephanie Hyun [phone redacted] | available |  |
| button | Joanne Reba Philip [phone redacted] | available |  |
| button | Anna Mietkowska [phone redacted] | available |  |
| button | Najwa Saleh [phone redacted] | available |  |
| button | Matthew Johnson [phone redacted] | available |  |
| button | Rohini Mukerji [phone redacted] | available |  |
| button | Peri Yersen [phone redacted] | available |  |
| button | Aditi Agrawal [phone redacted] | available |  |
| button | Patrycja Wnuk [phone redacted] | available |  |
| button | Nana Balser [phone redacted] | available |  |
| button | Sarah Jones [phone redacted] | available |  |
| button | Nivetha Premanand [phone redacted] | available |  |
| button | SYLVIE GENEVIEVE BOJ [phone redacted] | available |  |
| button | Ahmed Noor Hossain [phone redacted] | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Transactional emails: `/dashboard/settings/transactional-emails`

## `/dashboard/settings/confirmation-emails`

**Visible text**

- Confirmation Emails
- Type: All
- Name
- Type
- Body
- Pilates Intro Pack Reformer
- In Person
- —
- Private Class
- Private
- Level 3 Reformer
- All Levels Tower
- Level 2 Tower
- Level 1 Reformer
- Level 2 Athletic Conditioning
- Level 3 Tower
- Level 2 Reformer
- Mix & Match
- Pilates Intro Pack Tower
- Level 2 Tower Off-Peak
- Pilates Barre
- Level 1 Athletic Conditioning
- All Levels Reformer
- Level 1 Reformer Off-Peak
- Level 2 Just the Chair
- Level 2 Reformer Off-Peak
- Level 1 Tower
- Level 1 Tower Off-Peak
- Edit

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| input:text | Search services... | available |  |
| button | Type: All | available |  |
| input:checkbox | Column with Header Selection | available |  |
| button | Edit | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/macros`

**Visible text**

- Quick Replies
- Respond faster with saved messages
- Create quick replies for common questions so you can get back to clients in seconds.
- Add New
- Inbox Features

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| input:text | Search by name or tags... | available |  |
| button | Add new | available |  |
| button | Add New | available |  |
| button | Inbox Features | available |  |

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/email-suppression`

**Visible text**

- Email Suppression List
- Emails on this list will not receive any communications. Remove emails to allow them again
- Email Address
- Reason
- Date Added
- [email redacted]
- Received event of type: Bounce
- 18 Jul 2026, 08:22
- 17 Jul 2026, 19:49
- 17 Jul 2026, 19:48
- 17 Jul 2026, 15:12
- 17 Jul 2026, 10:59
- 17 Jul 2026, 09:29
- 16 Jul 2026, 22:27
- 16 Jul 2026, 18:09
- 16 Jul 2026, 17:38
- 16 Jul 2026, 17:33
- 16 Jul 2026, 17:17
- 16 Jul 2026, 17:16
- 16 Jul 2026, 17:15
- 16 Jul 2026, 13:28
- 15 Jul 2026, 23:43
- 15 Jul 2026, 18:13
- 15 Jul 2026, 18:03
- 15 Jul 2026, 13:28
- 15 Jul 2026, 02:03
- 14 Jul 2026, 20:24
- 14 Jul 2026, 14:56
- 14 Jul 2026, 13:30
- Remove
- 1 - 50 of 848 emails
- 1 of 17 pages

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| input:text | Search by email address... | available |  |
| button | Remove all | available |  |
| input:checkbox | Column with Header Selection | available |  |
| button | Remove | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |
| input:text | [unlabelled] | value configured |  |

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/payments`

**Visible text**

- Payments
- Manage payouts, bank accounts, and payment settings
- Payment Settings
- Edit
- Manage how you pay people
- GBP
- Currency
- Absorbed by business owner
- Processing fees
- Off
- System-wide Tax
- N/A
- Tax Name
- 0%
- Tax Rate
- Branding settings
- Statement descriptor, colors, and logos for checkout and receipts
- EL ESTUDIO WEMBLEY P
- Statement descriptor
- #000000
- Primary color
- Secondary color
- Business icon
- Business logo

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Update account | available |  |
| button | Edit | available |  |

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/integration`

**Visible text**

- Integrations
- Apple Pay
- Arketa Partner API
- Claude & AI assistants
- ClassPass
- Facebook
- Google
- Kisi
- Mailchimp
- Spivi
- Wellhub (Gympass)
- Zapier
- Zoom

**Settings links**

- Settings: `/dashboard/settings`
- Apple Pay: `/dashboard/settings/integration/apple-pay`
- Arketa Partner API: `/dashboard/settings/integration/partner-api`
- Claude & AI assistants: `/dashboard/settings/integration/ai-assistants`
- ClassPass: `/dashboard/settings/integration/classpass`
- Facebook: `/dashboard/settings/integration/facebook`
- Google: `/dashboard/settings/integration/google`
- Kisi: `/dashboard/settings/integration/kisi`
- Mailchimp: `/dashboard/settings/integration/mailchimp`
- Spivi: `/dashboard/settings/integration/spivi`
- Wellhub (Gympass): `/dashboard/settings/integration/gympass`
- Zapier: `/dashboard/settings/integration/zapier`
- Zoom: `/dashboard/settings/integration/zoom`

## `/dashboard/settings/my-plan`

**Visible text**

- My Plan

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/early-booking`

**Visible text**

- Early Booking Privileges
- Give loyal members priority booking
- Set up early booking privileges so members with active plans can reserve their spots before the general public.
- Add new policy

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Add new policy | available |  |
| button | Early Booking Privileges | available |  |

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/discounts`

**Visible text**

- Discounts
- Code
- Status
- Percent / Amount
- Activation Date
- Expiration
- Limit
- ToLevel1
- Active
- 5%
- 11 May 2026
- 11 May 2031
- 1 month
- BackToPilates
- 10%
- 2 discounts
- 1 of 1 page

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View FAQ | available |  |
| input:text | Search discounts... | available |  |
| button | Add new | available |  |
| input:checkbox | Column with Header Selection | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |
| input:text | [unlabelled] | value configured |  |

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/staff/commissions`

**Visible text**

- Commissions
- Configure default commission settings for your staff members. Global rates apply to all products unless overridden by a category rate or individual product settings.
- Reset
- Save changes
- Enable commissions
- Pay staff a percentage or fixed amount on sales.

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Reset | disabled |  |
| button | Save changes | disabled |  |
| switch | [unlabelled] | available |  |
| input:checkbox | [unlabelled] | available |  |

**Settings links**

- Settings: `/dashboard/settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| switch | false | no | Enable commissionsPay staff a percentage or fixed amount on sales. |
| checkbox | false | no | Enable commissionsPay staff a percentage or fixed amount on sales. |

## `/dashboard/settings/integration/apple-pay`

**Visible text**

- Integrations
- Apple Pay
- Accept Apple Pay on your booking widget and storefront.
- app.arketa.co
- Website Integration
- Registered domains
- www.elestudio.uk
- Add domain

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | All integrations | available |  |
| input:text | www.example.com | available |  |
| button | Add domain | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Integrations: `/dashboard/settings/integration`
- All integrations: `/dashboard/settings/integration`

## `/dashboard/settings/integration/partner-api`

**Visible text**

- Integrations
- Partner Api
- Arketa Partner API
- Build your own integrations with the Arketa REST API.
- View API docs
- Generate an API key, then use it with your Partner ID to authenticate API requests.
- Generate API key

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View FAQ | available |  |
| button | View API docs | available |  |
| button | All integrations | available |  |
| button | Generate API key | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Integrations: `/dashboard/settings/integration`
- All integrations: `/dashboard/settings/integration`

## `/dashboard/settings/integration/ai-assistants`

**Visible text**

- Integrations
- Ai Assistants
- Claude & AI assistants
- Connect your reporting to Claude or any MCP-compatible AI assistant.
- Connect your Arketa reporting to Claude or any MCP-compatible AI assistant. Paste the connection URL below as a custom connector — your API key is already included, so there's nothing else to set up.
- Generate a connection to get your ready-to-paste URL. This creates a Partner API key that the assistant uses to read your reporting.
- Generate connection URL

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | All integrations | available |  |
| button | Generate connection URL | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Integrations: `/dashboard/settings/integration`
- All integrations: `/dashboard/settings/integration`

## `/dashboard/settings/integration/classpass`

**Visible text**

- Integrations
- Classpass
- ClassPass
- Accept bookings from ClassPass members directly into your schedule.
- Enable ClassPass so members can book your group classes from the ClassPass app.
- Enable

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View FAQ | available |  |
| button | All integrations | available |  |
| button | Enable | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Integrations: `/dashboard/settings/integration`
- All integrations: `/dashboard/settings/integration`

## `/dashboard/settings/integration/facebook`

**Visible text**

- Integrations
- Facebook
- Embed the Facebook pixel and capture leads from Facebook Marketing campaigns.
- Facebook Pixel
- Track bookings and purchases with Facebook Pixel (browser) and Conversions API (server). Subscribe fires on first payment; StartTrial on trial signup.
- Pixel ID: not set
- CAPI token: not set
- Facebook Pixel ID
- Conversions API access token
- No token saved yet.
- 1. Go to Events Manager → Data Sources → your Pixel → Settings.
- 2. Conversions API → Generate Access Token.
- 3. Copy the token (shown once) and paste below.
- Track subscription renewals (LTV)
- Sends a custom SubscriptionRenewed event on each paid renewal. Create a Custom Conversion in Events Manager for LTV reporting.
- Facebook Domain Verification Meta Tag
- Save

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View FAQ | available |  |
| button | All integrations | available |  |
| input:text | Paste Facebook Pixel ID here... | available |  |
| textarea | Paste new token to replace existing | value empty |  |
| checkbox | [unlabelled] | available |  |
| textarea | Paste Facebook Domain Verification Meta Tag here... | value empty |  |
| button | Save | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Integrations: `/dashboard/settings/integration`
- All integrations: `/dashboard/settings/integration`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| checkbox | false | no | Track subscription renewals (LTV)Sends a custom SubscriptionRenewed event on each paid renewal. Create a Custom Conversion in Events Manager for LTV reporting. |

## `/dashboard/settings/integration/google`

**Visible text**

- Integrations
- Google
- Sign-in, Calendar, Gmail, Business profile, and Reserve with Google in one place.
- Google Analytics & Tag Manager
- Track visitor metrics with Google Analytics and manage tracking tags with Google Tag Manager
- Google Tag Manager ID
- Google Analytics Tracking
- Header Code
- Add code at the end of the <head> tag
- Save
- Google Calendar
- Sync your Arketa Calendar with Google. Classes will be automatically added to your Google Calendar
- enable it for this instructor
- Reserve with Google
- Enable Reserve with Google integration. Book now button will show up when searching for your business on Google
- Enable
- Connect to Google Business for online testimonials
- Google Business profile
- Link your primary Google Business profile to collect reviews.
- Connect

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View FAQ | available |  |
| button | All integrations | available |  |
| input:text | Paste Google Tag Manager ID here... | available |  |
| input:text | Paste Google Analytics Tracking ID here... | available |  |
| textarea | Paste code at the end of the <head> tag here... | value empty |  |
| button | Save | available |  |
| button | Enable | available |  |
| button | Connect | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Integrations: `/dashboard/settings/integration`
- All integrations: `/dashboard/settings/integration`
- enable it for this instructor: `/dashboard/account-settings/integrations`

## `/dashboard/settings/integration/kisi`

**Visible text**

- Integrations
- Kisi
- Kisi Integration
- Config
- Locks
- Unlock history
- How to Connect Kisi to Arketa
- 1
- Access Your Kisi Dashboard
- Log into your Kisi dashboard at [url redacted]
- 2
- Navigate to API Settings
- Click on your email in the top right corner and select 'My Account' from the dropdown menu. Then select 'API' from the left sidebar menu.
- Create New API Key
- Click the 'Add API Key' button. If you see an existing 'Arketa' API key, you can delete it using the trash icon before creating a new one.
- 4
- Configure API Key
- Name your new API key 'Arketa' and enter your Kisi password to confirm the creation.
- 5
- Copy API Key
- After creation, you'll see your generated API key. Copy this key to your clipboard.
- 6
- Connect to Arketa
- Paste the API key into the field below and click 'Save API Key'.
- 7
- Verify Connection
- Once saved, your connected Kisi locks will appear below. You can test each lock's connection using the 'Test Connection' button. If a lock fails to connect, ensure it's online in your Kisi dashboard. For assistance with offline locks, contact Kisi support or reach out to Arketa support through the chat widget.
- Note:
- API Key Configuration
- API Key
- Save API Key

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View FAQ | available |  |
| button | All integrations | available |  |
| radio | Config | available |  |
| radio | Locks | available |  |
| radio | Unlock history | available |  |
| input:password | Enter your Kisi API key | value empty |  |
| button | Show password | available |  |
| button | Save API Key | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Integrations: `/dashboard/settings/integration`
- All integrations: `/dashboard/settings/integration`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| radio | true | no | ConfigLocksUnlock history |
| radio | false | no | ConfigLocksUnlock history |

## `/dashboard/settings/integration/mailchimp`

**Visible text**

- Integrations
- Mailchimp
- Sync clients to a Mailchimp audience for marketing emails and automations.
- Connect your Mailchimp account to start syncing clients to an audience.
- Connect

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View FAQ | available |  |
| button | All integrations | available |  |
| button | Connect | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Integrations: `/dashboard/settings/integration`
- All integrations: `/dashboard/settings/integration`

## `/dashboard/settings/integration/spivi`

**Visible text**

- Integrations
- Spivi
- Track performance metrics — heart rate, power, cadence — across your cycling classes.
- Enable Spivi to start tracking heart rate, power, cadence, and other performance metrics.
- Enable

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | All integrations | available |  |
| button | Enable | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Integrations: `/dashboard/settings/integration`
- All integrations: `/dashboard/settings/integration`

## `/dashboard/settings/integration/gympass`

**Visible text**

- Integrations
- Wellhub
- Wellhub Settings
- Disable
- Live classes
- Global Wellhub Gym ID used for virtual / live-streamed classes
- Locations
- Configure a Wellhub Gym ID for each physical location
- Wembley Park

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View FAQ | available |  |
| button | Disable | available |  |
| input:text | Wellhub Gym ID | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Integrations: `/dashboard/settings/integration`

## `/dashboard/settings/integration/zapier`

**Visible text**

- Integrations
- Zapier
- Connect Arketa to 5,000+ apps with no-code automations.
- Generate an API key, then connect it in Zapier to automate workflows with Arketa.
- Generate API key

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View FAQ | available |  |
| button | View demo | available |  |
| button | All integrations | available |  |
| button | Generate API key | disabled |  |
| button | Invite | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Integrations: `/dashboard/settings/integration`
- All integrations: `/dashboard/settings/integration`

## `/dashboard/settings/integration/zoom`

**Visible text**

- Integrations
- Zoom
- Auto-create Zoom meetings when you schedule virtual or live-streamed classes.
- Connect a Zoom account to auto-create meetings for virtual classes.
- Connect

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | All integrations | available |  |
| button | Connect | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Integrations: `/dashboard/settings/integration`
- All integrations: `/dashboard/settings/integration`

## `/dashboard/settings/integration/gmail/blocked-emails`

**Visible text**

- Integrations
- Blocked Emails
- Email blocked senders
- Email address
- Added
- No rows to show
- No blocked senders yet
- 1 of 1 page

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Settings | available |  |
| button | Integrations | available |  |
| input:text | Search blocked senders... | available |  |
| button | Block a sender | available |  |
| input:checkbox | Column with Header Selection | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |
| input:text | [unlabelled] | value configured |  |

**Settings links**

- Settings: `/dashboard/settings`
- Integrations: `/dashboard/settings/integration`

## `/dashboard/settings/atlas`

**Visible text**

- Front Desk AI

**Settings links**

- Settings: `/dashboard/settings`

## `/dashboard/settings/email-settings`

**Visible text**

- Email Settings
- At least one verified domain and one verified sender address are required for outbound emails
- Addresses & Domains
- Design & Details
- Sender Domains
- Add and verify domains for outbound email
- Domain
- Subdomain
- Status
- elestudio.uk
- ark20114
- Verified
- Sender Addresses
- Add and verify email sender addresses
- Address
- Default sender name
- [email redacted]
- el Estudio Pilates
- El Estudio Wembley Park

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| radio | Addresses & Domains | available |  |
| radio | Design & Details | available |  |
| button | Refresh domains | available |  |
| button | Add domain | available |  |
| input:checkbox | Column with Header Selection | available |  |
| button | elestudio.uk | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |
| button | Refresh addresses | available |  |
| button | Add address | available |  |
| button | [email redacted] | available |  |

**Settings links**

- Settings: `/dashboard/settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| radio | true | no | Addresses & DomainsDesign & Details |
| radio | false | no | Addresses & DomainsDesign & Details |
| checkbox | false | no | Column with Header Selection |

## `/dashboard/settings/forms/create`

**Visible text**

- Forms
- Create
- Create new form
- Cancel
- Save changes
- Details
- Name
- Title
- Displayed on the public form page. Does not display on checkout pages.
- Subtitle
- Redirect URL
- Where users will be redirected after form submission.
- Custom lifecycle stage
- Default from settings
- If not selected, follows the default lead stage defined in settings.
- Custom lead source
- If left blank, defaults to 'form response'.
- Show one time only
- Students will only be asked to fill this out once
- Submission Message
- Submitted text
- Form Styling
- Background color
- Text color
- Primary color
- Visibility
- Leave empty if you're using this for embedded forms or landing pages
- Show for these service categories
- Select service categories...
- Show for these templates
- Select templates...
- Show for these pricing options and communities
- Select offerings...
- Preview
- Form
- Submitted
- First Name *
- Last Name *
- Email *
- Submit

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Cancel | available |  |
| button | Save changes | available |  |
| input:text | Enter the title displayed on the public form | available |  |
| input:text | Enter the subtitle displayed on the public form | available |  |
| input:text | [url redacted] | available |  |
| combobox | Default from settings | available |  |
| select | Default from settingsFirst class doneFirst PIP Class BookedFresh Lead | selection configured | Default from settings; First class done; First PIP Class Booked; Fresh Lead |
| input:text | Enter custom lead source | available |  |
| checkbox | [unlabelled] | available |  |
| input:checkbox | [unlabelled] | available |  |
| input:text | Your submission has been received. | available |  |
| input:color | Background color swatch | available |  |
| input:text | #000000 | value configured |  |
| input:color | Text color swatch | available |  |
| input:color | Primary color swatch | available |  |
| button | Select service categories... | available |  |
| button | Select templates... | available |  |
| button | Select offerings... | available |  |
| button | Add new field | available |  |
| button | Form | available |  |
| button | Submitted | available |  |
| input:text | [unlabelled] | value empty |  |
| input:email | [unlabelled] | value empty |  |
| button | Submit | available |  |

**Opened select/dropdown options**

- Option group 1: Default from settings; First class done; First PIP Class Booked; Fresh Lead
- Option group 2: menu was present but could not be read reliably without risking a state change.

**Settings links**

- Settings: `/dashboard/settings`
- Forms: `/dashboard/settings/forms`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| checkbox | false | no | Show one time onlyStudents will only be asked to fill this out once |

## `/dashboard/settings/macros/new`

**Visible text**

- Quick Replies
- New
- New Quick Reply
- Name
- Content
- (optional)
- Press Enter or Tab to add a tag. Backspace to remove.
- Active
- Inactive quick replies won't be available for use
- Save
- Cancel

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| input:text | Enter quick reply name | available |  |
| textarea | Enter quick reply content | value empty |  |
| textarea | Enter description for this quick reply | value empty |  |
| input:text | Type a tag and press Enter | available |  |
| switch | [unlabelled] | available |  |
| input:checkbox | [unlabelled] | available |  |
| button | Save | available |  |
| button | Cancel | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Quick Replies: `/dashboard/settings/macros`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| switch | true | no |  |
| checkbox | true | no |  |

## `/dashboard/settings/payroll`

**Visible text**

- Payroll Settings
- General
- Configure how payroll is calculated and processed for your team
- General Settings
- Organization Details
- Configure your payroll schedule and preferences
- Pay frequency
- How often you run payroll to pay your team
- First period end date
- The last day of your first pay period — the timeframe employees are being paid for.
- Select date
- Pay date
- When your team is paid for the first pay period. Must be a future date.
- Save Settings

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | General Settings | available |  |
| button | Organization Details | available |  |
| select | Weekly — Employees are paid every week, resulting in 52 pay periods per year.Biweekly — Employees are paid every two weeks (every other Friday, for example), resulting in 26 pay periods per year.Semi-monthly — Employees are paid twice per month on fixed dates (e.g., the 1st and 15th), resulting in 24 pay periods per year.Monthly — Employees are paid once per month, resulting in 12 pay periods per year. | selection configured | Weekly — Employees are paid every week, resulting in 52 pay periods per year.; Biweekly — Employees are paid every two weeks (every other Friday, for example), resulting in 26 pay periods per year.; Semi-monthly — Employees are paid twice per month on fixed dates (e.g., the 1st and 15th), resulting in 24 pay periods per year.; Monthly — Employees are paid once per month, resulting in 12 pay periods per year. |
| button | Select date | available |  |
| button | Save Settings | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Payroll Settings: `/dashboard/settings/payroll`
- General Settings: `/dashboard/settings/payroll/general`
- Organization Details: `/dashboard/settings/payroll/organization`

## `/dashboard/settings/payroll/general`

**Visible text**

- Payroll Settings
- General
- Configure how payroll is calculated and processed for your team
- General Settings
- Organization Details
- Configure your payroll schedule and preferences
- Pay frequency
- How often you run payroll to pay your team
- First period end date
- The last day of your first pay period — the timeframe employees are being paid for.
- Select date
- Pay date
- When your team is paid for the first pay period. Must be a future date.
- Save Settings

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | General Settings | available |  |
| button | Organization Details | available |  |
| select | Weekly — Employees are paid every week, resulting in 52 pay periods per year.Biweekly — Employees are paid every two weeks (every other Friday, for example), resulting in 26 pay periods per year.Semi-monthly — Employees are paid twice per month on fixed dates (e.g., the 1st and 15th), resulting in 24 pay periods per year.Monthly — Employees are paid once per month, resulting in 12 pay periods per year. | selection configured | Weekly — Employees are paid every week, resulting in 52 pay periods per year.; Biweekly — Employees are paid every two weeks (every other Friday, for example), resulting in 26 pay periods per year.; Semi-monthly — Employees are paid twice per month on fixed dates (e.g., the 1st and 15th), resulting in 24 pay periods per year.; Monthly — Employees are paid once per month, resulting in 12 pay periods per year. |
| button | Select date | available |  |
| button | Save Settings | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Payroll Settings: `/dashboard/settings/payroll`
- General Settings: `/dashboard/settings/payroll/general`
- Organization Details: `/dashboard/settings/payroll/organization`

## `/dashboard/settings/public-page`

**Visible text**

- Public Page
- Website Integration
- Save changes
- Styles
- Button Color
- Pick a color that fits your brand!
- Background Color
- The background color of your scheduling page
- Text Color
- The color of the text on your scheduling page
- Primary Font
- Used for your booking widget heading and on-demand titles
- Inter
- Secondary Font
- Used for everything else
- Widgets
- Profile Widget
- Great for Instagram link-in-bio! Share your schedule and pricing options.
- Open link
- Get the widget
- Schedule Widget
- Great for Instagram link-in-bio! Only share your upcoming schedule
- New!
- Learn more
- Embeds
- Schedule
- Copy and paste to embed your schedule in your own website
- <iframe id="sutraWidgetIframe" src="[url redacted] width="100%" frameBorder="0" allow="payment;fullscreen" allowfullscreen></iframe> <script src="[url redacted] </script>
- Schedule with a Calendar View
- Copy and paste to embed your schedule calendar into your own website
- Week starts on
- This will affect the week start day in the public calendar widget.
- Sunday
- Monday
- On-Demand Library
- Copy and paste to embed your on-demand library into your own website
- On-Demand Library with Featured Categories
- Pricing Options
- Copy and paste to embed your pricing options into your own website
- Click here
- Account Information Widget
- Copy and paste to embed your students' bookings, purchases, and account information
- Calendar Availability
- Copy and paste to embed your private calendar availability into your own website
- Gift Card Page
- Copy and paste to embed your gift card page into your own website
- List of All Your Communities
- Copy and paste to embed your communities page into your own website
- Events Page
- Copy and paste to embed only your upcoming events
- Online Shop
- Copy and paste to embed your online shop into your own website
- Pickup Enabled
- Delivery Enabled
- FAQs
- Copy and paste to embed your FAQs into your own website

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | Save changes | disabled |  |
| input:color | Button Color picker | available |  |
| input:text | #ffffff | available |  |
| input:color | Background Color picker | available |  |
| input:color | Text Color picker | available |  |
| combobox | Inter | available |  |
| select | AbeezeeAbelAbhaya LibreAbril FatfaceAclonicaAcmeActorAdaminaAdvent ProAguafina ScriptAileronAkaya KanadakaAkaya TelivigalaAkronimAladinAlataAlatsiAldrichAlefAlegreyaAlegreya SansAlegreya Sans ScAlegreya ScAleoAlex BrushAlfa Slab OneAliceAlikeAlike AngularAllanAllertaAllerta StencilAlluraAlmaraiAlmendraAlmendra DisplayAlmendra ScAmaranteAmaranthAmatic ScAmethystaAmikoAmiriAmitaAnaheimAndadaAndikaAndika New BasicAngkorAnnie Use Your TelescopeAnonymous ProAnticAntic DidoneAntic SlabAntonArapeyArbutusArbutus SlabArchitects DaughterArchivoArchivo BlackArchivo NarrowAref RuqaaArima MaduraiArimoArizoniaArmataArsenalArtifikaArvoAryaAsapAsap CondensedAsarAssetAssistantAstlochAsulAthitiAtmaAtomic AgeAubreyAudiowideAutour OneAverageAverage SansAveria Gruesa LibreAveria LibreAveria Sans LibreAveria Serif LibreB612B612 MonoBad ScriptBahianaBahianitaBai JamjureeBalletBaloo 2Baloo Bhai 2Baloo Bhaina 2Baloo Chettan 2Baloo Da 2Baloo Paaji 2Baloo Tamma 2Baloo Tammudu 2Baloo Thambi 2Balsamiq SansBalthazarBangersBarlowBarlow CondensedBarlow Semi CondensedBarriecitoBarrioBasicBaskervvilleBattambangBaumansBayonBe VietnamBebas NeueBelgranoBellefairBellezaBellotaBellota TextBenchnineBenneBenthamBerkshire SwashBeth EllenBevanBig Shoulders DisplayBig Shoulders Inline DisplayBig Shoulders Inline TextBig Shoulders Stencil DisplayBig Shoulders Stencil TextBig Shoulders TextBigelow RulesBigshot OneBilboBilbo Swash CapsBiorhymeBiorhyme ExpandedBiryaniBitterBlack And White PictureBlack Han SansBlack Ops OneBlackout MidnightBlackout SunriseBlackout Two AmBlinkerBodoni ModaBokorBonbonBoogalooBowlby OneBowlby One ScBrawlerBree SerifBricolage GrotesqueBrygada 1918Bubblegum SansBubbler OneBudaBuenardBungeeBungee HairlineBungee InlineBungee OutlineBungee ShadeButchermanButterfly KidsCabinCabin CondensedCabin SketchCaesar DressingCagliostroCairoCaladeaCalistogaCalligraffittiCambayCamboCandalCantarellCantata OneCantora OneCapriolaCardoCarlitoCarmeCarrois GothicCarrois Gothic ScCarter OneCascadia CodeCascadia MonoCastoroCatamaranCaudexCaveatCaveat BrushCedarville CursiveCeviche OneChakra PetchChangaChanga OneChangoCharis SilCharmCharmonmanChathuraChau Philomene OneChela OneChelsea MarketChenlaCherry Cream SodaCherry SwashChewyChicleChilankaChivoChonburiChunk FiveCinzelCinzel DecorativeClear SansClicker ScriptCodaCoda CaptionCodystarCoinyComboComfortaaComic MonoComic NeueComing SoonCommissionerConcert OneCondimentContentContrail OneConvergenceCookieCooper HewittCopseCorbenCormorantCormorant GaramondCormorant InfantCormorant ScCormorant UnicaseCormorant UprightCourgetteCourier PrimeCousineCoustardCovered By Your GraceCrafty GirlsCreepsterCrete RoundCrimson ProCrimson TextCroissant OneCrushedCuprumCute FontCutiveCutive MonoDamionDancing ScriptDangrekDarker GrotesqueDavid LibreDawning Of A New DayDays OneDekkoDeliusDelius Swash CapsDelius UnicaseDella RespiraDenk OneDevonshireDhurjatiDidact GothicDiplomataDiplomata ScDm MonoDm SansDm Serif DisplayDm Serif TextDo HyeonDokdoDomineDonegal OneDoppio OneDorsaDosisDotgothic16Dr SugiyamaDseg WeatherDseg14Dseg7Duru SansDynalightEagle LakeEast Sea DokdoEaterEb GaramondEconomicaEczarEl MessiriElectrolizeElsieElsie Swash CapsEmblema OneEmilys CandyEncode SansEncode Sans CondensedEncode Sans ExpandedEncode Sans Semi CondensedEncode Sans Semi ExpandedEngagementEnglebertEnriquetaEpilogueErica OneEstebanEuphoria ScriptEwertExoExo 2Expletus SansFahkwangFanwood TextFarroFarsanFascinateFascinate InlineFaster OneFasthandFauna OneFaustinaFederantFederoFelipaFenixFinger PaintFira CodeFira MonoFira SansFira Sans CondensedFira Sans Extra CondensedFiragoFjalla OneFjord OneFlamencoFlavorsFondamentoFontdiner SwankyForumFrancois OneFrank Ruhl LibreFrauncesFreckle FaceFredericka The GreatFredoka OneFreehandFrescaFrijoleFrukturFugaz OneGabrielaGaeguGafataGaladaGaldeanoGalindoGamja FlowerGayathriGelasioGentium BasicGentium Book BasicGeoGeostarGeostar FillGermania OneGfs DidotGfs NeohellenicGiduguGilda DisplayGirassolGive You GloryGlass AntiquaGlegooGloria HallelujahGoblin OneGochi HandGoldmanGorditasGothic A1GotuGoudy Bookletter 1911GraduateGrand HotelGrandstanderGravitas OneGreat VibesGrenzeGrenze GotischGriffyGruppoGudeaGugiGupterGurajadaHabibiHachi Maru PopHalantHammersmith OneHanaleiHanalei FillHandleeHanumanHappy MonkeyHarmattanHeadland OneHeeboHelvetica NeueHenny PennyHepta SlabHerr Von MuellerhoffHi MelodyHindHind GunturHind MaduraiHind SiliguriHind VadodaraHoltwood One ScHomemade AppleHomenajeIbarra Real NovaIbm Plex MonoIbm Plex SansIbm Plex Sans CondensedIbm Plex SerifIcebergIcelandIm Fell Double PicaIm Fell Double Pica ScIm Fell Dw PicaIm Fell Dw Pica ScIm Fell EnglishIm Fell English ScIm Fell French CanonIm Fell French Canon ScIm Fell Great PrimerIm Fell Great Primer ScImbueImprimaInconsolataInderIndie FlowerInikaInknut AntiquaInria SansInria SerifInterIrish GroverIstok WebItalianaItaliannoItimJacques FrancoisJacques Francois ShadowJaldiJetbrains MonoJim NightshadeJockey OneJolly LodgerJomhuriaJomolhariJosefin SansJosefin SlabJostJoti OneJuaJudsonJuleeJulius Sans OneJunctionJungeJuraJust Another HandJust Me Again Down HereK2dKadwaKalamKameronKanitKantumruyKarlaKarmaKarmillaKatibehKaushan ScriptKavivanarKavoonKdam ThmorKeania OneKelly SlabKeniaKhandKhmerKhulaKirang HaerangKite OneKnewaveKodchasanKohoKosugiKosugi MaruKotta OneKoulenKrankyKreonKristiKrona OneKrubKufamKulim ParkKumar OneKumar One OutlineKumbh SansKuraleLa Belle AuroreLacquerLailaLakki ReddyLalezarLancelotLangarLateefLatoLeague GothicLeague Gothic CondensedLeague MonoLeague Mono CondensedLeague Mono ExtendedLeague Mono NarrowLeague Mono WideLeague ScriptLeague SpartanLeckerli OneLedgerLektonLemonLemonadaLexend DecaLexend ExaLexend GigaLexend MegaLexend PetaLexend TeraLexend ZettaLibre Barcode 128Libre Barcode 128 TextLibre Barcode 39Libre Barcode 39 ExtendedLibre Barcode 39 Extended TextLibre Barcode 39 TextLibre Barcode Ean13 TextLibre BaskervilleLibre Caslon DisplayLibre Caslon TextLibre FranklinLife SaversLilita OneLily Script OneLimelightLinden HillLiterataLiu Jian Mao CaoLivvicLobsterLobster TwoLondrina OutlineLondrina ShadowLondrina SketchLondrina SolidLong CangLoraLove Ya Like A SisterLoved By The KingLovers QuarrelLuckiest GuyLusitanaLustriaM Plus 1pM Plus Rounded 1cMa Shan ZhengMacondoMacondo Swash CapsMadaMagraMaiden OrangeMaitreeMajor Mono DisplayMakoMaliMallannaMandaliManjariManropeMansalvaManualeMarcellusMarcellus ScMarck ScriptMargarineMarkazi TextMarko OneMarmeladMartelMartel SansMarvelMateMate ScMaterial IconsMaven ProMclarenMeddonMedievalsharpMedula OneMeera InimaiMegrimMeie ScriptMeriendaMerienda OneMerriweatherMerriweather SansMetalMetal ManiaMetamorphousMetrophobicMetropolisMichromaMilongaMiltonianMiltonian TattooMinaMiniverMiriam LibreMirzaMiss FajardoseMitrModakModern AntiquaMograMolengoMolleMondaMonofettMononokiMonotonMonsieur La DoulaiseMontagaMontezMontserratMontserrat AlternatesMontserrat SubrayadaMoulMoulpaliMountains Of ChristmasMouse MemoirsMr BedfortMr DafoeMr De HavilandMrs Saint DelafieldMrs SheppardsMuktaMukta MaheeMukta MalarMukta VaaniMulishMuseomodernoMystery QuestNanum Brush ScriptNanum GothicNanum Gothic CodingNanum MyeongjoNanum Pen ScriptNerko OneNeuchaNeutonNew RockerNews CycleNewsreaderNiconneNiramitNixie OneNobileNokoraNoricanNosiferNotableNothing You Could DoNoticia TextNoto MonoNoto SansNoto Sans HkNoto Sans JpNoto Sans KrNoto Sans ScNoto Sans TcNoto SerifNoto Serif JpNoto Serif KrNoto Serif ScNoto Serif TcNova CutNova FlatNova MonoNova OvalNova RoundNova ScriptNova SlimNova SquareNtrNumansNunitoNunito SansOdibee SansOdor Mean CheyOffsideOiOld Standard TtOldenburgOleo ScriptOleo Script Swash CapsOpen SansOpen Sans CondensedOranienbaumOrbitronOreganoOrientaOriginal SurferOstrich SansOstrich Sans DashedOstrich Sans InlineOstrich Sans RoundedOswaldOver The RainbowOverlockOverlock ScOverpassOverpass MonoOvoOxaniumOxygenOxygen MonoPacificoPadaukPalanquinPalanquin DarkPangolinPaprikaParisiennePassero OnePassion OnePathway Gothic OnePatrick HandPatrick Hand ScPattayaPatua OnePavanamPaytone OnePeddanaPeraltaPermanent MarkerPetit Formal ScriptPetronaPhilosopherPiazzollaPiedraPinyon ScriptPirata OnePlasterPlayPlayballPlayfair DisplayPlayfair Display ScPlus Jakarta SansPodkovaPoiret OnePoller OnePolyPompierePontano SansPoor StoryPoppinsPort Lligat SansPort Lligat SlabPotta OnePragati NarrowPrataPreahvihearPress Start 2pPridiPrincess SofiaProcionoPromptProsto OneProza LibrePt MonoPt SansPt Sans CaptionPt Sans NarrowPt SerifPt Serif CaptionPublic SansPuritanPurple PurseQuandoQuanticoQuattrocentoQuattrocento SansQuestrialQuicksandQuintessentialQwigleyRacing Sans OneRadleyRajdhaniRakkasRalewayRaleway DotsRamabhadraRamarajaRamblaRammetto OneRanchersRanchoRangaRasaRationaleRavi PrakashRecursiveRed Hat DisplayRed Hat TextRed RoseRedressedReem KufiReenie BeanieReggae OneRevaliaRhodium LibreRibeyeRibeye MarrowRighteousRisqueRobotoRoboto CondensedRoboto MonoRoboto SlabRochesterRock SaltRocknroll OneRokkittRomanescoRopa SansRosarioRosarivoRouge ScriptRowdiesRozha OneRubikRubik Mono OneRudaRufinaRuge BoogieRulukoRum RaisinRuslan DisplayRusso OneRuthieRyeSacramentoSahityaSailSairaSaira CondensedSaira Extra CondensedSaira Semi CondensedSaira Stencil OneSalsaSanchezSancreekSansitaSansita SwashedSarabunSaralaSarinaSarpanchSatisfySawarabi GothicSawarabi MinchoScadaScheherazadeSchoolbellScope OneSeaweed ScriptSecular OneSedgwick AveSedgwick Ave DisplaySenSevillanaSeymour OneShadows Into LightShadows Into Light TwoShantiShareShare TechShare Tech MonoShippori MinchoShippori Mincho B1ShojumaruShort StackShrikhandSiemreapSigmar OneSignikaSignika NegativeSimonettaSingle DaySintonySirin StencilSix CapsSkranjiSlabo 13pxSlabo 27pxSlackeySmokumSmytheSnigletSnippetSnowburst OneSofadi OneSofiaSolwaySong MyungSonsie OneSoraSorts Mill GoudySource Code ProSource Sans ProSource Serif ProSpace GroteskSpace MonoSpartanSpecial EliteSpectralSpectral ScSpicy RiceSpline SansSpinnakerSpiraxSquada OneSree KrushnadevarayaSrirachaSrisakdiStaatlichesStalemateStalinist OneStardos StencilStickStint Ultra CondensedStint Ultra ExpandedStokeStraitStylishSue Ellen FranciscoSuez OneSulphur PointSumanaSunflowerSunshineySupermercado OneSuraSurannaSuravaramSuwannaphumSwanky And Moo MooSyncopateSyneSyne ItalicSyne MonoSyne TactileTajawalTangerineTapromTauriTavirajTekoTelexTenali RamakrishnaTenor SansText Me OneTexturinaThasadithThe Girl Next DoorTienneTillanaTimmanaTinosTitan OneTitillium WebTomorrowTrade WindsTrirongTrispaceTrocchiTrochutTruculentaTrykkerTulpen OneTurret RoadUbuntuUbuntu CondensedUbuntu MonoUltraUncial AntiquaUnderdogUnica OneUnifrakturcookUnifrakturmaguntiaUnkemptUnlockUnnaVampiro OneVarelaVarela RoundVartaVast ShadowVazirVesper LibreViaoda LibreVibesViburVictor MonoVidalokaVigaVocesVolkhovVollkornVollkorn ScVoltaireVt323Waiting For The SunriseWallpoetWalter TurncoatWarnesWellfleetWendy OneWire OneWork SansXanh MonoYakuhanjpYakuhanjpsYakuhanmpYakuhanmpsYakuhanrpYakuhanrpsYanone KaffeesatzYantramanavYatra OneYellowtailYeon SungYeseva OneYesteryearYrsaYusei MagicZcool KuaileZcool Qingke HuangyouZcool XiaoweiZeyadaZhi Mang XingZilla SlabZilla Slab Highlight | selection configured | Abeezee; Abel; Abhaya Libre; Abril Fatface; Aclonica; Acme; Actor; Adamina; Advent Pro; Aguafina Script; Aileron; Akaya Kanadaka; Akaya Telivigala; Akronim; Aladin; Alata; Alatsi; Aldrich; Alef; Alegreya; Alegreya Sans; Alegreya Sans Sc; Alegreya Sc; Aleo; Alex Brush; Alfa Slab One; Alice; Alike; Alike Angular; Allan; Allerta; Allerta Stencil; Allura; Almarai; Almendra; Almendra Display; Almendra Sc; Amarante; Amaranth; Amatic Sc; Amethysta; Amiko; Amiri; Amita; Anaheim; Andada; Andika; Andika New Basic; Angkor; Annie Use Your Telescope; Anonymous Pro; Antic; Antic Didone; Antic Slab; Anton; Arapey; Arbutus; Arbutus Slab; Architects Daughter; Archivo; Archivo Black; Archivo Narrow; Aref Ruqaa; Arima Madurai; Arimo; Arizonia; Armata; Arsenal; Artifika; Arvo; Arya; Asap; Asap Condensed; Asar; Asset; Assistant; Astloch; Asul; Athiti; Atma; Atomic Age; Aubrey; Audiowide; Autour One; Average; Average Sans; Averia Gruesa Libre; Averia Libre; Averia Sans Libre; Averia Serif Libre; B612; B612 Mono; Bad Script; Bahiana; Bahianita; Bai Jamjuree; Ballet; Baloo 2; Baloo Bhai 2; Baloo Bhaina 2; Baloo Chettan 2; Baloo Da 2; Baloo Paaji 2; Baloo Tamma 2; Baloo Tammudu 2; Baloo Thambi 2; Balsamiq Sans; Balthazar; Bangers; Barlow; Barlow Condensed; Barlow Semi Condensed; Barriecito; Barrio; Basic; Baskervville; Battambang; Baumans; Bayon; Be Vietnam; Bebas Neue; Belgrano; Bellefair; Belleza; Bellota; Bellota Text; Benchnine; Benne; Bentham; Berkshire Swash; Beth Ellen; Bevan; Big Shoulders Display; Big Shoulders Inline Display; Big Shoulders Inline Text; Big Shoulders Stencil Display; Big Shoulders Stencil Text; Big Shoulders Text; Bigelow Rules; Bigshot One; Bilbo; Bilbo Swash Caps; Biorhyme; Biorhyme Expanded; Biryani; Bitter; Black And White Picture; Black Han Sans; Black Ops One; Blackout Midnight |
| button | Open link | available |  |
| button | Get the widget | available |  |
| button | Learn more | available |  |
| button | Copy code | available |  |
| radio | [unlabelled] | available |  |
| switch | [unlabelled] | available |  |

**Opened select/dropdown options**

- Option group 1: Abeezee; Abel; Abhaya Libre; Abril Fatface; Aclonica; Acme; Actor; Adamina; Advent Pro; Aguafina Script; Aileron; Akaya Kanadaka; Akaya Telivigala; Akronim; Aladin; Alata; Alatsi; Aldrich; Alef; Alegreya; Alegreya Sans; Alegreya Sans Sc; Alegreya Sc; Aleo; Alex Brush; Alfa Slab One; Alice; Alike; Alike Angular; Allan; Allerta; Allerta Stencil; Allura; Almarai; Almendra; Almendra Display; Almendra Sc; Amarante; Amaranth; Amatic Sc; Amethysta; Amiko; Amiri; Amita; Anaheim; Andada; Andika; Andika New Basic; Angkor; Annie Use Your Telescope; Anonymous Pro; Antic; Antic Didone; Antic Slab; Anton; Arapey; Arbutus; Arbutus Slab; Architects Daughter; Archivo; Archivo Black; Archivo Narrow; Aref Ruqaa; Arima Madurai; Arimo; Arizonia; Armata; Arsenal; Artifika; Arvo; Arya; Asap; Asap Condensed; Asar; Asset; Assistant; Astloch; Asul; Athiti; Atma; Atomic Age; Aubrey; Audiowide; Autour One; Average; Average Sans; Averia Gruesa Libre; Averia Libre; Averia Sans Libre; Averia Serif Libre; B612; B612 Mono; Bad Script; Bahiana; Bahianita; Bai Jamjuree; Ballet; Baloo 2; Baloo Bhai 2; Baloo Bhaina 2; Baloo Chettan 2; Baloo Da 2; Baloo Paaji 2; Baloo Tamma 2; Baloo Tammudu 2; Baloo Thambi 2; Balsamiq Sans; Balthazar; Bangers; Barlow; Barlow Condensed; Barlow Semi Condensed; Barriecito; Barrio; Basic; Baskervville; Battambang; Baumans; Bayon; Be Vietnam; Bebas Neue; Belgrano; Bellefair; Belleza; Bellota; Bellota Text; Benchnine; Benne; Bentham; Berkshire Swash; Beth Ellen; Bevan; Big Shoulders Display; Big Shoulders Inline Display; Big Shoulders Inline Text; Big Shoulders Stencil Display; Big Shoulders Stencil Text; Big Shoulders Text; Bigelow Rules; Bigshot One; Bilbo; Bilbo Swash Caps; Biorhyme; Biorhyme Expanded; Biryani; Bitter; Black And White Picture; Black Han Sans; Black Ops One; Blackout Midnight
- Option group 2: menu was present but could not be read reliably without risking a state change.

**Settings links**

- Settings: `/dashboard/settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| radio | false | no | Sunday |
| radio | true | no | Monday |
| switch | true | no |  |

## `/dashboard/account-settings/profile`

**Visible text**

- Account Settings
- Profile
- Shared notes
- Integrations
- Advanced
- Email
- First name
- Last name
- Address
- Phone
- United Kingdom (+44)
- Profile image
- PNG, JPG, or GIF • 16:9 aspect ratio recommended
- Click or drag to upload
- JPEG, PNG, or WebP
- Or paste image URL
- Username only.
- @
- Enter a full Spotify URL or just a username. Playlist links render a player; profile links open Spotify.
- Text size
- Change the text size of the dashboard
- Default
- Save

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| radio | Profile | available |  |
| radio | Shared notes | available |  |
| radio | Integrations | available |  |
| radio | Advanced | available |  |
| combobox | Search for a mailing address… | value empty |  |
| button | United Kingdom (+44) | available |  |
| input:text | Enter number… | available |  |
| button | Click or drag to uploadJPEG, PNG, or WebP | available |  |
| button | Or paste image URL | available |  |
| input:file | [unlabelled] | available |  |
| input:text | Enter your username… | available |  |
| input:text | [url redacted] or username | available |  |
| combobox | Default | available |  |
| select | DefaultLargeLarger | selection configured | Default; Large; Larger |
| button | Save | available |  |

**Opened select/dropdown options**

- Option group 1: Default; Large; Larger
- Option group 2: menu was present but could not be read reliably without risking a state change.

**Settings links**

- Account Settings: `/dashboard/account-settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| radio | true | no | ProfileShared notesIntegrationsAdvanced |
| radio | false | no | ProfileShared notesIntegrationsAdvanced |

## `/dashboard/account-settings/shared-notes`

**Visible text**

- Account Settings
- Profile
- Shared notes
- Integrations
- Advanced
- Notes your providers chose to share with you in the Arketa dashboard.
- No shared notes
- When your studio shares a note with you, it will appear here.

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| radio | Profile | available |  |
| radio | Shared notes | available |  |
| radio | Integrations | available |  |
| radio | Advanced | available |  |

**Settings links**

- Account Settings: `/dashboard/account-settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| radio | false | no | ProfileShared notesIntegrationsAdvanced |
| radio | true | no | ProfileShared notesIntegrationsAdvanced |

## `/dashboard/account-settings/integrations`

**Visible text**

- Account Settings
- Profile
- Shared notes
- Integrations
- Advanced
- Google Calendar
- Sync your Arketa Calendar with Google. Classes will be automatically added to your Google Calendar
- Enable

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| radio | Profile | available |  |
| radio | Shared notes | available |  |
| radio | Integrations | available |  |
| radio | Advanced | available |  |
| button | Enable | available |  |

**Settings links**

- Account Settings: `/dashboard/account-settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| radio | false | no | ProfileShared notesIntegrationsAdvanced |
| radio | true | no | ProfileShared notesIntegrationsAdvanced |

## `/dashboard/account-settings/advanced`

**Visible text**

- Account Settings
- Profile
- Shared notes
- Integrations
- Advanced
- Allow access to legacy dashboard
- Use this account as an instructor

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| radio | Profile | available |  |
| radio | Shared notes | available |  |
| radio | Integrations | available |  |
| radio | Advanced | available |  |
| switch | [unlabelled] | available |  |

**Settings links**

- Account Settings: `/dashboard/account-settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| radio | false | no | ProfileShared notesIntegrationsAdvanced |
| radio | true | no | ProfileShared notesIntegrationsAdvanced |
| switch | false | no | Allow access to legacy dashboard |
| switch | true | no | Use this account as an instructor |

## `/dashboard/account-settings/payroll`

**Visible text**

- Account Settings
- Profile
- Shared notes
- Integrations
- Advanced
- Email
- First name
- Last name
- Address
- Phone
- United Kingdom (+44)
- Profile image
- PNG, JPG, or GIF • 16:9 aspect ratio recommended
- Click or drag to upload
- JPEG, PNG, or WebP
- Or paste image URL
- Username only.
- @
- Enter a full Spotify URL or just a username. Playlist links render a player; profile links open Spotify.
- Text size
- Change the text size of the dashboard
- Default
- Save

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| radio | Profile | available |  |
| radio | Shared notes | available |  |
| radio | Integrations | available |  |
| radio | Advanced | available |  |
| combobox | Search for a mailing address… | value empty |  |
| button | United Kingdom (+44) | available |  |
| input:text | Enter number… | available |  |
| button | Click or drag to uploadJPEG, PNG, or WebP | available |  |
| button | Or paste image URL | available |  |
| input:file | [unlabelled] | available |  |
| input:text | Enter your username… | available |  |
| input:text | [url redacted] or username | available |  |
| combobox | Default | available |  |
| select | DefaultLargeLarger | selection configured | Default; Large; Larger |
| button | Save | available |  |

**Opened select/dropdown options**

- Option group 1: Default; Large; Larger
- Option group 2: menu was present but could not be read reliably without risking a state change.

**Settings links**

- Account Settings: `/dashboard/account-settings`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| radio | true | no | ProfileShared notesIntegrationsAdvanced |
| radio | false | no | ProfileShared notesIntegrationsAdvanced |

## `/dashboard/marketing/emails`

**Visible text**

- Marketing Emails
- Name
- Description
- Subject
- Status
- First Visit
- 30 minutes after first livestream/in-person visit.
- It was great to see you in class today!
- Class Package: Low
- Sent when a client has 1 credit left on a pack — only for packs of 4 or more credits.
- Your class package is running low
- Class Package: Expiring
- 7 days before package expires.
- Your class package is about to expire
- Canceled Membership
- When a client cancels a membership
- Sad to see you go :(
- New Account
- When client creates an account or you add them to your client list.
- Welcome to my studio!
- I Miss you
- When a student hasn’t interacted in 30 days. Sent maximum 2x per year.
- I Miss You...
- Happy Birthday
- One day before a student's birthday.
- Happy Birthday!
- Edit

**Controls**

| Kind | Label or placeholder | Redacted state | Native options |
| --- | --- | --- | --- |
| button | View FAQ | available |  |
| input:checkbox | Column with Header Selection | available |  |
| switch | [unlabelled] | available |  |
| button | Edit | available |  |
| button | First Page | available |  |
| button | Previous Page | available |  |
| button | Next Page | available |  |
| button | Last Page | available |  |

**Settings links**

- Settings: `/dashboard/settings`
- Marketing Emails: `/dashboard/marketing/emails`

**Verified toggle/checkbox/radio states**

| Kind | State | Disabled | Context |
| --- | --- | --- | --- |
| checkbox | false | no | Column with Header Selection |
| switch | true | no |  |

## Known evidence limits

- The audit deliberately did not click save/submit/connect/disconnect/create/delete/send controls.
- Create/edit forms reachable by a safe GET route were inspected when listed above; modal content behind ambiguous or potentially committing buttons was not opened.
- A dropdown recorded as not safely readable is explicitly marked instead of guessed.
- Current field contents are intentionally redacted, so this inventory records configuration shape rather than tenant data.
