"""Serve only the built, public web assets on loopback; never the repository."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "dist" / "web"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        self.send_header("Permissions-Policy", "microphone=(self), camera=(), geolocation=()")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def list_directory(self, path):
        self.send_error(404)


if __name__ == "__main__":
    if not (ROOT / "engine" / "jamloom_web.wasm").is_file():
        raise SystemExit("Run sh scripts/web_build.sh first.")
    print("Jamloom: http://localhost:4173", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 4173), Handler).serve_forever()
