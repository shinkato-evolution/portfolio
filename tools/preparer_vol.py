"""Prépare les planches de la Phase 1 V2 (chute et vol à dos de dragon).

Usage : python tools/preparer_vol.py <montagnes.png> <panorama.png> <elements_haut.png> <dragon_poses.png>
Sorties dans public/sprites/v2/ :
    montagne-<n>.webp   éléments de relief (ordre : rangées de haut en bas, de gauche à droite)
    haut-<n>.webp       éléments vus de dessus (nuages, brumes, dragons, oiseaux : même ordre)
    dragon-<0..7>.webp  poses du dragon avec son cavalier, vu de dos, sur un canevas commun (même ancrage)
    panorama.webp       décor de fond du vol
    prod/contact-v2-*.png : planches de contrôle numérotées (hors site)
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preparer_decor import detourer, rogner, RACINE  # noqa: E402

SORTIE = os.path.join(RACINE, "public", "sprites", "v2")
CONTROLE = os.path.join(RACINE, "prod")


def composantes(rgba, aire_min=1500, dilatation=8):
    """Objets séparés d'une planche détourée : liste de (masque, boîte) triés par rangée puis de gauche à droite."""
    a = np.asarray(rgba.getchannel("A")) > 100
    et, n = ndimage.label(ndimage.binary_dilation(a, iterations=dilatation))
    objets = []
    for i, sl in enumerate(ndimage.find_objects(et), start=1):
        m = (et == i) & a
        if m.sum() < aire_min:
            continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        objets.append({"masque": m, "boite": (x0, y0, x1, y1), "cy": (y0 + y1) / 2, "cx": (x0 + x1) / 2})
    objets.sort(key=lambda o: o["cy"])
    rangees, courante = [], []
    for o in objets:
        if courante and o["cy"] - np.mean([c["cy"] for c in courante]) > 170:
            rangees.append(courante); courante = []
        courante.append(o)
    if courante:
        rangees.append(courante)
    return [o for r in rangees for o in sorted(r, key=lambda o: o["cx"])]


def extraire(rgba, o, marge=3):
    arr = np.asarray(rgba).copy()
    arr[~ndimage.binary_dilation(o["masque"], iterations=2), 3] = 0
    x0, y0, x1, y1 = o["boite"]
    return rogner(Image.fromarray(arr, "RGBA").crop((max(0, x0 - marge), max(0, y0 - marge), x1 + marge, y1 + marge)))


def reduire(im, cote=1024):
    im = im.copy(); im.thumbnail((cote, cote), Image.LANCZOS); return im


def controle(nom, vignettes):
    os.makedirs(CONTROLE, exist_ok=True)
    col, w = 6, 300
    lignes = (len(vignettes) + col - 1) // col
    fond = Image.new("RGB", (col * w, lignes * w), (255, 0, 255))
    d = ImageDraw.Draw(fond)
    for i, v in enumerate(vignettes):
        t = v.copy(); t.thumbnail((w - 20, w - 40), Image.LANCZOS)
        x, y = (i % col) * w + 10, (i // col) * w + 28
        fond.paste(t, (x, y), t)
        d.text((x, y - 22), str(i + 1), fill=(255, 255, 255))
    fond.save(os.path.join(CONTROLE, f"contact-v2-{nom}.png"))


def planche(chemin, prefixe):
    rgba = detourer(Image.open(chemin).convert("RGB"))
    objets = composantes(rgba)
    sorties = []
    for i, o in enumerate(objets, start=1):
        im = reduire(extraire(rgba, o))
        im.save(os.path.join(SORTIE, f"{prefixe}-{i}.webp"), quality=88, method=6)
        sorties.append(im)
    controle(prefixe, sorties)
    print(prefixe, len(sorties), "objets")


def dragon(chemin):
    rgba = detourer(Image.open(chemin).convert("RGB"))
    W, H = rgba.size
    objets = composantes(rgba, aire_min=20000, dilatation=4)
    print("dragon : composantes", len(objets))
    if len(objets) != 8:
        sys.exit("attendu : 8 poses")
    # Ancrage commun : le centre de la boîte de chaque pose reste à la même place dans un canevas partagé.
    demi_w = max(max(o["cx"] - o["boite"][0], o["boite"][2] - o["cx"]) for o in objets) + 4
    demi_h = max(max(o["cy"] - o["boite"][1], o["boite"][3] - o["cy"]) for o in objets) + 4
    taille = (int(demi_w * 2), int(demi_h * 2))
    vignettes = []
    for i, o in enumerate(objets):
        arr = np.asarray(rgba).copy()
        arr[~ndimage.binary_dilation(o["masque"], iterations=2), 3] = 0
        x0, y0 = int(o["cx"] - demi_w), int(o["cy"] - demi_h)
        pose = Image.fromarray(arr, "RGBA").crop((x0, y0, x0 + taille[0], y0 + taille[1]))
        pose = pose.resize((taille[0] // 2, taille[1] // 2), Image.LANCZOS)
        pose.save(os.path.join(SORTIE, f"dragon-{i}.webp"), quality=90, method=6)
        vignettes.append(pose)
    controle("dragon", vignettes)
    print("canevas", taille[0] // 2, "x", taille[1] // 2)


def main():
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    os.makedirs(SORTIE, exist_ok=True)
    planche(sys.argv[1], "montagne")
    im = Image.open(sys.argv[2]).convert("RGB")
    im = im.resize((2048, int(2048 * im.height / im.width)), Image.LANCZOS)
    im.save(os.path.join(SORTIE, "panorama.webp"), quality=84, method=6)
    planche(sys.argv[3], "haut")
    dragon(sys.argv[4])


if __name__ == "__main__":
    main()
