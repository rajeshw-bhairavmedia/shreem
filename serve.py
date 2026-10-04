"""Serve the built site (dist/) locally with SPA routing. Run `npm run build` first."""
import http.server
import os
import socketserver

PORT = 8000
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        # Unknown paths (client-side routes like /collections) get index.html
        if not os.path.exists(self.translate_path(self.path)):
            self.path = "/index.html"
        return super().do_GET()


if not os.path.isdir(ROOT):
    raise SystemExit("dist/ not found - run `npm run build` first.")

with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
    print(f"Serving Shreem Lifestyle at http://localhost:{PORT}")
    httpd.serve_forever()
