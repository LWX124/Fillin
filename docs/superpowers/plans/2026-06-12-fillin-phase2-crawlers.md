# Fillin Phase 2 实施计划：爬虫功能

**版本:** 1.0  
**日期:** 2026-06-12  
**状态:** 待开始  
**前置条件:** Phase 1 MVP 完成

## 概述

Phase 2 在 MVP 基础上添加内容爬取功能，实现从微信公众号、X (Twitter)、微博等平台自动采集内容。

## 目标

- 实现微信公众号文章爬取
- 实现 X (Twitter) 推文爬取
- 实现微博内容爬取
- 爬虫任务管理与调度
- 自动内容导入与向量化

## 技术要点

- 使用 Playwright/Selenium 进行页面渲染
- Cookie 管理与登录态维护
- 反爬虫策略应对（限流、随机延迟、User-Agent轮换）
- Celery Beat 定时任务调度
- 爬虫状态监控

## 任务列表

### Task 1: 爬虫基础架构
### Task 2: 微信公众号爬虫
### Task 3: X (Twitter) 爬虫
### Task 4: 微博爬虫
### Task 5: 爬虫任务管理
### Task 6: 前端爬虫配置界面
### Task 7: Phase 2 集成测试

---

## Task 1: 爬虫基础架构

**Files:**
- Create: `backend/app/crawlers/__init__.py`
- Create: `backend/app/crawlers/base.py`
- Create: `backend/app/models/crawler_task.py`
- Create: `backend/app/models/crawler_cookie.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: 安装爬虫依赖**

Update `backend/requirements.txt`:
```txt
playwright==1.40.0
fake-useragent==1.4.0
```

Run: `pip install playwright && playwright install chromium`

- [ ] **Step 2: 创建爬虫任务模型**

Create `backend/app/models/crawler_task.py`:
```python
from sqlalchemy import Column, String, Enum, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from datetime import datetime
import enum


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class CrawlerTask(Base):
    __tablename__ = "crawler_tasks"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    knowledge_base_id = Column(String(36), ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False)
    
    platform = Column(String(50), nullable=False)  # wechat, x, weibo, xiaohongshu, bilibili
    target_url = Column(String(500), nullable=False)  # 目标账号/频道URL
    target_name = Column(String(200))  # 目标账号名称
    
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    items_crawled = Column(Integer, default=0)
    items_imported = Column(Integer, default=0)
    error_message = Column(Text)
    
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="crawler_tasks")
    knowledge_base = relationship("KnowledgeBase")
```

- [ ] **Step 3: 创建 Cookie 存储模型**

Create `backend/app/models/crawler_cookie.py`:
```python
from sqlalchemy import Column, String, ForeignKey, Text, DateTime
from app.db.base_class import Base
from datetime import datetime


class CrawlerCookie(Base):
    __tablename__ = "crawler_cookies"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(50), nullable=False)
    cookies_json = Column(Text, nullable=False)  # JSON 格式的 cookies
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
```

- [ ] **Step 4: 更新 User 模型关系**

In `backend/app/models/user.py`, add:
```python
from sqlalchemy.orm import relationship

class User(Base):
    # ... existing fields ...
    crawler_tasks = relationship("CrawlerTask", back_populates="user", cascade="all, delete-orphan")
```

- [ ] **Step 5: 创建数据库迁移**

Run:
```bash
cd backend
alembic revision --autogenerate -m "add crawler tables"
alembic upgrade head
```

- [ ] **Step 6: 创建爬虫基类**

Create `backend/app/crawlers/base.py`:
```python
from abc import ABC, abstractmethod
from playwright.async_api import async_playwright, Browser, Page
from typing import List, Dict, Optional
import asyncio
import random
from fake_useragent import UserAgent


class BaseCrawler(ABC):
    """Base crawler class with common functionality."""
    
    def __init__(self, cookies: Optional[str] = None):
        self.cookies = cookies
        self.ua = UserAgent()
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
    
    async def setup(self):
        """Initialize browser and page."""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=True)
        
        context = await self.browser.new_context(
            user_agent=self.ua.random,
            viewport={"width": 1920, "height": 1080}
        )
        
        # Load cookies if provided
        if self.cookies:
            import json
            await context.add_cookies(json.loads(self.cookies))
        
        self.page = await context.new_page()
    
    async def teardown(self):
        """Close browser."""
        if self.browser:
            await self.browser.close()
    
    async def random_delay(self, min_sec: float = 1.0, max_sec: float = 3.0):
        """Random delay to avoid detection."""
        await asyncio.sleep(random.uniform(min_sec, max_sec))
    
    @abstractmethod
    async def crawl(self, target_url: str, limit: int = 10) -> List[Dict]:
        """
        Crawl content from target URL.
        
        Returns:
            List of dicts with keys: title, content, url, published_at
        """
        pass
    
    @abstractmethod
    def validate_url(self, url: str) -> bool:
        """Validate if the URL is correct for this platform."""
        pass
```

- [ ] **Step 7: 测试爬虫基类初始化**

Create test in `backend/tests/test_crawlers.py`:
```python
import pytest
from app.crawlers.base import BaseCrawler


class DummyCrawler(BaseCrawler):
    async def crawl(self, target_url: str, limit: int = 10):
        return []
    
    def validate_url(self, url: str) -> bool:
        return True


@pytest.mark.asyncio
async def test_crawler_setup():
    crawler = DummyCrawler()
    await crawler.setup()
    assert crawler.browser is not None
    assert crawler.page is not None
    await crawler.teardown()
```

Run: `pytest tests/test_crawlers.py -v`

- [ ] **Step 8: Commit**

```bash
git add backend/
git commit -m "feat: add crawler infrastructure

- Create crawler task and cookie models
- Add database migrations
- Implement base crawler with Playwright
- Add anti-detection features (random UA, delays)"
```

---

## Task 2: 微信公众号爬虫

**Files:**
- Create: `backend/app/crawlers/wechat_crawler.py`
- Create: `backend/app/api/v1/crawler.py`
- Create: `backend/app/schemas/crawler.py`

- [ ] **Step 1: 实现微信爬虫**

Create `backend/app/crawlers/wechat_crawler.py`:
```python
from app.crawlers.base import BaseCrawler
from typing import List, Dict
import re
from datetime import datetime


class WeChatCrawler(BaseCrawler):
    """Crawler for WeChat Official Account articles."""
    
    SEARCH_URL = "https://weixin.sogou.com/weixin"
    
    def validate_url(self, url: str) -> bool:
        """Validate WeChat article or account URL."""
        return "mp.weixin.qq.com" in url or bool(re.match(r"^[\w一-龥]+$", url))
    
    async def crawl(self, target_url: str, limit: int = 10) -> List[Dict]:
        """
        Crawl WeChat articles.
        
        Args:
            target_url: WeChat account name or article URL
            limit: Max articles to crawl
        """
        if not self.validate_url(target_url):
            raise ValueError(f"Invalid WeChat URL or account: {target_url}")
        
        await self.setup()
        
        try:
            # If it's an account name, search for it
            if "mp.weixin.qq.com" not in target_url:
                articles = await self._search_account(target_url, limit)
            else:
                articles = await self._crawl_article(target_url)
            
            return articles
        finally:
            await self.teardown()
    
    async def _search_account(self, account_name: str, limit: int) -> List[Dict]:
        """Search for account and get recent articles."""
        await self.page.goto(self.SEARCH_URL)
        await self.random_delay()
        
        # Search for account
        await self.page.fill('input[name="query"]', account_name)
        await self.page.click('input[type="submit"]')
        await self.page.wait_for_load_state("networkidle")
        await self.random_delay()
        
        # Click first account result
        account_links = await self.page.query_selector_all('a[uigs="account_name_0"]')
        if not account_links:
            return []
        
        await account_links[0].click()
        await self.page.wait_for_load_state("networkidle")
        await self.random_delay()
        
        # Get article links
        article_elements = await self.page.query_selector_all('.weui_media_title')
        articles = []
        
        for elem in article_elements[:limit]:
            try:
                title = await elem.inner_text()
                url = await elem.get_attribute('href')
                
                if url:
                    # Crawl full article content
                    article_data = await self._crawl_article(url)
                    if article_data:
                        articles.extend(article_data)
                
                await self.random_delay(0.5, 1.5)
            except Exception as e:
                print(f"Error crawling article: {e}")
                continue
        
        return articles
    
    async def _crawl_article(self, article_url: str) -> List[Dict]:
        """Crawl single article content."""
        await self.page.goto(article_url)
        await self.page.wait_for_load_state("networkidle")
        await self.random_delay()
        
        try:
            # Extract title
            title_elem = await self.page.query_selector('#activity-name')
            title = await title_elem.inner_text() if title_elem else "Untitled"
            
            # Extract content
            content_elem = await self.page.query_selector('#js_content')
            content = await content_elem.inner_text() if content_elem else ""
            
            # Extract publish time
            time_elem = await self.page.query_selector('#publish_time')
            time_text = await time_elem.inner_text() if time_elem else ""
            
            return [{
                "title": title.strip(),
                "content": content.strip(),
                "url": article_url,
                "published_at": time_text or datetime.now().isoformat()
            }]
        except Exception as e:
            print(f"Error parsing article: {e}")
            return []
```

- [ ] **Step 2: 创建 API schemas**

Create `backend/app/schemas/crawler.py`:
```python
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from app.models.crawler_task import TaskStatus


class CrawlerTaskCreate(BaseModel):
    knowledge_base_id: str
    platform: str
    target_url: str
    target_name: Optional[str] = None


class CrawlerTaskResponse(BaseModel):
    id: str
    user_id: str
    knowledge_base_id: str
    platform: str
    target_url: str
    target_name: Optional[str]
    status: TaskStatus
    items_crawled: int
    items_imported: int
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class CrawlerCookieCreate(BaseModel):
    platform: str
    cookies_json: str


class CrawlerCookieResponse(BaseModel):
    id: str
    platform: str
    created_at: datetime
    
    class Config:
        from_attributes = True
```

- [ ] **Step 3: 创建爬虫 API 端点**

Create `backend/app/api/v1/crawler.py`:
```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import uuid
from datetime import datetime

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.crawler_task import CrawlerTask, TaskStatus
from app.models.crawler_cookie import CrawlerCookie
from app.schemas.crawler import (
    CrawlerTaskCreate,
    CrawlerTaskResponse,
    CrawlerCookieCreate,
    CrawlerCookieResponse
)
from app.crawlers.wechat_crawler import WeChatCrawler
from app.services.content_service import create_content_from_crawled

router = APIRouter()


@router.post("/tasks", response_model=CrawlerTaskResponse, status_code=201)
def create_crawler_task(
    task_in: CrawlerTaskCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create and start a crawler task."""
    # Verify KB ownership
    from app.models.knowledge_base import KnowledgeBase
    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == task_in.knowledge_base_id,
        KnowledgeBase.user_id == current_user.id
    ).first()
    
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    # Create task
    task = CrawlerTask(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        knowledge_base_id=task_in.knowledge_base_id,
        platform=task_in.platform,
        target_url=task_in.target_url,
        target_name=task_in.target_name,
        status=TaskStatus.PENDING
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    
    # Start crawling in background
    background_tasks.add_task(execute_crawler_task, task.id, db)
    
    return task


@router.get("/tasks", response_model=List[CrawlerTaskResponse])
def list_crawler_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List user's crawler tasks."""
    tasks = db.query(CrawlerTask).filter(
        CrawlerTask.user_id == current_user.id
    ).order_by(CrawlerTask.created_at.desc()).all()
    return tasks


@router.get("/tasks/{task_id}", response_model=CrawlerTaskResponse)
def get_crawler_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get crawler task details."""
    task = db.query(CrawlerTask).filter(
        CrawlerTask.id == task_id,
        CrawlerTask.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return task


@router.post("/cookies", response_model=CrawlerCookieResponse, status_code=201)
def save_crawler_cookies(
    cookie_in: CrawlerCookieCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save platform cookies for authenticated crawling."""
    # Delete existing cookies for this platform
    db.query(CrawlerCookie).filter(
        CrawlerCookie.user_id == current_user.id,
        CrawlerCookie.platform == cookie_in.platform
    ).delete()
    
    # Create new cookie entry
    cookie = CrawlerCookie(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        platform=cookie_in.platform,
        cookies_json=cookie_in.cookies_json
    )
    db.add(cookie)
    db.commit()
    db.refresh(cookie)
    
    return cookie


async def execute_crawler_task(task_id: str, db: Session):
    """Background task to execute crawling."""
    task = db.query(CrawlerTask).filter(CrawlerTask.id == task_id).first()
    if not task:
        return
    
    # Update status to running
    task.status = TaskStatus.RUNNING
    task.started_at = datetime.utcnow()
    db.commit()
    
    try:
        # Get user cookies if available
        cookie = db.query(CrawlerCookie).filter(
            CrawlerCookie.user_id == task.user_id,
            CrawlerCookie.platform == task.platform
        ).first()
        
        cookies_json = cookie.cookies_json if cookie else None
        
        # Select crawler based on platform
        if task.platform == "wechat":
            crawler = WeChatCrawler(cookies=cookies_json)
        else:
            raise ValueError(f"Unsupported platform: {task.platform}")
        
        # Crawl content
        articles = await crawler.crawl(task.target_url, limit=20)
        task.items_crawled = len(articles)
        
        # Import to knowledge base
        imported = 0
        for article in articles:
            try:
                await create_content_from_crawled(
                    db=db,
                    kb_id=task.knowledge_base_id,
                    platform=task.platform,
                    **article
                )
                imported += 1
            except Exception as e:
                print(f"Failed to import article: {e}")
        
        task.items_imported = imported
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.utcnow()
        
    except Exception as e:
        task.status = TaskStatus.FAILED
        task.error_message = str(e)
        task.completed_at = datetime.utcnow()
    
    db.commit()
```

- [ ] **Step 4: 注册爬虫路由**

In `backend/app/api/v1/__init__.py`, add:
```python
from app.api.v1 import crawler

api_router.include_router(crawler.router, prefix="/crawlers", tags=["crawlers"])
```

- [ ] **Step 5: 创建内容导入服务**

Create helper in `backend/app/services/content_service.py`:
```python
from sqlalchemy.orm import Session
from app.models.content import Content
from app.tasks.vectorize import vectorize_content_task
import uuid


async def create_content_from_crawled(
    db: Session,
    kb_id: str,
    platform: str,
    title: str,
    content: str,
    url: str,
    published_at: str
):
    """Create content from crawled data and trigger vectorization."""
    # Check if already exists
    existing = db.query(Content).filter(
        Content.knowledge_base_id == kb_id,
        Content.source_url == url
    ).first()
    
    if existing:
        return existing
    
    # Create new content
    content_obj = Content(
        id=str(uuid.uuid4()),
        knowledge_base_id=kb_id,
        title=title,
        content=content,
        source_platform=platform,
        source_url=url
    )
    db.add(content_obj)
    
    # Update KB content count
    from app.models.knowledge_base import KnowledgeBase
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if kb:
        kb.content_count += 1
    
    db.commit()
    db.refresh(content_obj)
    
    # Trigger vectorization
    vectorize_content_task.delay(content_obj.id)
    
    return content_obj
```

- [ ] **Step 6: 测试微信爬虫**

Test manually:
1. POST `/api/v1/crawlers/tasks` with wechat platform
2. GET `/api/v1/crawlers/tasks/{id}` to check status
3. Verify articles imported to KB

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat: implement WeChat crawler

- Add WeChat article crawler with Sogou search
- Create crawler task API endpoints
- Add cookie storage for authenticated crawling
- Auto-import crawled content to KB"
```


---

## Task 3: X (Twitter) 爬虫

**Files:**
- Create: `backend/app/crawlers/x_crawler.py`

- [ ] **Step 1: 实现 X 爬虫**

Create `backend/app/crawlers/x_crawler.py`:
```python
from app.crawlers.base import BaseCrawler
from typing import List, Dict
import re


class XCrawler(BaseCrawler):
    """Crawler for X (Twitter) posts."""
    
    def validate_url(self, url: str) -> bool:
        """Validate X profile URL."""
        pattern = r"(twitter\.com|x\.com)/[\w]+"
        return bool(re.search(pattern, url))
    
    async def crawl(self, target_url: str, limit: int = 10) -> List[Dict]:
        """
        Crawl X posts from a profile.
        
        Args:
            target_url: X profile URL (e.g., https://x.com/username)
            limit: Max posts to crawl
        """
        if not self.validate_url(target_url):
            raise ValueError(f"Invalid X URL: {target_url}")
        
        await self.setup()
        
        try:
            await self.page.goto(target_url)
            await self.page.wait_for_load_state("networkidle")
            await self.random_delay(2, 4)
            
            posts = []
            scroll_count = 0
            max_scrolls = 5
            
            while len(posts) < limit and scroll_count < max_scrolls:
                # Extract posts
                articles = await self.page.query_selector_all('article[data-testid="tweet"]')
                
                for article in articles:
                    if len(posts) >= limit:
                        break
                    
                    try:
                        # Extract text content
                        text_elem = await article.query_selector('[data-testid="tweetText"]')
                        text = await text_elem.inner_text() if text_elem else ""
                        
                        if not text:
                            continue
                        
                        # Extract timestamp
                        time_elem = await article.query_selector('time')
                        timestamp = await time_elem.get_attribute('datetime') if time_elem else ""
                        
                        # Extract post URL
                        link_elem = await article.query_selector('a[href*="/status/"]')
                        post_url = ""
                        if link_elem:
                            href = await link_elem.get_attribute('href')
                            post_url = f"https://x.com{href}" if href else ""
                        
                        # Skip if already collected
                        if post_url and any(p['url'] == post_url for p in posts):
                            continue
                        
                        posts.append({
                            "title": text[:100] + "..." if len(text) > 100 else text,
                            "content": text,
                            "url": post_url,
                            "published_at": timestamp
                        })
                        
                    except Exception as e:
                        print(f"Error parsing post: {e}")
                        continue
                
                # Scroll down to load more
                await self.page.evaluate("window.scrollBy(0, window.innerHeight)")
                await self.random_delay(2, 3)
                scroll_count += 1
            
            return posts
            
        finally:
            await self.teardown()
```

- [ ] **Step 2: 更新爬虫路由支持 X**

In `backend/app/api/v1/crawler.py`, update `execute_crawler_task`:
```python
# Select crawler based on platform
if task.platform == "wechat":
    crawler = WeChatCrawler(cookies=cookies_json)
elif task.platform == "x":
    crawler = XCrawler(cookies=cookies_json)
else:
    raise ValueError(f"Unsupported platform: {task.platform}")
```

- [ ] **Step 3: 测试 X 爬虫**

Manual test:
1. POST crawler task with platform="x" and target_url="https://x.com/elonmusk"
2. Check task status and imported posts

- [ ] **Step 4: Commit**

```bash
git add backend/app/crawlers/x_crawler.py
git commit -m "feat: add X (Twitter) crawler

- Implement X profile post crawler
- Support scrolling to load more posts
- Extract post text, timestamp, and URL"
```

---

## Task 4: 微博爬虫

**Files:**
- Create: `backend/app/crawlers/weibo_crawler.py`

- [ ] **Step 1: 实现微博爬虫**

Create `backend/app/crawlers/weibo_crawler.py`:
```python
from app.crawlers.base import BaseCrawler
from typing import List, Dict
import re


class WeiboCrawler(BaseCrawler):
    """Crawler for Weibo posts."""
    
    def validate_url(self, url: str) -> bool:
        """Validate Weibo profile URL."""
        pattern = r"weibo\.(com|cn)/u?/?\d+"
        return bool(re.search(pattern, url))
    
    async def crawl(self, target_url: str, limit: int = 10) -> List[Dict]:
        """
        Crawl Weibo posts from a profile.
        
        Args:
            target_url: Weibo profile URL (e.g., https://weibo.com/u/1234567890)
            limit: Max posts to crawl
        """
        if not self.validate_url(target_url):
            raise ValueError(f"Invalid Weibo URL: {target_url}")
        
        await self.setup()
        
        try:
            # Navigate to mobile version for easier parsing
            if "weibo.com/u/" in target_url:
                uid = target_url.split("/u/")[-1].split("?")[0]
                mobile_url = f"https://m.weibo.cn/u/{uid}"
            else:
                mobile_url = target_url.replace("weibo.com", "m.weibo.cn")
            
            await self.page.goto(mobile_url)
            await self.page.wait_for_load_state("networkidle")
            await self.random_delay(2, 4)
            
            posts = []
            scroll_count = 0
            max_scrolls = 5
            
            while len(posts) < limit and scroll_count < max_scrolls:
                # Extract post cards
                cards = await self.page.query_selector_all('.card-wrap')
                
                for card in cards:
                    if len(posts) >= limit:
                        break
                    
                    try:
                        # Extract content
                        content_elem = await card.query_selector('.weibo-text')
                        content = await content_elem.inner_text() if content_elem else ""
                        
                        if not content or len(content) < 10:
                            continue
                        
                        # Extract timestamp
                        time_elem = await card.query_selector('.time')
                        timestamp = await time_elem.inner_text() if time_elem else ""
                        
                        # Extract post link
                        link_elem = await card.query_selector('a.weibo-text')
                        post_url = ""
                        if link_elem:
                            href = await link_elem.get_attribute('href')
                            if href and href.startswith('/status/'):
                                post_url = f"https://m.weibo.cn{href}"
                        
                        # Skip duplicates
                        if any(p['content'] == content for p in posts):
                            continue
                        
                        posts.append({
                            "title": content[:100] + "..." if len(content) > 100 else content,
                            "content": content,
                            "url": post_url,
                            "published_at": timestamp
                        })
                        
                    except Exception as e:
                        print(f"Error parsing Weibo post: {e}")
                        continue
                
                # Scroll to load more
                await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await self.random_delay(2, 3)
                scroll_count += 1
            
            return posts
            
        finally:
            await self.teardown()
```

- [ ] **Step 2: 更新爬虫路由支持微博**

In `backend/app/api/v1/crawler.py`, add weibo support:
```python
elif task.platform == "weibo":
    crawler = WeiboCrawler(cookies=cookies_json)
```

- [ ] **Step 3: 测试微博爬虫**

Manual test with a Weibo profile URL.

- [ ] **Step 4: Commit**

```bash
git add backend/app/crawlers/weibo_crawler.py
git commit -m "feat: add Weibo crawler

- Implement Weibo profile crawler
- Use mobile version for easier parsing
- Extract post content and metadata"
```

---

## Task 5: 爬虫任务管理

**Files:**
- Create: `backend/app/tasks/crawler_tasks.py`
- Modify: `backend/app/core/celery_app.py`

- [ ] **Step 1: 创建 Celery Beat 配置**

In `backend/app/core/celery_app.py`, add beat schedule:
```python
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    'check-pending-crawler-tasks': {
        'task': 'app.tasks.crawler_tasks.process_pending_tasks',
        'schedule': 60.0,  # Every 60 seconds
    },
}
```

- [ ] **Step 2: 创建定时任务处理器**

Create `backend/app/tasks/crawler_tasks.py`:
```python
from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.crawler_task import CrawlerTask, TaskStatus
from app.models.crawler_cookie import CrawlerCookie
from app.crawlers.wechat_crawler import WeChatCrawler
from app.crawlers.x_crawler import XCrawler
from app.crawlers.weibo_crawler import WeiboCrawler
from app.services.content_service import create_content_from_crawled
from datetime import datetime
import asyncio


@celery_app.task
def process_pending_tasks():
    """Process pending crawler tasks."""
    db = SessionLocal()
    
    try:
        # Get pending tasks
        pending_tasks = db.query(CrawlerTask).filter(
            CrawlerTask.status == TaskStatus.PENDING
        ).limit(5).all()
        
        for task in pending_tasks:
            # Execute in async context
            asyncio.run(execute_single_task(task.id, db))
            
    finally:
        db.close()


async def execute_single_task(task_id: str, db):
    """Execute a single crawler task."""
    task = db.query(CrawlerTask).filter(CrawlerTask.id == task_id).first()
    if not task:
        return
    
    # Update to running
    task.status = TaskStatus.RUNNING
    task.started_at = datetime.utcnow()
    db.commit()
    
    try:
        # Get cookies
        cookie = db.query(CrawlerCookie).filter(
            CrawlerCookie.user_id == task.user_id,
            CrawlerCookie.platform == task.platform
        ).first()
        
        cookies_json = cookie.cookies_json if cookie else None
        
        # Select crawler
        if task.platform == "wechat":
            crawler = WeChatCrawler(cookies=cookies_json)
        elif task.platform == "x":
            crawler = XCrawler(cookies=cookies_json)
        elif task.platform == "weibo":
            crawler = WeiboCrawler(cookies=cookies_json)
        else:
            raise ValueError(f"Unsupported platform: {task.platform}")
        
        # Crawl
        articles = await crawler.crawl(task.target_url, limit=20)
        task.items_crawled = len(articles)
        
        # Import
        imported = 0
        for article in articles:
            try:
                await create_content_from_crawled(
                    db=db,
                    kb_id=task.knowledge_base_id,
                    platform=task.platform,
                    **article
                )
                imported += 1
            except Exception as e:
                print(f"Failed to import: {e}")
        
        task.items_imported = imported
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.utcnow()
        
    except Exception as e:
        task.status = TaskStatus.FAILED
        task.error_message = str(e)
        task.completed_at = datetime.utcnow()
    
    db.commit()
```

- [ ] **Step 3: 启动 Celery Beat**

Update `docker-compose.yml` to add celery-beat service:
```yaml
celery-beat:
  build: ./backend
  command: celery -A app.core.celery_app beat --loglevel=info
  depends_on:
    - redis
    - postgres
  env_file:
    - ./backend/.env
  volumes:
    - ./backend:/app
```

Run: `docker-compose up -d celery-beat`

- [ ] **Step 4: 测试定时任务**

1. Create a pending task via API
2. Wait 60 seconds
3. Check task status changes to running → completed

- [ ] **Step 5: Commit**

```bash
git add backend/ docker-compose.yml
git commit -m "feat: add crawler task scheduler

- Implement Celery Beat for task processing
- Auto-process pending crawler tasks every 60s
- Add Docker service for celery-beat"
```

---

## Task 6: 前端爬虫配置界面

**Files:**
- Create: `frontend/src/types/crawler.ts`
- Create: `frontend/src/app/(dashboard)/crawlers/page.tsx`
- Create: `frontend/src/components/crawler/task-list.tsx`
- Create: `frontend/src/components/crawler/create-task-dialog.tsx`

- [ ] **Step 1: 创建类型定义**

Create `frontend/src/types/crawler.ts`:
```typescript
export interface CrawlerTask {
  id: string;
  user_id: string;
  knowledge_base_id: string;
  platform: 'wechat' | 'x' | 'weibo' | 'xiaohongshu' | 'bilibili';
  target_url: string;
  target_name?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  items_crawled: number;
  items_imported: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface CrawlerTaskCreate {
  knowledge_base_id: string;
  platform: string;
  target_url: string;
  target_name?: string;
}
```

- [ ] **Step 2: 创建任务列表组件**

Create `frontend/src/components/crawler/task-list.tsx`:
```typescript
import { CrawlerTask } from '@/types/crawler';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';

interface TaskListProps {
  tasks: CrawlerTask[];
}

const statusConfig = {
  pending: { icon: Clock, color: 'bg-gray-500', label: '等待中' },
  running: { icon: Loader2, color: 'bg-blue-500', label: '运行中' },
  completed: { icon: CheckCircle, color: 'bg-green-500', label: '完成' },
  failed: { icon: XCircle, color: 'bg-red-500', label: '失败' },
};

export function TaskList({ tasks }: TaskListProps) {
  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const status = statusConfig[task.status];
        const Icon = status.icon;
        
        return (
          <Card key={task.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{task.platform}</Badge>
                    <Badge className={status.color}>
                      <Icon className={`h-3 w-3 mr-1 ${task.status === 'running' ? 'animate-spin' : ''}`} />
                      {status.label}
                    </Badge>
                  </div>
                  
                  <p className="font-medium">{task.target_name || task.target_url}</p>
                  <p className="text-sm text-gray-500 truncate">{task.target_url}</p>
                  
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>抓取: {task.items_crawled}</span>
                    <span>导入: {task.items_imported}</span>
                  </div>
                  
                  {task.error_message && (
                    <p className="text-sm text-red-500 mt-2">{task.error_message}</p>
                  )}
                </div>
                
                <div className="text-right text-sm text-gray-500">
                  {new Date(task.created_at).toLocaleString('zh-CN')}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: 创建任务创建对话框**

Create `frontend/src/components/crawler/create-task-dialog.tsx`:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KnowledgeBase } from '@/types/knowledge-base';
import apiClient from '@/lib/api-client';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const platforms = [
  { value: 'wechat', label: '微信公众号' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'weibo', label: '微博' },
];

export function CreateTaskDialog({ open, onOpenChange, onCreated }: CreateTaskDialogProps) {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [formData, setFormData] = useState({
    knowledge_base_id: '',
    platform: '',
    target_url: '',
    target_name: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchKnowledgeBases();
    }
  }, [open]);

  const fetchKnowledgeBases = async () => {
    try {
      const response = await apiClient.get<KnowledgeBase[]>('/knowledge-bases');
      setKbs(response.data);
    } catch (error) {
      console.error('Failed to fetch KBs:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.post('/crawlers/tasks', formData);
      onCreated();
      onOpenChange(false);
      setFormData({ knowledge_base_id: '', platform: '', target_url: '', target_name: '' });
    } catch (error: any) {
      alert(error.response?.data?.detail || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建爬虫任务</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>知识库</Label>
            <Select
              value={formData.knowledge_base_id}
              onValueChange={(value) => setFormData({ ...formData, knowledge_base_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择知识库" />
              </SelectTrigger>
              <SelectContent>
                {kbs.map((kb) => (
                  <SelectItem key={kb.id} value={kb.id}>
                    {kb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>平台</Label>
            <Select
              value={formData.platform}
              onValueChange={(value) => setFormData({ ...formData, platform: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择平台" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>目标 URL</Label>
            <Input
              value={formData.target_url}
              onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
              placeholder="例如: https://x.com/username"
              required
            />
          </div>

          <div>
            <Label>目标名称（可选）</Label>
            <Input
              value={formData.target_name}
              onChange={(e) => setFormData({ ...formData, target_name: e.target.value })}
              placeholder="账号名称"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? '创建中...' : '开始爬取'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: 创建爬虫页面**

Create `frontend/src/app/(dashboard)/crawlers/page.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TaskList } from '@/components/crawler/task-list';
import { CreateTaskDialog } from '@/components/crawler/create-task-dialog';
import { CrawlerTask } from '@/types/crawler';
import apiClient from '@/lib/api-client';
import { Plus, RefreshCw } from 'lucide-react';

export default function CrawlersPage() {
  const [tasks, setTasks] = useState<CrawlerTask[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await apiClient.get<CrawlerTask[]>('/crawlers/tasks');
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">爬虫任务</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTasks}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新建任务
          </Button>
        </div>
      </div>

      {loading ? (
        <p>加载中...</p>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">还没有爬虫任务</p>
        </div>
      ) : (
        <TaskList tasks={tasks} />
      )}

      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchTasks}
      />
    </div>
  );
}
```

- [ ] **Step 5: 添加导航链接**

In dashboard layout, add crawler link to navigation.

- [ ] **Step 6: 测试前端**

1. 访问爬虫页面
2. 创建新任务
3. 查看任务状态更新

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: add crawler management UI

- Create crawler tasks page
- Add task creation dialog
- Display task status with auto-refresh
- Support WeChat, X, and Weibo platforms"
```

---

## Task 7: Phase 2 集成测试

**Files:**
- Create: `backend/tests/test_crawlers_integration.py`
- Modify: `README.md`

- [ ] **Step 1: 编写集成测试**

Create `backend/tests/test_crawlers_integration.py`:
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_crawler_workflow():
    """Test: login → create task → check status."""
    
    # Login
    client.post("/api/v1/auth/register", json={
        "email": "crawler_test@test.com",
        "password": "pass123"
    })
    
    login_response = client.post("/api/v1/auth/login", json={
        "email": "crawler_test@test.com",
        "password": "pass123"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create KB
    kb_response = client.post(
        "/api/v1/knowledge-bases",
        headers=headers,
        json={"name": "Crawler Test KB"}
    )
    kb_id = kb_response.json()["id"]
    
    # Create crawler task
    task_response = client.post(
        "/api/v1/crawlers/tasks",
        headers=headers,
        json={
            "knowledge_base_id": kb_id,
            "platform": "wechat",
            "target_url": "https://mp.weixin.qq.com/s/test",
            "target_name": "Test Account"
        }
    )
    assert task_response.status_code == 201
    task_id = task_response.json()["id"]
    
    # Get task status
    status_response = client.get(f"/api/v1/crawlers/tasks/{task_id}", headers=headers)
    assert status_response.status_code == 200
    assert status_response.json()["platform"] == "wechat"
    
    # List tasks
    list_response = client.get("/api/v1/crawlers/tasks", headers=headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) >= 1
```

- [ ] **Step 2: 运行测试**

Run: `cd backend && pytest tests/test_crawlers_integration.py -v`

- [ ] **Step 3: 更新文档**

Update `README.md` with crawler feature documentation.

- [ ] **Step 4: Commit and tag**

```bash
git add .
git commit -m "test: add crawler integration tests

- Test crawler task creation workflow
- Verify task status tracking
- Complete Phase 2"

git tag -a v0.2.0-phase2 -m "Phase 2 Crawlers release

Features:
- WeChat Official Account crawler
- X (Twitter) crawler
- Weibo crawler
- Crawler task management
- Cookie storage for auth
- Celery Beat scheduler
- Frontend task management UI"
```

---

## Phase 2 完成！

**交付成果:**
- 3 个平台爬虫（微信、X、微博）
- 爬虫任务管理系统
- Cookie 存储与认证
- Celery Beat 定时调度
- 前端任务管理界面

**下一步:** 进入 Phase 3（高级功能）

