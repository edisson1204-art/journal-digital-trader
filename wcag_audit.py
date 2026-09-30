import sys
sys.stdout.reconfigure(encoding='utf-8')

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16)/255.0 for i in (0, 2, 4))

def linearize(c):
    return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4

def luminance(hex_color):
    r, g, b = hex_to_rgb(hex_color)
    return 0.2126*linearize(r) + 0.7152*linearize(g) + 0.0722*linearize(b)

def contrast(fg, bg):
    L1, L2 = luminance(fg), luminance(bg)
    if L1 < L2:
        L1, L2 = L2, L1
    return round((L1 + 0.05) / (L2 + 0.05), 2)

def grade(ratio, large=False):
    min_aa = 3.0 if large else 4.5
    if ratio >= 7.0:
        return 'AAA'
    if ratio >= min_aa:
        return 'AA'
    return 'FAIL'

COLORS = {
    'bg_main':        '#030A12',
    'bg_card':        '#091A2A',
    'bg_section':     '#061320',
    'green':          '#20E58D',
    'blue':           '#3B82F6',
    'violet':         '#8B5CF6',
    'red':            '#EF4444',
    'yellow':         '#F59E0B',
    'text_primary':   '#F8FAFC',
    'text_secondary': '#CBD5E1',
    'text_muted':     '#94A3B8',
}

pairs = [
    ('text_primary',   'bg_card',    'Texto primario / card',     False),
    ('text_secondary', 'bg_card',    'Texto secundario / card',   False),
    ('text_muted',     'bg_card',    'Texto muted / card',        False),
    ('text_muted',     'bg_main',    'Texto muted / bg main',     False),
    ('text_muted',     'bg_section', 'Texto muted / bg section',  False),
    ('green',          'bg_card',    'Verde KPI / card',          True),
    ('green',          'bg_main',    'Verde KPI / bg main',       True),
    ('blue',           'bg_card',    'Azul accent / card',        True),
    ('violet',         'bg_card',    'Violeta / card',            True),
    ('red',            'bg_card',    'Rojo perdidas / card',      True),
    ('yellow',         'bg_card',    'Amarillo warn / card',      True),
    ('yellow',         'bg_main',    'Amarillo warn / bg main',   True),
    ('bg_main',        'green',      'Dark texto / boton verde',  False),
    ('text_primary',   'green',      'Blanco / boton verde',      False),
]

results = []
for fg_key, bg_key, desc, large in pairs:
    r = contrast(COLORS[fg_key], COLORS[bg_key])
    g = grade(r, large)
    status = 'PASS' if g != 'FAIL' else 'FAIL'
    results.append((status, r, g, desc, large, COLORS[fg_key], COLORS[bg_key]))

print('=' * 70)
print('AUDITORIA WCAG 2.1 -- Journal Digital Trader Invest')
print('Min AA normal: 4.5:1 | Min AA large/bold: 3.0:1 | AAA: 7.0:1')
print('=' * 70)

for status, r, g, desc, large, fg, bg in results:
    tag = '[LARGE]' if large else '[NORMAL]'
    marker = 'OK  ' if status == 'PASS' else 'FAIL'
    print(f'{marker}  {r:5.2f}:1  {g:<5}  {tag:<8}  {desc}')

passes = sum(1 for s, _, _, _, _, _, _ in results if s == 'PASS')
fails_list = [(d, r, fg, bg) for s, r, g, d, l, fg, bg in results if s == 'FAIL']

print()
print(f'RESULTADO: {passes} PASS  |  {len(fails_list)} FAIL')
if fails_list:
    print()
    print('CORRECCIONES NECESARIAS:')
    for d, r, fg, bg in fails_list:
        print(f'  {d}: {r}:1  (fg={fg} bg={bg})')
