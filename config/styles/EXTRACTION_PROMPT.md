# Prompt para extraer design tokens de un template de Canva

Pegar esto en la extensión de Chrome junto con el link del template:

---

Abrí este template de Canva: <PEGAR LINK ACÁ>

Es un template para [Instagram 1200x1200 cuadrado / LinkedIn 1200x627
horizontal — borrar el que no aplique]. Quiero que extraigas sus design
tokens visuales y me los devuelvas como un bloque YAML con **exactamente**
esta estructura (no agregues ni renombres keys):

```yaml
theme:
  backgroundColor: "#______"   # color de fondo principal del template
  accentColor: "#______"       # color de acento (CTAs, números, highlights)
  textColor: "#______"         # color del texto principal (headline)
  mutedTextColor: "#______"    # color del texto secundario (body/footer)

overlayOpacity: 0.__            # 0 si el fondo es sólido/plano, 0.2-0.5 si hay
                                 # overlay oscuro sobre foto/gradiente

fallbackGradients:              # 2-3 gradientes CSS que capturen la paleta,
  - "linear-gradient(135deg, #______ 0%, #______ 50%, #______ 100%)"
  - "linear-gradient(135deg, #______ 0%, #______ 50%, #______ 100%)"
                                 # (omitir este bloque entero si el template
                                 # es fondo sólido sin gradiente)

fontFamily: "____, system-ui, -apple-system, sans-serif"
                                 # nombre real de la fuente si la reconocés,
                                 # si no un family genérico visualmente similar

slide:
  width: 1200
  height: 1200                  # 1200 para instagram cuadrado, 627 para linkedin
  padding: __                   # margen interno en px, estimalo del layout

typography:
  headline:
    fontSize: __                # tamaño del texto más grande/prominente
    fontWeight: ___              # 400/600/700/800 según grosor visual
    lineHeight: 1._
    color: "#______"
  bodyText:
    fontSize: __
    fontWeight: 400
    lineHeight: 1._
    color: "#______"
  dataPoint:                    # el texto para un número/stat grande
    fontSize: __
    fontWeight: 800
    lineHeight: 1._
    color: "#______"
  visualCue:                    # texto tipo "Swipe →" / CTA corto
    fontSize: __
    fontWeight: 600
    lineHeight: 1._
    color: "#______"
  footer:
    fontSize: __
    fontWeight: 400
    color: "#______"
```

Reglas:
- Todos los colores en hex (`#rrggbb`).
- Si un elemento (dataPoint, visualCue, footer) no aparece en el template,
  igual completá los valores con tu mejor estimación visual coherente con
  el resto de la paleta — no los omitas, el YAML necesita las 5 entradas
  de `typography`.
- No agregues comentarios ni texto fuera del bloque YAML en tu respuesta.

---

## Qué hacer con el resultado

1. Pegame el YAML que te devuelva acá en el chat.
2. Yo lo guardo en
   `carousel-studio/config/styles/instagram/<nombre-del-estilo>.yaml`
   (o `linkedin/`) y queda activo con `CAROUSEL_STYLE=<nombre-del-estilo>`.
