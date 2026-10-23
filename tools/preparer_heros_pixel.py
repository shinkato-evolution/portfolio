"""Découpe les deux planches du héros pixel (fond magenta) en images recalées.

Usage :
    python tools/preparer_heros_pixel.py <marche.png> <repos_chute.png> [--pixel N]

Planche marche : 8 poses (4 colonnes x 2 lignes). Planche repos/chute : repos x4, surprise x2, chute x2.
Chaque image est rognée, recalée (pieds au sol, tête alignée en largeur) et ramenée à la vraie grille de pixels
(--pixel N = côté d'un pixel dessiné dans la planche ; estimé si absent), puis enregistrée dans
public/sprites/heros-pixel/<nom>.png. Un fichier meta.json donne, par image, l'ancre (fractions de l'image).
Les images de chute sont ancrées au centre ; les autres aux pieds.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preparer_decor import detourer, RACINE  # noqa: E402

SORTIE = os.path.join(RACINE, "public", "sprites", "heros-pixel")


def cellules(img, cols, lignes):
    """Découpe une planche en cases égales et rend, par case, l'image détourée rognée sur le personnage."""
    W, H = img.size
    res = []
    for j in range(lignes):
        for i in range(cols):
            c = img.crop((i * W // cols, j * H // lignes, (i + 1) * W // cols, (j + 1) * H // lignes))
            a = np.asarray(c.getchannel("A")) > 128
            et, n = ndimage.label(ndimage.binary_dilation(a, iterations=6))
            if n == 0:
                raise SystemExit("case vide")
            taille = ndimage.sum(np.ones_like(et), et, range(1, n + 1))
            garde = 1 + int(np.argmax(taille))
            masque = (et == garde) & a
            arr = np.asarray(c).copy()
            arr[~masque, 3] = 0
            c = Image.fromarray(arr, "RGBA")
            res.append(c.crop(c.getchannel("A").getbbox()))
    return res


def estimer_pixel(frames):
    """Côté du pixel dessiné : période des contours verticaux et horizontaux."""
    meilleur, score_max = 4, 0
    energie_x = 0
    for f in frames[:4]:
        a = np.asarray(f.convert("RGB")).astype(np.int32)
        m = np.asarray(f.getchannel("A")) > 128
        gx = (np.abs(np.diff(a, axis=1)).sum(axis=2) * (m[:, 1:] & m[:, :-1])).sum(axis=0)
        energie_x = energie_x + gx if isinstance(energie_x, np.ndarray) and len(energie_x) == len(gx) else gx
    e = energie_x.astype(np.float64)
    tot = e.sum() or 1
    for s in range(3, 15):
        sc = max(e[p::s].sum() for p in range(s)) / tot
        sc_norm = sc - 1.0 / s
        if sc_norm > score_max * 1.12:  # on préfère le plus petit côté dont le score est franchement meilleur
            meilleur, score_max = s, sc_norm
    return meilleur


def vers_grille(f, s):
    """Ramène une image à la grille de pixels : moyenne par bloc de s x s, palette réduite, alpha binaire."""
    w, h = f.size
    f = f.crop((0, 0, w - w % s, h - h % s))
    petit = f.resize((f.width // s, f.height // s), Image.BOX)
    a = np.asarray(petit.getchannel("A")) > 140
    rgb = petit.convert("RGB").quantize(colors=40, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    arr = np.dstack([np.asarray(rgb), (a * 255).astype(np.uint8)])
    out = Image.fromarray(arr, "RGBA")
    box = out.getchannel("A").getbbox()
    return out.crop(box)


def centre_tete(f):
    """Abscisse (en pixels de l'image) du centre de la tête : barycentre du quart supérieur."""
    a = np.asarray(f.getchannel("A")) > 128
    haut = a[: max(4, f.height // 5)]
    xs = np.where(haut)[1]
    return float(xs.mean()) if len(xs) else f.width / 2


def main():
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    if len(args) != 2:
        sys.exit(__doc__)
    pixel = None
    if "--pixel" in sys.argv:
        pixel = int(sys.argv[sys.argv.index("--pixel") + 1])
    marche = cellules(detourer(Image.open(args[0])), 4, 2)
    repos = cellules(detourer(Image.open(args[1])), 4, 2)
    s = pixel or estimer_pixel(marche + repos)
    print("côté du pixel dessiné :", s)
    marche = [vers_grille(f, s) for f in marche]
    repos = [vers_grille(f, s) for f in repos]
    # Même échelle entre les deux planches : on compare le corps debout (marche n°3, jambes serrées) et le repos n°1.
    rapport = marche[2].height / repos[0].height
    print("rapport de taille entre planches :", round(rapport, 3), "(1 = identique)")
    os.makedirs(SORTIE, exist_ok=True)
    meta = {}
    noms = [(f"marche-{i}", f, "pieds") for i, f in enumerate(marche)]
    noms += [(f"repos-{i}", f, "pieds") for i, f in enumerate(repos[:4])]
    noms += [(f"surprise-{i}", f, "pieds" if i == 0 else "centre") for i, f in enumerate(repos[4:6])]
    noms += [(f"chute-{i}", f, "centre") for i, f in enumerate(repos[6:8])]
    for nom, f, mode in noms:
        cx = centre_tete(f) if mode == "pieds" else f.width / 2
        f.save(os.path.join(SORTIE, f"{nom}.png"))
        meta[nom] = {"w": f.width, "h": f.height, "ax": round(cx / f.width, 4), "ay": 1.0 if mode == "pieds" else 0.5}
        print(nom, f.size, mode)
    meta["_pixel"] = s
    meta["_rapport"] = round(rapport, 3)
    for chemin_meta in (os.path.join(SORTIE, "meta.json"), os.path.join(RACINE, "src", "content", "heros-pixel.json")):
        with open(chemin_meta, "w", encoding="utf-8") as fh:
            json.dump(meta, fh, indent=1)
    # Contrôle visuel (fond clair) hors site.
    t = 3
    haut = max(f.height for _, f, _ in noms) * t
    larg = sum(f.width * t + 12 for _, f, _ in noms)
    feuille = Image.new("RGB", (larg, haut + 12), (205, 238, 250))
    x = 6
    for nom, f, _ in noms:
        g = f.resize((f.width * t, f.height * t), Image.NEAREST)
        feuille.paste(g, (x, haut + 6 - g.height), g)
        x += g.width + 12
    feuille.save(os.path.join(RACINE, "prod", "contact-heros-pixel.png"))


if __name__ == "__main__":
    main()
