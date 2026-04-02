from __future__ import annotations

import httpx
from fastapi import HTTPException, status

from app.config import get_settings


SYSTEM_PROMPT = (
    "Bạn là trợ lý thư viện số THCS Tam Quan. "
    "Trả lời ngắn gọn, rõ ràng, thân thiện cho học sinh/giáo viên. "
    "Không bịa thông tin; nếu không chắc thì nói rõ và hướng dẫn người dùng kiểm tra trong hệ thống."
)


def chat_with_nvidia(user_message: str, context: str | None = None) -> str:
    settings = get_settings()

    if not settings.nvidia_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='NVIDIA_API_KEY chưa được cấu hình ở backend/.env hoặc environment.',
        )

    user_content = user_message.strip()
    if not user_content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Nội dung tin nhắn không được để trống.')

    if context:
        user_content = f"{user_content}\n\nNgữ cảnh tài liệu trong hệ thống (tối đa 5):\n{context.strip()}"

    payload = {
        'model': settings.nvidia_model,
        'messages': [
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user', 'content': user_content},
        ],
        'temperature': 0.2,
        'max_tokens': 500,
    }

    headers = {
        'Authorization': f'Bearer {settings.nvidia_api_key}',
        'Content-Type': 'application/json',
    }

    url = f"{settings.nvidia_base_url.rstrip('/')}/chat/completions"

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f'Lỗi gọi NVIDIA API: {exc.response.status_code} - {exc.response.text}',
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f'Không thể kết nối NVIDIA API: {exc}',
        ) from exc

    choices = data.get('choices') or []
    if not choices:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail='NVIDIA API trả về rỗng (không có choices).',
        )

    content = (((choices[0] or {}).get('message') or {}).get('content') or '').strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail='NVIDIA API không trả về nội dung trả lời.',
        )

    return content
