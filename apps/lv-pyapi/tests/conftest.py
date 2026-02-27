import sys
import os
from contextlib import contextmanager
from unittest.mock import MagicMock
from main import app
from database import get_db


if not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.environ.get(
        "TEST_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres"
    )

if not os.environ.get("GEMINI_API_KEY"):
    os.environ["GEMINI_API_KEY"] = "test-dummy-key"

# This is needed to import the python_utils models into the tests
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
UTILS_PATH = os.path.join(ROOT, "packages/python-utils/src")
AGENTS_PATH = os.path.join(ROOT, "apps/lv-pyapi/agents")

if UTILS_PATH not in sys.path:
    sys.path.insert(0, UTILS_PATH)

if AGENTS_PATH not in sys.path:
    sys.path.insert(0, AGENTS_PATH)

# Shared DB override for unit tests (avoids repeating override_get_db + cleanup in each test)


def _default_override_get_db():
    db = MagicMock()
    try:
        yield db
    finally:
        pass


@contextmanager
def with_db_override(db=None):
    if db is not None:
        def custom_override():
            try:
                yield db
            finally:
                pass
        override = custom_override
    else:
        override = _default_override_get_db
    app.dependency_overrides[get_db] = override
    try:
        yield
    finally:
        app.dependency_overrides.pop(get_db, None)
