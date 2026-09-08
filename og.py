"""Genera og-image.png (1200x630), la vista previa al compartir el enlace."""
import os, functools, threading, http.server, socketserver, contextlib
from playwright.sync_api import sync_playwright

SITIO = os.path.dirname(os.path.abspath(__file__))
PUERTO = 8743

PLANTILLA = """<!doctype html><meta charset="utf-8">
<style>
  @font-face{font-family:Big;src:url("bigshoulders.woff2") format("woff2");font-weight:100 900}
  html,body{margin:0;background:#07080b}
  .og{
    width:1200px;height:630px;box-sizing:border-box;background:#07080b;color:#f1f3f6;
    font-family:ui-sans-serif,system-ui,sans-serif;padding:64px 72px;
    display:grid;grid-template-rows:auto 1fr auto;position:relative;overflow:hidden;
  }
  .og::before{
    content:'';position:absolute;inset:-20%;
    background:radial-gradient(circle at 74% 28%,rgba(255,217,160,.10),transparent 32%),
               radial-gradient(circle at 20% 82%,rgba(170,191,255,.10),transparent 30%);
  }
  .og::after{content:'';position:absolute;left:0;right:0;bottom:0;height:5px;background:#ffd9a0}
  .og__alto{display:flex;justify-content:space-between;align-items:center;font:600 15px/1 monospace;letter-spacing:.14em;color:#9299a5;padding-bottom:26px;border-bottom:1px solid #242832}
  .og__marca{display:flex;align-items:center;gap:10px;color:#f1f3f6}
  .og__punto{width:9px;height:9px;border-radius:50%;background:#b9f6cf}
  .og__medio{display:flex;align-items:center;gap:52px}
  .og__foto{width:190px;height:238px;object-fit:cover;object-position:50% 13%;flex:none;border:1px solid #303641;filter:contrast(1.04) saturate(.78)}
  .og__nombre{margin:0;font-family:Big,Impact,sans-serif;font-weight:600;font-size:66px;line-height:.92;letter-spacing:-.025em}
  .og__nombre em{font-style:normal;color:#ffd9a0}
  .og__bajo{display:flex;justify-content:space-between;align-items:flex-end;gap:40px}
  .og__frase{margin:0;font-size:22px;line-height:1.5;color:#aeb5c0;max-width:34ch}
  .og__pila{font:600 13px/1.9 monospace;letter-spacing:.1em;color:#565d68;text-align:right;white-space:nowrap}
</style>
<div class="og">
  <div class="og__alto">
    <span class="og__marca"><i class="og__punto"></i>VAGM / SYSTEMS</span>
    <span>SALTILLO, COAHUILA</span>
  </div>
  <div class="og__medio">
    <img class="og__foto" src="victor.jpg" alt="">
    <h1 class="og__nombre">Todo proceso<br><em>puede mejorar.</em></h1>
  </div>
  <div class="og__bajo">
    <p class="og__frase">Víctor Alberto González Mejorado — ingeniero en TI. Construyo sistemas, ordeno procesos y convierto problemas operativos en herramientas que se pueden usar, medir y mejorar.</p>
    <p class="og__pila">SIGR · 8 ETAPAS<br>87 MIGRACIONES</p>
  </div>
</div>
"""


class Silencio(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


def main():
    tmp = os.path.join(SITIO, "_og.html")
    open(tmp, "w", encoding="utf-8").write(PLANTILLA)
    h = functools.partial(Silencio, directory=SITIO)
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(("127.0.0.1", PUERTO), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            nav = p.chromium.launch(channel="chrome", headless=True)
            pag = nav.new_page(viewport={"width": 1200, "height": 630},
                               device_scale_factor=1)
            pag.goto(f"http://127.0.0.1:{PUERTO}/_og.html", wait_until="networkidle")
            pag.wait_for_timeout(300)
            destino = os.path.join(SITIO, "og-image.png")
            pag.locator(".og").screenshot(path=destino)
            nav.close()
        kb = os.path.getsize(destino) / 1024
        print(f"og-image.png  1200x630  {kb:.1f} KB")
    finally:
        os.remove(tmp)
        with contextlib.suppress(Exception):
            srv.shutdown()


main()
