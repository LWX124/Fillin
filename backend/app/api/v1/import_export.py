import uuid
import json
import csv
from io import StringIO
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.content import Content

router = APIRouter()


@router.get("/knowledge-bases/{kb_id}/export/json")
def export_json(
    kb_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == kb_id,
        KnowledgeBase.user_id == current_user.id,
    ).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    contents = db.query(Content).filter(Content.knowledge_base_id == kb_id).all()

    data = {
        "knowledge_base": {"name": kb.name, "description": kb.description},
        "contents": [
            {
                "title": c.title,
                "content": c.content,
                "source_platform": c.source_platform,
                "source_url": c.source_url,
                "created_at": c.created_at.isoformat() if c.created_at else "",
            }
            for c in contents
        ],
    }

    return Response(
        content=json.dumps(data, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{kb.name}.json"'},
    )


@router.get("/knowledge-bases/{kb_id}/export/csv")
def export_csv(
    kb_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == kb_id,
        KnowledgeBase.user_id == current_user.id,
    ).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    contents = db.query(Content).filter(Content.knowledge_base_id == kb_id).all()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Title", "Content", "Source Platform", "Source URL", "Created At"])
    for c in contents:
        writer.writerow([
            c.title,
            c.content,
            c.source_platform or "",
            c.source_url or "",
            c.created_at.isoformat() if c.created_at else "",
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{kb.name}.csv"'},
    )


@router.post("/knowledge-bases/{kb_id}/import/json")
async def import_json(
    kb_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == kb_id,
        KnowledgeBase.user_id == current_user.id,
    ).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    MAX_IMPORT_SIZE = 10 * 1024 * 1024  # 10MB
    raw = await file.read(MAX_IMPORT_SIZE + 1)
    if len(raw) > MAX_IMPORT_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")
    try:
        data = json.loads(raw.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON file")

    items = data.get("contents", [])
    imported = 0
    for item in items:
        content = Content(
            id=str(uuid.uuid4()),
            knowledge_base_id=kb_id,
            title=item.get("title", "Untitled"),
            content=item.get("content", ""),
            source_platform=item.get("source_platform", "import"),
            source_url=item.get("source_url"),
        )
        db.add(content)
        imported += 1

    kb.content_count = (kb.content_count or 0) + imported
    db.commit()
    return {"message": f"Imported {imported} contents"}


@router.post("/knowledge-bases/{kb_id}/import/csv")
async def import_csv(
    kb_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == kb_id,
        KnowledgeBase.user_id == current_user.id,
    ).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    MAX_IMPORT_SIZE = 10 * 1024 * 1024  # 10MB
    raw = await file.read(MAX_IMPORT_SIZE + 1)
    if len(raw) > MAX_IMPORT_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")
    try:
        reader = csv.DictReader(StringIO(raw.decode("utf-8")))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSV file")

    imported = 0
    for row in reader:
        content = Content(
            id=str(uuid.uuid4()),
            knowledge_base_id=kb_id,
            title=row.get("Title", "Untitled"),
            content=row.get("Content", ""),
            source_platform=row.get("Source Platform", "import"),
            source_url=row.get("Source URL"),
        )
        db.add(content)
        imported += 1

    kb.content_count = (kb.content_count or 0) + imported
    db.commit()
    return {"message": f"Imported {imported} contents"}
