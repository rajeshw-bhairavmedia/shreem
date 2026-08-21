import http.server
import socketserver
import os

PORT = 8000

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Check if the requested path exists as a file or directory
        path = self.translate_path(self.path)
        if not os.path.exists(path):
            # If not found, rewrite path to serve index.html
            self.path = '/index.html'
        
        return super().do_GET()

with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
    print(f"Serving SPA at port {PORT}")
    httpd.serve_forever()
