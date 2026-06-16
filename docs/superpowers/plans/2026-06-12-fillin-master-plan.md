# Fillin 完整实施计划 - 主索引

> **项目概述:** Fillin是一个AI驱动的多平台内容聚合与知识管理平台，面向C端用户提供内容采集、知识库管理、AI问答和内容生成功能。

**设计文档:** [docs/superpowers/specs/2026-06-12-fillin-platform-design.md](../specs/2026-06-12-fillin-platform-design.md)

**技术栈:** FastAPI + Next.js 14 + PostgreSQL + Qdrant + Redis + Docker

**预计总工期:** 12-17周

---

## 实施计划结构

本项目采用分阶段迭代开发，每个Phase都会产出可测试、可部署的工作软件。

### Phase 1: MVP核心功能 (4-6周)
**计划文件:** [2026-06-12-fillin-phase1-mvp.md](./2026-06-12-fillin-phase1-mvp.md)

**目标:** 构建核心MVP，验证产品价值

**功能模块:**
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

**交付物:**
- 可运行的前后端应用
- Docker Compose部署环境
- 基础功能测试套件
- API文档

**关键里程碑:**
- Week 1-2: 项目搭建、用户认证、数据库模型
- Week 3-4: 知识库管理、内容添加
- Week 4-5: RAG问答实现、向量化
- Week 5-6: 积分系统、前端界面完善

---

### Phase 2: 爬虫功能 (3-4周)
**计划文件:** [2026-06-12-fillin-phase2-crawlers.md](./2026-06-12-fillin-phase2-crawlers.md)

**目标:** 实现多平台内容自动采集

**功能模块:**
1. **微信公众号爬虫**
   - 单篇文章采集
   - 图片下载保存
   - 内容解析和清洗

2. **X/微博爬虫**
   - 基础内容采集
   - 文本和图片提取
   - 反爬策略处理

3. **手动触发爬取**
   - 任务创建界面
   - 任务状态查看
   - 失败重试机制

4. **Celery任务队列**
   - Worker配置
   - 任务监控
   - 错误处理

**交付物:**
- 3个平台的爬虫模块
- 任务队列系统
- 爬虫管理界面
- 爬虫测试和文档

**关键里程碑:**
- Week 1: Celery配置、基础爬虫框架
- Week 2: 微信公众号爬虫
- Week 3: X和微博爬虫
- Week 4: 前端界面、测试和优化

---

### Phase 3: 增强功能 (3-4周)
**计划文件:** [2026-06-12-fillin-phase3-advanced.md](./2026-06-12-fillin-phase3-advanced.md)

**目标:** 增强AI能力和用户体验

**功能模块:**
1. **多知识库问答**
   - 支持选择多个知识库
   - 组合检索优化
   - 跨库引用溯源

2. **定时爬虫**
   - 定时任务配置
   - Cron表达式支持
   - Celery Beat调度

3. **内容生成**
   - LangGraph Agent实现
   - 文章生成和预览
   - Markdown导出

4. **Google OAuth登录**
   - OAuth集成
   - 账号关联
   - 第三方登录流程

**交付物:**
- 多知识库检索系统
- 定时任务调度器
- 内容生成Agent
- OAuth认证集成

**关键里程碑:**
- Week 1: 多知识库问答、定时任务
- Week 2: LangGraph Agent设计和实现
- Week 3: Google OAuth、内容生成界面
- Week 4: 测试、优化、文档

---

### Phase 4: 完善体验 (2-3周)
**计划文件:** [2026-06-12-fillin-phase4-polish.md](./2026-06-12-fillin-phase4-polish.md)

**目标:** 完善功能、优化体验

**功能模块:**
1. **小红书、B站爬虫**
   - 小红书笔记采集
   - B站视频字幕转写
   - Whisper集成

2. **标签系统**
   - 标签创建和管理
   - 内容打标签
   - 按标签筛选

3. **导入导出功能**
   - 批量导入内容
   - 知识库导出(Markdown/PDF)
   - 数据迁移工具

4. **用户自定义API Key**
   - API Key配置界面
   - 切换使用自己的API
   - 成本统计和展示

**交付物:**
- 5个平台完整爬虫支持
- 标签管理系统
- 导入导出工具
- API Key管理功能

**关键里程碑:**
- Week 1: 小红书和B站爬虫
- Week 2: 标签系统、导入导出
- Week 3: API Key管理、UI/UX优化

---

## 开发规范

### 代码规范
- **Python:** PEP 8, Type hints, Docstrings
- **TypeScript:** ESLint, Prettier
- **Git:** Conventional Commits

### 测试规范
- **后端:** Pytest, 单元测试覆盖率 > 80%
- **前端:** Jest + React Testing Library
- **集成测试:** 关键流程端到端测试

### 提交规范
- TDD开发流程: 测试 → 实现 → 重构
- 小步提交: 每个功能点独立commit
- Commit格式: `type(scope): message`
  - feat: 新功能
  - fix: 修复bug
  - test: 添加测试
  - refactor: 重构
  - docs: 文档
  - chore: 构建/工具

### 分支策略
- `main`: 稳定版本
- `develop`: 开发分支
- `feature/xxx`: 功能分支
- `phase-N`: 阶段分支

---

## 环境准备

### 开发环境要求
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (通过Docker)
- Redis 7 (通过Docker)
- Qdrant (通过Docker)

### IDE推荐配置
- VSCode + Python + Pylance
- VSCode + ESLint + Prettier
- .editorconfig统一编码风格

### 必需的API Key
- OpenAI API Key (用于embedding和LLM)
- (可选) Google OAuth credentials

---

## 风险管理

### 技术风险
1. **爬虫反爬**: 准备多种策略(代理池、延迟、User-Agent轮换)
2. **AI成本**: 监控token消耗,优化prompt
3. **向量检索性能**: 索引优化,分批处理

### 进度风险
1. **依赖阻塞**: 模块解耦,并行开发
2. **需求变更**: 敏捷迭代,快速调整
3. **技术债务**: 定期重构,代码审查

---

## 后续工作

完成MVP后的扩展方向:

1. **性能优化**
   - 缓存策略优化
   - 数据库索引优化
   - 前端性能优化

2. **功能增强**
   - 移动端支持
   - 浏览器插件
   - 更多平台支持

3. **商业化**
   - 支付集成
   - 订阅管理
   - 用户数据分析

---

## 开始实施

**推荐执行顺序:**
1. 阅读设计文档了解整体架构
2. 从Phase 1开始逐步实施
3. 每个Phase完成后进行验收测试
4. 持续集成和部署

**执行工具:**
- 使用 `superpowers:subagent-driven-development` 逐任务执行
- 或使用 `superpowers:executing-plans` 批量执行

**准备就绪？** 从 [Phase 1 计划](./2026-06-12-fillin-phase1-mvp.md) 开始！
