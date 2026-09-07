from enum import StrEnum


class ConversationKind(StrEnum):
    DIRECT = "direct"
    GROUP = "group"


class MemberRole(StrEnum):
    ADMIN = "admin"
    MEMBER = "member"
