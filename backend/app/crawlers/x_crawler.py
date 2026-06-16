from app.crawlers import BaseCrawler
from typing import List, Dict
import re
import httpx
import json


class XCrawler(BaseCrawler):
    def validate_url(self, url: str) -> bool:
        pattern = r"(twitter\.com|x\.com)/[\w]+"
        return bool(re.search(pattern, url))

    async def crawl(self, target_url: str, limit: int = 10) -> List[Dict]:
        if not self.validate_url(target_url):
            raise ValueError(f"Invalid X URL: {target_url}")

        username = target_url.rstrip("/").split("/")[-1]
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        }
        if self.cookies:
            headers["Cookie"] = self.cookies

        # Use nitter instances as a fallback public scraping approach
        nitter_url = f"https://nitter.net/{username}"
        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            try:
                resp = await client.get(nitter_url, headers=headers)
            except Exception:
                return []

        if resp.status_code != 200:
            return []

        posts = []
        html = resp.text
        # Parse timeline items from nitter HTML
        items = html.split('<div class="timeline-item"')

        for item in items[1:limit + 1]:
            try:
                content_match = re.search(r'<div class="tweet-content[^"]*"[^>]*>(.*?)</div>', item, re.DOTALL)
                content = re.sub(r"<[^>]+>", "", content_match.group(1)).strip() if content_match else ""
                if not content:
                    continue

                time_match = re.search(r'<span class="tweet-date"><a[^>]*title="([^"]*)"', item)
                timestamp = time_match.group(1) if time_match else ""

                link_match = re.search(r'<a class="tweet-link"[^>]*href="([^"]*)"', item)
                post_url = f"https://x.com{link_match.group(1)}" if link_match else ""

                posts.append({
                    "title": content[:100] + "..." if len(content) > 100 else content,
                    "content": content,
                    "url": post_url,
                    "published_at": timestamp,
                })
            except Exception:
                continue

        return posts
