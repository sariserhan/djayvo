#!/usr/bin/env python3
"""Loopback song player with byte ranges for browser audio seeking."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[2]/'renders/night-current-20261020/review'

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def list_directory(self,path):self.send_error(404)
    def end_headers(self):
        self.send_header('Accept-Ranges','bytes')
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()
    def send_head(self):
        self.remaining=None
        path=Path(self.translate_path(self.path));value=self.headers.get('Range')
        if not value or not path.is_file():return super().send_head()
        size=path.stat().st_size;match=re.fullmatch(r'bytes=(\d*)-(\d*)',value)
        try:
            if not match or not any(match.groups()):raise ValueError()
            left,right=match.groups()
            start=int(left) if left else max(0,size-int(right))
            end=min(size-1,int(right)) if left and right else size-1
            if not 0<=start<=end<size:raise ValueError()
        except ValueError:
            self.send_response(416);self.send_header('Content-Range',f'bytes */{size}')
            self.send_header('Content-Length','0');self.end_headers();return None
        stream=path.open('rb');stream.seek(start);self.remaining=end-start+1
        self.send_response(206);self.send_header('Content-Type',self.guess_type(str(path)))
        self.send_header('Content-Length',str(self.remaining))
        self.send_header('Content-Range',f'bytes {start}-{end}/{size}');self.end_headers()
        return stream
    def copyfile(self,source,output):
        if self.remaining is None:return super().copyfile(source,output)
        while self.remaining:
            chunk=source.read(min(self.remaining,65536))
            if not chunk:break
            output.write(chunk);self.remaining-=len(chunk)

if __name__=='__main__':
    if not (ROOT/'index.html').is_file():raise SystemExit('Prepare the local song player first')
    print('Night Current: http://127.0.0.1:4212/',flush=True)
    ThreadingHTTPServer(('127.0.0.1',4212),Handler).serve_forever()
