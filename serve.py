from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse
from urllib.request import Request, urlopen
import json
import os


ROOT = Path(__file__).resolve().parent
PORT = 3091


class NeoHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/.netlify/functions/neo-music-search":
            return self.music_search(parsed.query)
        return super().do_GET()

    def music_search(self, query_string):
        query = parse_qs(query_string).get("q", [""])[0].strip()
        if not query or len(query) > 120:
            return self.send_json(400, {"error": "Enter a valid search"})

        url = "https://vcsa.huangqirui.xyz/api/music/search?q=" + quote(query)
        try:
            request = Request(url, headers={"Accept": "application/json", "User-Agent": "NEO-TV/1.0"})
            with urlopen(request, timeout=8) as response:
                payload = json.loads(response.read().decode("utf-8"))
            return self.send_json(200, payload)
        except Exception:
            return self.send_json(502, {"error": "Music search is unavailable"})

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "public, max-age=30")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), NeoHandler)
    print(f"NEO OS preview: http://localhost:{PORT}/neo-os/")
    server.serve_forever()
