#!/usr/bin/env python3
"""Builds web/sky/, the small real-sky data the treehouse telescope ships with.

The sky imagery itself streams from CDS at play time (far too big to ship). What lives here
is what lets a kid read that sky: the named stars, the nebulae and galaxies, and maps of where
Hubble and Webb have taken pictures. Everything is fetched fresh from its source, so rerunning
this picks up catalog updates.

    python3 tools/sky_data.py        # from lantern-hill/
"""

import csv, io, json, os, re, sys, urllib.parse, urllib.request

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web', 'sky')
HYG = 'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv'
MESSIER = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/messier.json'
MOC = 'https://alasky.cds.unistra.fr/MocServer/query?ID={}&get=moc&order=9&fmt=json'
SESAME = 'https://cds.unistra.fr/cgi-bin/nph-sesame/-oI/SNV?'

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
    with urllib.request.urlopen(url, timeout=120) as r:
        return r.read()


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


def write(name, data):
    with open(os.path.join(OUT, name), 'w') as f:
        json.dump(data, f, separators=(',', ':'), ensure_ascii=False)
    print(f'{name}: {os.path.getsize(os.path.join(OUT, name)):,} bytes')


os.makedirs(OUT, exist_ok=True)
write('stars.json', stars())
write('deep-sky.json', deep_sky())
write('hubble-moc.json', json.loads(get(MOC.format('CDS/P/HST/EPO'))))
write('webb-moc.json', json.loads(get(MOC.format('CDS/P/JWST/EPO'))))
