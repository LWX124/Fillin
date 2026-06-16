from app.crawlers import BaseCrawler
from typing import List, Dict
import re
from datetime import datetime
import httpx


class WeChatCrawler(BaseCrawler):
    def validate_url(self, url: str) -> bool:
        return "mp.weixin.qq.com" in url or bool(re.match(r"^[\w一-鿿]+$", url))

    async def crawl(self, target_url: str, limit: int = 10) -> List[Dict]:
        if not self.validate_url(target_url):
            raise ValueError(f"Invalid WeChat URL or account: {target_url}")

        if "mp.weixin.qq.com" in target_url:
            return await self._crawl_article(target_url)

        return []

    async def _crawl_article(self, article_url: str) -> List[Dict]:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        if self.cookies:
            headers["Cookie"] = self.cookies

        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(article_url, headers=headers)

        if resp.status_code != 200:
            return []

        html = resp.text
        title = self._extract_between(html, '<h1 class="rich_media_title"', "</h1>")
        if not title:
            title = self._extract_between(html, "var msg_title = '", "';")

        content = self._extract_between(html, '<div class="rich_media_content"', "</div>")
        content = re.sub(r"<[^>]+>", "", content or "")

        if not title and not content:
            return []

        return [{
            "title": (title or "Untitled").strip(),
            "content": content.strip() if content else "",
            "url": article_url,
            "published_at": datetime.now().isoformat(),
        }]

    @staticmethod
    def _extract_between(html: str, start: str, end: str) -> str:
        idx = html.find(start)
        if idx == -1:
            return ""
        idx = html.find(">", idx) + 1
        end_idx = html.find(end, idx)
        if end_idx == -1:
            return ""
        return html[idx:end_idx]
