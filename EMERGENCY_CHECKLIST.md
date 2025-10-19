# ✅ Emergency Call - Setup Checklist

Use this checklist to set up the emergency call feature step-by-step.

---

## Phase 1: Twilio Account Setup (5 minutes)

### Step 1: Create Account
- [ ] Go to https://www.twilio.com/try-twilio
- [ ] Sign up with email
- [ ] Verify email address
- [ ] Complete phone verification
- [ ] **Result**: $15 free trial credits

### Step 2: Get Credentials
- [ ] Go to https://console.twilio.com
- [ ] Navigate to Dashboard
- [ ] Copy **Account SID** (starts with `AC`)
- [ ] Copy **Auth Token** (click "View" to reveal)
- [ ] Save both to a safe place

### Step 3: Get Phone Number
- [ ] Go to Phone Numbers → Buy a Number
- [ ] Filter by "Voice" capability
- [ ] Choose a number (preferably local area code)
- [ ] Purchase number (uses trial credits)
- [ ] Copy number in format: `+12025551234`

### Step 4: Verify Emergency Contact (Trial Only)
- [ ] Go to Phone Numbers → Verified Caller IDs
- [ ] Click "Add a new number"
- [ ] Enter your emergency contact number
- [ ] Choose verification method (SMS or Call)
- [ ] Complete verification code
- [ ] **Result**: Number can now receive calls

---

## Phase 2: Backend Setup (2 minutes)

### Step 5: Install Twilio Package
```bash
cd /Users/arnav/Desktop/projects/hack-knight-2025/backend
npm install twilio
```

**Checklist**:
- [ ] Command ran successfully
- [ ] No errors in terminal
- [ ] Check `package.json` includes `"twilio": "^5.x.x"`

### Step 6: Configure Environment Variables
- [ ] Open `backend/.env` file
- [ ] Add these lines:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_32_character_auth_token
TWILIO_FROM_NUMBER=+12025551234
AEYE_EMERGENCY_CONTACT=+19876543210
AEYE_LOCATION=123 Main St, San Francisco, CA
```
- [ ] Replace with YOUR actual credentials
- [ ] Save file
- [ ] **Verify**: No quotes needed, no spaces around `=`

---

## Phase 3: Test Backend (3 minutes)

### Step 7: Start Backend Server
```bash
cd /Users/arnav/Desktop/projects/hack-knight-2025/backend
npm start
```

**Expected Output**:
```
🚀 ================================
✅ Backend server running on http://localhost:3001
🔑 Gemini API Key: Configured ✓
📡 CORS enabled for: http://localhost:3000
🤖 Model: gemini-2.0-flash
================================

📋 Available endpoints:
   POST http://localhost:3001/api/detect - Analyze food product
   POST http://localhost:3001/api/chat - Chat with AI assistant
   POST http://localhost:3001/api/emergency/call - Place emergency call (Twilio)
   ...
```

**Checklist**:
- [ ] No errors in startup
- [ ] See emergency call endpoint listed
- [ ] Port 3001 is running
- [ ] Leave this terminal open

### Step 8: Test Emergency Call Endpoint (Optional)
Open new terminal:
```bash
curl -X POST http://localhost:3001/api/emergency/call \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test call from setup"}'
```

**Expected**: JSON response with `"success": true` and call SID

**Checklist**:
- [ ] Response shows success
- [ ] Emergency contact phone rings
- [ ] Voice message plays
- [ ] Backend shows logs

**If test fails**:
- Check `.env` credentials are correct
- Check phone numbers in E.164 format (+1...)
- Check emergency contact is verified (trial)
- Check Twilio account has credits

---

## Phase 4: Frontend Test (3 minutes)

### Step 9: Open Frontend
```bash
cd /Users/arnav/Desktop/projects/hack-knight-2025/frontend
open public/main.html
```

**Checklist**:
- [ ] Page opens in browser
- [ ] No console errors (F12 → Console)
- [ ] UI loads properly

### Step 10: Test Voice Command
1. **Click microphone icon** (or say wake word)
2. **Say**: "Call my contact"
3. **Expected**: AI says "This will call your emergency contact. Say confirm to proceed, or cancel to abort."
4. **Say**: "Confirm"
5. **Expected**: AI says "Calling your emergency contact now..."
6. **Check**: Emergency contact phone rings

**Checklist**:
- [ ] Voice command recognized
- [ ] Confirmation prompt heard
- [ ] "Confirm" recognized
- [ ] Call placed successfully
- [ ] Emergency contact received call
- [ ] Voice message played correctly

### Step 11: Test Emergency Button
1. **Click red emergency button** (top-left)
2. **Expected**: Overlay opens
3. **Check**: "Calling emergency contact..." status
4. **Check**: Emergency contact phone rings

**Checklist**:
- [ ] Button opens overlay
- [ ] Call placed automatically
- [ ] Status updates shown
- [ ] Emergency contact received call

---

## Phase 5: Demo Preparation (2 minutes)

### Step 12: Prepare Demo Environment
- [ ] Backend running in visible terminal
- [ ] Frontend open in browser (main.html)
- [ ] Microphone permission granted
- [ ] Volume at 80%
- [ ] Emergency contact phone ready and on
- [ ] Phone ringer/volume turned up
- [ ] Test "call my contact" one more time

### Step 13: Practice Demo Script
**Practice saying clearly**:
- [ ] "Call my contact"
- [ ] "Confirm"
- [ ] Explain feature in 30 seconds

**30-Second Script**:
```
"Our app has a critical safety feature - hands-free emergency calling 
for visually impaired users. Watch - I'll say:

[Say] 'Call my contact'

Notice it asks for confirmation - safety first.

[Say] 'Confirm'

[Show backend] - Real Twilio call placed.

[Show phone] - Emergency contact receiving call with location.

This gives visually impaired users instant access to help - 
completely hands-free, no buttons to find in a panic."
```

---

## Troubleshooting Guide

### ❌ "Authentication failed"
**Fix**:
- [ ] Check `TWILIO_ACCOUNT_SID` starts with `AC`
- [ ] Check `TWILIO_AUTH_TOKEN` is 32 characters
- [ ] No spaces or quotes in `.env`
- [ ] Restart backend after changes

### ❌ "Invalid phone number"
**Fix**:
- [ ] Use E.164 format: `+12025551234`
- [ ] Include country code (+1 for US)
- [ ] No dashes, spaces, or parentheses
- [ ] Check both FROM and TO numbers

### ❌ "Number must be verified"
**Fix** (Trial accounts only):
- [ ] Go to https://console.twilio.com/us1/verification/list
- [ ] Add emergency contact as verified caller ID
- [ ] Complete SMS/call verification
- [ ] Wait 1-2 minutes for verification to activate

### ❌ Voice not recognized
**Fix**:
- [ ] Check microphone permission in browser
- [ ] Try Chrome (best Web Speech API support)
- [ ] Speak clearly and wait 1 second after "listening" indicator
- [ ] Check console for errors (F12)

### ❌ Call not received
**Fix**:
- [ ] Check emergency contact phone is on
- [ ] Check ringer volume is up
- [ ] Check Twilio balance: https://console.twilio.com/billing
- [ ] Check Twilio logs: https://console.twilio.com/logs/calls
- [ ] Try test call with curl (see Step 8)

---

## Final Verification

### Before Demo - Check All:
- [ ] ✅ Backend running (http://localhost:3001)
- [ ] ✅ Frontend open (main.html)
- [ ] ✅ Twilio credentials configured
- [ ] ✅ Emergency contact verified (trial)
- [ ] ✅ Test call successful
- [ ] ✅ Voice commands working
- [ ] ✅ Button trigger working
- [ ] ✅ Demo script practiced
- [ ] ✅ Emergency phone ready

---

## Quick Reference

**Voice Commands**:
- "Call my contact" → Confirmation prompt
- "Confirm" → Places call
- "Cancel" → Aborts call

**API Endpoint**:
```bash
POST http://localhost:3001/api/emergency/call
```

**Documentation**:
- Full setup: `EMERGENCY_CALL_SETUP.md`
- Demo guide: `EMERGENCY_DEMO_GUIDE.md`
- Quick ref: `EMERGENCY_QUICK_REF.md`

---

## Success Criteria

Your setup is complete when:
- [ ] ✅ Say "call my contact" → AI responds
- [ ] ✅ Say "confirm" → Call placed
- [ ] ✅ Emergency contact receives call
- [ ] ✅ Voice message includes location
- [ ] ✅ No errors in console/terminal
- [ ] ✅ Can demo reliably 3 times in a row

---

## Time Estimates

| Phase | Time | Cumulative |
|-------|------|------------|
| Twilio Account Setup | 5 min | 5 min |
| Backend Setup | 2 min | 7 min |
| Backend Testing | 3 min | 10 min |
| Frontend Testing | 3 min | 13 min |
| Demo Preparation | 2 min | 15 min |
| **Total** | **15 min** | |

---

## 🎉 You're Ready!

Once all checkboxes are marked, you have a production-ready emergency call feature that:
- ✅ Works with voice commands
- ✅ Has confirmation safety
- ✅ Uses real Twilio API
- ✅ Is demo-ready for judges
- ✅ Shows professional implementation

**Go wow those judges!** 🚀✨

---

## Support Resources

**Twilio Console**: https://console.twilio.com
**Twilio Docs**: https://www.twilio.com/docs/voice
**Call Logs**: https://console.twilio.com/logs/calls
**Balance**: https://console.twilio.com/billing

**Need help?** Check the troubleshooting section above or the full setup guide in `EMERGENCY_CALL_SETUP.md`.
