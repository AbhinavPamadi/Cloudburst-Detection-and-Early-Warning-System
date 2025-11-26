# 📱 SMS Notification System - Complete Guide

## What Was Fixed

The SMS notification system has been completely overhauled with the following improvements:

### ✅ Fixed Issues

1. **Real Twilio Integration**
   - Previously: SMS sending was only simulated, even when Twilio was configured
   - Now: Actual Twilio API calls are made when configured

2. **Server-Side SMS Sending**
   - Previously: SMS logic ran client-side (insecure)
   - Now: SMS sending happens through a secure API route (`/api/sms`)

3. **Proper Error Handling**
   - Previously: Limited error reporting
   - Now: Detailed error tracking, partial success handling, and comprehensive logging

4. **Configuration Management**
   - Previously: No environment file template
   - Now: `.env.example` file with detailed instructions

5. **Status Checking**
   - Previously: Basic configuration check
   - Now: Full status endpoint that checks SDK installation and all required credentials

## System Architecture

```
┌─────────────────┐
│  Admin Panel    │
│  (Frontend)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ notifications.js│ ◄── Client calls sendSMSNotification()
│  (Lib)          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  /api/sms       │ ◄── Server-side API route
│  (API Route)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Twilio API     │ ◄── Actual SMS sending
│  (External)     │
└─────────────────┘
```

## Files Changed/Created

### New Files
- `src/app/api/sms/route.js` - API endpoint for SMS sending
- `.env.example` - Environment variable template
- `SMS_SYSTEM_README.md` - This file

### Modified Files
- `src/lib/notifications.js` - Updated to use API route
- `src/app/admin/page.js` - Updated SMS status check
- `SMS_QUICK_START.txt` - Updated instructions

## Setup Instructions

### Quick Start (No SMS - Logging Only)

The system works out of the box without any configuration. SMS notifications will be logged to Firebase but not actually sent.

1. Run the application:
   ```bash
   npm run dev
   ```

2. Create an alert with "Send SMS" checked

3. Check the console and Firebase to see logged notifications

### Full Setup (With Twilio)

#### Step 1: Twilio Account Setup

1. **Sign up for Twilio**
   - Go to: https://www.twilio.com/try-twilio
   - Create a free account
   - You get $15.50 credit (enough for ~1,500 SMS)

2. **Verify your phone and email**
   - Complete the verification process

3. **Get a Twilio phone number**
   - Go to: Phone Numbers → Manage → Buy a number
   - Choose a number (FREE with trial)
   - Complete the purchase

4. **Get your credentials**
   - Go to: https://console.twilio.com
   - Copy your **Account SID** (starts with `AC...`)
   - Click "View" to reveal and copy your **Auth Token**
   - Note your **Twilio phone number** (format: `+1234567890`)

#### Step 2: Install Dependencies

```bash
npm install twilio
```

#### Step 3: Configure Environment

1. **Create .env.local file**
   ```bash
   # Windows
   copy .env.example .env.local

   # Mac/Linux
   cp .env.example .env.local
   ```

2. **Edit .env.local** with your credentials:
   ```env
   NEXT_PUBLIC_TWILIO_ENABLED=true
   NEXT_PUBLIC_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   NEXT_PUBLIC_TWILIO_PHONE_NUMBER=+1234567890
   ```

#### Step 4: Restart Server

```bash
npm run dev
```

#### Step 5: Verify Configuration

1. Open the admin panel: http://localhost:3000/admin
2. Press F12 to open console
3. Look for: `📱 SMS Configuration Status:`
4. Should show: `configured: true`

#### Step 6: Test SMS

1. **Important**: With a free trial account, you can only send SMS to **verified phone numbers**

2. **Verify a phone number**:
   - Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
   - Click "Add a new number"
   - Enter your phone number
   - Enter the verification code

3. **Add a contact** with your verified number:
   - Go to: http://localhost:3000/contacts
   - Add a contact with your verified phone number

4. **Create a test alert**:
   - Go to: http://localhost:3000/admin
   - Create an alert
   - Select nodes associated with your contact
   - Check "Send SMS"
   - Click "Create & Send Alert"

5. **Check results**:
   - You should receive the SMS
   - Console will show: `✅ SMS sent successfully`
   - System logs will record the delivery

## API Documentation

### POST /api/sms

Send SMS notifications to multiple recipients.

**Request Body:**
```json
{
  "recipients": ["+1234567890", "+0987654321"],
  "message": "[CRITICAL] Cloudburst detected!",
  "alertId": "alert_abc123",
  "severity": "critical"
}
```

**Response (Success):**
```json
{
  "success": true,
  "configured": true,
  "recipients": 2,
  "successCount": 2,
  "failureCount": 0,
  "message": "SMS sent successfully to 2 recipient(s)",
  "deliveryResults": [
    {
      "to": "+1234567890",
      "status": "queued",
      "sid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "success": true
    }
  ]
}
```

**Response (Not Configured):**
```json
{
  "success": false,
  "configured": false,
  "recipients": 2,
  "message": "SMS service not configured. Please set up Twilio credentials."
}
```

**Response (Partial Success):**
```json
{
  "success": false,
  "partialSuccess": true,
  "configured": true,
  "recipients": 2,
  "successCount": 1,
  "failureCount": 1,
  "message": "SMS sent to 1 recipient(s), failed for 1",
  "deliveryResults": [...],
  "errors": [
    {
      "to": "+1234567890",
      "error": "Invalid phone number",
      "code": 21211
    }
  ]
}
```

### GET /api/sms

Check SMS service configuration status.

**Response:**
```json
{
  "enabled": true,
  "configured": true,
  "accountSid": "Set",
  "authToken": "Set",
  "phoneNumber": "Set",
  "sdkInstalled": true,
  "status": "Ready"
}
```

## Troubleshooting

### Issue: "Twilio SDK not installed"

**Solution:**
```bash
npm install twilio
```

### Issue: "SMS service not configured"

**Checklist:**
- [ ] `.env.local` file exists
- [ ] `NEXT_PUBLIC_TWILIO_ENABLED=true`
- [ ] `NEXT_PUBLIC_TWILIO_ACCOUNT_SID` is set
- [ ] `TWILIO_AUTH_TOKEN` is set
- [ ] `NEXT_PUBLIC_TWILIO_PHONE_NUMBER` is set
- [ ] Server restarted after changing `.env.local`

### Issue: "Cannot send SMS to unverified number"

**Cause:** Twilio trial accounts can only send to verified numbers.

**Solution:**
1. Verify the recipient's phone number in Twilio Console
2. OR upgrade to a paid account ($20 minimum)

### Issue: SMS sent but not received

**Possible causes:**
- Phone number format incorrect (should be: `+1234567890`)
- Carrier blocking SMS
- Phone number is landline (can't receive SMS)
- Number is outside allowed countries for trial account

**Solution:**
- Check Twilio logs: https://console.twilio.com/us1/monitor/logs/sms
- Verify phone number format includes country code
- Try with a different phone number

### Issue: "Authentication failed"

**Solution:**
- Verify Auth Token is correct (case-sensitive)
- Check if Auth Token was regenerated in Twilio Console
- Make sure there are no extra spaces in `.env.local`

## Cost & Limits

### Free Trial Account
- **Credit**: $15.50
- **SMS Cost**: ~$0.01 per SMS
- **Total SMS**: ~1,500 messages
- **Limitations**: Can only send to verified numbers
- **Duration**: No expiration (credit doesn't expire)

### Paid Account
- **Minimum**: $20
- **SMS Cost**: $0.0079 per SMS (to US/Canada)
- **No restrictions**: Send to any valid phone number
- **International**: Available at higher rates

### Example Costs

| Scenario | Free Trial | Paid Account |
|----------|-----------|--------------|
| 100 alerts to 5 people | $5.00 (500 SMS) | $3.95 |
| 1 alert/day for 30 days to 10 people | $3.00 (300 SMS) | $2.37 |
| 1000 alerts to 1 person | $10.00 | $7.90 |

## Security Best Practices

1. **Never commit `.env.local`** to version control
   - Already in `.gitignore`
   - Contains sensitive credentials

2. **Use environment variables** for production
   - Set in Vercel/Netlify/hosting platform
   - Don't hardcode credentials

3. **Rotate credentials regularly**
   - Regenerate Auth Token periodically
   - Update in `.env.local` and hosting platform

4. **Monitor usage**
   - Check Twilio Console regularly
   - Set up usage alerts
   - Watch for suspicious activity

5. **Validate phone numbers**
   - System includes phone validation
   - Format: Indian numbers (10 digits)
   - Converted to E.164 format (+91xxxxxxxxxx)

## Production Deployment

### Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_TWILIO_ENABLED=true`
   - `NEXT_PUBLIC_TWILIO_ACCOUNT_SID=ACxxx...`
   - `TWILIO_AUTH_TOKEN=xxx`
   - `NEXT_PUBLIC_TWILIO_PHONE_NUMBER=+1xxx`
4. Deploy

### Other Platforms

Add the same environment variables in your platform's settings.

## Testing Checklist

- [ ] System works without Twilio (logs notifications)
- [ ] `/api/sms` GET returns correct status
- [ ] SMS sends successfully with valid config
- [ ] Error handling works for invalid numbers
- [ ] Partial success handled correctly
- [ ] Firebase logging works
- [ ] System logs record all events
- [ ] Admin panel shows correct status

## Support & Resources

- **Twilio Documentation**: https://www.twilio.com/docs/sms
- **Twilio Console**: https://console.twilio.com
- **SMS Logs**: https://console.twilio.com/us1/monitor/logs/sms
- **Support**: https://support.twilio.com

## What's Next?

Future improvements could include:
- Support for other SMS providers (Fast2SMS, etc.)
- SMS templates with variables
- Delivery status webhooks
- SMS scheduling
- Bulk SMS optimization
- A/B testing for message content
