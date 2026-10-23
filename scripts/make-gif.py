"""Turns the recorded frames into docs/timelapse.gif. Usage: python3 scripts/make-gif.py <frames-dir> [out.gif]"""
import glob, sys
from PIL import Image

frames = [Image.open(f).convert('RGB') for f in sorted(glob.glob(f'{sys.argv[1]}/*.png'))]
w = 560
frames = [f.resize((w, round(f.height * w / f.width)), Image.LANCZOS) for f in frames]
pal = [f.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for f in frames]
out = sys.argv[2] if len(sys.argv) > 2 else 'docs/timelapse.gif'
pal[0].save(out, save_all=True, append_images=pal[1:], duration=[700] + [140] * (len(pal) - 2) + [1200], loop=0, optimize=True)
print(out, len(pal), 'frames')
