from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/live")
def liveness() -> dict[str, str]:
    """Return quickly when the process is able to receive traffic."""

    return {"status": "ok"}
