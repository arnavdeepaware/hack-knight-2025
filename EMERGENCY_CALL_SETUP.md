# 🚨 Emergency Call Feature - Complete Setup Guide

## Overview
Voice-activated emergency calling via Twilio integration. Users can say "call my contact" to place an emergency call with confirmation flow.

---

## ✅ Features Implemented

### 1. **Voice Commands**
- "Call my contact"
- "Emergency call"
- "Call emergency"
- "Call contact"

### 2. **Confirmation Flow**
```
User: "Call my contact"
AI: "This will call your emergency contact. Say 'confirm' to proceed, or 'cancel' to abort."

User: "Confirm" → Places call
User: "Cancel" → Aborts call
```

### 3. **Button Trigger**
- Emergency button in UI opens overlay
- Automatically places call when activated
- Shows real-time call status

### 4. **Backend API**
- Endpoint: `POST /api/emergency/call`
- Uses Twilio REST API
- Voice message includes reason and location

---

## 🔧 Setup Instructions

### Step 1: Install Twilio SDK

```bash
cd backend
npm install twilio
```

### Step 2: Configure Environment Variables

Add to `backend/.env`:

```env
# Twilio Emergency Call Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_32_characters
TWILIO_FROM_NUMBER=+1234567890
AEYE_EMERGENCY_CONTACT=+1234567890
AEYE_LOCATION=Home Address or GPS Coordinates
```

### Step 3: Get Twilio Credentials

1. Sign up at https://www.twilio.com/try-twilio
2. Get free trial credits ($15)
3. Navigate to Console Dashboard
4. Copy:
   - **Account SID** (starts with `AC`)
   - **Auth Token** (32 characters)

### Step 4: Get Twilio Phone Number

1. Go to Phone Numbers → Manage → Buy a number
2. Choose a number with **Voice** capability
3. Copy the number in E.164 format (e.g., `+12025551234`)
4. Set as `TWILIO_FROM_NUMBER`

### Step 5: Verify Emergency Contact (Trial Accounts Only)

1. Go to Phone Numbers → Manage → Verified Caller IDs
2. Click "Add a new number"
3. Enter emergency contact number
4. Verify via SMS/call
5. Set as `AEYE_EMERGENCY_CONTACT`

---

## 📱 How to Use

### Voice Activation

1. **Start the app** with camera and voice enabled
2. **Say**: "Call my contact"
3. **AI responds**: "This will call your emergency contact. Say confirm to proceed, or cancel to abort."
4. **Say**: "Confirm"
5. **AI responds**: "Calling your emergency contact now..."
6. **Call placed** via Twilio with voice message

### Button Activation

1. **Click** the red emergency button (top-left)
2. **Emergency overlay** opens with camera
3. **Call automatically placed** when overlay opens
4. **Status updates** show in real-time

---

## 🎯 Voice Message Content

When a call is placed, the emergency contact hears:

> "Emergency alert from AEye. [Reason]. Location: [Location]. Please respond immediately."

Example:
> "Emergency alert from AEye. User requested emergency assistance via voice command. Location: 123 Main St, San Francisco. Please respond immediately."

---

## 🧪 Testing

### Test Voice Command Flow

```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend
cd frontend
open public/main.html
```

Then:
1. Click microphone icon to start listening
2. Say: "Call my contact"
3. Wait for confirmation prompt
4. Say: "Confirm"
5. Check backend logs for call status
6. Verify call received on emergency contact number

### Test Button Flow

1. Open `public/main.html`
2. Click red emergency button
3. Check call status in overlay
4. Verify call received

### Check Backend Logs

```
🚨 ================================
📞 Emergency call request received
📱 Calling from: +1234567890 → +1987654321
📍 Location: 123 Main St
✅ Emergency call placed successfully
   Call SID: CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Status: queued
================================
```

---

## ⚠️ Troubleshooting

### Error: "Authentication failed"
**Solution**: Check `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in `.env`

### Error: "Invalid phone number"
**Solution**: Use E.164 format: `+[country code][number]` (e.g., `+12025551234`)

### Error: "The number must be verified" (Trial)
**Solution**: Add emergency contact as verified caller ID in Twilio console

### Error: "Insufficient funds"
**Solution**: Add credits to Twilio account or upgrade from trial

### Call not received
**Checklist**:
- [ ] Phone number has voice capability
- [ ] Emergency contact is verified (trial accounts)
- [ ] Phone number is in E.164 format
- [ ] Twilio account has credits
- [ ] Check Twilio logs at https://console.twilio.com/logs/calls

---

## 💰 Costs

### Twilio Pricing (US)
- **Trial**: $15 free credits
- **Outbound Voice**: ~$0.013/min
- **Example**: 100 emergency calls (1 min each) = $1.30

### Production Recommendations
- Upgrade from trial for unverified numbers
- Set up usage alerts in Twilio console
- Monitor costs at https://console.twilio.com/billing

---

## 🔐 Security Best Practices

1. **Never commit `.env`** - Add to `.gitignore`
2. **Rotate credentials** regularly
3. **Use environment-specific** credentials
4. **Rate limit** emergency calls (prevent abuse)
5. **Log all calls** for audit trail

---

## 📊 API Reference

### Endpoint: `POST /api/emergency/call`

**Request:**
```json
{
  "reason": "User requested emergency assistance via voice command"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Emergency call placed successfully",
  "callSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "queued"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Authentication failed. Please check Twilio credentials.",
  "details": "HTTP 401 Error"
}
```

---

## 🎤 Voice Commands Reference

| Command | Action |
|---------|--------|
| "Call my contact" | Initiates emergency call with confirmation |
| "Emergency call" | Initiates emergency call with confirmation |
| "Confirm" | Confirms and places the call |
| "Cancel" | Aborts the emergency call |

---

## 🚀 Demo Script (30 seconds)

**Showcase for judges:**

```
"Let me show you our emergency feature. Watch - I'll say:

[Say] "Call my contact"

[AI responds] "This will call your emergency contact. Say confirm to proceed."

[Say] "Confirm"

[AI responds] "Calling your emergency contact now..."

[Show backend logs] - You can see the call was placed via Twilio.
[Show phone] - And here's the call coming through.

This gives visually impaired users instant access to help - completely hands-free."
```

---

## 📝 Code Architecture

### Backend (`server.js`)
```
POST /api/emergency/call
├── Load Twilio credentials from .env
├── Validate credentials and phone format
├── Initialize Twilio client
├── Create TwiML voice message
├── Place call via Twilio API
└── Return success/error response
```

### Frontend (`app.js`)
```
handleVoiceQuery()
├── Detect emergency keywords
├── Set awaitingEmergencyConfirmation flag
├── Wait for "confirm" or "cancel"
├── If confirmed:
│   ├── Fetch POST /api/emergency/call
│   ├── Display success/error message
│   └── Speak response
└── If cancelled: Clear flag and abort
```

---

## ✨ Future Enhancements

- [ ] SMS notifications (currently disabled)
- [ ] GPS location integration
- [ ] Multiple emergency contacts
- [ ] Call recording for evidence
- [ ] Automatic retry on failure
- [ ] Video call option
- [ ] Silent alarm mode

---

## 📞 Support

**Twilio Documentation**: https://www.twilio.com/docs/voice
**Console**: https://console.twilio.com
**Support**: https://support.twilio.com

---

## ✅ Pre-Demo Checklist

- [ ] Backend running (`npm start` in `backend/`)
- [ ] Frontend open (`main.html`)
- [ ] Twilio credentials in `.env`
- [ ] Emergency contact verified (trial)
- [ ] Test call successful
- [ ] Microphone permission granted
- [ ] Volume at 80%
- [ ] Phone ready to receive call
- [ ] Backend logs visible for judges

**Status**: ✅ Ready for demo!
