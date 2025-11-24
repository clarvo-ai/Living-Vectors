from typing import Any


import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient

PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

REPO_ROOT: Path = PROJECT_ROOT.parents[1]
PYUTILS_SRC: Path = REPO_ROOT / "packages" / "python-utils" / "src"
if str(PYUTILS_SRC) not in sys.path:
    sys.path.append(str(PYUTILS_SRC))

os.environ.setdefault(key="DATABASE_URL", value="sqlite:///dummy.db")

from main import app

def test_health_endpoint_returns_healthy_status() -> None:
    client: Any = TestClient(app)
    response: Any = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "lv-pyapi"}
