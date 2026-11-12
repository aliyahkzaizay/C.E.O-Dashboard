"""Validate finance inputs; currency is USD and monetary values are integer cents."""
from datetime import date, datetime
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator


class FinanceInput(BaseModel):
    """Reject unknown fields and normalize surrounding whitespace."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class FinanceSettingsInput(FinanceInput):
    """Opening balance is the balance before transactions on the tracking start date."""
    opening_balance_cents: int = Field(strict=True, ge=-999999999, le=999999999)
    tracking_start_date: date
    budget_cents: int | None = Field(default=None, strict=True, ge=1, le=999999999)
    budget_start_date: date | None = None
    budget_end_date: date | None = None

    @model_validator(mode="after")
    def validate_budget(self):
        """A budget needs an amount and an ordered, inclusive date range."""
        values = (self.budget_cents, self.budget_start_date, self.budget_end_date)
        if any(v is not None for v in values):
            if any(v is None for v in values) or self.budget_end_date < self.budget_start_date:
                raise ValueError("Provide a positive budget and valid start/end dates.")
        return self


class TransactionInput(FinanceInput):
    """A transaction may reference a club event or a named meeting/other purpose."""
    kind: Literal["income", "expense"]
    amount_cents: int = Field(strict=True, ge=1, le=999999999)
    transaction_date: date
    description: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=50)
    event_id: UUID | None = None
    related_kind: Literal["meeting", "other"] | None = None
    related_label: str | None = Field(default=None, min_length=1, max_length=200)

    @model_validator(mode="after")
    def validate_relation(self):
        """Require either an event, paired custom fields, or no association."""
        if (self.related_kind is None) != (self.related_label is None):
            raise ValueError("Provide both the association kind and label.")
        if self.event_id and self.related_kind:
            raise ValueError("Choose an event or a custom association, not both.")
        return self


class VoidInput(FinanceInput):
    """Voiding preserves the original transaction and records a reason."""
    reason: str = Field(min_length=1, max_length=1000)


class ReportInput(FinanceInput):
    """Report metadata; files and uploader identity are handled separately."""
    title: str = Field(min_length=1, max_length=200)
    event_id: UUID | None = None
    notes: str | None = Field(default=None, max_length=1000)


class SettingsResponse(FinanceSettingsInput):
    """Saved settings scoped to one club."""
    organization_id: UUID
    currency: Literal["USD"] = "USD"
    created_at: datetime
    updated_at: datetime


class TransactionResponse(TransactionInput):
    """A stored transaction including its audit information."""
    transaction_id: UUID
    organization_id: UUID
    created_by: UUID
    created_at: datetime
    voided_at: datetime | None = None
    voided_by: UUID | None = None
    void_reason: str | None = None


class ReportResponse(ReportInput):
    """Stored report metadata; listing does not prove the file upload completed."""
    report_id: UUID
    organization_id: UUID
    filename: str
    content_type: Literal["application/pdf", "image/jpeg", "image/png"]
    file_size_bytes: int
    object_path: str
    uploaded_by: UUID
    created_at: datetime
