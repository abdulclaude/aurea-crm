# Booking System - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Start the Server
```bash
npm run dev
```
This will start the dev server and clear any TypeScript errors.

### Step 2: Access the Booking System
Navigate to: **http://localhost:3000/bookings**

### Step 3: Create Your First Event Type
1. Click "Event Types" in the sidebar (or go to `/bookings/event-types`)
2. Click "Create Event Type"
3. Fill in:
   - **Title:** "30 Minute Consultation"
   - **Duration:** 30 minutes
   - **Location Type:** Google Meet
4. Click "Create"

### Step 4: Create Your First Booking
1. Go back to "Bookings" (or `/bookings`)
2. Click "New booking"
3. Fill in:
   - **Event Type:** Select the one you just created
   - **Attendee Name:** John Doe
   - **Email:** john@example.com
   - **Date & Time:** Pick a future date/time
4. Click "Create Booking"

Done! 🎉 Your first booking is created.

---

## 🔗 Quick Links

| Page | URL | Purpose |
|------|-----|---------|
| **Bookings List** | `/bookings` | View all bookings |
| **Event Types** | `/bookings/event-types` | Manage service types |
| **Cal.com Settings** | `/settings/integrations/calcom` | Connect Cal.com |

---

## 🎯 Common Tasks

### Search for a Booking
1. Go to `/bookings`
2. Use the search box to find by name or email

### Filter Bookings
1. Go to `/bookings`
2. Use the dropdown filters:
   - **Status:** Pending, Confirmed, Cancelled, etc.
   - **Event Type:** Filter by service type

### View Booking Details
1. Click on any booking row
2. Side panel opens with full details

### Reschedule a Booking
1. Click the ⋮ menu on a booking
2. Select "Reschedule"
3. Choose new date/time
4. Click "Reschedule Booking"

### Cancel a Booking
1. Click the ⋮ menu on a booking
2. Select "Cancel booking"
3. Confirm the cancellation

---

## 🔧 Cal.com Integration (Optional)

### Setup Cal.com
1. Get your API key from: https://app.cal.com/settings/developer/api-keys
2. Go to `/settings/integrations/calcom`
3. Paste API key
4. Click "Test Connection"
5. Click "Save & Connect"
6. Click "Sync Event Types"

### Webhook Setup
Add this URL in Cal.com settings:
```
https://your-domain.com/api/webhooks/calcom?subaccountId=YOUR_SUBACCOUNT_ID
```

---

## 📊 Features Overview

| Feature | Status | Description |
|---------|--------|-------------|
| ✅ Create Booking | **Ready** | Full form with validation |
| ✅ View Details | **Ready** | Side panel with all info |
| ✅ Reschedule | **Ready** | Change date/time easily |
| ✅ Cancel | **Ready** | Cancel with optional reason |
| ✅ Search | **Ready** | Find by name or email |
| ✅ Filter | **Ready** | Filter by status/type |
| ✅ Event Types | **Ready** | Manage service templates |
| ✅ Cal.com Sync | **Ready** | Optional bidirectional sync |

---

## 🐛 Troubleshooting

### TypeScript Errors?
**Fix:** Restart dev server with `npm run dev`

### Can't See Bookings Menu?
**Fix:** Clear browser cache and reload

### Cal.com Not Syncing?
**Check:** 
- API key is correct
- Connection tested successfully
- Event type has Cal.com sync enabled

---

## 📝 Next Steps

Once comfortable with basic operations:
1. Link bookings to Contacts
2. Link bookings to Deals
3. Set up email notifications (optional)
4. Configure Cal.com webhooks (optional)
5. Build custom workflows with booking triggers

---

## 💡 Tips

- **Create event types first** before creating bookings
- **Use descriptive names** for easy filtering
- **Test Cal.com sync** in a test environment first
- **Add notes** to bookings for context

---

**Need Help?**
- Check `BOOKING_SYSTEM_FINAL_SUMMARY.md` for complete documentation
- Review `BOOKING_UI_IMPLEMENTATION_COMPLETE.md` for UI details
- See `BOOKING_SYSTEM_IMPLEMENTATION.md` for backend details

---

Ready to manage your bookings! 🚀
