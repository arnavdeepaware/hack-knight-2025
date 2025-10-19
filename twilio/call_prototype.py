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


def place_emergency(client: Client, from_number: str, to_number: str, reason: str, location: str) -> bool:
    """
    Places a call and sends an SMS. Returns True if either succeeded.
    """
    # Build TwiML (URL-encoded or direct twiml string)
    # We’ll pass direct XML via 'twiml' param.
    spoken = f"Emergency alert from AEye. {reason}. Location: {location}. Please respond immediately."

    call_ok = False
    sms_ok = False

    # Voice call
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

    # SMS
    try:
        msg = client.messages.create(
            to=to_number,
            from_=from_number,
            body=f"AEye EMERGENCY: {reason}. Location: {location}"
        )
        print("✉️  SMS SID:", msg.sid)
        sms_ok = True
    except Exception as e:
        print("❌ SMS failed:", str(e))
        print("   → On a trial account, 'to' must be a Verified Caller ID.")
        print("   → Also ensure your Twilio number supports SMS (check console).")

    return call_ok or sms_ok


def main():
    cfg = load_env()
    if not validate_cfg(cfg):
        sys.exit(1)

    parser = argparse.ArgumentParser(description="AEye Twilio Emergency Caller")
    parser.add_argument("--reason", default="User requested help via AEye", help="Reason included in call/SMS")
    parser.add_argument("--to", help="Override AEYE_EMERGENCY_CONTACT, E.164 (+1...)")
    args = parser.parse_args()

    to_number = args.to.strip() if args.to else cfg["to_number"]
    if not to_number:
        print("❌ No destination number. Set AEYE_EMERGENCY_CONTACT in .env or pass --to +1...")
        sys.exit(1)

    client = init_twilio_client(cfg)
    if not client:
        sys.exit(1)

    print(f"\nFrom: {cfg['from_number']}  →  To: {to_number}")
    ok = place_emergency(client, cfg["from_number"], to_number, args.reason, cfg["location"])

    if ok:
        print("\n✅ Emergency notifications sent.")
    else:
        print("\n⚠️  Emergency failed (see errors above).")


if __name__ == "__main__":
    main()