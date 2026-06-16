# Fillin Phase 3 实施计划：高级功能

**版本:** 1.0  
**日期:** 2026-06-12  
**状态:** 待开始  
**前置条件:** Phase 2 Crawlers 完成

## 概述

Phase 3 在爬虫功能基础上添加高级特性，包括多知识库联合问答、定时爬取、AI内容生成、Google OAuth登录。

## 目标

- 实现跨多个知识库的联合问答
- 添加定时爬取功能
- AI 内容生成（基于知识库）
- Google OAuth 第三方登录
- 用户积分充值

## 技术要点

- 多集合向量检索合并
- LangGraph Agent for 内容生成
- Google OAuth 2.0 集成
- Stripe/支付宝支付集成（可选）
- Celery Beat 定时任务

## 任务列表

### Task 1: 多知识库联合问答
### Task 2: 定时爬取功能
### Task 3: AI 内容生成
### Task 4: Google OAuth 登录
### Task 5: 积分充值系统
### Task 6: Phase 3 集成测试

---

## Task 1: 多知识库联合问答

**Files:**
- Modify: `backend/app/services/rag_service.py`
- Modify: `backend/app/api/v1/conversation.py`
- Modify: `frontend/src/components/conversation/chat-interface.tsx`

- [ ] **Step 1: 更新 RAG service 支持多 KB**

Modify `backend/app/services/rag_service.py`:
```python
from typing import List
from app.services.vector_service import search_vectors, get_qdrant_client

async def retrieve_from_multiple_kbs(
    kb_ids: List[str],
    query: str,
    limit: int = 5
) -> List[Dict]:
    """Retrieve relevant chunks from multiple knowledge bases."""
    from app.models.knowledge_base import KnowledgeBase
    from app.db.session import SessionLocal
    
    db = SessionLocal()
    
    try:
        # Get KB collection names
        kbs = db.query(KnowledgeBase).filter(
            KnowledgeBase.id.in_(kb_ids)
        ).all()
        
        collection_names = [kb.qdrant_collection_name for kb in kbs]
        
        # Search each collection
        all_results = []
        for collection_name in collection_names:
            try:
                results = await search_vectors(
                    collection_name=collection_name,
                    query_text=query,
                    limit=limit
                )
                all_results.extend(results)
            except Exception as e:
                print(f"Error searching {collection_name}: {e}")
                continue
        
        # Sort by score and return top results
        all_results.sort(key=lambda x: x['score'], reverse=True)
        return all_results[:limit * 2]  # Return more results when combining multiple KBs
        
    finally:
        db.close()


async def answer_question_multi_kb(
    kb_ids: List[str],
    question: str,
    chat_history: List[Dict] = None
) -> Dict:
    """Answer question using multiple knowledge bases."""
    # Retrieve from all KBs
    retrieved_chunks = await retrieve_from_multiple_kbs(kb_ids, question, limit=5)
    
    if not retrieved_chunks:
        return {
            "answer": "抱歉，在所选知识库中没有找到相关信息。",
            "sources": []
        }
    
    # Build context
    context = "\n\n".join([
        f"来源: {chunk['metadata'].get('title', 'Unknown')}\n{chunk['text']}"
        for chunk in retrieved_chunks
    ])
    
    # Build messages
    messages = []
    
    if chat_history:
        for msg in chat_history[-6:]:  # Last 3 turns
            messages.append({"role": msg["role"], "content": msg["content"]})
    
    system_prompt = f"""你是一个智能助手，根据提供的参考资料回答用户问题。

参考资料：
{context}

请基于以上参考资料回答问题。如果资料中没有相关信息，请诚实地说不知道。"""
    
    messages.insert(0, {"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": question})
    
    # Call LLM
    from app.core.config import settings
    from openai import OpenAI
    
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7,
        max_tokens=1000
    )
    
    answer = response.choices[0].message.content
    token_count = response.usage.total_tokens
    
    # Build sources
    sources = []
    for chunk in retrieved_chunks[:5]:
        sources.append({
            "content_id": chunk['metadata'].get('content_id'),
            "title": chunk['metadata'].get('title', 'Unknown'),
            "chunk_text": chunk['text'][:200],
            "url": chunk['metadata'].get('source_url'),
            "relevance_score": chunk['score']
        })
    
    return {
        "answer": answer,
        "sources": sources,
        "token_count": token_count
    }
```

- [ ] **Step 2: 更新 conversation API**

Modify `backend/app/api/v1/conversation.py` to use multi-KB RAG when conversation has multiple KBs:
```python
# In create_message endpoint, replace single KB logic:
if len(conversation.knowledge_base_ids) == 1:
    # Single KB - use existing logic
    rag_result = await answer_question(
        kb_id=conversation.knowledge_base_ids[0],
        question=message_in.content,
        chat_history=history
    )
else:
    # Multiple KBs - use multi-KB logic
    rag_result = await answer_question_multi_kb(
        kb_ids=conversation.knowledge_base_ids,
        question=message_in.content,
        chat_history=history
    )
```

- [ ] **Step 3: 测试多 KB 问答**

Manual test:
1. Create conversation with multiple KBs
2. Ask question
3. Verify sources from different KBs appear

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "feat: support multi-KB question answering

- Add retrieve_from_multiple_kbs function
- Search across multiple Qdrant collections
- Merge and rank results by relevance score
- Update conversation API to handle multi-KB"
```

---

## Task 2: 定时爬取功能

**Files:**
- Create: `backend/app/models/scheduled_crawl.py`
- Create: `backend/app/api/v1/scheduled_crawl.py`
- Create: `backend/app/tasks/scheduled_crawl_tasks.py`

- [ ] **Step 1: 创建定时爬取模型**

Create `backend/app/models/scheduled_crawl.py`:
```python
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from datetime import datetime


class ScheduledCrawl(Base):
    __tablename__ = "scheduled_crawls"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    knowledge_base_id = Column(String(36), ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False)
    
    platform = Column(String(50), nullable=False)
    target_url = Column(String(500), nullable=False)
    target_name = Column(String(200))
    
    interval_hours = Column(Integer, default=24, nullable=False)  # 爬取间隔（小时）
    is_active = Column(Boolean, default=True, nullable=False)
    
    last_run_at = Column(DateTime)
    next_run_at = Column(DateTime, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    knowledge_base = relationship("KnowledgeBase")
```

- [ ] **Step 2: 创建数据库迁移**

Run:
```bash
cd backend
alembic revision --autogenerate -m "add scheduled crawls"
alembic upgrade head
```

- [ ] **Step 3: 创建 API schemas**

In `backend/app/schemas/crawler.py`, add:
```python
class ScheduledCrawlCreate(BaseModel):
    knowledge_base_id: str
    platform: str
    target_url: str
    target_name: Optional[str] = None
    interval_hours: int = 24


class ScheduledCrawlResponse(BaseModel):
    id: str
    knowledge_base_id: str
    platform: str
    target_url: str
    target_name: Optional[str]
    interval_hours: int
    is_active: bool
    last_run_at: Optional[datetime]
    next_run_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True
```

- [ ] **Step 4: 创建 API 端点**

Create `backend/app/api/v1/scheduled_crawl.py`:
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from datetime import datetime, timedelta

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.scheduled_crawl import ScheduledCrawl
from app.schemas.crawler import ScheduledCrawlCreate, ScheduledCrawlResponse

router = APIRouter()


@router.post("/scheduled-crawls", response_model=ScheduledCrawlResponse, status_code=201)
def create_scheduled_crawl(
    crawl_in: ScheduledCrawlCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a scheduled crawl task."""
    # Verify KB ownership
    from app.models.knowledge_base import KnowledgeBase
    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == crawl_in.knowledge_base_id,
        KnowledgeBase.user_id == current_user.id
    ).first()
    
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    # Create scheduled crawl
    next_run = datetime.utcnow() + timedelta(hours=crawl_in.interval_hours)
    
    crawl = ScheduledCrawl(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        knowledge_base_id=crawl_in.knowledge_base_id,
        platform=crawl_in.platform,
        target_url=crawl_in.target_url,
        target_name=crawl_in.target_name,
        interval_hours=crawl_in.interval_hours,
        next_run_at=next_run
    )
    db.add(crawl)
    db.commit()
    db.refresh(crawl)
    
    return crawl


@router.get("/scheduled-crawls", response_model=List[ScheduledCrawlResponse])
def list_scheduled_crawls(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List user's scheduled crawls."""
    crawls = db.query(ScheduledCrawl).filter(
        ScheduledCrawl.user_id == current_user.id
    ).order_by(ScheduledCrawl.created_at.desc()).all()
    return crawls


@router.delete("/scheduled-crawls/{crawl_id}", status_code=204)
def delete_scheduled_crawl(
    crawl_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a scheduled crawl."""
    crawl = db.query(ScheduledCrawl).filter(
        ScheduledCrawl.id == crawl_id,
        ScheduledCrawl.user_id == current_user.id
    ).first()
    
    if not crawl:
        raise HTTPException(status_code=404, detail="Scheduled crawl not found")
    
    db.delete(crawl)
    db.commit()
    
    return None


@router.patch("/scheduled-crawls/{crawl_id}/toggle", response_model=ScheduledCrawlResponse)
def toggle_scheduled_crawl(
    crawl_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle scheduled crawl active status."""
    crawl = db.query(ScheduledCrawl).filter(
        ScheduledCrawl.id == crawl_id,
        ScheduledCrawl.user_id == current_user.id
    ).first()
    
    if not crawl:
        raise HTTPException(status_code=404, detail="Scheduled crawl not found")
    
    crawl.is_active = not crawl.is_active
    db.commit()
    db.refresh(crawl)
    
    return crawl
```

Register in `backend/app/api/v1/__init__.py`:
```python
from app.api.v1 import scheduled_crawl
api_router.include_router(scheduled_crawl.router, prefix="/crawlers", tags=["crawlers"])
```

- [ ] **Step 5: 创建定时任务处理器**

Create `backend/app/tasks/scheduled_crawl_tasks.py`:
```python
from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.scheduled_crawl import ScheduledCrawl
from app.models.crawler_task import CrawlerTask, TaskStatus
from datetime import datetime, timedelta
import uuid


@celery_app.task
def check_scheduled_crawls():
    """Check and trigger scheduled crawls that are due."""
    db = SessionLocal()
    
    try:
        now = datetime.utcnow()
        
        # Get due crawls
        due_crawls = db.query(ScheduledCrawl).filter(
            ScheduledCrawl.is_active == True,
            ScheduledCrawl.next_run_at <= now
        ).all()
        
        for crawl in due_crawls:
            # Create crawler task
            task = CrawlerTask(
                id=str(uuid.uuid4()),
                user_id=crawl.user_id,
                knowledge_base_id=crawl.knowledge_base_id,
                platform=crawl.platform,
                target_url=crawl.target_url,
                target_name=crawl.target_name,
                status=TaskStatus.PENDING
            )
            db.add(task)
            
            # Update next run time
            crawl.last_run_at = now
            crawl.next_run_at = now + timedelta(hours=crawl.interval_hours)
            
        db.commit()
        print(f"Created {len(due_crawls)} crawler tasks from schedule")
        
    finally:
        db.close()
```

Update `backend/app/core/celery_app.py`:
```python
celery_app.conf.beat_schedule['check-scheduled-crawls'] = {
    'task': 'app.tasks.scheduled_crawl_tasks.check_scheduled_crawls',
    'schedule': 300.0,  # Every 5 minutes
}
```

- [ ] **Step 6: 测试定时爬取**

1. Create scheduled crawl via API
2. Wait for next_run_at to pass
3. Verify crawler task is created automatically

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat: add scheduled crawling

- Create scheduled_crawls model
- Add CRUD API for scheduled crawls
- Celery task to check and trigger due crawls
- Support custom interval in hours"
```

---

## Task 3: AI 内容生成

**Files:**
- Create: `backend/app/services/content_generation_service.py`
- Create: `backend/app/api/v1/content_generation.py`
- Create: `backend/app/schemas/content_generation.py`

- [ ] **Step 1: 创建内容生成 service**

Create `backend/app/services/content_generation_service.py`:
```python
from typing import List, Dict
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END
from app.services.rag_service import retrieve_from_multiple_kbs


class ContentGenerationState(Dict):
    """State for content generation workflow."""
    kb_ids: List[str]
    topic: str
    content_type: str
    research_data: str
    outline: str
    content: str
    token_count: int


async def generate_content(
    kb_ids: List[str],
    topic: str,
    content_type: str = "article"  # article, summary, report
) -> Dict:
    """
    Generate content based on knowledge base data.
    
    Uses LangGraph to orchestrate: research → outline → write
    """
    from app.core.config import settings
    
    llm = ChatOpenAI(
        api_key=settings.OPENAI_API_KEY,
        model="gpt-4o-mini",
        temperature=0.7
    )
    
    # Define workflow steps
    async def research_step(state: ContentGenerationState) -> ContentGenerationState:
        """Research relevant information from KBs."""
        chunks = await retrieve_from_multiple_kbs(
            kb_ids=state['kb_ids'],
            query=state['topic'],
            limit=10
        )
        
        research_data = "\n\n".join([
            f"[{chunk['metadata'].get('title')}]\n{chunk['text']}"
            for chunk in chunks
        ])
        
        state['research_data'] = research_data
        return state
    
    async def outline_step(state: ContentGenerationState) -> ContentGenerationState:
        """Create content outline."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是一个专业的内容策划师。"),
            ("user", """基于以下参考资料，为主题「{topic}」创建一个{content_type}的大纲。

参考资料：
{research_data}

请输出结构化的大纲（使用 markdown 格式）。""")
        ])
        
        messages = prompt.format_messages(
            topic=state['topic'],
            content_type=state['content_type'],
            research_data=state['research_data'][:3000]  # Limit context
        )
        
        response = await llm.ainvoke(messages)
        state['outline'] = response.content
        return state
    
    async def write_step(state: ContentGenerationState) -> ContentGenerationState:
        """Write full content based on outline."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是一个专业的内容创作者。"),
            ("user", """基于以下大纲和参考资料，撰写完整的{content_type}。

主题：{topic}

大纲：
{outline}

参考资料：
{research_data}

要求：
1. 内容充实，逻辑清晰
2. 使用 markdown 格式
3. 适当引用参考资料
4. 字数在 1000-2000 字之间""")
        ])
        
        messages = prompt.format_messages(
            topic=state['topic'],
            content_type=state['content_type'],
            outline=state['outline'],
            research_data=state['research_data'][:4000]
        )
        
        response = await llm.ainvoke(messages)
        state['content'] = response.content
        # Note: token counting would need proper implementation
        state['token_count'] = len(response.content) // 2  # Rough estimate
        return state
    
    # Build workflow
    workflow = StateGraph(ContentGenerationState)
    
    workflow.add_node("research", research_step)
    workflow.add_node("outline", outline_step)
    workflow.add_node("write", write_step)
    
    workflow.set_entry_point("research")
    workflow.add_edge("research", "outline")
    workflow.add_edge("outline", "write")
    workflow.add_edge("write", END)
    
    app = workflow.compile()
    
    # Execute workflow
    initial_state = ContentGenerationState(
        kb_ids=kb_ids,
        topic=topic,
        content_type=content_type,
        research_data="",
        outline="",
        content="",
        token_count=0
    )
    
    result = await app.ainvoke(initial_state)
    
    return {
        "content": result['content'],
        "outline": result['outline'],
        "token_count": result['token_count']
    }
```

- [ ] **Step 2: 创建 schemas**

Create `backend/app/schemas/content_generation.py`:
```python
from pydantic import BaseModel
from typing import List


class ContentGenerationRequest(BaseModel):
    knowledge_base_ids: List[str]
    topic: str
    content_type: str = "article"  # article, summary, report


class ContentGenerationResponse(BaseModel):
    content: str
    outline: str
    token_count: int
    credits_used: int
```

- [ ] **Step 3: 创建 API 端点**

Create `backend/app/api/v1/content_generation.py`:
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.content_generation import ContentGenerationRequest, ContentGenerationResponse
from app.services.content_generation_service import generate_content

router = APIRouter()

CREDITS_PER_GENERATION = 50


@router.post("/generate", response_model=ContentGenerationResponse)
async def generate_content_endpoint(
    request: ContentGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate content based on knowledge bases."""
    # Check credits
    if current_user.credits < CREDITS_PER_GENERATION:
        raise HTTPException(status_code=402, detail="Insufficient credits")
    
    # Verify KB ownership
    from app.models.knowledge_base import KnowledgeBase
    kbs = db.query(KnowledgeBase).filter(
        KnowledgeBase.id.in_(request.knowledge_base_ids),
        KnowledgeBase.user_id == current_user.id
    ).all()
    
    if len(kbs) != len(request.knowledge_base_ids):
        raise HTTPException(status_code=404, detail="Some knowledge bases not found")
    
    # Generate content
    result = await generate_content(
        kb_ids=request.knowledge_base_ids,
        topic=request.topic,
        content_type=request.content_type
    )
    
    # Deduct credits
    current_user.credits -= CREDITS_PER_GENERATION
    
    # Record transaction
    from app.models.credit_transaction import CreditTransaction
    import uuid
    from datetime import datetime
    
    transaction = CreditTransaction(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        amount=-CREDITS_PER_GENERATION,
        transaction_type="content_generation",
        description=f"Generate {request.content_type}: {request.topic}"
    )
    db.add(transaction)
    db.commit()
    
    return ContentGenerationResponse(
        content=result['content'],
        outline=result['outline'],
        token_count=result['token_count'],
        credits_used=CREDITS_PER_GENERATION
    )
```

Register in `backend/app/api/v1/__init__.py`:
```python
from app.api.v1 import content_generation
api_router.include_router(content_generation.router, prefix="/content-generation", tags=["content-generation"])
```

- [ ] **Step 4: 测试内容生成**

Manual test:
1. Select KB(s)
2. POST `/content-generation/generate` with topic
3. Verify generated content

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat: add AI content generation

- Implement LangGraph workflow for content generation
- Steps: research → outline → write
- Retrieve from multiple KBs
- Deduct credits on generation"
```


---

## Task 4: Google OAuth 登录

**Files:**
- Create: `backend/app/api/v1/oauth.py`
- Modify: `backend/app/models/user.py`
- Modify: `backend/requirements.txt`
- Modify: `frontend/src/app/(auth)/login/page.tsx`

- [ ] **Step 1: 安装依赖**

Update `backend/requirements.txt`:
```txt
authlib==1.3.0
httpx==0.25.2
```

Run: `pip install authlib httpx`

- [ ] **Step 2: 配置环境变量**

Update `backend/.env`:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
```

Update `backend/app/core/config.py`:
```python
class Settings(BaseSettings):
    # ... existing fields ...
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
```

- [ ] **Step 3: 更新 User 模型**

Modify `backend/app/models/user.py`:
```python
class User(Base):
    # ... existing fields ...
    google_id = Column(String(100), unique=True, nullable=True)
    avatar_url = Column(String(500), nullable=True)
```

Create migration:
```bash
cd backend
alembic revision --autogenerate -m "add google oauth fields"
alembic upgrade head
```

- [ ] **Step 4: 创建 OAuth API**

Create `backend/app/api/v1/oauth.py`:
```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request
import uuid

from app.api.deps import get_db
from app.models.user import User
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token

router = APIRouter()

oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)


@router.get("/google/login")
async def google_login(request: Request):
    """Redirect to Google OAuth login."""
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Google OAuth callback."""
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        google_id = user_info['sub']
        email = user_info['email']
        username = user_info.get('name', email.split('@')[0])
        avatar_url = user_info.get('picture')
        
        # Check if user exists
        user = db.query(User).filter(User.google_id == google_id).first()
        
        if not user:
            # Check if email exists
            user = db.query(User).filter(User.email == email).first()
            
            if user:
                # Link existing account
                user.google_id = google_id
                user.avatar_url = avatar_url
            else:
                # Create new user
                user = User(
                    id=str(uuid.uuid4()),
                    email=email,
                    username=username,
                    google_id=google_id,
                    avatar_url=avatar_url,
                    password_hash="",  # No password for OAuth users
                    credits=100  # Initial credits
                )
                db.add(user)
            
            db.commit()
            db.refresh(user)
        
        # Generate tokens
        access_token = create_access_token(data={"sub": user.id})
        refresh_token = create_refresh_token(data={"sub": user.id})
        
        # Redirect to frontend with tokens
        frontend_url = f"http://localhost:3000/auth/callback?access_token={access_token}&refresh_token={refresh_token}"
        return RedirectResponse(url=frontend_url)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")
```

Register in `backend/app/api/v1/__init__.py`:
```python
from app.api.v1 import oauth
api_router.include_router(oauth.router, prefix="/auth", tags=["auth"])
```

- [ ] **Step 5: 更新前端登录页面**

Modify `frontend/src/app/(auth)/login/page.tsx`:
```typescript
// Add Google login button
<Button
  variant="outline"
  onClick={() => {
    window.location.href = 'http://localhost:8000/api/v1/auth/google/login';
  }}
  className="w-full"
>
  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
    {/* Google icon SVG */}
  </svg>
  使用 Google 登录
</Button>
```

- [ ] **Step 6: 创建回调处理页面**

Create `frontend/src/app/auth/callback/page.tsx`:
```typescript
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      router.push('/dashboard');
    } else {
      router.push('/login?error=oauth_failed');
    }
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>登录中...</p>
    </div>
  );
}
```

- [ ] **Step 7: 测试 Google OAuth**

Manual test:
1. Click "使用 Google 登录"
2. Complete Google auth
3. Verify redirect back with tokens
4. Check user created/linked in DB

- [ ] **Step 8: Commit**

```bash
git add backend/ frontend/
git commit -m "feat: add Google OAuth login

- Implement OAuth 2.0 with Authlib
- Create oauth callback endpoint
- Link or create user on OAuth login
- Add Google login button to frontend
- Handle OAuth callback and token storage"
```

---

## Task 5: 积分充值系统

**Files:**
- Create: `backend/app/models/credit_package.py`
- Create: `backend/app/api/v1/credits.py`
- Create: `backend/app/schemas/credits.py`

- [ ] **Step 1: 创建积分套餐模型**

Create `backend/app/models/credit_package.py`:
```python
from sqlalchemy import Column, String, Integer, Numeric, Boolean
from app.db.base_class import Base


class CreditPackage(Base):
    __tablename__ = "credit_packages"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    credits = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)  # USD
    is_active = Column(Boolean, default=True, nullable=False)
    display_order = Column(Integer, default=0)
```

Create migration:
```bash
cd backend
alembic revision --autogenerate -m "add credit packages"
alembic upgrade head
```

- [ ] **Step 2: 创建初始套餐数据**

Create `backend/scripts/seed_credit_packages.py`:
```python
import sys
sys.path.append(".")

from app.db.session import SessionLocal
from app.models.credit_package import CreditPackage
import uuid


def seed_packages():
    db = SessionLocal()
    
    packages = [
        {"name": "入门套餐", "credits": 100, "price": 9.99, "display_order": 1},
        {"name": "标准套餐", "credits": 500, "price": 39.99, "display_order": 2},
        {"name": "专业套餐", "credits": 1000, "price": 69.99, "display_order": 3},
        {"name": "企业套餐", "credits": 5000, "price": 299.99, "display_order": 4},
    ]
    
    for pkg_data in packages:
        pkg = CreditPackage(
            id=str(uuid.uuid4()),
            **pkg_data
        )
        db.add(pkg)
    
    db.commit()
    print("Credit packages seeded!")


if __name__ == "__main__":
    seed_packages()
```

Run: `python backend/scripts/seed_credit_packages.py`

- [ ] **Step 3: 创建 schemas**

Create `backend/app/schemas/credits.py`:
```python
from pydantic import BaseModel
from decimal import Decimal


class CreditPackageResponse(BaseModel):
    id: str
    name: str
    credits: int
    price: Decimal
    display_order: int
    
    class Config:
        from_attributes = True


class PurchaseRequest(BaseModel):
    package_id: str
    payment_method: str = "mock"  # mock, stripe, alipay


class PurchaseResponse(BaseModel):
    success: bool
    credits_added: int
    new_balance: int
```

- [ ] **Step 4: 创建 API 端点**

Create `backend/app/api/v1/credits.py`:
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from datetime import datetime

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.credit_package import CreditPackage
from app.models.credit_transaction import CreditTransaction
from app.schemas.credits import CreditPackageResponse, PurchaseRequest, PurchaseResponse

router = APIRouter()


@router.get("/packages", response_model=List[CreditPackageResponse])
def list_credit_packages(db: Session = Depends(get_db)):
    """List available credit packages."""
    packages = db.query(CreditPackage).filter(
        CreditPackage.is_active == True
    ).order_by(CreditPackage.display_order).all()
    return packages


@router.post("/purchase", response_model=PurchaseResponse)
def purchase_credits(
    request: PurchaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Purchase credits (mock payment for MVP)."""
    # Get package
    package = db.query(CreditPackage).filter(
        CreditPackage.id == request.package_id,
        CreditPackage.is_active == True
    ).first()
    
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Mock payment processing (in production, integrate with Stripe/Alipay)
    if request.payment_method == "mock":
        payment_success = True
    else:
        # TODO: Integrate real payment gateway
        raise HTTPException(status_code=400, detail="Payment method not supported")
    
    if not payment_success:
        raise HTTPException(status_code=402, detail="Payment failed")
    
    # Add credits
    current_user.credits += package.credits
    
    # Record transaction
    transaction = CreditTransaction(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        amount=package.credits,
        transaction_type="purchase",
        description=f"Purchased {package.name}"
    )
    db.add(transaction)
    db.commit()
    
    return PurchaseResponse(
        success=True,
        credits_added=package.credits,
        new_balance=current_user.credits
    )
```

Register in `backend/app/api/v1/__init__.py`:
```python
from app.api.v1 import credits
api_router.include_router(credits.router, prefix="/credits", tags=["credits"])
```

- [ ] **Step 5: 创建前端充值页面**

Create `frontend/src/app/(dashboard)/credits/page.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api-client';

interface Package {
  id: string;
  name: string;
  credits: number;
  price: number;
}

export default function CreditsPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    const response = await apiClient.get<Package[]>('/credits/packages');
    setPackages(response.data);
  };

  const handlePurchase = async (packageId: string) => {
    setLoading(true);
    try {
      await apiClient.post('/credits/purchase', {
        package_id: packageId,
        payment_method: 'mock'
      });
      alert('充值成功！');
      window.location.reload();
    } catch (error) {
      alert('充值失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">积分充值</h1>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {packages.map((pkg) => (
          <Card key={pkg.id}>
            <CardContent className="pt-6">
              <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
              <p className="text-3xl font-bold text-blue-600 mb-2">
                {pkg.credits} 积分
              </p>
              <p className="text-gray-600 mb-4">${pkg.price}</p>
              <Button
                onClick={() => handlePurchase(pkg.id)}
                disabled={loading}
                className="w-full"
              >
                购买
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 测试充值功能**

Manual test:
1. Visit credits page
2. Click purchase on a package
3. Verify credits added to balance

- [ ] **Step 7: Commit**

```bash
git add backend/ frontend/
git commit -m "feat: add credit purchase system

- Create credit packages model
- Add package list and purchase API
- Mock payment for MVP (can integrate Stripe later)
- Create frontend credits page"
```

---

## Task 6: Phase 3 集成测试

**Files:**
- Create: `backend/tests/test_phase3_integration.py`
- Modify: `README.md`

- [ ] **Step 1: 编写集成测试**

Create `backend/tests/test_phase3_integration.py`:
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_multi_kb_qa():
    """Test multi-KB question answering."""
    # Setup: register, create 2 KBs with content
    client.post("/api/v1/auth/register", json={
        "email": "multi_kb@test.com",
        "password": "pass123"
    })
    
    login = client.post("/api/v1/auth/login", json={
        "email": "multi_kb@test.com",
        "password": "pass123"
    })
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create 2 KBs
    kb1 = client.post("/api/v1/knowledge-bases", headers=headers, json={
        "name": "KB1"
    }).json()
    kb2 = client.post("/api/v1/knowledge-bases", headers=headers, json={
        "name": "KB2"
    }).json()
    
    # Create conversation with both KBs
    conv = client.post("/api/v1/conversations", headers=headers, json={
        "knowledge_base_ids": [kb1["id"], kb2["id"]]
    })
    assert conv.status_code == 201


def test_scheduled_crawl_crud():
    """Test scheduled crawl CRUD operations."""
    client.post("/api/v1/auth/register", json={
        "email": "sched@test.com",
        "password": "pass123"
    })
    
    login = client.post("/api/v1/auth/login", json={
        "email": "sched@test.com",
        "password": "pass123"
    })
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create KB
    kb = client.post("/api/v1/knowledge-bases", headers=headers, json={
        "name": "Test KB"
    }).json()
    
    # Create scheduled crawl
    crawl = client.post("/api/v1/crawlers/scheduled-crawls", headers=headers, json={
        "knowledge_base_id": kb["id"],
        "platform": "wechat",
        "target_url": "https://test.com",
        "interval_hours": 24
    })
    assert crawl.status_code == 201
    crawl_id = crawl.json()["id"]
    
    # List
    crawls = client.get("/api/v1/crawlers/scheduled-crawls", headers=headers)
    assert len(crawls.json()) >= 1
    
    # Toggle
    toggle = client.patch(f"/api/v1/crawlers/scheduled-crawls/{crawl_id}/toggle", headers=headers)
    assert toggle.status_code == 200
    
    # Delete
    delete = client.delete(f"/api/v1/crawlers/scheduled-crawls/{crawl_id}", headers=headers)
    assert delete.status_code == 204


def test_credit_purchase():
    """Test credit purchase flow."""
    client.post("/api/v1/auth/register", json={
        "email": "purchase@test.com",
        "password": "pass123"
    })
    
    login = client.post("/api/v1/auth/login", json={
        "email": "purchase@test.com",
        "password": "pass123"
    })
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # List packages
    packages = client.get("/api/v1/credits/packages", headers=headers)
    assert packages.status_code == 200
    assert len(packages.json()) > 0
    
    package_id = packages.json()[0]["id"]
    
    # Purchase
    purchase = client.post("/api/v1/credits/purchase", headers=headers, json={
        "package_id": package_id,
        "payment_method": "mock"
    })
    assert purchase.status_code == 200
    assert purchase.json()["success"] == True
```

- [ ] **Step 2: 运行测试**

Run: `cd backend && pytest tests/test_phase3_integration.py -v`

- [ ] **Step 3: 更新文档**

Update README.md with Phase 3 features.

- [ ] **Step 4: Commit and tag**

```bash
git add .
git commit -m "test: add Phase 3 integration tests

- Test multi-KB question answering
- Test scheduled crawl CRUD
- Test credit purchase flow
- Complete Phase 3"

git tag -a v0.3.0-phase3 -m "Phase 3 Advanced Features release

Features:
- Multi-KB question answering
- Scheduled crawling
- AI content generation with LangGraph
- Google OAuth login
- Credit purchase system"
```

---

## Phase 3 完成！

**交付成果:**
- 多知识库联合问答
- 定时爬取功能
- AI 内容生成（LangGraph）
- Google OAuth 登录
- 积分充值系统

**下一步:** 进入 Phase 4（功能完善）

