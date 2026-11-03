from fastapi import Header, HTTPException


def get_officer_org_id(x_org_id: str | None = Header(default="org-a")) -> str:
    """STUB for testing. Replace with the real officer/org check."""
    if not x_org_id:
        raise HTTPException(status_code=401, detail="Missing organization")
    return x_org_id