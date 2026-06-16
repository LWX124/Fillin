from app.crawlers import BaseCrawler
from typing import List, Dict
import re
import httpx


class WeiboCrawler(BaseCrawler):
    def validate_url(self, url: str) -> bool:
        pattern = r"weibo\.(com|cn)/(u/)?\d+"
        return bool(re.search(pattern, url))

    async def crawl(self, target_url: str, limit: int = 10) -> List[Dict]:
        if not self.validate_url(target_url):
            raise ValueError(f"Invalid Weibo URL: {target_url}")

        # Extract UID
        uid_match = re.search(r"(\d{5,})", target_url)
        if not uid_match:
            return []
        uid = uid_match.group(1)

        headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
            "Referer": "https://m.weibo.cn/",
            "X-Requested-With": "XMLHttpRequest",
        }
        if self.cookies:
            headers["Cookie"] = self.cookies

        api_url = f"https://m.weibo.cn/api/container/getIndex?type=uid&value={uid}&containerid=107603{uid}"

        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            try:
                resp = await client.get(api_url, headers=headers)
            except Exception:
                return []

        if resp.status_code != 200:
            return []

        posts = []
        try:
            data = resp.json()
            cards = data.get("data", {}).get("cards", [])
        except Exception:
            return []

        for card in cards:
            if len(posts) >= limit:
                break
            if card.get("card_type") != 9:
                continue

            mblog = card.get("mblog", {})
            text = mblog.get("text", "")
            text = re.sub(r"<[^>]+>", "", text).strip()

            if not text or len(text) < 10:
                continue

            created_at = mblog.get("created_at", "")
            mid = mblog.get("mid", "")
            post_url = f"https://m.weibo.cn/detail/{mid}" if mid else ""

            posts.append({
                "title": text[:100] + "..." if len(text) > 100 else text,
                "content": text,
                "url": post_url,
                "published_at": created_at,
            })

        return posts
