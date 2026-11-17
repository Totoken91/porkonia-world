import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import sys
import sys
src = ROOT + '/src/'
tpl = open(src + 'template.html', encoding='utf-8').read()
world = open(ROOT + '/data/world2.js', encoding='utf-8').read()
game = ''.join(open(src + f, encoding='utf-8').read() + '\n' for f in ['a_core.js', 'b_tracks.js', 'c_scenery.js', 'd_train.js', 'd1_assets.js', 'd2_explore.js', 'd3_props.js', 'e_game.js'])
html = tpl.replace('/*CZ*/', open(ROOT + '/data/cz.js').read() + open(ROOT + '/data/car.js').read()).replace('/*WORLD*/', world).replace('/*GAME*/', game)
open(ROOT + '/dist/index.html', 'w', encoding='utf-8').write(html)
print(len(html) // 1024, 'KB')
