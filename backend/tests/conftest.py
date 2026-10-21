import io
from pathlib import Path

import pytest
from openpyxl import Workbook

FIXTURES = Path(__file__).parent / "fixtures" / "imports"


@pytest.fixture
def fixture_bytes():
    """Read a fake roster file from tests/fixtures/imports."""

    def read(name: str) -> bytes:
        return (FIXTURES / name).read_bytes()

    return read


@pytest.fixture
def make_xlsx():
    """Build an .xlsx in memory. Cell values keep their Python type: str, int, date, and so on."""

    def build(rows: list[list], *, first_row: int = 1) -> bytes:
        workbook = Workbook()
        sheet = workbook.active
        for offset, values in enumerate(rows):
            for column, value in enumerate(values, start=1):
                if value is not None:
                    sheet.cell(row=first_row + offset, column=column, value=value)
        buffer = io.BytesIO()
        workbook.save(buffer)
        return buffer.getvalue()

    return build
