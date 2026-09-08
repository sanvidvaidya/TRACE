"""Streamlit Community Cloud entrypoint for TRACE."""
from __future__ import annotations

import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parent
runpy.run_path(str(ROOT / "app.py"), run_name="__main__")

