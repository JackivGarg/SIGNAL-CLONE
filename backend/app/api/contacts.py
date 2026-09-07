from fastapi import APIRouter, HTTPException, status
from sqlalchemy import or_, select

from app.api.deps import CurrentUser, DatabaseSession
from app.models.contact import Contact
from app.models.user import User
from app.schemas.auth import normalize_identifier
from app.schemas.contact import ContactCreatePayload, ContactResponse

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactResponse])
def list_contacts(
    current_user: CurrentUser, db: DatabaseSession, query: str = ""
) -> list[ContactResponse]:
    statement = (
        select(Contact, User)
        .join(User, Contact.contact_id == User.id)
        .where(Contact.owner_id == current_user.id)
        .order_by(User.display_name)
    )
    if query.strip():
        search = f"%{query.strip()}%"
        statement = statement.where(
            or_(User.display_name.ilike(search), User.identifier.ilike(search))
        )

    return [
        ContactResponse(
            id=user.id,
            identifier=user.identifier,
            display_name=user.display_name,
            avatar_key=user.avatar_key,
            nickname=contact.nickname,
            last_seen_at=user.last_seen_at,
        )
        for contact, user in db.execute(statement).all()
    ]


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def add_contact(
    payload: ContactCreatePayload, current_user: CurrentUser, db: DatabaseSession
) -> ContactResponse:
    identifier = normalize_identifier(payload.identifier)
    target = db.scalar(select(User).where(User.identifier == identifier))
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User was not found.")
    if target.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot add yourself."
        )

    contact = db.get(Contact, (current_user.id, target.id))
    if contact is None:
        contact = Contact(owner_id=current_user.id, contact_id=target.id)
        db.add(contact)
        db.commit()
        db.refresh(contact)

    return ContactResponse(
        id=target.id,
        identifier=target.identifier,
        display_name=target.display_name,
        avatar_key=target.avatar_key,
        nickname=contact.nickname,
        last_seen_at=target.last_seen_at,
    )
