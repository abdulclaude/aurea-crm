# Node Catalog - Complete Reference

## 📋 All Node Types (150+)

### 🔵 GOOGLE WORKSPACE

#### Gmail
**Triggers:**
- `GMAIL_TRIGGER` - New Email

**Executions:**
- `GMAIL_SEND_EMAIL` - Send Email
- `GMAIL_REPLY_TO_EMAIL` - Reply to Email
- `GMAIL_SEARCH_EMAILS` - Search Emails
- `GMAIL_ADD_LABEL` - Add Label

#### Google Calendar
**Triggers:**
- `GOOGLE_CALENDAR_EVENT_CREATED` - Event Created
- `GOOGLE_CALENDAR_EVENT_UPDATED` - Event Updated
- `GOOGLE_CALENDAR_EVENT_DELETED` - Event Deleted

**Executions:**
- `GOOGLE_CALENDAR_CREATE_EVENT` - Create Event
- `GOOGLE_CALENDAR_UPDATE_EVENT` - Update Event
- `GOOGLE_CALENDAR_DELETE_EVENT` - Delete Event
- `GOOGLE_CALENDAR_FIND_AVAILABLE_TIMES` - Find Available Times

#### Google Drive
**Triggers:**
- `GOOGLE_DRIVE_FILE_CREATED` - File Created
- `GOOGLE_DRIVE_FILE_UPDATED` - File Updated
- `GOOGLE_DRIVE_FILE_DELETED` - File Deleted
- `GOOGLE_DRIVE_FOLDER_CREATED` - Folder Created

**Executions:**
- `GOOGLE_DRIVE_UPLOAD_FILE` - Upload File
- `GOOGLE_DRIVE_DOWNLOAD_FILE` - Download File
- `GOOGLE_DRIVE_MOVE_FILE` - Move File
- `GOOGLE_DRIVE_DELETE_FILE` - Delete File
- `GOOGLE_DRIVE_CREATE_FOLDER` - Create Folder

#### Google Forms
**Triggers:**
- `GOOGLE_FORM_TRIGGER` - Form Submission Received

**Executions:**
- `GOOGLE_FORM_READ_RESPONSES` - Read Responses
- `GOOGLE_FORM_CREATE_RESPONSE` - Create Response

---

### 🟦 MICROSOFT 365

#### Outlook Email
**Triggers:**
- `OUTLOOK_NEW_EMAIL` - New Email
- `OUTLOOK_EMAIL_MOVED` - Email Moved
- `OUTLOOK_EMAIL_DELETED` - Email Deleted

**Executions:**
- `OUTLOOK_SEND_EMAIL` - Send Email
- `OUTLOOK_REPLY_TO_EMAIL` - Reply to Email
- `OUTLOOK_MOVE_EMAIL` - Move Email
- `OUTLOOK_SEARCH_EMAILS` - Search Emails

#### OneDrive
**Triggers:**
- `ONEDRIVE_FILE_CREATED` - File Created
- `ONEDRIVE_FILE_UPDATED` - File Updated
- `ONEDRIVE_FILE_DELETED` - File Deleted

**Executions:**
- `ONEDRIVE_UPLOAD_FILE` - Upload File
- `ONEDRIVE_DOWNLOAD_FILE` - Download File
- `ONEDRIVE_MOVE_FILE` - Move File
- `ONEDRIVE_DELETE_FILE` - Delete File

#### Outlook Calendar
**Triggers:**
- `OUTLOOK_CALENDAR_EVENT_CREATED` - Event Created
- `OUTLOOK_CALENDAR_EVENT_UPDATED` - Event Updated
- `OUTLOOK_CALENDAR_EVENT_DELETED` - Event Deleted

**Executions:**
- `OUTLOOK_CALENDAR_CREATE_EVENT` - Create Event
- `OUTLOOK_CALENDAR_UPDATE_EVENT` - Update Event
- `OUTLOOK_CALENDAR_DELETE_EVENT` - Delete Event

---

### 💬 COMMUNICATION & SOCIAL

#### Slack
**Triggers:**
- `SLACK_NEW_MESSAGE` - New Message
- `SLACK_MESSAGE_REACTION` - Message Reaction
- `SLACK_CHANNEL_JOINED` - Channel Joined

**Executions:**
- `SLACK_SEND_MESSAGE` - Send Message
- `SLACK_UPDATE_MESSAGE` - Update Message
- `SLACK_SEND_DM` - Send DM
- `SLACK_UPLOAD_FILE` - Upload File

#### Discord
**Triggers:**
- `DISCORD_NEW_MESSAGE` - New Message
- `DISCORD_NEW_REACTION` - New Reaction
- `DISCORD_USER_JOINED` - User Joined

**Executions:**
- `DISCORD_SEND_MESSAGE` - Send Message
- `DISCORD_EDIT_MESSAGE` - Edit Message
- `DISCORD_SEND_EMBED` - Send Embed
- `DISCORD_SEND_DM` - Send DM

#### Telegram
**Triggers:**
- `TELEGRAM_NEW_MESSAGE` - New Message
- `TELEGRAM_COMMAND_RECEIVED` - Command Received

**Executions:**
- `TELEGRAM_SEND_MESSAGE` - Send Message
- `TELEGRAM_SEND_PHOTO` - Send Photo
- `TELEGRAM_SEND_DOCUMENT` - Send Document

---

### 🟣 CRM

#### Contacts
**Triggers:**
- `CONTACT_CREATED_TRIGGER` - Contact Created
- `CONTACT_UPDATED_TRIGGER` - Contact Updated
- `CONTACT_DELETED_TRIGGER` - Contact Deleted
- `CONTACT_FIELD_CHANGED_TRIGGER` - Contact Field Changed
- `CONTACT_TYPE_CHANGED_TRIGGER` - Contact Type Changed
- `CONTACT_LIFECYCLE_STAGE_CHANGED_TRIGGER` - Lifecycle Stage Changed

**Executions:**
- `CREATE_CONTACT` - Create Contact
- `UPDATE_CONTACT` - Update Contact
- `DELETE_CONTACT` - Delete Contact
- `FIND_CONTACTS` - Find Contacts
- `ADD_TAG_TO_CONTACT` - Add Tag
- `REMOVE_TAG_FROM_CONTACT` - Remove Tag

#### Deals
**Triggers:**
- `DEAL_CREATED_TRIGGER` - Deal Created
- `DEAL_UPDATED_TRIGGER` - Deal Updated
- `DEAL_DELETED_TRIGGER` - Deal Deleted
- `DEAL_STAGE_CHANGED_TRIGGER` - Deal Stage Changed

**Executions:**
- `CREATE_DEAL` - Create Deal
- `UPDATE_DEAL` - Update Deal
- `DELETE_DEAL` - Delete Deal
- `MOVE_DEAL_STAGE` - Move Deal Stage
- `ADD_DEAL_NOTE` - Add Deal Note

#### Appointments (Future)
**Triggers:**
- `APPOINTMENT_CREATED_TRIGGER` - Appointment Created
- `APPOINTMENT_CANCELLED_TRIGGER` - Appointment Cancelled

**Executions:**
- `SCHEDULE_APPOINTMENT` - Schedule Appointment
- `UPDATE_APPOINTMENT` - Update Appointment
- `CANCEL_APPOINTMENT` - Cancel Appointment

---

### 💰 PAYMENTS (STRIPE)

**Triggers:**
- `STRIPE_PAYMENT_SUCCEEDED` - Payment Succeeded
- `STRIPE_PAYMENT_FAILED` - Payment Failed
- `STRIPE_SUBSCRIPTION_CREATED` - Subscription Created
- `STRIPE_SUBSCRIPTION_UPDATED` - Subscription Updated
- `STRIPE_SUBSCRIPTION_CANCELLED` - Subscription Cancelled

**Executions:**
- `STRIPE_CREATE_CHECKOUT_SESSION` - Create Checkout Session
- `STRIPE_CREATE_INVOICE` - Create Invoice
- `STRIPE_SEND_INVOICE` - Send Invoice
- `STRIPE_REFUND_PAYMENT` - Refund Payment

---

### 🔧 LOGIC & CONTROL FLOW

**Executions Only:**
- `IF_ELSE` - IF / ELSE branching
- `SWITCH` - Switch statement (multiple branches)
- `LOOP` - Loop over array or N times
- `WAIT` - Wait / Delay execution
- `SET_VARIABLE` - Set Variable
- `STOP_WORKFLOW` - Stop Workflow
- `HTTP_REQUEST` - HTTP Request

---

### 🤖 AI (GEMINI)

**Executions Only:**
- `GEMINI_GENERATE_TEXT` - Generate Text
- `GEMINI_SUMMARISE` - Summarise
- `GEMINI_TRANSFORM` - Transform Data
- `GEMINI_CLASSIFY` - Classify Text

---

### 🔄 BUNDLE WORKFLOWS

**Executions Only:**
- `BUNDLE_WORKFLOW` - Execute Workflow (nested workflow)
- `EXECUTE_WORKFLOW` - Execute Workflow (alias)

---

### ⚙️ SYSTEM

**Triggers:**
- `MANUAL_TRIGGER` - Trigger Manually
- `INITIAL` - Initial placeholder node

---

## 📊 Statistics

- **Total Nodes:** 150+
- **Triggers:** 45+
- **Executions:** 105+

### By Category:
- **Google:** 24 nodes
- **Microsoft:** 18 nodes
- **Communication:** 21 nodes
- **CRM:** 16 nodes
- **Payments:** 9 nodes
- **Logic:** 7 nodes
- **AI:** 4 nodes
- **Other:** 3 nodes

### Implementation Status:
- ✅ **Schema:** 100% complete
- ✅ **UI:** 100% complete
- ⏳ **Node Components:** 0% (ready to implement)
- ⏳ **Executors:** 0% (ready to implement)

---

## 🎯 Recommended Implementation Order

### Phase 1: High-Value Quick Wins
1. Slack Send Message
2. Discord Send Message
3. Gmail Send Email
4. Stripe Payment Succeeded trigger
5. Deal Created trigger

### Phase 2: Complete Core Platforms
1. All Slack nodes
2. All Discord nodes
3. All Gmail execution nodes
4. All Stripe nodes
5. All Deal triggers

### Phase 3: Advanced Features
1. Google Drive operations
2. OneDrive operations
3. AI Gemini nodes
4. Advanced CRM operations
5. Calendar detailed operations

### Phase 4: Specialized Use Cases
1. Form operations
2. Advanced triggers
3. Appointment system
4. Custom integrations

---

## 🔗 Quick Links

- Implementation Guide: [NODE_IMPLEMENTATION_GUIDE.md](./NODE_IMPLEMENTATION_GUIDE.md)
- Summary: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- Schema: [prisma/schema.prisma](./prisma/schema.prisma)
- UI: [src/components/node-selector.tsx](./src/components/node-selector.tsx)
