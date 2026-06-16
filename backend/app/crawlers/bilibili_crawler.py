from app.crawlers import BaseCrawler
from typing import List, Dict
import re
import httpx


class BilibiliCrawler(BaseCrawler):
    """Crawler for Bilibili user videos via API."""

    def validate_url(self, url: str) -> bool:
        return "space.bilibili.com" in url or bool(re.match(r"^\d+$", url))

    async def crawl(self, target_url: str, limit: int = 10) -> List[Dict]:
        if not self.validate_url(target_url):
            raise ValueError(f"Invalid Bilibili URL: {target_url}")

        mid = self._extract_mid(target_url)
        if not mid:
            raise ValueError(f"Cannot extract user ID from: {target_url}")

        return await self._crawl_user_videos(mid, limit)

    def _extract_mid(self, url: str) -> str:
        match = re.search(r"space\.bilibili\.com/(\d+)", url)
        if match:
            return match.group(1)
        if re.match(r"^\d+$", url):
            return url
        return ""

    async def _crawl_user_videos(self, mid: str, limit: int) -> List[Dict]:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Referer": f"https://space.bilibili.com/{mid}/video",
        }
        if self.cookies:
            headers["Cookie"] = self.cookies

        api_url = f"https://api.bilibili.com/x/space/wbi/arc/search?mid={mid}&ps={limit}&pn=1"

        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(api_url, headers=headers)

        if resp.status_code != 200:
            return []

        try:
            data = resp.json()
        except Exception:
            return []

        if data.get("code") != 0:
            return []

        vlist = data.get("data", {}).get("list", {}).get("vlist", [])
        posts = []

        for video in vlist[:limit]:
            bvid = video.get("bvid", "")
            title = video.get("title", "")
            description = video.get("description", "")
            created = video.get("created", 0)

            video_url = f"https://www.bilibili.com/video/{bvid}" if bvid else ""

            content_parts = []
            if title:
                content_parts.append(f"标题: {title}")
            if description:
                content_parts.append(f"简介: {description}")

            posts.append({
                "title": title or "Untitled",
                "content": "\n".join(content_parts),
                "url": video_url,
                "published_at": str(created) if created else "",
            })

        return posts
