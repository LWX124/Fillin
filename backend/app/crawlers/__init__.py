from abc import ABC, abstractmethod
from typing import List, Dict, Optional
import asyncio
import random


class BaseCrawler(ABC):
    def __init__(self, cookies: Optional[str] = None):
        self.cookies = cookies

    async def random_delay(self, min_sec: float = 1.0, max_sec: float = 3.0):
        await asyncio.sleep(random.uniform(min_sec, max_sec))

    @abstractmethod
    async def crawl(self, target_url: str, limit: int = 10) -> List[Dict]:
        pass

    @abstractmethod
    def validate_url(self, url: str) -> bool:
        pass
