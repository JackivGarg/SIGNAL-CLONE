from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.models.conversation import ConversationMember
from app.models.message import Message, MessageReceipt
from app.models.user import User
from app.schemas.conversation import MessageResponse


def serialize_message(db: DbSession, message: Message, viewer_id: str) -> MessageResponse:
    sender = db.get(User, message.sender_id)
    delivered_at = None
    read_at = None

    if message.sender_id == viewer_id:
        receipts = list(
            db.scalars(
                select(MessageReceipt).where(MessageReceipt.message_id == message.id)
            ).all()
        )
        delivered_times = [receipt.delivered_at for receipt in receipts if receipt.delivered_at]
        read_times = [receipt.read_at for receipt in receipts if receipt.read_at]
        if receipts and len(delivered_times) == len(receipts):
            delivered_at = max(delivered_times)
        if receipts and len(read_times) == len(receipts):
            read_at = max(read_times)
    else:
        receipt = db.get(MessageReceipt, (message.id, viewer_id))
        if receipt is not None:
            delivered_at = receipt.delivered_at
            read_at = receipt.read_at

    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        sender_name=sender.display_name if sender else "Unknown user",
        body=message.body,
        client_message_id=message.client_message_id,
        reply_to_id=message.reply_to_id,
        sent_at=message.sent_at,
        delivered_at=delivered_at,
        read_at=read_at,
    )


def mark_messages_read(
    db: DbSession, conversation_id: str, user_id: str
) -> list[tuple[Message, MessageReceipt]]:
    unread_messages = list(
        db.scalars(
            select(Message).where(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,
            )
        ).all()
    )
    now = datetime.now(UTC)
    changed_receipts: list[tuple[Message, MessageReceipt]] = []
    for message in unread_messages:
        receipt = db.get(MessageReceipt, (message.id, user_id))
        if receipt is None:
            receipt = MessageReceipt(message_id=message.id, recipient_id=user_id)
            db.add(receipt)
        if receipt.read_at is None:
            receipt.delivered_at = receipt.delivered_at or now
            receipt.read_at = now
            changed_receipts.append((message, receipt))
    membership = db.get(ConversationMember, (conversation_id, user_id))
    if membership is not None:
        membership.last_read_at = now
    db.commit()
    return changed_receipts
