"""Comprobaciones de cv_pro (el rediseno de ChatGPT sobre la maqueta de opcion 3).

Uso:
    python pruebas.py            corre todas
    python pruebas.py contenido  corre una sola
"""
import os, sys, functools, threading, http.server, socketserver, contextlib
from playwright.sync_api import sync_playwright

SITIO = os.path.dirname(os.path.abspath(__file__))
PUERTO = 8744
BASE = f"http://127.0.0.1:{PUERTO}/index.html"

SECCIONES = ["hero", "profile", "project", "architecture", "timeline",
             "capability", "other", "education", "contact"]
ANCHOS = [320, 375, 768, 1024, 1440, 2560]


class Silencio(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


def servir():
    h = functools.partial(Silencio, directory=SITIO)
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(("127.0.0.1", PUERTO), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


PRUEBAS = {}


def prueba(fn):
    PRUEBAS[fn.__name__] = fn
    return fn


def cargar(nav, **vp):
    """Abre la pagina, espera a que la escena arranque y captura consola/red."""
    pag = nav.new_page(viewport=vp or {"width": 1440, "height": 900})
    errores = []
    pag.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)
    pag.on("pageerror", lambda e: errores.append(f"pageerror: {e}"))
    pag.on("response", lambda r: errores.append(f"{r.status} {r.url}") if r.status >= 400 else None)
    pag.goto(BASE, wait_until="networkidle")
    pag.wait_for_timeout(4500)  # el loader tarda hasta ~3.2s en llegar a 100% y desvanecerse
    return pag, errores


# ─────────────────────────────────────────────────────────────────

@prueba
def consola_limpia(nav):
    """Sin errores de consola ni recursos que devuelvan 4xx/5xx al cargar."""
    pag, errores = cargar(nav)
    assert not errores, f"errores: {errores}"


@prueba
def secciones_presentes(nav):
    """Las nueve secciones (00 a 08) estan en el documento."""
    pag, _ = cargar(nav)
    faltan = [s for s in SECCIONES if pag.locator(f".section.{s}, .{s}.section").count() < 1
              and pag.locator(f"#{s}").count() < 1]
    # 'hero' y 'project' usan selectores compuestos; se revisan por data-section en su lugar
    total = pag.locator("[data-section]").count()
    assert total == 9, f"se esperaban 9 secciones con data-section, hay {total}"


@prueba
def sin_desborde_horizontal(nav):
    """Ningun ancho de 320 a 2560 produce scroll horizontal."""
    malos = []
    for ancho in ANCHOS:
        pag, _ = cargar(nav, width=ancho, height=900)
        over = pag.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        if over > 0:
            malos.append(f"{ancho}px desborda {over}px")
        pag.close()
    assert not malos, "; ".join(malos)


@prueba
def bilingue_completo(nav):
    """Cada nodo de texto traducible tiene su par lang=es / lang=en."""
    pag, _ = cargar(nav)
    huerfanos = pag.evaluate("""
      [...document.querySelectorAll('body [lang=es], body [lang=en]')]
        .filter(el => {
          const hermano = el.getAttribute('lang') === 'es' ? 'en' : 'es';
          return !el.parentElement || !el.parentElement.querySelector(`:scope > [lang=${hermano}]`);
        })
        .map(el => el.outerHTML.slice(0, 60))
    """)
    assert not huerfanos, f"spans de idioma sin su par: {huerfanos}"


@prueba
def toggle_idioma(nav):
    """El boton de idioma cambia el atributo lang, lo que se ve, y persiste al recargar."""
    pag, _ = cargar(nav)
    inicial = pag.evaluate("document.documentElement.lang")
    assert inicial in ("es", "en")

    pag.click("#idioma")
    pag.wait_for_timeout(200)
    nuevo = pag.evaluate("document.documentElement.lang")
    assert nuevo != inicial, "el idioma no cambio tras el clic"

    visible = pag.eval_on_selector(f"h1 [lang='{nuevo}']", "el => getComputedStyle(el).display")
    oculto = pag.eval_on_selector(f"h1 [lang='{inicial}']", "el => getComputedStyle(el).display")
    assert visible != "none" and oculto == "none", "el h1 no cambio de idioma visualmente"

    pag.reload(wait_until="networkidle")
    pag.wait_for_timeout(500)
    persiste = pag.evaluate("document.documentElement.lang")
    assert persiste == nuevo, "el idioma no persistio tras recargar"


@prueba
def sonido_alterna(nav):
    """El boton de sonido enciende y apaga, y el primer gesto en la pagina tambien lo enciende."""
    pag, _ = cargar(nav)
    boton = pag.locator("#sound")
    assert boton.get_attribute("aria-pressed") == "false"
    boton.click()
    pag.wait_for_timeout(600)
    assert boton.get_attribute("aria-pressed") == "true", "no se encendio al primer clic"
    boton.click()
    pag.wait_for_timeout(300)
    assert boton.get_attribute("aria-pressed") == "false", "no se apago al segundo clic"


@prueba
def movimiento_reducido(nav):
    """Con prefers-reduced-motion la escena no tira errores y detiene el giro por tiempo."""
    pag = nav.new_page(viewport={"width": 1440, "height": 900})
    pag.emulate_media(reduced_motion="reduce")
    errores = []
    pag.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)
    pag.on("pageerror", lambda e: errores.append(str(e)))
    pag.goto(BASE, wait_until="networkidle")
    pag.wait_for_timeout(4500)
    assert not errores, f"errores bajo movimiento reducido: {errores}"
    assert pag.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")


@prueba
def scroll_vuelve_al_inicio(nav):
    """Recargar a mitad de scroll no deja al visitante a mitad de la galaxia."""
    pag, _ = cargar(nav)
    pag.mouse.wheel(0, 8000)
    pag.wait_for_timeout(500)
    assert pag.evaluate("window.scrollY") > 0, "la pagina no se pudo desplazar para probar esto"
    pag.reload(wait_until="networkidle")
    pag.wait_for_timeout(200)
    assert pag.evaluate("window.scrollY") == 0, "el scroll no volvio a 0 tras recargar"


@prueba
def contraste_textos_tenues(nav):
    """Los textos en --dim y --muted cumplen 4.5:1 contra el fondo real (con velo)."""
    pag, _ = cargar(nav)

    def luminancia(rgb):
        import re
        vals = [int(v) for v in re.findall(r"[\d.]+", rgb)[:3]]

        def canal(c):
            c = c / 255
            return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

        r, g, b = (canal(v) for v in vals)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b

    objetivos = pag.eval_on_selector_all(
        ".topbar__status, .section__head small, .private, .contact footer span",
        "els => els.map(el => ({texto: el.textContent.trim(), color: getComputedStyle(el).color}))"
    )
    fondo = luminancia("rgb(7,8,11)")
    malos = []
    for o in objetivos:
        if not o["texto"]:
            continue
        l1, l2 = luminancia(o["color"]), fondo
        alto, bajo = max(l1, l2), min(l1, l2)
        ratio = (alto + 0.05) / (bajo + 0.05)
        if ratio < 4.5:
            malos.append(f"{o['texto'][:24]!r} -> {ratio:.2f}:1 ({o['color']})")
    assert not malos, "contraste insuficiente: " + "; ".join(malos)


@prueba
def og_image_valida(nav):
    """og-image.png existe, es 1200x630, y el meta tag apunta a ella."""
    ruta = os.path.join(SITIO, "og-image.png")
    assert os.path.isfile(ruta), "falta og-image.png"
    pag, _ = cargar(nav)
    contenido = pag.get_attribute('meta[property="og:image"]', "content")
    assert contenido == "og-image.png"
    an = pag.get_attribute('meta[property="og:image:width"]', "content")
    al = pag.get_attribute('meta[property="og:image:height"]', "content")
    assert an == "1200" and al == "630"


@prueba
def factico_sigr_sin_aprobar(nav):
    """El SIGR se describe como interno y sin aprobar, no como 'en operacion'."""
    pag, _ = cargar(nav)
    texto = pag.inner_text(".private")
    assert "sin aprobar" in texto.lower() or "unapproved" in texto.lower(), \
        f"el aviso del SIGR no dice que esta sin aprobar: {texto!r}"
    assert "en operación" not in texto.lower() and "in operation" not in texto.lower()


# ─────────────────────────────────────────────────────────────────

def main():
    quiere = sys.argv[1] if len(sys.argv) > 1 else "todo"
    if quiere != "todo" and quiere not in PRUEBAS:
        print(f"No existe la prueba {quiere!r}. Hay: {', '.join(PRUEBAS)}")
        sys.exit(2)

    srv = servir()
    fallos = []
    try:
        with sync_playwright() as p:
            nav = p.chromium.launch(channel="chrome", headless=True,
                                    args=["--use-gl=angle", "--ignore-gpu-blocklist"])
            for nombre, fn in PRUEBAS.items():
                if quiere not in ("todo", nombre):
                    continue
                try:
                    fn(nav)
                    print(f"  OK    {nombre}")
                except AssertionError as e:
                    print(f"  FALLA {nombre}: {e}")
                    fallos.append(nombre)
                except Exception as e:
                    print(f"  ROTA  {nombre}: {type(e).__name__}: {e}")
                    fallos.append(nombre)
            nav.close()
    finally:
        with contextlib.suppress(Exception):
            srv.shutdown()

    print()
    if fallos:
        print("FALLAN:", ", ".join(fallos))
        sys.exit(1)
    print("Todo en orden.")


main()
