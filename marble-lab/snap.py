import sys, asyncio
from playwright.async_api import async_playwright
page, prefix, lvl, fam, steps = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), [int(x) for x in sys.argv[5].split(',')]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
        pg = await b.new_page(viewport={'width':1100,'height':1400})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        async def route(r):
            u=r.request.url
            if 'matter' in u: await r.fulfill(path='/home/claude/explorerkids/marble-lab/out/matter.min.js', content_type='application/javascript')
            elif u.startswith('file:'): await r.continue_()
            else: await r.abort()
        await pg.route('**/*', route)
        await pg.goto('file://'+page); await pg.wait_for_timeout(500)
        await pg.evaluate(f"playing=false; lvlKey='{lvl}'; famIdx={fam}; candIdx=0; render(); playing=false;")
        done=0
        for s in steps:
            await pg.evaluate(f"(()=>{{ while(R.steps<{s} && !R.done) R.step(); draw(); }})()")
            el = await pg.query_selector('canvas'); await el.screenshot(path=f'{prefix}_{s}.png')
        print(await pg.evaluate("JSON.stringify({steps:R.steps, done:R.done, success:R.success, tokens:R.tokens})"))
        for e in errs: print('ERR', e)
        await b.close()
asyncio.run(main())
