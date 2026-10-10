"""Local dev server: serves this folder on port 8080 with caching disabled."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    handler = partial(NoCacheHandler, directory=here)
    port = int(os.environ.get("PORT", "8080"))
    print(f"Serving on http://0.0.0.0:{port}")
    ThreadingHTTPServer(("0.0.0.0", port), handler).serve_forever()
