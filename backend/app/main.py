"""HTTP infrastructure; simulation routes await accepted engine contracts."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def create_app(frontend_origins: tuple[str, ...] | None = None) -> FastAPI:
    if frontend_origins is None:
        frontend_origins = tuple(
            origin.strip()
            for origin in os.getenv(
                "OPERATOROS_FRONTEND_ORIGINS", "http://localhost:5173"
            ).split(",")
            if origin.strip()
        )
    if "*" in frontend_origins:
        raise ValueError("Configure explicit frontend origins; wildcard CORS is forbidden")

    app = FastAPI(title="OperatorOS API", version="0.0.1")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(frontend_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @app.get("/api/v1/health")
    def health() -> dict[str, str | bool]:
        return {"status": "ok", "simulation_ready": False}

    return app


app = create_app()
