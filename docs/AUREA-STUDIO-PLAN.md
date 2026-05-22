# Aurea Studio — Fitness Studio Booking + CRM Platform

> Complete pivot plan from agency CRM to fitness studio platform.
> Researched against: Mindbody, Arketa, Glofox, Momoyoga, Vagaro, WellnessLiving, Mariana Tek, Zen Planner, Pike13, Acuity/Square, Barbr, Booksy.

---

## Table of Contents

- [Vision](#vision)
- [Codebase Audit — What Exists](#codebase-audit--what-exists)
- [Keep, Modify, Remove](#keep-modify-remove)
- [Feature Domains](#feature-domains)
  - [1. Class Management System](#1-class-management-system)
  - [2. Membership & Pricing Engine](#2-membership--pricing-engine)
  - [3. Member Experience & CRM](#3-member-experience--crm)
  - [4. Check-In System](#4-check-in-system)
  - [5. Instructor Dashboard & Management](#5-instructor-dashboard--management)
  - [6. Payments & POS](#6-payments--pos)
  - [7. Marketing & Automations](#7-marketing--automations)
  - [8. Reporting & Analytics Dashboard](#8-reporting--analytics-dashboard)
  - [9. Public API & Embeddable Widgets](#9-public-api--embeddable-widgets)
  - [10. Data Import System](#10-data-import-system)
  - [11. Mobile Apps](#11-mobile-apps)
  - [12. Studio Website Builder](#12-studio-website-builder)
- [Database Schema Changes](#database-schema-changes)
- [Implementation Phases](#implementation-phases)
- [Pricing Model](#pricing-model)
- [Competitor Feature Matrix](#competitor-feature-matrix)
- [Competitor Weaknesses We Exploit](#competitor-weaknesses-we-exploit)

---

## Vision

A single platform where fitness studio owners manage **everything**: classes, memberships, bookings, instructors, payments, marketing, CRM, and client apps — without needing Mindbody's $500/mo price tag or Glofox's enterprise sales calls.

Two mobile app tiers:
1. **Aurea Studio App** (generic) — included in all plans, studio owners + instructors + members use it
2. **Branded Studio App** (premium) — fully white-labeled, published under the studio's name in App Store / Google Play

Target verticals: Yoga studios, Pilates studios, Gyms, CrossFit boxes, Barre studios, Dance studios, Martial arts, Spin studios, Multi-discipline studios.

---

## Codebase Audit — What Exists

### Current Scale
- **96 database models** across 9 domains
- **44 enums** in Prisma schema
- **43 feature modules** under `src/features/`
- **45 tRPC routers**
- **46+ reusable UI components**
- **150+ workflow node types**
- **12+ external service integrations**

### Current Architecture
- Next.js 16 (App Router) + React 19
- TypeScript strict mode
- Prisma (PostgreSQL) with custom output to `src/generated/prisma`
- tRPC for type-safe API routes
- Better Auth with Polar.sh for subscriptions
- Inngest for background jobs and workflow orchestration
- React Flow for visual workflow editor
- Stripe Connect for multi-tenant payments
- Resend for email delivery

### Existing Models (Key Groups)

**Multi-Tenant:**
- Organization, Subaccount, Member, SubaccountMember, User, Session

**CRM:**
- Contact, ContactAssignee, Deal, DealContact, DealMember, Pipeline, PipelineStage, Note, NoteMention, Task

**Workflows:**
- Workflow, Node (150+ types), Connection, Credential, Execution, Webhook

**Booking (Already Started):**
- Booking, BookingEventType, BookingAvailability, BookingHoliday, CalComCredential

**Studio (Already Started):**
- StudioClass, StudioBooking, StudioMembership

**Workforce:**
- Rota, Worker, WorkerDocument, WorkerAvailability, ShiftSwapRequest, TimeOffRequest, OvertimeTracking

**Invoicing:**
- Invoice, InvoiceLineItem, InvoicePayment, InvoiceReminder, InvoiceTemplate, RecurringInvoice, BankTransferSettings

**Marketing:**
- Funnel, FunnelPage, FunnelBlock, FunnelAnalytics, Form, FormStep, FormField, FormSubmission
- Campaign, CampaignRecipient, EmailDomain, EmailTemplate

**Module System:**
- SubaccountModule with ModuleType enum (TIME_TRACKING, INVOICING, BOOKING_CALENDAR, PILATES_STUDIO, etc.)

---

## Keep, Modify, Remove

### Keep As-Is

| Feature | Why |
|---------|-----|
| **Workflow automation engine** | 150+ node types, visual builder, Inngest execution. Massive competitive advantage — Mindbody/Glofox have basic automations at best |
| **Funnel builder** | Lead capture pages, landing pages for class promos, workshop signups |
| **Form builder** | Intake forms, health questionnaires, liability waivers |
| **Email campaigns + templates** | Member communications, win-back sequences |
| **Invoice system** | Already has recurring invoices, Stripe, bank transfers, dunning |
| **Stripe Connect** | Multi-studio payment processing |
| **Activity audit logging** | Compliance-ready |
| **UI component library** | 46+ components, dark theme, data tables |
| **tRPC architecture** | End-to-end type safety |
| **QR Code model** | Already exists — perfect for check-ins |
| **WhatsApp integration** | Already integrated — useful for member comms |
| **Gmail / Google Calendar** | Already integrated — instructor calendar sync |
| **AI features** | OpenAI, Gemini, Claude integrations for content generation |

### Modify (Rebrand + Extend)

| Current | Becomes | Changes |
|---------|---------|---------|
| Organization | **Studio** | Remove agency language, add studio branding (logo, colors, timezone, currency, studio type) |
| Subaccount | **Location** | Multi-location support for studio chains, add address/geo/capacity/amenities |
| Contact | **Member** | Add fitness fields: membership tier, attendance count, class preferences, fitness goals, health notes, emergency contact, waiver status |
| Deal / Pipeline | **Lead Pipeline** | Simplify to: New Lead → Trial Booked → Trial Completed → Follow-Up → Converted → Lost |
| Worker | **Instructor** | Add: certifications, specialties, bio, photo, public profile URL, commission rates, class types |
| Rota | **Class Schedule Slot** | Rebrand UI, add recurring class templates, substitute management |
| Note | **Keep** | Works for member notes and instructor notes |
| Task | **Keep** | Works for follow-up tasks on leads/members |
| StudioClass | **Class** | Expand: class type, difficulty level, room assignment, equipment, waitlist, recurring rules, virtual/hybrid flag |
| StudioBooking | **ClassBooking** | Add: spot selection, late-cancel tracking, no-show tracking, check-in method |
| StudioMembership | **Membership** | Expand significantly (see Membership & Pricing Engine section) |
| Credential | **Keep** | Add fitness-specific credential types |
| Module system | **Keep** | Rename PILATES_STUDIO → STUDIO_CORE, add new modules |
| Worker Portal | **Instructor Portal** | Rebrand, add class roster view, check-in from device, earnings dashboard |

### Remove

| Feature | Reason |
|---------|--------|
| Agency / subaccount language | Not relevant to studios |
| OneDrive integration nodes | Low priority for fitness |
| Outlook integration nodes | Low priority (keep Gmail / Google Cal) |
| Discord nodes | Not relevant (keep Slack as optional) |
| BillingRule model (RETAINER etc.) | Agency billing model, not applicable |
| External funnels tracking | Replace with simpler referral tracking |

---

## Feature Domains

### 1. Class Management System

*Inspired by: Mindbody, Glofox, Momoyoga, Mariana Tek*

#### Class Types
- **Group classes** — Yoga, Pilates, HIIT, Spin, Barre, CrossFit, etc.
- **Private sessions** — 1-on-1 personal training, private Pilates
- **Workshops & events** — one-off, multi-hour or multi-day
- **Series / courses** — e.g. "6-Week Beginner Yoga" with single enrollment (from Pike13)
- **Retreats** — multi-day events with accommodation tracking (from Arketa)
- **Virtual / livestream classes** — Zoom integration or native streaming
- **On-demand video library** — recorded classes available anytime

#### Class Configuration
- Capacity limits with automatic waitlist enrollment
- **Spot / seat picker with visual room maps** (from Mariana Tek — major differentiator, no other affordable platform has this)
- Difficulty levels: Beginner, Intermediate, Advanced, All Levels
- Equipment requirements listed per class
- Room / resource assignment with conflict detection
- Minimum enrollment threshold (auto-cancel if not met, notify enrolled members)
- Booking window (how far in advance members can book)
- Cancellation window (e.g., 12 hours before class)
- Late-cancel and no-show fee configuration per class type

#### Recurring Class Templates
- Weekly recurring schedules with drag-and-drop calendar builder
- **Date-specific overrides** without changing the recurring pattern (from Barbr)
- Holiday / closure management with bulk date selection
- Seasonal schedule templates (summer schedule, holiday schedule)
- Clone and modify schedules across locations

#### Substitute Management
- When instructor marks unavailable, auto-notify qualified substitutes via SMS
- First to accept gets the class (from Mindbody)
- Members notified of instructor change via push / email / SMS
- Track substitute history per instructor

---

### 2. Membership & Pricing Engine

*Inspired by: Zen Planner, WellnessLiving, Mindbody, Glofox*

#### Membership Types
| Type | Description | Example |
|------|-------------|---------|
| **Unlimited** | Unlimited classes per billing cycle | "Unlimited Monthly — $149/mo" |
| **Class Packs** | X classes, use anytime before expiry | "10-Class Pack — $180, expires in 3 months" |
| **Drop-in** | Single class purchase | "$25 per class" |
| **Time-based** | Access for X days/weeks/months | "1-Month Pass — $120" |
| **Tiered** | Bronze/Silver/Gold with different access | "Gold: unlimited + workshops, Silver: 12 classes/mo" |
| **Family / Couple** | Linked billing, shared or individual counts | "Family Plan: 2 adults unlimited — $249/mo" |
| **Corporate wellness** | Employer-subsidized with reporting | "Company X: employees get 50% off" |
| **Intro offers** | First-timer pricing | "2 Weeks Unlimited — $49 (new members only)" |
| **Free trials** | Configurable trial periods | "7-Day Free Trial" |

#### Membership Lifecycle
- Auto-renewal with configurable billing dates
- Freeze / pause with auto-resume date
- Proration for mid-cycle upgrades / downgrades
- Upgrade / downgrade paths between plans
- **Cancellation flows with retention offers** — "Before you go, here's 20% off for 3 months"
- Failed payment retry with configurable attempts and escalation (Zen Planner achieves 69% recovery)
- Membership comparison page for member self-service
- Grace period after expiry before losing access

#### Pricing Rules
- Per-location pricing for multi-location studios
- Time-of-day pricing (off-peak discounts to fill empty classes)
- Early-bird pricing for advance bookings
- **Dynamic pricing based on class fill rate** (innovative — no competitor does this well)
- Volume discounts (buy 20 classes, cheaper per class than 10)

---

### 3. Member Experience & CRM

*Inspired by: Booksy, WellnessLiving, Glofox, Barbr*

#### Member Profiles (Enhanced from Contact model)
- Personal info + emergency contact
- Fitness goals and preferences (selected at signup)
- Health notes and contraindications (instructor-visible flag)
- **Digital waiver / liability form** — signed at first booking, stored permanently, re-sign on policy update
- Full attendance history with streak tracking
- Membership status and payment history
- Class preferences and favorite instructors
- Communication preferences (email / SMS / push opt-in/out)
- Referral source tracking (how did they find us?)
- Family / dependent linking (from Pike13 — great for kids' classes)
- Profile photo
- **Trusted / VIP flag** (from Booksy) — skip cancellation fees, priority waitlist

#### Smart Segments (from Booksy)

Auto-generated segments that update in real-time:

| Segment | Definition | Auto-Action |
|---------|------------|-------------|
| **New Members** | Joined in last 30 days | Welcome series automation |
| **Most Active** | Top 20% by attendance this month | VIP perks, referral nudges |
| **Regulars** | 2+ visits/week consistently | Loyalty rewards |
| **Slipping Away** | No booking in 2+ weeks (normally weekly) | Win-back message with class credit |
| **At Risk** | Membership expiring < 14 days + declining attendance | Personal outreach from staff |
| **Lapsed** | No visit in 30+ days | Escalating win-back sequence |
| **VIP / Trusted** | Manually tagged by studio owner | Skip cancellation fees, priority booking |

Plus custom segments with any filter combination (age, class type, membership, location, etc.). Segments feed directly into marketing automations.

#### Digital Loyalty Program (from Booksy — no fitness platform does this natively)
- **Digital stamp cards**: attend X classes → earn reward
- Auto-stamped per check-in, visible in member app
- Configurable rewards: free class, merch discount, free month, free private session
- **Loyalty points system** as alternative: points per visit, purchase, referral, review
- Replaces paper punch cards instantly
- Visible progress in member app ("3 more classes until your free session!")

#### Lead Pipeline (Simplified from current Deal/Pipeline)
- Stages: **New Lead → Trial Booked → Trial Attended → Follow-Up → Converted → Lost**
- Auto-advance triggers (e.g., after trial class check-in → move to "Follow-Up")
- Automated follow-up sequences per stage (powered by workflow engine)
- Lead source tracking: website, Google, referral, walk-in, marketplace, Instagram, Facebook ad
- Conversion analytics per source and per time period
- Assign leads to staff members for personal follow-up

---

### 4. Check-In System

*Inspired by: Glofox, Zen Planner, Barbr, Mariana Tek*

#### Check-In Methods
| Method | How It Works |
|--------|-------------|
| **QR code scan** | Member shows QR from app, staff scans or self-service kiosk reads it |
| **Kiosk mode** | iPad at front desk — branded, self-service check-in with name search |
| **NFC tap** | Physical NFC cards/stickers at entrance (from Barbr) — member taps phone |
| **Geo-located auto check-in** | Automatic when member arrives within configurable radius (from Mariana Tek) |
| **Manual** | Staff checks in member from dashboard or instructor checks in from roster |
| **PIN code** | Member enters their PIN on kiosk |

#### Check-In Features
- First-visit waiver capture (if not already signed digitally)
- Class capacity enforcement (can't check in if class is full and not on waitlist)
- Membership validation (can't check in if expired / frozen / no credits remaining)
- Late arrival handling (configurable grace period, late arrivals flagged)
- **Attendance streak tracking** — "You've attended 10 classes in a row!"
- Milestone notifications — "Congratulations on your 100th class!"
- Auto-mark no-shows X minutes after class starts

---

### 5. Instructor Dashboard & Management

*Inspired by: Mindbody, WellnessLiving, Booksy, Vagaro*

#### Instructor Profiles (Public-Facing)
- Bio, photo, certifications, specialties
- Class types they teach
- **Unique booking link per instructor** (from Barbr — for Instagram bio, TikTok, etc.)
- Rating / reviews from members
- Public schedule and availability
- Years of experience, training background

#### Instructor Dashboard (Dedicated Portal — extend existing Worker Portal)

**My Schedule:**
- Upcoming classes with enrolled member count / capacity
- Full class rosters with member names, membership status, health notes
- Check in members directly from device
- Mark attendance / no-shows / late arrivals

**My Availability:**
- Set weekly availability
- Request time off
- Block specific dates
- View / accept substitute requests from other instructors

**My Earnings:**
- Current pay period breakdown
- Per-class earnings, tips, commissions
- Historical earnings by month
- Upcoming payout date and amount

**My Performance:**
- Average class attendance and fill rate
- Member retention per class
- Ratings and reviews
- Comparison to studio average (anonymized)

**Communication:**
- Messages from studio owner / manager
- Class change notifications
- Substitute request alerts

#### Payroll & Compensation
- Per-class flat rate or hourly rate (configurable per instructor per class type)
- Commission on private sessions (configurable percentage)
- Tip collection and distribution
- Revenue share models
- Automatic payroll calculation per pay period
- Pay period management (weekly, bi-weekly, monthly)
- Exportable reports for accountants
- Integration with ADP / Gusto (future)

---

### 6. Payments & POS

*Inspired by: Vagaro, Square, Stripe, Booksy*

#### Payment Methods
- **Stripe** for online payments (already integrated)
- Contactless payments (Apple Pay, Google Pay, Samsung Pay)
- In-studio POS for retail and drop-ins (card reader integration)
- Saved cards for recurring billing and quick checkout
- Payment plans / installments for expensive packages (e.g., 200-hour teacher training)
- Bank transfers for large corporate accounts

#### Revenue Streams
| Stream | Description |
|--------|-------------|
| Membership recurring billing | Monthly/annual auto-charge |
| Class pack purchases | One-time purchase, credits tracked |
| Drop-in payments | Pay at booking or at check-in |
| Private session bookings | 1-on-1 with instructor |
| Workshop / event registrations | One-off events with pricing |
| Retail product sales | Water, mats, towels, merch via POS |
| Gift cards | Physical + digital, purchasable online |
| On-demand video subscriptions | Monthly access to video library |
| Branded app subscriptions | Revenue from premium member features |

#### No-Show Protection (from Booksy)
- Require card-on-file for booking
- **Non-refundable deposits** for premium or high-demand classes
- Late-cancel fees (configurable window, e.g., cancel < 12 hours = $15 fee)
- No-show fees charged automatically to card on file
- **VIP / Trusted members can be exempted** (from Booksy)
- Configurable per class type (e.g., no deposit for free community classes)

#### Promo & Discounts
- Promo codes with usage limits, expiry dates, and restrictions (specific classes, new members only, etc.)
- Automatic discounts (e.g., "Book 3+ classes this week, 4th is free")
- **Referral credits** — member refers friend → both get credit (configurable amount)
- First-timer offers (auto-applied for new members)
- Corporate discount codes tied to employer accounts
- Seasonal promotions (New Year, summer specials)

#### Gift Cards
- Digital gift cards purchasable online (emailed to recipient)
- Physical gift cards with unique codes
- Custom designs with studio branding
- Redeemable for any service or product
- Balance tracking and partial redemption
- Purchasable through member app and website widget

---

### 7. Marketing & Automations

*Powered by: existing workflow engine + campaigns system*

#### Pre-Built Workflow Templates (Studio-Specific)

| Workflow | Trigger | Actions |
|----------|---------|---------|
| **Welcome Series** | New member signup | 5-email onboarding sequence over 14 days |
| **Trial Follow-Up** | Trial class attended | Day 1: thank you + photos. Day 3: highlight membership options. Day 7: limited-time offer |
| **Win-Back** | No visit in 30 days | Email with "We miss you" + class credit |
| **Birthday** | Birthday week | Auto-send birthday message + free class or discount |
| **Milestone** | 50th / 100th / 200th class | Congratulations message + reward |
| **Renewal Reminder** | 7 days before membership expiry | Reminder email + renewal link |
| **Payment Failed** | Payment fails | Day 1, 3, 7: escalating retry + notification |
| **Class Reminder** | 24h + 2h before class | Push notification + email reminder |
| **Post-Class Feedback** | After class check-in | Request rating + review |
| **Referral Nudge** | After 10th class | "Love it here? Refer a friend and both get $X" |
| **Re-Engagement** | "Slipping Away" segment entry | Personalized message + incentive |
| **NPS Survey** | Every 90 days | Net Promoter Score survey |
| **Waitlist Notification** | Spot opens in full class | Auto-notify waitlisted members, first to confirm gets spot |
| **Instructor Sub Alert** | Instructor marks unavailable | SMS to qualified subs, first to accept gets class |

#### Communication Channels
| Channel | Provider | Status |
|---------|----------|--------|
| Email | Resend | Already integrated |
| SMS | Twilio | New integration needed |
| Push notifications | Firebase / APNs | New (mobile app) |
| In-app messaging | Built-in | New |
| WhatsApp | Meta API | Already integrated |

#### Marketing Tools
- **AI-powered email content generation** (extend existing AI features — OpenAI/Claude already connected)
- Campaign A/B testing (subject lines, send times, content variations)
- **Automated Google review requests** (from Barbr — triggered post-class)
- **NFC review cards** (from Barbr — tap to leave Google review at front desk)
- Referral program with tracking, rewards, and leaderboard
- Landing pages via funnel builder (already exists)
- **Reserve with Google** integration (from Booksy — free acquisition channel, book from Google Maps)
- Social media content creator (design promo images for Instagram/stories in-app, from Booksy)

---

### 8. Reporting & Analytics Dashboard

*Inspired by: Mindbody Analytics 2.0, WellnessLiving, Mariana Tek*

#### Revenue Analytics
- Total revenue by source (memberships, packs, drop-ins, retail, private sessions, gift cards)
- Revenue per class / per instructor / per location / per class type
- MRR (Monthly Recurring Revenue) tracking with trend
- Churn rate and revenue churn
- Average revenue per member (ARPM)
- Payment failure rate and recovery rate
- Projected revenue (AI-powered forecasting)

#### Attendance Analytics
- Class fill rates (which classes are popular, which underperform)
- **Peak hours / days heat map** — visual grid showing busiest times
- Average attendance per class type
- No-show and late-cancel rates (per class, per member, per instructor)
- Member visit frequency distribution
- Instructor fill rate comparison
- Waitlist conversion rate (how many waitlisted members eventually attend)

#### Member Analytics
- New member acquisition by source (website, Google, referral, walk-in, marketplace, ad)
- **Trial-to-conversion rate** — most important metric for studio growth
- **Retention cohort analysis** — what % of January signups are still active in March?
- Lifetime value (LTV) per member
- **Churn prediction** (AI-powered — flag members likely to leave in next 30 days)
- Segment size trends over time
- Referral program performance

#### Instructor Analytics
- Classes taught and fill rates
- Member retention per instructor (do members come back after their class?)
- Revenue generated per instructor
- Average rating and review scores
- Substitute frequency
- Commission and payroll summaries

#### Real-Time Dashboard
- Today's classes with current enrollment vs. capacity
- Members checked in right now
- Revenue today / this week / this month (vs. same period last month)
- Upcoming classes needing attention (low enrollment, no instructor assigned)
- Key alerts: expiring memberships, failed payments, waitlisted members, open sub requests
- Quick actions: check in member, process payment, send message

---

### 9. Public API & Embeddable Widgets

*Inspired by: Mindbody API v6, Mariana Tek, Pike13*

#### Public REST API

**Endpoints:**

| Resource | Operations | Use Case |
|----------|-----------|----------|
| `/classes` | List, filter by type/instructor/date/location | Display schedule on any website |
| `/bookings` | Create, cancel, waitlist, check-in | Book from custom website or third-party app |
| `/members` | Create, update, read profile, check membership | Member management from external systems |
| `/memberships` | List plans, purchase, check status, cancel | Sell memberships from custom checkout |
| `/instructors` | List, read profiles, availability | Display instructor bios on website |
| `/locations` | List, read details | Multi-location directory |
| `/webhooks` | Subscribe to events | Real-time event notifications |

**Webhook Events:**
- `booking.created`, `booking.cancelled`, `booking.checked_in`
- `member.created`, `member.updated`
- `membership.purchased`, `membership.cancelled`, `membership.expired`
- `payment.completed`, `payment.failed`
- `class.created`, `class.cancelled`, `class.updated`

**API Infrastructure:**
- OAuth2 authentication for third-party apps
- API key management per studio (with scopes)
- Rate limiting (configurable per plan)
- Developer documentation portal
- Sandbox environment for testing
- Versioned API (v1, v2, etc.)

#### Embeddable Widgets

| Widget | Description | Embed Method |
|--------|-------------|-------------|
| **Class Schedule** | Interactive weekly/daily schedule | iframe or JS embed |
| **Booking Widget** | Book a class with payment | iframe or JS embed |
| **Membership Purchase** | Browse and buy memberships | iframe or JS embed |
| **Instructor Profiles** | Grid/list of instructors with bios | iframe or JS embed |
| **Single Class Booking** | "Book This Class" button for specific class | JS button embed |

- All widgets inherit studio branding (colors, fonts, logo)
- Responsive design for mobile
- Custom CSS override support
- **Native WordPress plugin** (not just iframe — proper WP integration with shortcodes and Gutenberg blocks)
- React component library for custom web apps

#### Third-Party Integrations

| Integration | Type | Priority |
|-------------|------|----------|
| **Reserve with Google** | Booking from Google Maps | High |
| **ClassPass / Gympass** | Marketplace listing | High |
| **Zapier** | Automation connector (1000s of apps) | High |
| **Google Calendar** | Bi-directional sync | Already exists |
| **Zoom** | Virtual class links | Medium |
| **QuickBooks / Xero** | Accounting sync | Medium |
| **Mailchimp** | Email list sync | Medium |
| **Apple Health / Fitbit** | Attendance + workout data | Low |
| **Facebook / Instagram** | Ad tracking, pixel, booking link | Medium |
| **Twilio** | SMS (see Marketing section) | High |

---

### 10. Data Import System

*For studios migrating from competitors*

#### Import Sources

| Source | Method | Priority |
|--------|--------|----------|
| **Mindbody** | API-based import (credential type already exists in codebase!) | High |
| **Arketa** | CSV export → import | High |
| **Glofox** | CSV export → import | Medium |
| **Momoyoga** | CSV export → import | Medium |
| **Zen Planner** | CSV export → import | Medium |
| **Generic CSV** | Custom column mapping UI | High |

#### What Gets Imported

| Data | Fields |
|------|--------|
| **Members** | Name, email, phone, address, membership status, join date, tags |
| **Class schedule** | Class names, times, instructors, recurring rules |
| **Membership plans** | Plan names, pricing, billing frequency, included classes |
| **Attendance history** | Member + class + date (for analytics continuity) |
| **Payment history** | Transactions for financial reporting continuity |
| **Instructor profiles** | Name, bio, certifications, class types, pay rates |
| **Gift card balances** | Active gift cards with remaining balances |

#### Import Flow
1. Studio selects source platform
2. Upload CSV or connect API credentials
3. Column mapping UI (auto-detect common fields)
4. Preview import with conflict detection (duplicate emails, etc.)
5. Import with progress tracking
6. Post-import validation report (what succeeded, what needs attention)
7. Rollback capability within 48 hours

---

### 11. Mobile Apps

#### Tier 1: Aurea Studio App (Generic — included in all plans)

**For Members:**
- Browse and discover studios on the marketplace (by location, class type, rating)
- View class schedule and book classes
- Join waitlists with auto-notification
- Check in via QR code
- View and manage membership
- Purchase class packs, drop-ins
- Payment history and receipts
- Class history with attendance streaks
- Rate and review classes / instructors
- Push notifications (class reminders, waitlist spots, promotions)
- Favorite studios and instructors

**For Studio Owners:**
- Dashboard with today's overview
- View bookings and check in members
- Quick member lookup
- Revenue snapshot
- Push notifications for alerts (no-shows, payment failures, sub requests)

**For Instructors:**
- My schedule with class rosters
- Check in members from phone
- View member health notes (flagged only)
- Accept/decline substitute requests
- View earnings

**Marketplace:**
- Members discover studios by location, class type, rating, price
- Studio profiles with photos, schedule, pricing, reviews
- Book at any Aurea-powered studio with one account
- Search and filter (yoga near me, pilates under $20, etc.)

#### Tier 2: Branded Studio App (Premium add-on)

Everything in Tier 1, plus:
- **Fully white-labeled**: studio name, logo, colors, icon, splash screen
- **Published under the studio's name** in App Store and Google Play
- Custom push notifications from the studio
- **On-demand video library** branded to the studio
- **Community features**: member social feed, challenges, leaderboards
- **Spot / seat picker** for classes with visual room maps
- **Digital loyalty stamp card** visible in app
- **Gift card** purchase and redemption
- Custom home screen layout
- Studio-specific onboarding flow

#### Technical Approach
- **React Native (Expo)** for cross-platform iOS + Android
- Shared API layer via the public REST API
- White-label builds via build flavors / app configs (different bundle IDs, icons, splash screens)
- OTA (Over-The-Air) updates via Expo for quick fixes without App Store review
- Push notifications via Firebase Cloud Messaging (Android) + APNs (iOS)
- Offline support for viewing schedule and membership (sync when online)

---

### 12. Studio Website Builder

*Extend existing funnel builder (from Arketa's approach)*

#### Pre-Built Templates
- **Yoga studio** template (serene, earthy tones)
- **Pilates studio** template (clean, modern)
- **CrossFit / gym** template (bold, energetic)
- **Dance studio** template (elegant, dynamic)
- **Multi-discipline** template (versatile)

#### Pages
| Page | Features |
|------|----------|
| **Home** | Hero image, featured classes, testimonials, CTA to book |
| **Schedule** | Embedded class schedule widget with booking |
| **Instructors** | Team grid with bios, photos, specialties |
| **Pricing** | Membership plans comparison table with purchase buttons |
| **About** | Studio story, values, photos |
| **Contact** | Form, map, hours, phone |
| **Blog** | Studio news, wellness tips, class spotlights |

#### Features
- Drag-and-drop page builder (already exists in funnel builder)
- Custom domain support (already exists)
- SSL certificates (auto-provisioned)
- Mobile responsive
- SEO optimization (meta tags, Open Graph, schema markup for local business)
- Integrated booking widget on every page
- Google Analytics / Meta Pixel integration (already exists)

---

## Database Schema Changes

### Renames / Rebrands

```
Organization         → Studio
  + timezone, currency, studioType, brandingConfig (JSON)

Subaccount           → Location
  + address, latitude, longitude, capacity, amenities (JSON)

Contact              → Member
  + emergencyContactName, emergencyContactPhone
  + fitnessGoals, healthNotes, contraindications
  + waiverSignedAt, waiverVersion
  + attendanceCount, currentStreak, longestStreak
  + memberSegment (auto-calculated)
  + trustedMember (boolean, VIP flag)

Worker               → Instructor
  + bio, photoUrl, publicProfileSlug
  + certifications (JSON array)
  + specialties (JSON array)
  + classTypes (relation)
  + uniqueBookingUrl
  + averageRating

Rota                 → ClassScheduleSlot (or keep as internal name, rebrand in UI)
```

### New Models

```prisma
// ── Class Management ──

ClassType {
  id, name, slug, description, color, icon
  studioId → Studio
  classes → Class[]
}

ClassTemplate {
  id, name, classTypeId, instructorId, locationId
  dayOfWeek, startTime, endTime
  capacity, roomId, difficulty
  equipmentNeeded, description
  isVirtual, zoomLink
  bookingWindowHours, cancellationWindowHours
  effectiveFrom, effectiveTo (seasonal)
  studioId → Studio
}

ClassInstance {
  id, classTemplateId, date, startTime, endTime
  instructorId (can differ from template if substitute)
  substituteForId (original instructor)
  status: SCHEDULED | CANCELLED | COMPLETED
  actualAttendance, capacity
  locationId, roomId
  isVirtual, streamUrl
  cancelReason
  studioId → Studio
  bookings → ClassBooking[]
  waitlist → ClassWaitlist[]
}

ClassWaitlist {
  id, classInstanceId, memberId
  position, joinedAt
  notifiedAt, respondedAt
  status: WAITING | NOTIFIED | CONFIRMED | EXPIRED
}

SpotMap {
  id, name, locationId, roomId
  layout (JSON — rows, columns, spots with coordinates)
  studioId → Studio
}

SpotBooking {
  id, classBookingId, spotMapId
  spotId (reference within the layout JSON)
  row, column
}

Room {
  id, name, locationId, capacity
  amenities (JSON), description
}

// ── Memberships ──

MembershipPlan {
  id, name, description
  type: UNLIMITED | CLASS_PACK | DROP_IN | TIME_BASED | TIERED | FAMILY | CORPORATE | INTRO | TRIAL
  price, currency, billingInterval (WEEKLY | MONTHLY | QUARTERLY | ANNUALLY | ONE_TIME)
  classCredits (nullable — for packs)
  durationDays (nullable — for time-based)
  maxFreezedays, freezeCount
  allowedClassTypes (relation — which class types this plan includes)
  allowedLocations (relation — which locations)
  isIntroOffer, introOfferMaxUses
  trialDays
  cancellationNoticeDays
  sortOrder, isActive, isPublic
  studioId → Studio
}

MembershipSubscription {
  id, memberId, planId
  status: ACTIVE | FROZEN | CANCELLED | EXPIRED | PAST_DUE | TRIALING
  startDate, currentPeriodStart, currentPeriodEnd
  cancelledAt, cancelReason
  frozenAt, frozenUntil
  stripeSubscriptionId
  remainingCredits (for packs)
  autoRenew
  studioId → Studio
}

ClassCredit {
  id, subscriptionId, memberId
  totalCredits, usedCredits, remainingCredits
  expiresAt
}

// ── Check-In ──

CheckIn {
  id, memberId, classInstanceId
  method: QR_CODE | NFC | KIOSK | GEO | MANUAL | PIN
  checkedInAt, checkedInBy (staff member if manual)
  isLateArrival
  locationId
}

// ── Loyalty ──

LoyaltyCard {
  id, memberId, name
  stampsRequired, stampsCollected
  rewardId
  status: ACTIVE | COMPLETED | EXPIRED
  startedAt, completedAt, expiresAt
  studioId → Studio
}

LoyaltyStamp {
  id, loyaltyCardId, classInstanceId, checkInId
  stampedAt
}

Reward {
  id, name, description, type
  value (discount amount, free class, etc.)
  studioId → Studio
}

// ── Referrals ──

ReferralCode {
  id, memberId, code (unique)
  rewardForReferrer, rewardForReferred
  usageCount, maxUses
  isActive
  studioId → Studio
}

ReferralRedemption {
  id, referralCodeId, referredMemberId
  redeemedAt, referrerRewardApplied, referredRewardApplied
}

// ── Gift Cards ──

GiftCard {
  id, code (unique), purchasedById (member)
  recipientEmail, recipientName, personalMessage
  originalAmount, remainingBalance, currency
  purchasedAt, expiresAt, redeemedById
  status: ACTIVE | FULLY_REDEEMED | EXPIRED | CANCELLED
  studioId → Studio
}

GiftCardTransaction {
  id, giftCardId, amount, type: PURCHASE | REDEMPTION | REFUND
  description, createdAt
}

// ── Retail ──

RetailProduct {
  id, name, description, sku, price
  category, imageUrl
  stockQuantity, lowStockThreshold
  isActive
  locationId, studioId → Studio
}

RetailSale {
  id, productId, memberId (nullable)
  quantity, unitPrice, total
  paymentMethod, stripePaymentId
  soldAt, soldBy (staff member)
  locationId
}

// ── Video Library ──

VideoContent {
  id, title, description, thumbnailUrl
  videoUrl, duration, difficulty
  classTypeId, instructorId
  isPublic, isFree
  viewCount, averageRating
  publishedAt
  studioId → Studio
}

VideoCategory {
  id, name, description, sortOrder
  studioId → Studio
}

VideoAccess {
  id, memberId, videoId
  watchedAt, completedAt, watchDuration
}

// ── Reviews ──

Review {
  id, memberId, rating (1-5), comment
  classInstanceId (nullable), instructorId (nullable)
  isPublished, publishedAt
  studioId → Studio
}

// ── Data Import ──

ImportJob {
  id, source: MINDBODY | ARKETA | GLOFOX | MOMOYOGA | ZEN_PLANNER | CSV
  status: PENDING | PROCESSING | COMPLETED | FAILED | ROLLED_BACK
  totalRecords, processedRecords, failedRecords
  errorLog (JSON)
  importedBy, startedAt, completedAt
  rollbackAvailableUntil
  studioId → Studio
}

// ── API Management ──

ApiKey {
  id, name, key (hashed), prefix (first 8 chars for identification)
  scopes (JSON array — e.g., ["classes:read", "bookings:write"])
  lastUsedAt, expiresAt
  isActive
  studioId → Studio
}

WidgetConfig {
  id, name, type: SCHEDULE | BOOKING | MEMBERSHIP | INSTRUCTOR
  config (JSON — colors, layout, filters)
  embedCode
  studioId → Studio
}
```

### New Enums

```prisma
enum StudioType {
  YOGA
  PILATES
  GYM
  CROSSFIT
  BARRE
  DANCE
  MARTIAL_ARTS
  SPIN
  SWIM
  MULTI_DISCIPLINE
  OTHER
}

enum ClassDifficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  ALL_LEVELS
}

enum MembershipPlanType {
  UNLIMITED
  CLASS_PACK
  DROP_IN
  TIME_BASED
  TIERED
  FAMILY
  CORPORATE
  INTRO_OFFER
  TRIAL
}

enum MembershipStatus {
  ACTIVE
  FROZEN
  CANCELLED
  EXPIRED
  PAST_DUE
  TRIALING
}

enum BillingInterval {
  WEEKLY
  MONTHLY
  QUARTERLY
  ANNUALLY
  ONE_TIME
}

enum CheckInMethod {
  QR_CODE
  NFC
  KIOSK
  GEO
  MANUAL
  PIN
}

enum ClassInstanceStatus {
  SCHEDULED
  CANCELLED
  COMPLETED
  IN_PROGRESS
}

enum WaitlistStatus {
  WAITING
  NOTIFIED
  CONFIRMED
  EXPIRED
  CANCELLED
}

enum MemberSegment {
  NEW
  ACTIVE
  LOYAL
  REGULAR
  SLIPPING
  AT_RISK
  LAPSED
  VIP
}

enum ImportSource {
  MINDBODY
  ARKETA
  GLOFOX
  MOMOYOGA
  ZEN_PLANNER
  CSV
}

enum GiftCardStatus {
  ACTIVE
  FULLY_REDEEMED
  EXPIRED
  CANCELLED
}

enum VideoAccessLevel {
  FREE
  MEMBERS_ONLY
  PREMIUM
}
```

---

## Implementation Phases

### Phase 1 — Core Studio Platform (Weeks 1-4)

> Goal: Strip agency, build class management + memberships + check-in. A studio can go operational.

- [ ] Schema migrations (rename Organization→Studio, Subaccount→Location, Contact→Member, Worker→Instructor)
- [ ] Remove all agency language from UI (sidebar, settings, onboarding, etc.)
- [ ] New models: ClassType, ClassTemplate, ClassInstance, Room, ClassWaitlist
- [ ] Class management UI: create/edit class types, build weekly schedule with drag-and-drop
- [ ] Class instance generation from templates (recurring schedule → individual class instances)
- [ ] New models: MembershipPlan, MembershipSubscription, ClassCredit
- [ ] Membership plan builder UI: create plans with pricing, limits, class type restrictions
- [ ] Member signup + membership purchase flow
- [ ] Enhanced Member profiles: fitness fields, waiver, emergency contact
- [ ] Enhanced Instructor profiles: bio, certifications, specialties, public profile
- [ ] New model: CheckIn
- [ ] Check-in system: QR code generation per member, manual check-in, kiosk mode
- [ ] Booking flow: browse schedule → select class → book (validate membership/credits) → confirmation
- [ ] Waitlist: join waitlist for full classes, auto-notify on spot open
- [ ] Cancellation flow: cancel booking with policy enforcement (late-cancel fees)
- [ ] Rebrand sidebar navigation, dashboard, settings for studio context
- [ ] New onboarding flow: studio setup wizard (studio info → location → first class type → first class → invite instructors)

### Phase 2 — Payments & Business Operations (Weeks 5-7)

> Goal: Revenue engine that makes studios money.

- [ ] Membership billing engine: Stripe recurring subscriptions, retry logic, dunning
- [ ] Class pack purchase: one-time Stripe payment → credit allocation → credit deduction per booking
- [ ] Drop-in payments: pay at booking via Stripe
- [ ] Membership freeze/pause/cancel flows with Stripe subscription management
- [ ] New models: GiftCard, GiftCardTransaction
- [ ] Gift card system: purchase, send, redeem, balance tracking
- [ ] Promo code engine: create codes with rules, validate at checkout, track usage
- [ ] No-show / late-cancel fee automation: auto-charge card on file
- [ ] New models: RetailProduct, RetailSale
- [ ] POS for retail sales (simple product catalog + checkout)
- [ ] Instructor payroll calculation: per-class rates, commissions, tips, pay period summaries
- [ ] Revenue dashboard: MRR, revenue by source, payment failure rate, churn

### Phase 3 — CRM & Marketing Automations (Weeks 8-10)

> Goal: Retain members and convert leads.

- [ ] Smart segments engine: auto-calculate member segments based on attendance patterns
- [ ] Segment-based views in member list (filter by New, Slipping Away, At Risk, etc.)
- [ ] Lead pipeline: simplified stages, auto-advance on triggers
- [ ] Pre-built workflow templates: welcome series, trial follow-up, win-back, birthday, milestone, renewal reminder, payment failed, class reminder, post-class feedback
- [ ] Twilio SMS integration (new node type for workflow engine)
- [ ] Automated Google review request workflow (trigger: post-class, action: send review link)
- [ ] New models: ReferralCode, ReferralRedemption
- [ ] Referral program: generate member referral codes, track conversions, apply rewards
- [ ] New models: LoyaltyCard, LoyaltyStamp, Reward
- [ ] Digital loyalty stamp cards: auto-stamp on check-in, reward redemption
- [ ] Campaign improvements: studio-specific templates, segment targeting

### Phase 4 — Public API & Integrations (Weeks 11-13)

> Goal: Let studios use Aurea anywhere.

- [ ] New models: ApiKey, WidgetConfig
- [ ] Public REST API: /classes, /bookings, /members, /memberships, /instructors endpoints
- [ ] API key management UI: create keys, set scopes, view usage
- [ ] Webhook subscription system: event-based notifications to external URLs
- [ ] Embeddable schedule widget: JS embed that renders class schedule on any website
- [ ] Embeddable booking widget: book + pay from external site
- [ ] WordPress plugin: shortcodes + Gutenberg blocks for schedule, booking, membership widgets
- [ ] Reserve with Google integration: publish class schedule to Google Maps
- [ ] ClassPass / Gympass integration: list classes on marketplaces
- [ ] QuickBooks / Xero sync: revenue, invoices, payroll data
- [ ] Zoom integration: auto-create meeting links for virtual classes
- [ ] New model: ImportJob
- [ ] Data import system: Mindbody API import, CSV import with column mapping, preview, validation

### Phase 5 — Mobile Apps (Weeks 14-18)

> Goal: Member-facing and instructor-facing mobile experience.

- [ ] React Native (Expo) project setup with shared API client
- [ ] Member app: authentication, studio discovery/marketplace
- [ ] Member app: class schedule browsing, booking, waitlist
- [ ] Member app: QR code check-in, membership management
- [ ] Member app: payment (class packs, drop-ins, gift cards)
- [ ] Member app: class history, attendance streaks, loyalty card
- [ ] Member app: push notifications (Firebase + APNs)
- [ ] Instructor app: schedule view, class rosters, check-in members
- [ ] Instructor app: accept/decline sub requests, earnings view
- [ ] Studio owner app: dashboard, quick member lookup, revenue snapshot
- [ ] White-label build system: configurable bundle IDs, app icons, splash screens, color themes
- [ ] OTA update pipeline via Expo
- [ ] App Store / Google Play submission pipeline for branded apps

### Phase 6 — Advanced Features (Weeks 19-22)

> Goal: Differentiators that make Aurea best-in-class.

- [ ] New model: SpotMap, SpotBooking
- [ ] Spot / seat picker: visual room layout builder, member selects spot during booking
- [ ] NFC tap-to-book / tap-to-review cards (generate NFC tag URLs, handle deep links)
- [ ] New models: VideoContent, VideoCategory, VideoAccess
- [ ] On-demand video library: upload, categorize, restrict by membership, track views
- [ ] Virtual / livestream classes: Zoom or native WebRTC integration
- [ ] Community features in branded app: member social feed, challenges, leaderboards
- [ ] Studio website builder: pre-built templates, page editor, custom domains (extend funnel builder)
- [ ] AI analytics: churn prediction, class recommendations, pricing optimization suggestions
- [ ] Corporate wellness program management: employer accounts, subsidized memberships, reporting
- [ ] Competitive benchmarking: anonymous, aggregated analytics across Aurea studios
- [ ] Franchise management: multi-studio dashboards, royalty fee tracking, standardized class templates
- [ ] New model: Review
- [ ] Review system: members rate classes and instructors, moderation, display on profiles

---

## Pricing Model

| Plan | Monthly Price | Target Customer | Key Features |
|------|---------------|-----------------|--------------|
| **Starter** | $49/mo | Solo instructors, brand new studios | 1 location, 1 instructor, classes + bookings, basic CRM, email campaigns, QR check-in |
| **Growth** | $99/mo | Established single-location studios | 1 location, 5 instructors, memberships + class packs, workflow automations, SMS, loyalty program, smart segments, API access |
| **Pro** | $199/mo | Multi-instructor studios | 1 location, unlimited instructors, advanced analytics, custom widgets, all integrations, data import, POS, gift cards, video library |
| **Enterprise** | $349/mo | Multi-location studios / franchises | Unlimited locations, franchise tools, priority support, dedicated onboarding, custom automations, corporate wellness |
| **Branded App** | +$149/mo | Any plan | Fully branded iOS + Android app published under studio's name, on-demand video, community features, spot picker |

**Processing fees:** 2.9% + $0.30 per transaction (Stripe standard)
**No setup fees. No contracts. Cancel anytime.**

---

## Competitor Feature Matrix

### Booking & Scheduling

| Feature | Mindbody | Arketa | Glofox | Booksy | Barbr | **Aurea** |
|---------|----------|--------|--------|--------|-------|-----------|
| Recurring class scheduling | Yes | Yes | Yes | Yes | Yes | **Yes** |
| Workshops / events / retreats | Manual | Yes | Yes | No | No | **Yes** |
| Spot / seat picker | No | No | No | No | No | **Yes** (from Mariana Tek) |
| Waitlist + auto-enrollment | Yes | Yes | Yes | Yes | No | **Yes** |
| Substitute management | Yes (SMS) | Limited | Yes | No | No | **Yes** (SMS auto-notify) |
| Reserve with Google | No | No | No | Yes | No | **Yes** |
| Date-specific schedule overrides | No | No | No | No | Yes | **Yes** |
| Multi-location | Yes | Yes | Yes | Yes | No | **Yes** |

### CRM & Members

| Feature | Mindbody | Arketa | Glofox | Booksy | Barbr | **Aurea** |
|---------|----------|--------|--------|--------|-------|-----------|
| Smart auto-segments | No | No | No | Yes | No | **Yes** |
| Digital loyalty stamps | No | No | No | Yes | No | **Yes** |
| VIP / trusted member flag | No | No | No | Yes | No | **Yes** |
| Lead pipeline | Yes (Ultimate) | Yes | Yes | No | No | **Yes** (all plans) |
| Family accounts | Limited | No | No | No | No | **Yes** |
| Referral program | Yes | Limited | Limited | No | No | **Yes** |
| Attendance streaks | No | No | No | No | No | **Yes** |

### Payments & Pricing

| Feature | Mindbody | Arketa | Glofox | Booksy | Barbr | **Aurea** |
|---------|----------|--------|--------|--------|-------|-----------|
| Membership engine | Yes | Yes | Yes | Yes | No | **Yes** |
| Class packs | Yes | Yes | Yes | Yes | No | **Yes** |
| Gift cards | Yes | Limited | Limited | Yes | No | **Yes** |
| No-show fees | Yes | Yes | Yes | Yes | Yes | **Yes** |
| POS for retail | Yes | No | Yes | No | No | **Yes** |
| Dynamic pricing | No | No | No | No | No | **Yes** |

### Marketing

| Feature | Mindbody | Arketa | Glofox | Booksy | Barbr | **Aurea** |
|---------|----------|--------|--------|--------|-------|-----------|
| Workflow automations | Basic | Yes | Basic | Basic | Basic | **Advanced** (150+ nodes) |
| AI email content | No | Yes | No | No | No | **Yes** |
| NFC review cards | No | No | No | No | Yes | **Yes** |
| 2-way SMS | Yes | No | No | No | Yes | **Yes** |
| Automated Google reviews | No | No | No | No | Yes | **Yes** |
| Consumer marketplace | Yes | No | No | Yes | Yes | **Yes** |

### Mobile & Digital

| Feature | Mindbody | Arketa | Glofox | Booksy | Barbr | **Aurea** |
|---------|----------|--------|--------|--------|-------|-----------|
| Branded mobile app | $199/mo | Extra | Included (Plus) | No | No | **$149/mo** |
| Instructor app | Yes | Limited | Yes | No | No | **Yes** |
| QR check-in | Yes | Yes | Yes | No | No | **Yes** |
| NFC check-in | No | No | No | No | No | **Yes** |
| Geo check-in | No | No | No | No | No | **Yes** |
| On-demand video | $99/mo | Yes | Limited | No | No | **Yes** |
| Community features | No | No | No | No | No | **Yes** |

### API & Integrations

| Feature | Mindbody | Arketa | Glofox | Booksy | Barbr | **Aurea** |
|---------|----------|--------|--------|--------|-------|-----------|
| Public API | Yes ($) | No | No | No | No | **Yes** (included) |
| WordPress plugin | Widget | Widget | Widget | No | No | **Native** |
| Embeddable widgets | Yes | Yes | Yes | No | No | **Yes** |
| Zapier | Yes | Yes | Limited | No | No | **Yes** |
| ClassPass / Gympass | Yes | Yes | Yes | No | No | **Yes** |
| Accounting sync | 3rd party | No | Limited | No | No | **Native** |

---

## Competitor Weaknesses We Exploit

| Competitor | Their Weakness | Our Advantage |
|------------|---------------|---------------|
| **Mindbody** | Extremely expensive ($499+ for full features), outdated UI, steep learning curve | Modern UI, transparent pricing, all features accessible at lower price points |
| **Mindbody** | Branded app costs $199/mo extra | Branded app at $149/mo, generic app included free |
| **Mindbody** | Basic automation — no visual workflow builder | Full visual workflow automation engine with 150+ node types |
| **Mindbody** | API access costs extra and is complex | Public API included in Growth plan and above |
| **Arketa** | No public API, limited integrations | Full public API, WordPress plugin, embeddable widgets |
| **Arketa** | Branded app/website costs extra on top of already expensive plans | More transparent pricing, website builder included |
| **Glofox** | Opaque pricing (requires sales call), enterprise-focused | Transparent self-serve pricing, scales from solo to enterprise |
| **Glofox** | No public API | Open API ecosystem |
| **Booksy** | Mandatory app download to book (biggest complaint) | Web-based booking as primary, app optional |
| **Booksy** | 30% commission on marketplace leads | Lower marketplace commission or flat fee model |
| **Booksy** | No spot/seat picker | Visual spot/seat picker for classes |
| **Momoyoga** | No POS, no staff management, no lead CRM | Full-featured platform at comparable price |
| **Vagaro** | Group class scheduling less advanced than 1-on-1 | Purpose-built for group fitness classes |
| **WellnessLiving** | Auto-renewal contract traps, hidden fees | No contracts, cancel anytime, transparent pricing |
| **Zen Planner** | Total cost adds up to $486+/mo with all modules | All-inclusive pricing, no module add-on nickel-and-diming |
| **Mariana Tek** | Enterprise-only custom pricing, overkill for small studios | Spot/seat picker available to all studios, not just enterprise |
| **Barbr** | Limited to barber/salon vertical | NFC ideas applied to fitness vertical |
| **All competitors** | No visual workflow automation builder | Drag-and-drop automation with 150+ nodes — the most powerful automation engine in the fitness space |
| **All competitors** | No AI-powered churn prediction | AI analytics that predict which members will leave |
| **All competitors** | No dynamic pricing based on fill rate | Time-of-day and fill-rate based pricing optimization |

---

## Key Differentiators Summary

1. **Most powerful automation engine in fitness** — visual workflow builder with 150+ node types (no competitor comes close)
2. **Spot/seat picker** at non-enterprise pricing (only Mariana Tek has this, at enterprise cost)
3. **NFC tap-to-book and tap-to-review** — physical-digital bridge no fitness platform offers
4. **AI-powered analytics** — churn prediction, pricing optimization, class recommendations
5. **Dynamic pricing** — fill-rate and time-of-day based (like airlines, but for classes)
6. **Open public API** included in plan (Mindbody charges extra, most others don't have one)
7. **Native WordPress plugin** (not just an iframe embed)
8. **Transparent pricing** with no contracts (vs. Mindbody's enterprise sales process)
9. **Digital loyalty stamp cards** built natively (vs. third-party integrations)
10. **Smart auto-segments** with auto-campaigns ("Slipping Away" members auto-receive win-back)
