#!/usr/bin/env python3
"""Builds web/sky/, the small real-sky data the treehouse telescope ships with.

The sky imagery itself streams from CDS at play time (far too big to ship). What lives here
is what lets a kid read that sky: the named stars, the nebulae and galaxies, and Hubble's and
Webb's pictures: each one's title and the four corners it covers on the sky, from the picture's
own page at ESA/Hubble or ESA/Webb (its centre, its size and which way north points in it).
Hubble's are the ones CDS's index lists; Webb's are every one filed under one of its cameras. Everything is fetched fresh from its source, so rerunning this
picks up catalog updates and new pictures.

    python3 tools/sky_data.py            # from lantern-hill/
    python3 tools/sky_data.py pictures   # just the ones named
"""

import csv, html, io, json, math, os, re, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web', 'sky')
HYG = 'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv'
MESSIER = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/messier.json'
MOC = 'https://alasky.cds.unistra.fr/MocServer/query?ID={}&get=moc&order=9&fmt=json'
SESAME = 'https://cds.unistra.fr/cgi-bin/nph-sesame/-oI/SNV?'
HUBBLE_INDEX = 'https://alasky.cds.unistra.fr/HST-outreach/CDS_P_HST_EPO/HpxFinder/Norder3/Dir0/Npix{}'
WEBB_CAMERA = 'https://esawebb.org/images/archive/category/{}/{}'

CONSTELLATIONS = dict(
    And='Andromeda', Ant='Antlia', Aps='Apus', Aqr='Aquarius', Aql='Aquila', Ara='Ara', Ari='Aries', Aur='Auriga',
    Boo='Boötes', Cae='Caelum', Cam='Camelopardalis', Cnc='Cancer', CVn='Canes Venatici', CMa='Canis Major',
    CMi='Canis Minor', Cap='Capricornus', Car='Carina', Cas='Cassiopeia', Cen='Centaurus', Cep='Cepheus',
    Cet='Cetus', Cha='Chamaeleon', Cir='Circinus', Col='Columba', Com='Coma Berenices', CrA='Corona Australis',
    CrB='Corona Borealis', Crv='Corvus', Crt='Crater', Cru='Crux', Cyg='Cygnus', Del='Delphinus', Dor='Dorado',
    Dra='Draco', Equ='Equuleus', Eri='Eridanus', For='Fornax', Gem='Gemini', Gru='Grus', Her='Hercules',
    Hor='Horologium', Hya='Hydra', Hyi='Hydrus', Ind='Indus', Lac='Lacerta', Leo='Leo', LMi='Leo Minor',
    Lep='Lepus', Lib='Libra', Lup='Lupus', Lyn='Lynx', Lyr='Lyra', Men='Mensa', Mic='Microscopium',
    Mon='Monoceros', Mus='Musca', Nor='Norma', Oct='Octans', Oph='Ophiuchus', Ori='Orion', Pav='Pavo',
    Peg='Pegasus', Per='Perseus', Phe='Phoenix', Pic='Pictor', Psc='Pisces', PsA='Piscis Austrinus',
    Pup='Puppis', Pyx='Pyxis', Ret='Reticulum', Sge='Sagitta', Sgr='Sagittarius', Sco='Scorpius',
    Scl='Sculptor', Sct='Scutum', Ser='Serpens', Sex='Sextans', Tau='Taurus', Tel='Telescopium',
    Tri='Triangulum', TrA='Triangulum Australe', Tuc='Tucana', UMa='Ursa Major', UMi='Ursa Minor', Vel='Vela',
    Vir='Virgo', Vol='Volans', Vul='Vulpecula')

# Famous Hubble and Webb targets beyond the Messier list: (name to resolve, name to show, kind)
EXTRA = [
    ('NGC 3372', 'Carina Nebula', 'nebula'),
    ('NGC 3132', 'Southern Ring Nebula', 'pn'),
    ("Stephan's Quintet", "Stephan's Quintet", 'group'),
    ('Cartwheel Galaxy', 'Cartwheel Galaxy', 'galaxy'),
    ('SMACS J0723.3-7327', "Webb's First Deep Field", 'deep'),
    ('Hubble Ultra Deep Field', 'Hubble Ultra Deep Field', 'deep'),
    ('NGC 2070', 'Tarantula Nebula', 'nebula'),
    ('LMC', 'Large Magellanic Cloud', 'galaxy'),
    ('SMC', 'Small Magellanic Cloud', 'galaxy'),
    ('Barnard 33', 'Horsehead Nebula', 'dark'),
    ('NGC 7293', 'Helix Nebula', 'pn'),
    ('NGC 6543', "Cat's Eye Nebula", 'pn'),
    ('NGC 1300', 'NGC 1300', 'galaxy'),
    ('NGC 2392', 'Eskimo Nebula', 'pn'),
    ('NGC 6302', 'Butterfly Nebula', 'pn'),
    ('IC 2944', 'Running Chicken Nebula', 'nebula'),
    ('rho Oph', 'Rho Ophiuchi Clouds', 'nebula'),
    ('Westerlund 2', 'Westerlund 2', 'cluster'),
    ('Abell 2744', "Pandora's Cluster", 'deep'),
    ('Sgr A*', 'Center of the Milky Way', 'center'),
]
MESSIER_KIND = {'gc': 'globular', 'oc': 'cluster', 'pos': 'cluster', 's': 'galaxy', 'e': 'galaxy', 'i': 'galaxy',
                'sfr': 'nebula', 'rn': 'nebula', 'pn': 'pn', 'snr': 'snr'}


def get(url):
    # ESA's sites turn away Python's default user agent
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (lantern-hill-sky-data)'}), timeout=120) as r:
        return r.read()


def page(url):
    try:
        return get(url).decode()
    except Exception:
        return ''


def stars():
    out = []
    for r in csv.DictReader(io.StringIO(get(HYG).decode())):
        if not r['proper'] or r['proper'] == 'Sol':
            continue
        dist = float(r['dist'])
        out.append({'name': r['proper'], 'ra': round(float(r['ra']) * 15, 4), 'dec': round(float(r['dec']), 4),
                    'mag': round(float(r['mag']), 2), 'con': CONSTELLATIONS.get(r['con'], ''),
                    # HYG marks an unknown distance as 100000 pc
                    'ly': round(dist * 3.26156) if 0 < dist < 100000 else None,
                    'sp': r['spect'][:1].upper()})
    return sorted(out, key=lambda s: s['mag'])


def resolve(name):
    text = get(SESAME + urllib.parse.quote(name)).decode()
    m = re.search(r'^%J\s+([\d.+-]+)\s+([\d.+-]+)', text, re.M)
    if not m:
        sys.exit(f'Sesame could not resolve {name!r}')
    return float(m.group(1)), float(m.group(2))


def deep_sky():
    out = []
    for f in json.loads(get(MESSIER))['features']:
        p, (ra, dec) = f['properties'], f['geometry']['coordinates']
        alt = p['alt'].replace('´', '’').replace("'", '’')
        if alt in ('4 Star asterism', 'Milky Way patch'):
            alt = ''
        out.append({'name': alt or p['name'], 'm': p['name'], 'ra': round(ra % 360, 4), 'dec': round(dec, 4),
                    'kind': MESSIER_KIND[p['type']], 'mag': p['mag']})
    for query, name, kind in EXTRA:
        ra, dec = resolve(query)
        out.append({'name': name.replace("'", '’'), 'ra': round(ra, 4), 'dec': round(dec, 4), 'kind': kind})
    return out


def hubble_names(moc):
    cells = sorted({n >> 2*(int(k) - 3) for k, ns in moc.items() for n in ns if int(k) >= 3})
    with ThreadPoolExecutor(8) as pool:
        lines = [l.strip().rstrip(',') for text in pool.map(lambda n: page(HUBBLE_INDEX.format(n)), cells) for l in text.splitlines()]
    return sorted({json.loads(l)['name'] for l in lines if l.startswith('{')})


def webb_names():
    names = set()
    for camera in ('nircam', 'miri', 'niriss', 'nirspec'):
        for n in range(1, 100):
            found = set(re.findall(r'href="/images/([a-z0-9]+)/"', page(WEBB_CAMERA.format(camera, f'page/{n}/' if n > 1 else '')))) - {'potm'}
            if n > 1 and not found - names:
                break
            names |= found
    return sorted(names)


def field(text, name):
    m = re.search(re.escape(name) + r':\s*([^:]*?)\s+(?:Position|Field of view|Orientation|Name|Type|Distance|compass_src|$)', text)
    return m.group(1).strip() if m else None


def picture(site, name):
    """{n: name, t: title, c: corners} from the picture's page, or None if it isn't of the sky.
    The corners run top-left, top-right, bottom-right, bottom-left, as the picture is drawn."""
    raw = page(f'https://{site}/images/{name}/')
    text = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', raw)))
    ra, dec, fov, north = (field(text, k) for k in ('Position (RA)', 'Position (Dec)', 'Field of view', 'Orientation'))
    title = re.search(r'<title>\s*(.*?)\s*\|', raw, re.S)
    if not (ra and dec and fov and north and title):
        return None
    h, m, s = (float(x) for x in ra.split()[:3])
    d = [float(x) for x in re.findall(r'[\d.]+', dec)[:3]]
    ra0, de0 = math.radians(15*(h + m/60 + s/3600)), math.radians((-1 if dec.startswith('-') else 1)*(d[0] + d[1]/60 + d[2]/3600))
    unit = 1/60 if 'arcmin' in fov else 1/3600 if 'arcsec' in fov else 1
    w, hh = (math.radians(float(x)*unit/2) for x in re.findall(r'[\d.]+', fov)[:2])
    # "North is 22.3° right of vertical": the picture's up is north turned that far toward east
    th = math.radians(float(re.findall(r'[\d.]+', north)[0])*(1 if 'right' in north else -1))
    up, right = (math.sin(th), math.cos(th)), (-math.cos(th), math.sin(th))
    corners = []
    for sx, sy in ((-1, 1), (1, 1), (1, -1), (-1, -1)):
        xi, eta = sx*w*right[0] + sy*hh*up[0], sx*w*right[1] + sy*hh*up[1]
        den = math.cos(de0) - eta*math.sin(de0)
        corners += [round(math.degrees(ra0 + math.atan2(xi, den)) % 360, 5),
                    round(math.degrees(math.atan2(math.sin(de0) + eta*math.cos(de0), math.hypot(xi, den))), 5)]
    return {'n': name, 't': html.unescape(title.group(1).strip()), 'c': corners}


def pictures(site, names):
    with ThreadPoolExecutor(8) as pool:
        return [p for p in pool.map(lambda n: picture(site, n), names) if p]


def write(name, data):
    with open(os.path.join(OUT, name), 'w') as f:
        json.dump(data, f, separators=(',', ':'), ensure_ascii=False)
    print(f'{name}: {os.path.getsize(os.path.join(OUT, name)):,} bytes')


os.makedirs(OUT, exist_ok=True)
want = set(sys.argv[1:]) or {'stars', 'deep-sky', 'pictures'}
if 'stars' in want: write('stars.json', stars())
if 'deep-sky' in want: write('deep-sky.json', deep_sky())
if 'pictures' in want:
    # where Hubble's pictures cover the sky says which cells of CDS's index to read
    write('hubble-pictures.json', pictures('esahubble.org', hubble_names(json.loads(get(MOC.format('CDS/P/HST/EPO'))))))
    write('webb-pictures.json', pictures('esawebb.org', webb_names()))
