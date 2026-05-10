from pydantic import BaseModel
from datetime import datetime

class CommentCreate(BaseModel):
    target_type: str
    target_id: int
    content: str
    parent_id: int | None = None
