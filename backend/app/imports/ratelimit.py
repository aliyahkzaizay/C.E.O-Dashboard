import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable
 
 
class SlidingWindowLimiter:
    def __init__(self, max_calls: int, window_seconds: float, clock: Callable[[], float] = time.monotonic):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._clock = clock
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()
 
    def hit(self, key: str) -> int | None:
        now = self._clock()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] >= self.window_seconds:
                hits.popleft()
            if len(hits) >= self.max_calls:
                return max(1, int(self.window_seconds - (now - hits[0])) + 1)
            hits.append(now)
            return None
 
    def reset(self) -> None:
        with self._lock:
            self._hits.clear()
