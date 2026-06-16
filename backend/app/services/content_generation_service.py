from typing import List, Dict
from openai import OpenAI

from app.core.config import settings
from app.services.vectorization import search_similar


def _get_llm_client() -> OpenAI:
    return OpenAI(api_key=settings.OPENAI_API_KEY, base_url=settings.LLM_BASE_URL)


def _retrieve_research(kb_collection_names: List[str], topic: str, limit: int = 10) -> str:
    all_chunks = []
    per_kb_limit = max(3, limit // len(kb_collection_names)) if kb_collection_names else limit
    for collection_name in kb_collection_names:
        try:
            results = search_similar(collection_name, topic, limit=per_kb_limit)
            all_chunks.extend(results)
        except Exception:
            pass
    all_chunks.sort(key=lambda x: x["score"], reverse=True)
    top = all_chunks[:limit]
    return "\n\n".join(chunk["text"] for chunk in top)


def generate_content(
    kb_collection_names: List[str],
    topic: str,
    content_type: str = "article",
) -> Dict:
    client = _get_llm_client()
    model = settings.LLM_MODEL

    research_data = _retrieve_research(kb_collection_names, topic)

    outline_resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "你是一个专业的内容策划师。"},
            {"role": "user", "content": f"基于以下参考资料，为主题「{topic}」创建一个{content_type}的大纲。\n\n参考资料：\n{research_data[:3000]}\n\n请输出结构化的大纲（使用 markdown 格式）。"},
        ],
        max_tokens=1024,
    )
    outline = outline_resp.choices[0].message.content

    write_resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "你是一个专业的内容创作者。"},
            {"role": "user", "content": f"基于以下大纲和参考资料，撰写完整的{content_type}。\n\n主题：{topic}\n\n大纲：\n{outline}\n\n参考资料：\n{research_data[:4000]}\n\n要求：\n1. 内容充实，逻辑清晰\n2. 使用 markdown 格式\n3. 适当引用参考资料\n4. 字数在 1000-2000 字之间"},
        ],
        max_tokens=2048,
    )
    content = write_resp.choices[0].message.content

    total_tokens = 0
    if outline_resp.usage:
        total_tokens += outline_resp.usage.total_tokens
    if write_resp.usage:
        total_tokens += write_resp.usage.total_tokens

    return {
        "content": content,
        "outline": outline,
        "token_count": total_tokens,
    }
