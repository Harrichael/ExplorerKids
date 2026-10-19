#!/usr/bin/env python3
"""Builds web/sky/maps/, the real maps the telescope wraps the Moon and planets in.

Every pixel is a spacecraft's or Hubble's: nothing is painted. Where one source has a hole, the
hole is filled from another source of the same world. Only the last few degrees round a pole
that nothing has ever photographed are filled, by repeating the nearest photographed row (the
gas giants are banded, so their colour holds round a latitude line).

  Moon, Mercury, Venus, Mars, Jupiter, Neptune, and Jupiter's four big moons: HiPS maps at CDS,
          exported flat with hips2fits. Galileo and Voyager left gaps near the moons' poles; a
          missing pixel takes the average colour of what was photographed along its latitude.
  Saturn: Hubble OPAL 2025, its equator (hidden by the rings' edge) and north pole from OPAL 2018.
  Uranus: Hubble OPAL 2025 for the north, OPAL 2014 for the tropics, and the south pole from
          Voyager 2's 1986 portrait, when that pole faced the spacecraft.
  Saturn's rings: how much light gets through, from Voyager 2 watching a star shine through them
          (PPS occultation); their colour, from Cassini's 2004 natural-colour portrait.

Every map runs east from longitude -180 at the left edge, latitude +90 at the top. Each comes in
two sizes: <name>.jpg as sharp as the source allows (up to 4096 wide), for flying close, and
<name>-small.jpg, 512 wide, for the star view and while the sharp one is on its way.

closeups.json: where Galileo and Voyager flew close over Jupiter's moons. Their maps are mostly
pictures taken from far off, sharpened up to the few close passes; nobody publishes where those
passes landed, so each HEALPix tile of the map (at its finest order) is tested for detail that
holds at the 2-pixel scale as strongly as at the 8-pixel scale, in every direction, which a picture
blown up from a distant one never has. Written as a MOC, as the Hubble and Webb maps are.

    python3 -m venv /tmp/v && /tmp/v/bin/pip install numpy pillow
    /tmp/v/bin/python tools/sky_maps.py        # from lantern-hill/
    /tmp/v/bin/python tools/sky_maps.py closeups europa   # just the ones named
"""

import io, json, os, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web', 'sky', 'maps')
HIPS2FITS = 'https://alasky.cds.unistra.fr/hips-image-services/hips2fits?'
OPAL = 'https://archive.stsci.edu/hlsps/opal/cycle{}/{}/hlsp_opal_hst_wfc3-uvis_{}_v1_globalmap.tif'
VOYAGER_URANUS = 'https://images-assets.nasa.gov/image/PIA18182/PIA18182~orig.jpg'
CASSINI_SATURN = 'https://images-assets.nasa.gov/image/PIA06193/PIA06193~large.jpg'
VOYAGER_RINGS = 'https://pds-rings.seti.org/holdings/volumes/VG_28xx/VG_2801/EASYDATA/KM020/PS1P01.TAB'

# survey, width of the sharp map, and whether it has unphotographed holes to fill
HIPS = {'moon': ('CDS/P/Moon/LROC-WAC-100m', 4096, False), 'mercury': ('CDS/P/Mercury/MESSENGER-MDIS-LOI-166m', 4096, False),
        'venus': ('CDS/P/Venus/Magellan/C3-MDIR-ClrTopo-6600m-color', 4096, False), 'mars': ('CDS/P/Mars/Viking-MDIM21-color', 4096, False),
        # Cassini's Jupiter map is 3600 wide and Voyager 2's Neptune much coarser; more pixels would only blur
        'jupiter': ('CDS/P/Jupiter/PIA07782', 4096, False), 'neptune': ('CDS/P/Neptune/Voyager2', 2048, False),
        'io': ('CDS/P/Io/Galileo-SSI-1km', 2048, True), 'europa': ('CDS/P/Europa/Voyager-GalileoSSI-500m', 2048, True),
        'ganymede': ('CDS/P/Ganymede/VoyagerGalileo-SSI-1km', 2048, True), 'callisto': ('CDS/P/Callisto/Voyager-Galileo-simp-1km', 2048, True)}
RING_IN, RING_OUT = 74000, 140500   # km from Saturn's centre, the C ring's inner edge out past the F ring


def get(url):
    # the PDS Rings Node turns away Python's default user agent
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'lantern-hill-sky-maps'}), timeout=300) as r:
        return r.read()


def image(url):
    return np.asarray(Image.open(io.BytesIO(get(url))).convert('RGB')).astype(float)


def save(name, a):
    for file, img in ((f'{name}.jpg', a), (f'{name}-small.jpg', resample(a, 512, 256))):
        path = os.path.join(OUT, file)
        Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(path, quality=82)
        print(f'{file}: {os.path.getsize(path):,} bytes')


def lats(h):
    return 90 - (np.arange(h) + .5)*180/h


def resample(a, w, h):
    return np.asarray(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize((w, h), Image.LANCZOS)).astype(float)


def opal(cycle, planet, rotation, filters):
    # OPAL maps start at 360°W (0°E) on the left and run east; ours start at 180°W
    a = image(OPAL.format(cycle, planet, f'{planet}-{rotation}_{filters}'))
    return np.roll(a, a.shape[1]//2, axis=1)


def at_lat(a, want):
    """Rows of a whole-globe map at the given latitudes, by linear interpolation between rows."""
    h = a.shape[0]
    y = np.clip((90 - want)*h/180 - .5, 0, h - 1)
    i = np.floor(y).astype(int); j = np.minimum(i + 1, h - 1); f = (y - i)[:, None, None]
    return a[i]*(1 - f) + a[j]*f


def blend(layers, h):
    """Layers of (rows, lat_ok) in order of trust, each row band feathered into the next. Rows no
    layer covers repeat the nearest covered row's average colour."""
    lat = lats(h)
    out, weight = np.zeros_like(layers[0][0]), np.zeros(h)
    for rows, ok in layers:
        w = np.clip(ok(lat), 0, 1)*(1 - weight)
        out += rows*w[:, None, None]; weight += w
    covered = np.where(weight > .99)[0]
    out[weight > 0] /= weight[weight > 0][:, None, None]
    for i in np.where(weight <= .99)[0]:
        near = covered[np.argmin(abs(covered - i))]
        out[i] = out[i]*weight[i] + out[near].mean(0)*(1 - weight[i])
    return out


def ramp(lo, hi, soft=2):
    """1 well inside [lo, hi] (degrees of latitude), easing to 0 over `soft` degrees at each edge."""
    return lambda lat: np.clip((lat - lo)/soft, 0, 1)*np.clip((hi - lat)/soft, 0, 1)


def matched(src, ref, overlap):
    """src scaled colour by colour to match ref where both saw the same latitudes."""
    lat = lats(src.shape[0]); m = overlap(lat) > .5
    return src*(ref[m].mean((0, 1))/src[m].mean((0, 1)))


def hips(name):
    survey, w, holes = HIPS[name]
    q = urllib.parse.urlencode(dict(hips=survey, width=w, height=w//2, projection='CAR', fov=360, ra=0, dec=0, format='jpg'))
    a = image(HIPS2FITS + q)
    # Cassini never saw Jupiter's south pole; those rows come back black
    lit = (a.max(2) > 20).mean(1) > .5
    a = blend([(a, lambda lat: np.interp(lat, lats(len(lit))[::-1], lit[::-1].astype(float)))], a.shape[0])
    if holes:
        dark = a.max(2) < 20
        for i in np.nonzero(dark.any(1))[0]:
            if (~dark[i]).any():
                a[i, dark[i]] = a[i, ~dark[i]].mean(0)
    return a


def saturn():
    w, h = 2048, 1024
    now, before = opal(32, 'saturn', '2025a', 'f395n-f502n-f631n'), opal(25, 'saturn', '2018a', 'f395n-f502n-f631n')
    # OPAL latitudes are planetographic; the globe is a squashed sphere, whose rows go by parametric latitude
    beta = lats(h); flat = 60268/54364
    graphic = np.degrees(np.arctan(np.tan(np.radians(beta))*flat))
    now, before = (resample(at_lat(m, graphic), w, h) for m in (now, before))
    # 2025's equator is hidden behind the rings seen edge-on; 2018 has it, and the north pole's hexagon
    ok_now = lambda lat: ramp(-80, 74, 3)(lat)*(1 - ramp(-3, 7, 1.5)(lat))
    before = matched(before, now, lambda lat: ramp(10, 70)(lat))
    return blend([(now, ok_now), (before, ramp(-6, 95, 3))], h)


def uranus():
    w, h = 1024, 512
    lat = lats(h)
    north = resample(opal(33, 'uranus', '2025a', 'f657n-f547m-f467m'), w, h)
    tropics = matched(resample(opal(22, 'uranus', '2014a', 'f467m-f547m-f658n'), w, h), north, ramp(5, 40))
    # Voyager 2 flew in with the south pole almost straight ahead, so the pole sits at the disc's
    # centre and a latitude line is a ring around it; the haze is featureless enough that where
    # longitude 0 lies doesn't show
    v = image(VOYAGER_URANUS); disc = v.sum(2) > 90
    ys, xs = np.nonzero(disc); cy, cx, r = ys.mean(), xs.mean(), np.sqrt(disc.sum()/np.pi)
    lon = np.radians(np.linspace(-180, 180, w, endpoint=False))
    rr = r*np.cos(np.radians(lat))[:, None]
    py, px = (cy + rr*np.sin(lon)).astype(int), (cx + rr*np.cos(lon)).astype(int)
    # the photo darkens toward its limb and toward its shadowed side; Minnaert's law undoes the
    # first, and taking each latitude's colour all the way round its ring undoes the second
    mu = np.clip(np.sin(np.radians(-lat)), .05, 1)[:, None, None]
    south = v[np.clip(py, 0, v.shape[0] - 1), np.clip(px, 0, v.shape[1] - 1)]/mu**.7
    south = matched(np.repeat(south.mean(1, keepdims=True), w, 1), tropics, ramp(-40, -20))
    return blend([(north, ramp(4, 95, 4)), (tropics, ramp(-28, 95, 4)), (south, ramp(-95, -22, 4))], h)


def rings():
    r = np.linspace(RING_IN, RING_OUT, 1024)
    t = np.array([[float(x) for x in line.split(',')[:4:3]] for line in get(VOYAGER_RINGS).decode().splitlines() if line.strip()])
    # Voyager flags where no starlight got through at all with 99; the B ring is that thick
    tau = np.clip(np.interp(r, t[:, 0], t[:, 1]), 0, 5)
    # Cassini's portrait shows the rings' right-hand tip edge-on to the picture, so there the
    # distance from Saturn's centre along the row is the true ring radius; 778px is the A ring's edge
    cas = image(CASSINI_SATURN)
    x = (949 + r/136774*778).round().astype(int)
    rgb = cas[478:487, np.clip(x, 0, cas.shape[1] - 1)].mean(0)
    rgb = rgb/max(1, rgb.max())*255
    # opacity holds tau over 5 as 0..255; the shader turns it into how much light gets through
    a = np.concatenate([rgb, (tau/5*255)[:, None]], 1)
    Image.fromarray(np.repeat(a[None], 4, 0).astype(np.uint8), 'RGBA').save(os.path.join(OUT, 'saturn-rings.png'))
    print(f'saturn-rings.png: {os.path.getsize(os.path.join(OUT, "saturn-rings.png")):,} bytes')


def sharp(tile):
    a = np.asarray(Image.open(io.BytesIO(tile)).convert('L').filter(ImageFilter.MedianFilter(3)), float)[8:-8, 8:-8]
    step = lambda s: [abs(a[:, s:] - a[:, :-s]).mean(), abs(a[s:, :] - a[:-s, :]).mean(),
                      abs(a[s:, s:] - a[:-s, :-s]).mean(), abs(a[s:, :-s] - a[:-s, s:]).mean()]
    return min(f/(w + .5) for f, w in zip(step(2), step(8)))


def closeups():
    # 0.4 by eye: above it, craters and ridges stand crisp; below, the ground is a blur (Io's whole
    # map falls below, as its close passes aren't in it)
    order, out = 3, {}
    for moon in ('io', 'europa', 'ganymede', 'callisto'):
        url = 'https://alasky.cds.unistra.fr/Planets/' + HIPS[moon][0].replace('/', '_') + f'/Norder{order}/Dir0/Npix{{}}.jpg'
        with ThreadPoolExecutor(8) as pool:
            scores = list(pool.map(lambda n: sharp(get(url.format(n))), range(12*4**order)))
        out[moon] = {str(order): [n for n, v in enumerate(scores) if v > .4]}
        print(f'closeups {moon}: {len(out[moon][str(order)])} tiles')
    with open(os.path.join(OUT, 'closeups.json'), 'w') as f:
        json.dump(out, f, separators=(',', ':'))


os.makedirs(OUT, exist_ok=True)
want = set(sys.argv[1:]) or {*HIPS, 'saturn', 'uranus', 'rings', 'closeups'}
for body in HIPS:
    if body in want: save(body, hips(body))
if 'saturn' in want: save('saturn', saturn())
if 'uranus' in want: save('uranus', uranus())
if 'rings' in want: rings()
if 'closeups' in want: closeups()
