"""
AEye Emergency Call Prototype (Twilio)
-------------------------------------
- Loads Twilio credentials from .env
- Verifies auth by fetching your account
- Places a voice call and sends an SMS to AEYE_EMERGENCY_CONTACT

Usage:
  python call_prototype.py --reason "User requested help via AEye" [--to +1XXXXXXXXXX]

Notes:
  • On a Twilio *trial* account, the 'to' number must be a *verified caller ID*.
  • TWILIO_FROM_NUMBER must be a Twilio number you own with Voice capability.
"""

import os
import sys
import argparse
from urllib.parse import quote

from dotenv import load_dotenv, find_dotenv
from twilio.rest import Client


def load_env():
    """Load .env from DOTENV_PATH or auto-discover."""
    dotenv_path = os.getenv("DOTENV_PATH")
    if dotenv_path and os.path.exists(dotenv_path):
        load_dotenv(dotenv_path)
        print(f"Loaded env from DOTENV_PATH={dotenv_path}")
    else:
        # auto-discover (looks upward from CWD)
        load_dotenv(find_dotenv())
        print("Loaded env via find_dotenv().")

    # Read variables
    cfg = {
        "sid": os.getenv("TWILIO_ACCOUNT_SID", "").strip(),
        "token": os.getenv("TWILIO_AUTH_TOKEN", "").strip(),
        "from_number": os.getenv("TWILIO_FROM_NUMBER", "").strip(),
        "to_number": os.getenv("AEYE_EMERGENCY_CONTACT", "").strip(),
        "location": os.getenv("AEYE_LOCATION", "Unknown location"),
    }
    return cfg


def validate_cfg(cfg) -> bool:
    ok = True
    if not cfg["sid"].startswith("AC") or len(cfg["sid"]) != 34:
        print("❌ TWILIO_ACCOUNT_SID is missing or malformed (should start with AC and be 34 chars).")
        ok = False
    if len(cfg["token"]) < 20:
        print("❌ TWILIO_AUTH_TOKEN looks missing/too short.")
        ok = False
    if not cfg["from_number"].startswith("+"):
        print("❌ TWILIO_FROM_NUMBER must be E.164 (like +15551234567).")
        ok = False
    if not cfg["to_number"].startswith("+"):
        print("⚠️  AEYE_EMERGENCY_CONTACT not set or not E.164. You can pass --to +1... on the CLI.")
    return ok


def init_twilio_client(cfg):
    print(f"Initializing Twilio with SID: {cfg['sid'][:6]}…")
    client = Client(cfg["sid"], cfg["token"])
    try:
        account = client.api.accounts(cfg["sid"]).fetch()
        print(f"✅ Auth OK. Account friendly name: {account.friendly_name}")
        return client
    except Exception as e:
        print("\n❌ Auth FAILED:", str(e))
        print("   → This is usually error 20003 (authentication).")
        print("   → Double-check your SID/TOKEN and that your .env is being loaded.")
        return None


def place_emergency(client: Client, from_number: str, to_number: str, reason: str, location: str, mode: str='both') -> bool:
    """
    Places a call and/or sends an SMS based on mode. Returns True if the requested operations succeeded.
    Args:
        mode: 'call', 'sms', or 'both'
    """
    # Build TwiML (URL-encoded or direct twiml string)
    # We'll pass direct XML via 'twiml' param.
    spoken = f"Emergency alert from AEye. {reason}. Location: {location}. Please respond immediately."

    call_ok = False
    sms_ok = False

    # Voice call if requested
    if mode in ['call', 'both']:
        try:
            call = client.calls.create(
                to=to_number,
                from_=from_number,
                twiml=f"<Response><Say voice='alice'>{spoken}</Say></Response>"
            )
            print("📞 Call SID:", call.sid)
            call_ok = True
        except Exception as e:
            print("❌ Call failed:", str(e))
            print("   → On a trial account, 'to' must be a Verified Caller ID.")

    # SMS if requested
    if mode in ['sms', 'both']:
        try:
            print("\n📱 Attempting to send SMS...")
            print(f"   From: {from_number}")
            print(f"   To: {to_number}")
            
            # Verify phone numbers are in E.164 format
            if not (from_number.startswith('+') and to_number.startswith('+')):
                raise ValueError("Phone numbers must be in E.164 format (e.g., +1234567890)")
            
            msg = client.messages.create(
                to=to_number,
                from_=from_number,
                body=f"🚨 AEye EMERGENCY ALERT:\n\nReason: {reason}\nLocation: {location}\n\nThis is an automated alert. Please respond immediately."
            )
            
            # Check message status
            message_status = client.messages(msg.sid).fetch()
            print(f"✉️  SMS Status: {message_status.status}")
            print(f"   SID: {msg.sid}")
            
            if message_status.error_code:
                print(f"⚠️  Error Code: {message_status.error_code}")
                print(f"   Error Message: {message_status.error_message}")
                sms_ok = False
            else:
                sms_ok = True
                
        except ValueError as ve:
            print(f"❌ SMS Configuration Error: {str(ve)}")
        except Exception as e:
            print("❌ SMS failed:", str(e))
            print("\nTroubleshooting Guide:")
            print("1. Check if your Twilio number can send SMS:")
            print("   → Go to https://console.twilio.com")
            print("   → Click Phone Numbers > Manage > Active numbers")
            print("   → Verify SMS is enabled for your number")
            print("\n2. For trial accounts:")
            print("   → The 'to' number must be a verified phone number")
            print("   → Add it at: https://console.twilio.com/us1/verification/list")
            print("\n3. Check your Twilio balance")
            try:
                balance = client.api.accounts(client.account_sid).fetch().balance
                print(f"\nCurrent Balance: ${balance if balance else 'unknown'}")
            except:
                print("\nCould not fetch balance. Please check console.")

    # Consider success based on requested mode
    if mode == 'both':
        return call_ok and sms_ok  # Both must succeed
    elif mode == 'call':
        return call_ok  # Only call must succeed
    else:  # sms
        return sms_ok  # Only SMS must succeed


def main():
    cfg = load_env()
    if not validate_cfg(cfg):
        sys.exit(1)

    parser = argparse.ArgumentParser(description="AEye Twilio Emergency Notifications")
    parser.add_argument("--reason", default="User requested help via AEye", help="Reason included in call/SMS")
    parser.add_argument("--to", help="Override AEYE_EMERGENCY_CONTACT, E.164 (+1...)")
    parser.add_argument("--mode", choices=['call', 'sms', 'both'], default='both',
                       help="Send via: call, sms, or both (default: both)")
    args = parser.parse_args()

    to_number = args.to.strip() if args.to else cfg["to_number"]
    if not to_number:
        print("❌ No destination number. Set AEYE_EMERGENCY_CONTACT in .env or pass --to +1...")
        sys.exit(1)

    client = init_twilio_client(cfg)
    if not client:
        sys.exit(1)

    print(f"\nFrom: {cfg['from_number']}  →  To: {to_number}")
    print(f"Mode: {args.mode.upper()}")
    
    ok = place_emergency(
        client, 
        cfg["from_number"], 
        to_number, 
        args.reason, 
        cfg["location"],
        mode=args.mode
    )

    if ok:
        if args.mode == 'both':
            print("\n✅ Emergency call and SMS sent successfully.")
        else:
            print(f"\n✅ Emergency {args.mode.upper()} sent successfully.")
    else:
        print(f"\n⚠️  Emergency {args.mode.upper()} failed (see errors above).")


if __name__ == "__main__":
    main()