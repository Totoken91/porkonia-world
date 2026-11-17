import asyncio, sys, time
from playwright.async_api import async_playwright
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# pv3.py quality outprefix W H "js1||js2||..."
async def main():
    q, out, W, H, js = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width':W,'height':H}, device_scale_factor=1)
        await ctx.add_init_script("try{localStorage.setItem('porkonia-q3','%s')}catch(e){}" % q)
        pg = await ctx.new_page(); pg.set_default_timeout(1200000)
        pg.on('pageerror', lambda e: print('ERR', e, (e.stack or '')[:900], flush=True))
        pg.on('console', lambda m: print('CONSOLE', m.text[:300], flush=True) if m.type == 'error' else None)
        async def route(r):
            u=r.request.url
            if 'three@0.160.0/' in u: await r.fulfill(path=ROOT+'/node_modules/three/'+u.split('three@0.160.0/')[1], content_type='application/javascript')
            elif 'fonts.g' in u: await r.fulfill(body='', content_type='text/css')
            else: await r.continue_()
        await pg.route('**/*', route)
        t0 = time.time()
        await pg.goto('file://'+ROOT+'/dist/index.html?pause')
        for i in range(120):
            if await pg.evaluate("!!(window.__pe && window.__pe.render)"): break
            await asyncio.sleep(2)
        await pg.evaluate("document.getElementById('title').classList.add('gone'); window.pe = window.__pe; 1")
        await pg.evaluate(open(ROOT + '/tools/aer.js').read()); await pg.evaluate(open(ROOT + '/tools/prof.js').read())
        for i, part in enumerate(js.split('||')):
            r = await pg.evaluate(part)
            await pg.evaluate("window.__pe.render(2)")
            await pg.screenshot(path=f'{out}_{i}.png'); print('shot', i, r, round(time.time()-t0), flush=True)
            if len(sys.argv) > 6: print(await pg.evaluate('prof()'), flush=True)
        await b.close()
asyncio.run(main())
