"""Découpe la planche du personnage qui tombe (8 poses) : public/sprites/v2/chute-<0..7>.webp, canevas carré commun, centre de chaque pose au centre.
Usage : python tools/preparer_chute_perso.py <planche_8_poses.png>"""
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preparer_decor import detourer
from preparer_vol import composantes, SORTIE

rgba = detourer(Image.open(sys.argv[1]).convert("RGB"))
objets = composantes(rgba, aire_min=20000, dilatation=8)
print(len(objets), "poses")
if len(objets) != 8: sys.exit("attendu : 8")
demi = int(max(max(o["boite"][2] - o["boite"][0], o["boite"][3] - o["boite"][1]) for o in objets) / 2) + 4
os.makedirs(SORTIE, exist_ok=True)
import numpy as np
from scipy import ndimage
for i, o in enumerate(objets):
    arr = np.asarray(rgba).copy()
    arr[~ndimage.binary_dilation(o["masque"], iterations=2), 3] = 0
    cx, cy = int((o["boite"][0] + o["boite"][2]) / 2), int((o["boite"][1] + o["boite"][3]) / 2)
    im = Image.fromarray(arr, "RGBA").crop((cx - demi, cy - demi, cx + demi, cy + demi)).resize((420, 420), Image.LANCZOS)
    im.save(os.path.join(SORTIE, f"chute-{i}.webp"), quality=92, method=6)
