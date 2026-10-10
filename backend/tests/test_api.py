import pytest
from fastapi.testclient import TestClient

from app.main import create_app


def test_health_reports_engine_not_ready():
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "simulation_ready": False}


@pytest.mark.parametrize(
    ("origin", "allowed"),
    [("http://localhost:5173", True), ("https://untrusted.example", False)],
)
def test_cors_preflight_restricts_origins(origin, allowed):
    with TestClient(create_app(("http://localhost:5173",))) as client:
        response = client.options(
            "/api/v1/health",
            headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
        )
    assert response.status_code == (200 if allowed else 400)
    assert response.headers.get("access-control-allow-origin") == (
        origin if allowed else None
    )


def test_wildcard_cors_is_rejected():
    with pytest.raises(ValueError, match="explicit frontend origins"):
        create_app(("*",))


def test_unimplemented_simulation_is_not_advertised():
    with TestClient(create_app()) as client:
        paths = client.get("/openapi.json").json()["paths"]
    assert set(paths) == {"/api/v1/health"}
