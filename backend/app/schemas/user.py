from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    identifier: str
    display_name: str
    avatar_key: str
    bio: str | None
    last_seen_at: datetime | None
    is_demo_user: bool
