from app.imports.ratelimit import SlidingWindowLimiter


class Clock:
    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now


def test_blocks_after_the_limit_and_says_how_long_to_wait():
    clock = Clock()
    limiter = SlidingWindowLimiter(max_calls=2, window_seconds=60, clock=clock)
    assert limiter.hit("a") is None
    clock.now = 10
    assert limiter.hit("a") is None
    clock.now = 20
    assert limiter.hit("a") == 41


def test_allows_again_when_the_window_passes():
    clock = Clock()
    limiter = SlidingWindowLimiter(max_calls=1, window_seconds=60, clock=clock)
    assert limiter.hit("a") is None
    assert limiter.hit("a") is not None
    clock.now = 60
    assert limiter.hit("a") is None


def test_keys_are_counted_separately_and_blocked_calls_do_not_extend_the_wait():
    clock = Clock()
    limiter = SlidingWindowLimiter(max_calls=1, window_seconds=60, clock=clock)
    assert limiter.hit("a") is None
    assert limiter.hit("b") is None
    clock.now = 30
    assert limiter.hit("a") == 31
    clock.now = 60
    assert limiter.hit("a") is None