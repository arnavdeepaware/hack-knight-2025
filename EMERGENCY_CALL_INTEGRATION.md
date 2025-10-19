# 🚨 Emergency Call Integration Plan

## Overview
Integrate Twilio voice calling into the emergency feature with voice activation support.

## Architecture

### Backend (Node.js)
1. Install Twilio Node SDK: `npm install twilio`
2. Add new endpoint: `POST /api/emergency/call`
3. Load Twilio credentials from `.env`
4. Call emergency contact with voice message

### Frontend (JavaScript)
1. Add voice command detection: "call my contact" or "emergency call"
2. Add confirmation flow: speak "confirm" to proceed
3. Call backend endpoint when confirmed
4. Update UI to show call status

## Environment Variables Needed
```env
# Add to backend/.env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_FROM_NUMBER=+1234567890
AEYE_EMERGENCY_CONTACT=+1234567890
AEYE_LOCATION=Unknown location
```

## Voice Flow
```
User: "Call my contact" or "Emergency call"
AI: "This will call your emergency contact. Say 'confirm' to proceed, or 'cancel' to abort."
User: "Confirm"
AI: "Calling your emergency contact now..."
[Call placed via Twilio]
AI: "Emergency call placed successfully. Help is on the way."
```

## Implementation Time: ~15 minutes
- Backend endpoint: 5 min
- Frontend voice commands: 5 min
- Testing: 5 min
