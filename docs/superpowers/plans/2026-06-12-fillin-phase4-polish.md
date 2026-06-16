# Fillin Phase 4 实施计划：功能完善

**版本:** 1.0  
**日期:** 2026-06-12  
**状态:** 待开始  
**前置条件:** Phase 3 Advanced Features 完成

## 概述

Phase 4 完善产品功能，添加小红书和B站爬虫、标签系统、导入导出、API密钥配置等功能，为产品上线做准备。

## 目标

- 添加小红书爬虫
- 添加B站爬虫
- 内容标签系统
- 知识库导入导出
- 自定义 API Key 配置
- 性能优化

## 技术要点

- 小红书反爬虫处理
- B站视频信息抓取
- 标签多对多关系
- JSON/CSV 导入导出
- 用户级 API Key 管理
- 数据库索引优化

## 任务列表

### Task 1: 小红书爬虫
### Task 2: B站爬虫
### Task 3: 标签系统
### Task 4: 导入导出功能
### Task 5: API Key 配置
### Task 6: 性能优化
### Task 7: 生产环境准备

---

## Task 1: 小红书爬虫

**Files:**
- Create: `backend/app/crawlers/xiaohongshu_crawler.py`

- [ ] **Step 1: 实现小红书爬虫**

Create `backend/app/crawlers/xiaohongshu_crawler.py`:
```python
from app.crawlers.base import BaseCrawler
from typing import List, Dict
import re
import json


class XiaohongshuCrawler(BaseCrawler):
    """Crawler for Xiaohongshu (Little Red Book) posts."""
    
    def validate_url(self, url: str) -> bool:
        """Validate Xiaohongshu user URL."""
        pattern = r"xiaohongshu\.com/user/profile/[\w]+"
        return bool(re.search(pattern, url))
    
    async def crawl(self, target_url: str, limit: int = 10) -> List[Dict]:
        """
        Crawl Xiaohongshu posts from a user profile.
        
        Args:
            target_url: User profile URL
            limit: Max posts to crawl
        """
        if not self.validate_url(target_url):
            raise ValueError(f"Invalid Xiaohongshu URL: {target_url}")
        
        await self.setup()
        
        try:
            await self.page.goto(target_url)
            await self.page.wait_for_load_state("networkidle")
            await self.random_delay(3, 5)
            
            posts = []
            scroll_count = 0
            max_scrolls = 5
            
            while len(posts) < limit and scroll_count < max_scrolls:
                # Wait for feed to load
                await self.page.wait_for_selector('.note-item', timeout=5000)
                
                # Extract note items
                note_items = await self.page.query_selector_all('.note-item')
                
                for item in note_items:
                    if len(posts) >= limit:
                        break
                    
                    try:
                        # Click to open detail (if needed)
                        link_elem = await item.query_selector('a')
                        if link_elem:
                            href = await link_elem.get_attribute('href')
                            if href:
                                full_url = f"https://www.xiaohongshu.com{href}" if href.startswith('/') else href
                                
                                # Open in new page to get full content
                                detail_page = await self.browser.new_page()
                                try:
                                    await detail_page.goto(full_url)
                                    await detail_page.wait_for_load_state("networkidle")
                                    await self.random_delay(2, 3)
                                    
                                    # Extract title
                                    title_elem = await detail_page.query_selector('.title')
                                    title = await title_elem.inner_text() if title_elem else ""
                                    
                                    # Extract content
                                    content_elem = await detail_page.query_selector('.content')
                                    content = await content_elem.inner_text() if content_elem else ""
                                    
                                    # Extract publish time
                                    time_elem = await detail_page.query_selector('.publish-time')
                                    publish_time = await time_elem.inner_text() if time_elem else ""
                                    
                                    if title and content:
                                        posts.append({
                                            "title": title.strip(),
                                            "content": content.strip(),
                                            "url": full_url,
                                            "published_at": publish_time
                                        })
                                    
                                finally:
                                    await detail_page.close()
                        
                    except Exception as e:
                        print(f"Error parsing Xiaohongshu post: {e}")
                        continue
                
                # Scroll down
                await self.page.evaluate("window.scrollBy(0, window.innerHeight)")
                await self.random_delay(2, 4)
                scroll_count += 1
            
            return posts
            
        finally:
            await self.teardown()
```

- [ ] **Step 2: 注册小红书爬虫**

In `backend/app/api/v1/crawler.py` and `backend/app/tasks/crawler_tasks.py`, add:
```python
elif task.platform == "xiaohongshu":
    crawler = XiaohongshuCrawler(cookies=cookies_json)
```

- [ ] **Step 3: 测试小红书爬虫**

Manual test with a Xiaohongshu user profile URL.

- [ ] **Step 4: Commit**

```bash
git add backend/app/crawlers/xiaohongshu_crawler.py
git commit -m "feat: add Xiaohongshu crawler

- Implement Xiaohongshu user profile crawler
- Extract post title, content, and metadata
- Handle detail page navigation"
```

---

## Task 2: B站爬虫

**Files:**
- Create: `backend/app/crawlers/bilibili_crawler.py`

- [ ] **Step 1: 实现B站爬虫**

Create `backend/app/crawlers/bilibili_crawler.py`:
```python
from app.crawlers.base import BaseCrawler
from typing import List, Dict
import re
import json


class BilibiliCrawler(BaseCrawler):
    """Crawler for Bilibili videos."""
    
    def validate_url(self, url: str) -> bool:
        """Validate Bilibili space/user URL."""
        pattern = r"space\.bilibili\.com/\d+"
        return bool(re.search(pattern, url))
    
    async def crawl(self, target_url: str, limit: int = 10) -> List[Dict]:
        """
        Crawl Bilibili videos from a user space.
        
        Args:
            target_url: User space URL (e.g., https://space.bilibili.com/123456)
            limit: Max videos to crawl
        """
        if not self.validate_url(target_url):
            raise ValueError(f"Invalid Bilibili URL: {target_url}")
        
        await self.setup()
        
        try:
            await self.page.goto(target_url)
            await self.page.wait_for_load_state("networkidle")
            await self.random_delay(2, 4)
            
            videos = []
            scroll_count = 0
            max_scrolls = 3
            
            while len(videos) < limit and scroll_count < max_scrolls:
                # Wait for video list
                await self.page.wait_for_selector('.small-item', timeout=5000)
                
                # Extract video items
                items = await self.page.query_selector_all('.small-item')
                
                for item in items:
                    if len(videos) >= limit:
                        break
                    
                    try:
                        # Extract title
                        title_elem = await item.query_selector('.title')
                        title = await title_elem.get_attribute('title') if title_elem else ""
                        
                        # Extract link
                        link_elem = await item.query_selector('a')
                        href = await link_elem.get_attribute('href') if link_elem else ""
                        video_url = f"https:{href}" if href and href.startswith('//') else href
                        
                        # Extract description/intro (if available on list page)
                        # Note: Full description requires visiting video page
                        
                        # Skip if duplicate
                        if any(v['url'] == video_url for v in videos):
                            continue
                        
                        if title and video_url:
                            # For video content, we'll store title as content preview
                            # Full transcription would require additional APIs
                            videos.append({
                                "title": title.strip(),
                                "content": f"视频标题: {title}\n视频链接: {video_url}",
                                "url": video_url,
                                "published_at": ""
                            })
                        
                    except Exception as e:
                        print(f"Error parsing Bilibili video: {e}")
                        continue
                
                # Scroll down
                await self.page.evaluate("window.scrollBy(0, window.innerHeight)")
                await self.random_delay(2, 3)
                scroll_count += 1
            
            return videos
            
        finally:
            await self.teardown()
```

- [ ] **Step 2: 注册B站爬虫**

In crawler routing, add:
```python
elif task.platform == "bilibili":
    crawler = BilibiliCrawler(cookies=cookies_json)
```

- [ ] **Step 3: 更新前端平台选项**

In `frontend/src/components/crawler/create-task-dialog.tsx`, add:
```typescript
const platforms = [
  { value: 'wechat', label: '微信公众号' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'weibo', label: '微博' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'bilibili', label: 'B站' },
];
```

- [ ] **Step 4: 测试B站爬虫**

Manual test with a Bilibili user space URL.

- [ ] **Step 5: Commit**

```bash
git add backend/ frontend/
git commit -m "feat: add Bilibili crawler

- Implement Bilibili user space video crawler
- Extract video titles and links
- Update frontend to support all 5 platforms"
```

---

## Task 3: 标签系统

**Files:**
- Create: `backend/app/models/tag.py`
- Create: `backend/app/models/content_tag.py`
- Create: `backend/app/api/v1/tag.py`
- Create: `backend/app/schemas/tag.py`

- [ ] **Step 1: 创建标签模型**

Create `backend/app/models/tag.py`:
```python
from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from datetime import datetime


class Tag(Base):
    __tablename__ = "tags"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)
    color = Column(String(7), default="#3B82F6")  # Hex color
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User")
    content_tags = relationship("ContentTag", back_populates="tag", cascade="all, delete-orphan")
```

Create `backend/app/models/content_tag.py`:
```python
from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from datetime import datetime


class ContentTag(Base):
    __tablename__ = "content_tags"

    id = Column(String(36), primary_key=True)
    content_id = Column(String(36), ForeignKey("contents.id", ondelete="CASCADE"), nullable=False)
    tag_id = Column(String(36), ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    content = relationship("Content", back_populates="content_tags")
    tag = relationship("Tag", back_populates="content_tags")
```

Update `backend/app/models/content.py`:
```python
class Content(Base):
    # ... existing fields ...
    content_tags = relationship("ContentTag", back_populates="content", cascade="all, delete-orphan")
```

- [ ] **Step 2: 创建数据库迁移**

Run:
```bash
cd backend
alembic revision --autogenerate -m "add tags system"
alembic upgrade head
```

- [ ] **Step 3: 创建 schemas**

Create `backend/app/schemas/tag.py`:
```python
from pydantic import BaseModel
from datetime import datetime
from typing import List


class TagCreate(BaseModel):
    name: str
    color: str = "#3B82F6"


class TagResponse(BaseModel):
    id: str
    name: str
    color: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class AddTagsToContentRequest(BaseModel):
    tag_ids: List[str]
```

- [ ] **Step 4: 创建 API 端点**

Create `backend/app/api/v1/tag.py`:
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.tag import Tag
from app.models.content_tag import ContentTag
from app.models.content import Content
from app.schemas.tag import TagCreate, TagResponse, AddTagsToContentRequest

router = APIRouter()


@router.post("/tags", response_model=TagResponse, status_code=201)
def create_tag(
    tag_in: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new tag."""
    # Check if tag name already exists for user
    existing = db.query(Tag).filter(
        Tag.user_id == current_user.id,
        Tag.name == tag_in.name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Tag already exists")
    
    tag = Tag(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=tag_in.name,
        color=tag_in.color
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    
    return tag


@router.get("/tags", response_model=List[TagResponse])
def list_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List user's tags."""
    tags = db.query(Tag).filter(
        Tag.user_id == current_user.id
    ).order_by(Tag.name).all()
    return tags


@router.delete("/tags/{tag_id}", status_code=204)
def delete_tag(
    tag_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a tag."""
    tag = db.query(Tag).filter(
        Tag.id == tag_id,
        Tag.user_id == current_user.id
    ).first()
    
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    db.delete(tag)
    db.commit()
    
    return None


@router.post("/contents/{content_id}/tags", status_code=201)
def add_tags_to_content(
    content_id: str,
    request: AddTagsToContentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add tags to content."""
    # Verify content ownership
    content = db.query(Content).join(Content.knowledge_base).filter(
        Content.id == content_id,
        Content.knowledge_base.has(user_id=current_user.id)
    ).first()
    
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Verify tag ownership
    tags = db.query(Tag).filter(
        Tag.id.in_(request.tag_ids),
        Tag.user_id == current_user.id
    ).all()
    
    if len(tags) != len(request.tag_ids):
        raise HTTPException(status_code=404, detail="Some tags not found")
    
    # Remove existing tags
    db.query(ContentTag).filter(ContentTag.content_id == content_id).delete()
    
    # Add new tags
    for tag in tags:
        content_tag = ContentTag(
            id=str(uuid.uuid4()),
            content_id=content_id,
            tag_id=tag.id
        )
        db.add(content_tag)
    
    db.commit()
    
    return {"message": "Tags added successfully"}


@router.get("/contents/{content_id}/tags", response_model=List[TagResponse])
def get_content_tags(
    content_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tags for a content."""
    content = db.query(Content).join(Content.knowledge_base).filter(
        Content.id == content_id,
        Content.knowledge_base.has(user_id=current_user.id)
    ).first()
    
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    tags = db.query(Tag).join(ContentTag).filter(
        ContentTag.content_id == content_id
    ).all()
    
    return tags
```

Register in `backend/app/api/v1/__init__.py`:
```python
from app.api.v1 import tag
api_router.include_router(tag.router, tags=["tags"])
```

- [ ] **Step 5: 更新内容列表返回标签**

Modify `backend/app/api/v1/knowledge_base.py` to include tags in content response.

- [ ] **Step 6: 测试标签系统**

Manual test:
1. Create tags
2. Add tags to content
3. List content with tags
4. Delete tags

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat: add tagging system

- Create tags and content_tags models
- Add tag CRUD API
- Support adding/removing tags from content
- Many-to-many relationship"
```


---

## Task 4: 导入导出功能

**Files:**
- Create: `backend/app/api/v1/import_export.py`
- Create: `backend/app/services/import_export_service.py`

- [ ] **Step 1: 创建导入导出服务**

Create `backend/app/services/import_export_service.py`:
```python
from typing import List, Dict
import json
import csv
from io import StringIO
from sqlalchemy.orm import Session
from app.models.content import Content
from app.models.knowledge_base import KnowledgeBase
from app.tasks.vectorize import vectorize_content_task
import uuid


def export_kb_to_json(db: Session, kb_id: str) -> str:
    """Export knowledge base contents to JSON."""
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise ValueError("Knowledge base not found")
    
    contents = db.query(Content).filter(Content.knowledge_base_id == kb_id).all()
    
    data = {
        "knowledge_base": {
            "name": kb.name,
            "description": kb.description
        },
        "contents": [
            {
                "title": c.title,
                "content": c.content,
                "source_platform": c.source_platform,
                "source_url": c.source_url,
                "created_at": c.created_at.isoformat()
            }
            for c in contents
        ]
    }
    
    return json.dumps(data, ensure_ascii=False, indent=2)


def export_kb_to_csv(db: Session, kb_id: str) -> str:
    """Export knowledge base contents to CSV."""
    contents = db.query(Content).filter(Content.knowledge_base_id == kb_id).all()
    
    output = StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(['Title', 'Content', 'Source Platform', 'Source URL', 'Created At'])
    
    # Rows
    for c in contents:
        writer.writerow([
            c.title,
            c.content,
            c.source_platform,
            c.source_url or '',
            c.created_at.isoformat()
        ])
    
    return output.getvalue()


def import_kb_from_json(db: Session, kb_id: str, json_data: str, user_id: str) -> int:
    """Import knowledge base contents from JSON."""
    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == kb_id,
        KnowledgeBase.user_id == user_id
    ).first()
    
    if not kb:
        raise ValueError("Knowledge base not found")
    
    data = json.loads(json_data)
    contents_data = data.get('contents', [])
    
    imported_count = 0
    for item in contents_data:
        content = Content(
            id=str(uuid.uuid4()),
            knowledge_base_id=kb_id,
            title=item['title'],
            content=item['content'],
            source_platform=item.get('source_platform', 'import'),
            source_url=item.get('source_url')
        )
        db.add(content)
        imported_count += 1
        
        # Trigger vectorization
        db.flush()
        vectorize_content_task.delay(content.id)
    
    # Update KB count
    kb.content_count += imported_count
    db.commit()
    
    return imported_count


def import_kb_from_csv(db: Session, kb_id: str, csv_data: str, user_id: str) -> int:
    """Import knowledge base contents from CSV."""
    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == kb_id,
        KnowledgeBase.user_id == user_id
    ).first()
    
    if not kb:
        raise ValueError("Knowledge base not found")
    
    reader = csv.DictReader(StringIO(csv_data))
    
    imported_count = 0
    for row in reader:
        content = Content(
            id=str(uuid.uuid4()),
            knowledge_base_id=kb_id,
            title=row.get('Title', 'Untitled'),
            content=row.get('Content', ''),
            source_platform=row.get('Source Platform', 'import'),
            source_url=row.get('Source URL')
        )
        db.add(content)
        imported_count += 1
        
        db.flush()
        vectorize_content_task.delay(content.id)
    
    kb.content_count += imported_count
    db.commit()
    
    return imported_count
```

- [ ] **Step 2: 创建 API 端点**

Create `backend/app/api/v1/import_export.py`:
```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.services.import_export_service import (
    export_kb_to_json,
    export_kb_to_csv,
    import_kb_from_json,
    import_kb_from_csv
)

router = APIRouter()


@router.get("/knowledge-bases/{kb_id}/export/json")
def export_json(
    kb_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export knowledge base as JSON."""
    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == kb_id,
        KnowledgeBase.user_id == current_user.id
    ).first()
    
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    json_data = export_kb_to_json(db, kb_id)
    
    return Response(
        content=json_data,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={kb.name}.json"}
    )


@router.get("/knowledge-bases/{kb_id}/export/csv")
def export_csv(
    kb_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export knowledge base as CSV."""
    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == kb_id,
        KnowledgeBase.user_id == current_user.id
    ).first()
    
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    csv_data = export_kb_to_csv(db, kb_id)
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={kb.name}.csv"}
    )


@router.post("/knowledge-bases/{kb_id}/import/json")
async def import_json(
    kb_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import knowledge base from JSON."""
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="File must be JSON")
    
    json_data = await file.read()
    
    try:
        count = import_kb_from_json(db, kb_id, json_data.decode('utf-8'), current_user.id)
        return {"message": f"Imported {count} contents successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")


@router.post("/knowledge-bases/{kb_id}/import/csv")
async def import_csv(
    kb_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import knowledge base from CSV."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be CSV")
    
    csv_data = await file.read()
    
    try:
        count = import_kb_from_csv(db, kb_id, csv_data.decode('utf-8'), current_user.id)
        return {"message": f"Imported {count} contents successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")
```

Register in `backend/app/api/v1/__init__.py`:
```python
from app.api.v1 import import_export
api_router.include_router(import_export.router, tags=["import-export"])
```

- [ ] **Step 3: 测试导入导出**

Manual test:
1. Export KB as JSON
2. Export KB as CSV
3. Create new KB and import JSON
4. Import CSV into KB

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "feat: add import/export functionality

- Export KB to JSON/CSV
- Import KB from JSON/CSV
- Auto-trigger vectorization on import
- File download with proper headers"
```

---

## Task 5: API Key 配置

**Files:**
- Create: `backend/app/models/user_api_key.py`
- Create: `backend/app/api/v1/settings.py`
- Create: `backend/app/schemas/settings.py`

- [ ] **Step 1: 创建用户 API Key 模型**

Create `backend/app/models/user_api_key.py`:
```python
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from datetime import datetime


class UserAPIKey(Base):
    __tablename__ = "user_api_keys"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    provider = Column(String(50), nullable=False)  # openai, anthropic, etc.
    api_key = Column(Text, nullable=False)  # Encrypted in production
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
```

- [ ] **Step 2: 创建数据库迁移**

Run:
```bash
cd backend
alembic revision --autogenerate -m "add user api keys"
alembic upgrade head
```

- [ ] **Step 3: 创建 schemas**

Create `backend/app/schemas/settings.py`:
```python
from pydantic import BaseModel
from datetime import datetime


class APIKeyCreate(BaseModel):
    provider: str
    api_key: str


class APIKeyResponse(BaseModel):
    id: str
    provider: str
    api_key_preview: str  # Only show last 4 chars
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
```

- [ ] **Step 4: 创建 settings API**

Create `backend/app/api/v1/settings.py`:
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.user_api_key import UserAPIKey
from app.schemas.settings import APIKeyCreate, APIKeyResponse

router = APIRouter()


@router.post("/api-keys", response_model=APIKeyResponse, status_code=201)
def create_api_key(
    key_in: APIKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save user's API key."""
    # Delete existing key for this provider
    db.query(UserAPIKey).filter(
        UserAPIKey.user_id == current_user.id,
        UserAPIKey.provider == key_in.provider
    ).delete()
    
    # Create new key
    api_key = UserAPIKey(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        provider=key_in.provider,
        api_key=key_in.api_key  # TODO: Encrypt in production
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    
    return APIKeyResponse(
        id=api_key.id,
        provider=api_key.provider,
        api_key_preview="****" + api_key.api_key[-4:],
        is_active=api_key.is_active,
        created_at=api_key.created_at
    )


@router.get("/api-keys", response_model=List[APIKeyResponse])
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List user's API keys."""
    keys = db.query(UserAPIKey).filter(
        UserAPIKey.user_id == current_user.id
    ).all()
    
    return [
        APIKeyResponse(
            id=k.id,
            provider=k.provider,
            api_key_preview="****" + k.api_key[-4:],
            is_active=k.is_active,
            created_at=k.created_at
        )
        for k in keys
    ]


@router.delete("/api-keys/{key_id}", status_code=204)
def delete_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an API key."""
    key = db.query(UserAPIKey).filter(
        UserAPIKey.id == key_id,
        UserAPIKey.user_id == current_user.id
    ).first()
    
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    db.delete(key)
    db.commit()
    
    return None
```

Register in `backend/app/api/v1/__init__.py`:
```python
from app.api.v1 import settings
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
```

- [ ] **Step 5: 更新 RAG service 使用用户 API Key**

Modify `backend/app/services/rag_service.py`:
```python
def get_openai_client(user_id: str, db: Session):
    """Get OpenAI client with user's API key or fallback to system key."""
    from app.models.user_api_key import UserAPIKey
    from app.core.config import settings
    from openai import OpenAI
    
    # Try to get user's key
    user_key = db.query(UserAPIKey).filter(
        UserAPIKey.user_id == user_id,
        UserAPIKey.provider == "openai",
        UserAPIKey.is_active == True
    ).first()
    
    if user_key:
        return OpenAI(api_key=user_key.api_key)
    else:
        return OpenAI(api_key=settings.OPENAI_API_KEY)

# Update answer_question to use this function
```

- [ ] **Step 6: 测试 API Key 配置**

Manual test:
1. Save OpenAI API key
2. Use Q&A with custom key
3. List and delete keys

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat: add custom API key configuration

- Create user_api_keys model
- Add API key management endpoints
- Support using user's OpenAI key for Q&A
- Fallback to system key if not configured"
```

---

## Task 6: 性能优化

**Files:**
- Modify: `backend/app/models/*.py` (add indexes)
- Create: `backend/alembic/versions/*_add_indexes.py`

- [ ] **Step 1: 添加数据库索引**

Create migration `backend/alembic/versions/*_add_indexes.py`:
```python
"""add indexes for performance

Revision ID: xxx
"""
from alembic import op


def upgrade():
    # User indexes
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_google_id', 'users', ['google_id'])
    
    # Knowledge base indexes
    op.create_index('ix_knowledge_bases_user_id', 'knowledge_bases', ['user_id'])
    
    # Content indexes
    op.create_index('ix_contents_kb_id', 'contents', ['knowledge_base_id'])
    op.create_index('ix_contents_created_at', 'contents', ['created_at'])
    
    # Conversation indexes
    op.create_index('ix_conversations_user_id', 'conversations', ['user_id'])
    op.create_index('ix_messages_conversation_id', 'messages', ['conversation_id'])
    
    # Crawler task indexes
    op.create_index('ix_crawler_tasks_user_id', 'crawler_tasks', ['user_id'])
    op.create_index('ix_crawler_tasks_status', 'crawler_tasks', ['status'])
    
    # Credit transaction indexes
    op.create_index('ix_credit_transactions_user_id', 'credit_transactions', ['user_id'])
    op.create_index('ix_credit_transactions_created_at', 'credit_transactions', ['created_at'])


def downgrade():
    op.drop_index('ix_users_email')
    op.drop_index('ix_users_google_id')
    op.drop_index('ix_knowledge_bases_user_id')
    op.drop_index('ix_contents_kb_id')
    op.drop_index('ix_contents_created_at')
    op.drop_index('ix_conversations_user_id')
    op.drop_index('ix_messages_conversation_id')
    op.drop_index('ix_crawler_tasks_user_id')
    op.drop_index('ix_crawler_tasks_status')
    op.drop_index('ix_credit_transactions_user_id')
    op.drop_index('ix_credit_transactions_created_at')
```

Run: `alembic upgrade head`

- [ ] **Step 2: 添加 Redis 缓存**

Update `backend/app/services/rag_service.py`:
```python
import json
from app.core.redis import redis_client

async def answer_question(kb_id: str, question: str, chat_history: List[Dict] = None):
    """Answer with caching."""
    # Generate cache key
    cache_key = f"qa:{kb_id}:{hash(question)}"
    
    # Check cache
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # ... existing RAG logic ...
    
    # Cache result (expire in 1 hour)
    redis_client.setex(cache_key, 3600, json.dumps(result))
    
    return result
```

- [ ] **Step 3: 添加分页**

Update list endpoints to support pagination:
```python
@router.get("/knowledge-bases/{kb_id}/contents")
def list_contents(
    kb_id: str,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List contents with pagination."""
    # ... existing logic with .offset(skip).limit(limit) ...
```

- [ ] **Step 4: 优化向量搜索**

Update `backend/app/services/vector_service.py`:
```python
def search_vectors(collection_name: str, query_text: str, limit: int = 5):
    """Search with optimized parameters."""
    # Use HNSW search params for better performance
    search_params = {
        "hnsw_ef": 128,  # Higher ef = better recall but slower
        "exact": False    # Use approximate search
    }
    
    # ... existing search logic with search_params ...
```

- [ ] **Step 5: 测试性能**

Run load tests:
```bash
# Install locust for load testing
pip install locust

# Create locustfile.py and run:
locust -f locustfile.py --host=http://localhost:8000
```

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "perf: add performance optimizations

- Add database indexes on frequently queried columns
- Implement Redis caching for Q&A results
- Add pagination to list endpoints
- Optimize vector search parameters"
```

---

## Task 7: 生产环境准备

**Files:**
- Create: `docker-compose.prod.yml`
- Create: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: 创建生产环境 Docker Compose**

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: fillin
      POSTGRES_USER: fillin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    restart: always

  qdrant:
    image: qdrant/qdrant:latest
    volumes:
      - qdrant_data:/qdrant/storage
    restart: always

  backend:
    build: ./backend
    command: gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
    environment:
      - DATABASE_URL=postgresql://fillin:${POSTGRES_PASSWORD}@postgres:5432/fillin
      - REDIS_URL=redis://redis:6379/0
      - QDRANT_URL=http://qdrant:6333
      - SECRET_KEY=${SECRET_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
      - qdrant
    restart: always

  celery-worker:
    build: ./backend
    command: celery -A app.core.celery_app worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://fillin:${POSTGRES_PASSWORD}@postgres:5432/fillin
      - REDIS_URL=redis://redis:6379/0
      - QDRANT_URL=http://qdrant:6333
    depends_on:
      - postgres
      - redis
    restart: always

  celery-beat:
    build: ./backend
    command: celery -A app.core.celery_app beat --loglevel=info
    environment:
      - DATABASE_URL=postgresql://fillin:${POSTGRES_PASSWORD}@postgres:5432/fillin
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    restart: always

  frontend:
    build: ./frontend
    environment:
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: always

volumes:
  postgres_data:
  qdrant_data:
```

- [ ] **Step 2: 创建环境变量模板**

Create `.env.example`:
```env
# Database
POSTGRES_PASSWORD=your_secure_password

# Security
SECRET_KEY=your_secret_key_here

# OpenAI
OPENAI_API_KEY=sk-xxx

# Google OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/v1/auth/google/callback

# Frontend
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

- [ ] **Step 3: 创建部署文档**

Update `README.md` with deployment section:
```markdown
## 生产环境部署

### 1. 准备服务器
- Ubuntu 20.04+ / CentOS 8+
- Docker & Docker Compose
- 域名和 SSL 证书

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 填入真实配置
```

### 3. 启动服务
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 4. 运行数据库迁移
```bash
docker-compose exec backend alembic upgrade head
```

### 5. 创建管理员账号
```bash
docker-compose exec backend python scripts/create_admin.py
```

### 监控和日志
```bash
# 查看日志
docker-compose logs -f backend

# 重启服务
docker-compose restart backend
```
```

- [ ] **Step 4: 安全检查清单**

Create `docs/SECURITY_CHECKLIST.md`:
```markdown
# 安全检查清单

## 部署前
- [ ] 更改所有默认密码
- [ ] 生成强随机 SECRET_KEY
- [ ] 配置 SSL 证书
- [ ] 设置防火墙规则
- [ ] 禁用不必要的端口

## 应用安全
- [ ] API Key 加密存储
- [ ] SQL 注入防护（使用 ORM）
- [ ] XSS 防护
- [ ] CORS 配置正确
- [ ] Rate limiting

## 数据安全
- [ ] 数据库定期备份
- [ ] 向量数据库备份
- [ ] 用户数据加密

## 监控
- [ ] 错误日志监控
- [ ] 性能监控
- [ ] 安全事件告警
```

- [ ] **Step 5: Commit and tag**

```bash
git add .
git commit -m "chore: production environment setup

- Add production docker-compose
- Create environment template
- Add deployment documentation
- Security checklist"

git tag -a v1.0.0-phase4 -m "Phase 4 Polish release - Production Ready

Features:
- Xiaohongshu and Bilibili crawlers
- Tagging system
- Import/export (JSON/CSV)
- Custom API key configuration
- Performance optimizations
- Production deployment config"
```

---

## Phase 4 完成！

**交付成果:**
- 5个平台爬虫（微信、X、微博、小红书、B站）
- 标签系统
- 导入导出功能
- 自定义 API Key 配置
- 性能优化（索引、缓存、分页）
- 生产环境部署配置

**产品状态:** 生产就绪 (Production Ready)

**后续优化方向:**
- 移动端适配
- 更多平台爬虫
- AI 功能增强
- 团队协作功能
- 企业级功能

