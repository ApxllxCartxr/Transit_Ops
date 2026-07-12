from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_auth_login() -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@transitops.dev", "password": "secret123"},
    )
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "admin@transitops.dev"
