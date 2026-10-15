"""Build invitation emails and submit them to Resend."""

import os
from html import escape

import httpx


async def send_invitation_email(
    client: httpx.AsyncClient,
    *,
    invitation_id: str,
    recipient: str,
    club_name: str,
    link: str,
) -> bool:
    """Return whether Resend accepted the email; never expose provider errors."""
    key = os.getenv("RESEND_API_KEY", "").strip()
    sender = os.getenv("RESEND_FROM_EMAIL", "").strip()
    if not key or not sender:
        return False

    safe_name, safe_link = escape(club_name), escape(link, quote=True)
    try:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {key}",
                "Idempotency-Key": f"club-invitation/{invitation_id}",
            },
            json={
                "from": sender,
                "to": [recipient],
                "subject": "You're invited to a club on C.E.O.",
                "text": (
                    f"You're invited to join {club_name} as an officer on C.E.O.\n\n"
                    f"Accept invitation: {link}\n\n"
                    "Sign in with this email address to accept. This link expires in 7 days.\n"
                    "If you weren't expecting this invitation, you can ignore it."
                ),
                "html": (
                    f"<h1>You're invited to {safe_name}</h1>"
                    "<p>Join your club as an officer on C.E.O.</p>"
                    f'<p><a href="{safe_link}" style="background:#2563eb;color:white;'
                    'padding:12px 20px;border-radius:8px;display:inline-block;'
                    'text-decoration:none">Accept invitation</a></p>'
                    "<p>Sign in with this email address to accept. This link expires in 7 days.</p>"
                    "<p>If you weren't expecting this invitation, you can ignore it.</p>"
                ),
            },
        )
        return response.is_success and bool(response.json().get("id"))
    except (httpx.HTTPError, ValueError, AttributeError):
        # A timeout can mean delivery is unknown; keep the existing invitation link.
        return False
