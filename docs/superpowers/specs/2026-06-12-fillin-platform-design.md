# Fillin - AI驱动的多平台内容聚合与知识管理平台设计文档

## 1. 项目概述

### 1.1 项目定位
Fillin是一个面向C端用户的SaaS产品，旨在聚合微信公众号、X(Twitter)、微博、小红书、B站等多个平台的内容，通过AI技术提供智能问答和内容生成功能，帮助用户高效管理和利用信息。

### 1.2 目标用户
- 个人用户：需要管理多平台内容消费的知识工作者
- 内容创作者：需要素材收集和灵感来源
- 研究人员：需要跨平台信息聚合和分析

### 1.3 核心价值
- 多平台内容一站式聚合
- AI驱动的智能问答和知识提取
- 基于知识库的内容生成
- 灵活的知识组织和管理

---

## 2. 技术架构

### 2.1 技术选型

**前端技术栈**
- Next.js 14 (TypeScript, App Router)
- TailwindCSS + shadcn/ui
- React Query (数据获取和缓存)
- Zustand (状态管理)

**后端技术栈**
- FastAPI (Python 3.11+)
- SQLAlchemy (ORM)
- Alembic (数据库迁移)
- Pydantic (数据验证)

**任务队列**
- Celery (异步任务执行)
- Celery Beat (定时任务调度)
- Redis (消息队列和缓存)

**数据存储**
- PostgreSQL (主数据库)
- Qdrant (向量数据库)
- Redis (缓存)

**AI/LLM**
- LangChain (LLM应用框架)
- LangGraph (Agent编排)
- OpenAI API / Anthropic API

**爬虫技术**
- Playwright (浏览器自动化)
- BeautifulSoup4 (HTML解析)
- Requests / aiohttp (HTTP请求)

**部署方案**
- Docker + Docker Compose
- 容器化部署所有服务

### 2.2 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         用户端                                │
│                   Next.js 14 (TypeScript)                    │
│  ┌────────────┬────────────┬────────────┬─────────────┐     │
│  │  内容采集  │  知识库    │  AI问答    │   内容生成   │     │
│  │  管理页面  │  管理页面  │  页面      │   页面       │     │
│  └────────────┴────────────┴────────────┴─────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    后端API层 (FastAPI)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  认证模块  │  用户管理  │  知识库API  │  AI服务API  │   │
│  │  (JWT)     │  (积分)    │            │             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │              │                │              │
         ▼              ▼                ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────┐
│ PostgreSQL  │  │   Redis     │  │   Qdrant     │  │ Celery  │
│  (主数据库) │  │ (缓存/队列) │  │ (向量数据库) │  │ Worker  │
└─────────────┘  └─────────────┘  └──────────────┘  └─────────┘
                                                           │
                                         ┌─────────────────┤
                                         ▼                 ▼
                              ┌──────────────────┐  ┌──────────────┐
                              │  爬虫任务模块    │  │  AI任务模块  │
                              │  - 微信公众号    │  │  - RAG问答   │
                              │  - X/微博/小红书 │  │  - 内容生成  │
                              │  - B站视频       │  │  - 向量化    │
                              └──────────────────┘  └──────────────┘
```

### 2.3 数据流向

**内容采集流程**
```
用户发起采集请求 → API接收 → 创建Celery任务 → Worker执行爬虫 
→ 保存内容到PostgreSQL → 向量化内容 → 存入Qdrant → 通知用户完成
```

**AI问答流程**
```
用户提问 → API接收 → 从Qdrant检索相关内容 → 调用LLM生成答案 
→ 扣除积分 → 返回答案和引用源 → 保存对话历史
```

**内容生成流程**
```
用户请求生成 → API接收 → 从知识库提取内容 → LangGraph Agent编排 
→ 调用LLM生成文章 → 保存草稿 → 返回预览
```

---

## 3. 数据库设计

### 3.1 PostgreSQL 表结构

#### users 表（用户基础信息）
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    username VARCHAR(100),
    avatar_url TEXT,
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    credits INTEGER DEFAULT 0,
    api_key TEXT,
    api_provider VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### credit_transactions 表（积分交易记录）
```sql
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type VARCHAR(50),
    description TEXT,
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### knowledge_bases 表（知识库）
```sql
CREATE TABLE knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    qdrant_collection_name VARCHAR(255) UNIQUE,
    content_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### contents 表（内容条目）
```sql
CREATE TABLE contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_html TEXT,
    source_platform VARCHAR(50),
    source_url TEXT,
    author VARCHAR(255),
    published_at TIMESTAMP,
    metadata JSONB,
    is_vectorized BOOLEAN DEFAULT FALSE,
    vector_ids TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### crawl_tasks 表（爬虫任务）
```sql
CREATE TABLE crawl_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE SET NULL,
    platform VARCHAR(50) NOT NULL,
    task_type VARCHAR(50),
    config JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    celery_task_id VARCHAR(255),
    result JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### scheduled_crawls 表（定时爬虫配置）
```sql
CREATE TABLE scheduled_crawls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    config JSONB NOT NULL,
    cron_expression VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### conversations 表（对话会话）
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    knowledge_base_ids UUID[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### messages 表（对话消息）
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    sources JSONB,
    token_count INTEGER,
    credits_used INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### generated_articles 表（生成的文章）
```sql
CREATE TABLE generated_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE SET NULL,
    title VARCHAR(500),
    content TEXT NOT NULL,
    content_html TEXT,
    prompt TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    credits_used INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### tags 表（标签）
```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE TABLE content_tags (
    content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (content_id, tag_id)
);
```

### 3.2 Qdrant 向量数据库设计

**Collection 命名规则**
- 每个知识库对应一个独立的Collection
- 命名格式: `kb_{knowledge_base_id}`

**向量配置**
```python
{
    "vector_size": 1536,  # OpenAI text-embedding-3-small
    "distance": "Cosine",
    "payload_schema": {
        "content_id": "uuid",
        "chunk_index": "integer",
        "text": "text",
        "metadata": {
            "title": "text",
            "author": "text",
            "platform": "keyword",
            "published_at": "datetime",
            "url": "text"
        }
    }
}
```

---

## 4. 核心功能模块设计

### 4.1 用户认证与积分系统

#### 认证方式

**邮箱注册/登录**
- 密码使用bcrypt加密
- 注册时赠送初始积分(100)
- JWT token认证(access + refresh)

**Google OAuth登录**
- 使用authlib库实现
- 自动创建或关联用户账号
- 同样赠送初始积分

**JWT Token设计**
```python
{
    "access_token": {
        "user_id": "uuid",
        "email": "user@example.com",
        "exp": 15分钟
    },
    "refresh_token": {
        "user_id": "uuid",
        "exp": 7天
    }
}
```

#### 积分系统

**消耗规则**
- 微信公众号单篇: 1积分
- X/微博/小红书单条: 0.5积分
- B站视频(含字幕转写): 3积分
- AI问答: 按token计费(输入0.01/1k, 输出0.02/1k)
- 内容生成: 10-50积分(根据长度)
- 使用自己API Key: 免费或50%折扣

**获取方式**
- 注册赠送: 100积分
- 邀请用户: 50积分/人
- 充值购买:
  - 100积分 = ¥10
  - 500积分 = ¥40
  - 1000积分 = ¥70

### 4.2 内容采集模块

#### 统一采集接口
```python
POST /api/crawl/tasks
{
    "platform": "wechat",
    "knowledge_base_id": "uuid",
    "config": {
        "account": "公众号名称",
        "article_urls": ["url1", "url2"],
        "keywords": ["关键词"],
        "count": 10
    },
    "is_scheduled": false
}
```

#### 各平台爬虫实现

**微信公众号**
- 使用Playwright + Selenium
- 参考项目: wechat-article-exporter
- 提取标题、内容、作者、发布时间、图片

**X (Twitter)**
- 使用官方API或第三方接口
- 提取推文内容、作者、时间、图片

**微博**
- 使用移动端API (m.weibo.cn)
- 处理长图文和多图

**小红书**
- 使用Playwright模拟浏览器
- 反爬策略: 随机延迟、User-Agent轮换

**B站视频**
- 使用bilibili-api-python库
- 检查字幕文件，无字幕则使用Whisper转写

#### 任务管理

**状态机**
```
pending → running → completed
                 → failed
```

**失败重试**
- 最多重试3次
- 指数退避策略
- 记录错误信息

**定时任务**
- 使用Celery Beat
- 每5分钟检查scheduled_crawls表
- 自动创建爬虫任务

### 4.3 知识库与内容管理

#### 知识库操作

**创建知识库**
1. 创建knowledge_bases记录
2. 在Qdrant创建对应collection
3. collection名称: kb_{uuid}

**删除知识库**
1. 删除knowledge_bases记录(cascade删除contents)
2. 删除Qdrant中的collection
3. 清理相关crawl_tasks和conversations

#### 内容向量化

**向量化流程**
1. 文本分块(RecursiveCharacterTextSplitter)
   - chunk_size=1000
   - chunk_overlap=200
2. 生成embedding(OpenAI text-embedding-3-small)
3. 存入Qdrant
4. 更新contents表is_vectorized字段

### 4.4 AI问答模块

#### RAG问答流程

```python
async def answer_question(question, kb_ids, user):
    # 1. 检查积分余额
    # 2. 向量检索(top_k=5)
    # 3. 构建prompt
    # 4. 调用LLM
    # 5. 扣除积分
    # 6. 保存消息
    # 7. 返回答案和引用源
```

#### 引用溯源

返回格式:
```json
{
    "answer": "AI的发展历经三次浪潮...",
    "sources": [
        {
            "content_id": "uuid",
            "title": "人工智能简史",
            "chunk_text": "...相关段落...",
            "url": "https://...",
            "relevance_score": 0.85
        }
    ],
    "credits_used": 5
}
```

### 4.5 内容生成模块

#### LangGraph Agent实现

**节点设计**
1. `outline`: 创建文章大纲
2. `research`: 从知识库检索相关内容
3. `write`: 生成文章各个章节
4. `review`: 审阅文章质量
5. 条件边: 决定是否需要修订

**生成流程**
```
用户提示 → 生成大纲 → 检索内容 → 写作章节 → 审阅 
→ [需要修订: 返回写作] 或 [完成: 返回文章]
```

---

## 5. 项目结构

### 5.1 后端结构 (FastAPI)
```
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── dependencies.py
│   ├── api/v1/
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── knowledge_bases.py
│   │   ├── contents.py
│   │   ├── crawl.py
│   │   ├── conversations.py
│   │   └── articles.py
│   ├── core/
│   │   ├── security.py
│   │   ├── credits.py
│   │   └── permissions.py
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── crawlers/
│   │   ├── base.py
│   │   ├── wechat.py
│   │   ├── twitter.py
│   │   ├── weibo.py
│   │   ├── xiaohongshu.py
│   │   └── bilibili.py
│   ├── tasks/
│   │   ├── celery_app.py
│   │   ├── crawl_tasks.py
│   │   ├── vector_tasks.py
│   │   └── ai_tasks.py
│   ├── db/
│   └── utils/
├── tests/
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

### 5.2 前端结构 (Next.js)
```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   └── (dashboard)/
│   │       ├── knowledge-bases/
│   │       ├── crawl/
│   │       ├── conversations/
│   │       ├── articles/
│   │       └── settings/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── knowledge-base/
│   │   ├── crawl/
│   │   ├── conversation/
│   │   └── article/
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   ├── hooks/
│   ├── types/
│   └── stores/
├── public/
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.js
```

---

## 6. 部署方案

### 6.1 Docker Compose配置

**服务组件**
- frontend: Next.js应用
- backend: FastAPI应用
- celery-worker: 异步任务执行
- celery-beat: 定时任务调度
- postgres: PostgreSQL数据库
- redis: Redis缓存和消息队列
- qdrant: Qdrant向量数据库

### 6.2 服务器要求

**最低配置(MVP)**
- CPU: 4核
- 内存: 8GB
- 硬盘: 100GB SSD
- 网络: 5Mbps

**推荐配置(生产)**
- CPU: 8核
- 内存: 16GB
- 硬盘: 200GB SSD
- 网络: 10Mbps

### 6.3 开发流程

```bash
# 启动所有服务
docker-compose up -d

# 初始化数据库
docker-compose exec backend alembic upgrade head

# 访问
# 前端: http://localhost:3000
# 后端API文档: http://localhost:8000/docs
# Qdrant: http://localhost:6333/dashboard
```

---

## 7. MVP迭代计划

### Phase 1: MVP核心 (4-6周)
1. **用户系统**
   - 邮箱注册/登录
   - JWT认证
   - 用户信息管理

2. **知识库基础功能**
   - 创建/查看/删除知识库
   - 手动添加内容(文本/链接)
   - 内容列表展示

3. **基础AI问答**
   - 单知识库RAG问答
   - 对话历史保存
   - 基础引用溯源

4. **积分系统**
   - 积分扣除逻辑
   - 交易记录查询
   - 简单充值功能

### Phase 2: 爬虫功能 (3-4周)
5. **微信公众号爬虫**
   - 单篇文章采集
   - 图片下载保存

6. **X/微博爬虫**
   - 基础内容采集
   - 文本提取

7. **手动触发爬取**
   - 任务创建界面
   - 任务状态查看
   - 失败重试

### Phase 3: 增强功能 (3-4周)
8. **多知识库问答**
   - 支持选择多个知识库
   - 组合检索优化

9. **定时爬虫**
   - 定时任务配置
   - Cron表达式支持

10. **内容生成**
    - LangGraph Agent实现
    - 文章生成和预览
    - Markdown导出

11. **Google OAuth登录**
    - OAuth集成
    - 账号关联

### Phase 4: 完善体验 (2-3周)
12. **小红书、B站爬虫**
    - 小红书笔记采集
    - B站视频字幕转写

13. **标签系统**
    - 标签创建和管理
    - 内容打标签
    - 按标签筛选

14. **导入导出功能**
    - 批量导入内容
    - 知识库导出(Markdown/PDF)

15. **用户自定义API Key**
    - API Key配置界面
    - 切换使用自己的API
    - 成本统计

---

## 8. 变现策略

### 8.1 免费版
- 基础内容采集
- 有限存储(100条内容)
- 有限AI调用(100积分/月)
- 单个知识库

### 8.2 付费版

**个人版 (¥29/月)**
- 无限内容存储
- 500积分/月
- 5个知识库
- 定时爬虫
- 基础内容生成

**专业版 (¥99/月)**
- 无限内容存储
- 2000积分/月
- 无限知识库
- 高级AI功能
- 优先支持

**企业版 (定制)**
- 按需定制
- API访问
- 私有部署选项

### 8.3 积分充值
- 100积分 = ¥10 (¥0.10/积分)
- 500积分 = ¥40 (¥0.08/积分)
- 1000积分 = ¥70 (¥0.07/积分)

---

## 9. 风险与挑战

### 9.1 技术风险
- **爬虫反爬**: 各平台反爬机制升级
  - 应对: 多种爬取方式备选,代理池,延迟策略
  
- **AI成本**: LLM调用成本随用户增长
  - 应对: 鼓励用户使用自己API Key,优化prompt减少token消耗

- **向量检索性能**: 大规模数据检索变慢
  - 应对: Qdrant集群部署,索引优化

### 9.2 法律风险
- **内容版权**: 爬取的内容可能涉及版权
  - 应对: 仅供个人使用,不公开分享,添加免责声明

- **平台ToS**: 违反平台服务条款
  - 应对: 用户自行承担责任,提供官方API接入选项

### 9.3 运营风险
- **用户留存**: 用户使用频率低
  - 应对: 定时推送内容摘要,提供价值提醒

- **竞争压力**: 类似产品出现
  - 应对: 快速迭代,差异化功能,社区建设

---

## 10. 后续扩展方向

### 10.1 功能扩展
- 团队协作功能
- 知识库分享和订阅
- 移动端APP
- 浏览器插件(快速保存)

### 10.2 平台扩展
- YouTube视频字幕
- Medium/Substack文章
- GitHub仓库文档
- Notion/飞书文档同步

### 10.3 AI能力扩展
- 多模态支持(图片理解)
- 实时语音问答
- 知识图谱构建
- 个性化推荐

---

## 11. 总结

Fillin项目通过技术架构上的前后端分离、容器化部署,功能设计上的渐进式MVP迭代,以及商业模式上的免费+付费+积分组合,为C端用户提供了一个完整的多平台内容聚合和AI驱动的知识管理解决方案。

核心竞争力在于:
1. 多平台内容一站式聚合
2. 灵活的知识库组织方式
3. 准确的RAG问答和引用溯源
4. 基于LangGraph的智能内容生成

通过MVP快速验证市场需求,再根据用户反馈迭代优化,最终形成可持续的商业模式。
