from app.crawlers import BaseCrawler
from typing import List, Dict
import re
import httpx


class XiaohongshuCrawler(BaseCrawler):
    """Crawler for Xiaohongshu (Little Red Book) posts via mobile API."""

    def validate_url(self, url: str) -> bool:
        return "xiaohongshu.com" in url or bool(re.match(r"^[a-f0-9]{24}$", url))

    async def crawl(self, target_url: str, limit: int = 10) -> List[Dict]:
        if not self.validate_url(target_url):
            raise ValueError(f"Invalid Xiaohongshu URL: {target_url}")

        user_id = self._extract_user_id(target_url)
        if not user_id:
            return await self._crawl_single_note(target_url)

        return await self._crawl_user_notes(user_id, limit)

    def _extract_user_id(self, url: str) -> str:
        match = re.search(r"user/profile/([a-f0-9]+)", url)
        if match:
            return match.group(1)
        if re.match(r"^[a-f0-9]{24}$", url):
            return url
        return ""

    async def _crawl_single_note(self, url: str) -> List[Dict]:
        headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
            "Referer": "https://www.xiaohongshu.com/",
        }
        if self.cookies:
            headers["Cookie"] = self.cookies

        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)

        if resp.status_code != 200:
            return []

        html = resp.text
        title = ""
        content = ""

        title_match = re.search(r'<title[^>]*>([^<]+)</title>', html)
        if title_match:
            title = title_match.group(1).strip()

        desc_match = re.search(r'name="description"\s+content="([^"]*)"', html)
        if desc_match:
            content = desc_match.group(1).strip()

        if not title and not content:
            return []

        return [{
            "title": title or "Untitled",
            "content": content,
            "url": url,
            "published_at": "",
        }]

    async def _crawl_user_notes(self, user_id: str, limit: int) -> List[Dict]:
        headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
            "Referer": "https://www.xiaohongshu.com/",
        }
        if self.cookies:
            headers["Cookie"] = self.cookies

        api_url = f"https://www.xiaohongshu.com/user/profile/{user_id}"
        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(api_url, headers=headers)

        if resp.status_code != 200:
            return []

        html = resp.text
        posts = []

        note_links = re.findall(r'href="(/explore/[a-f0-9]+)"', html)
        note_links = list(set(note_links))[:limit]

        async with httpx.AsyncClient(follow_redirects=True) as client:
            for link in note_links:
                await self.random_delay(1, 2)
                note_url = f"https://www.xiaohongshu.com{link}"
                try:
                    r = await client.get(note_url, headers=headers)
                    if r.status_code != 200:
                        continue

                    t_match = re.search(r'<title[^>]*>([^<]+)</title>', r.text)
                    d_match = re.search(r'name="description"\s+content="([^"]*)"', r.text)

                    title = t_match.group(1).strip() if t_match else ""
                    content = d_match.group(1).strip() if d_match else ""

                    if title or content:
                        posts.append({
                            "title": title or "Untitled",
                            "content": content,
                            "url": note_url,
                            "published_at": "",
                        })
                except Exception:
                    continue

        return posts
