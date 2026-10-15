"""Send one test email using the backend's private configuration."""

import os
from pathlib import Path

import resend
from dotenv import load_dotenv


def main() -> None:
    """Load email settings and submit one test message to Resend."""
    backend_directory = Path(__file__).resolve().parents[1]
    load_dotenv(backend_directory / ".env")

    required = (
        "RESEND_API_KEY",
        "RESEND_FROM_EMAIL",
        "RESEND_TEST_TO_EMAIL",
    )

    if any(not os.getenv(name, "").strip() for name in required):
        raise SystemExit("Fill in all three email settings in backend/.env.")

    resend.api_key = os.environ["RESEND_API_KEY"]

    try:
        resend.Emails.send({
            "from": os.environ["RESEND_FROM_EMAIL"],
            "to": [os.environ["RESEND_TEST_TO_EMAIL"]],
            "subject": "C.E.O. email test",
            "text": "Your C.E.O. email setup is working!",
        })
    except Exception:
        raise SystemExit(
            "Email submission failed. Check your settings and Resend dashboard."
        ) from None

    print("Resend accepted the email. Check your inbox and spam folder.")


if __name__ == "__main__":
    main()
