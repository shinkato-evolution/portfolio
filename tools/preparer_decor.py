"""Prépare le décor de l'acte 1 : détoure le fond magenta, découpe la planche d'éléments, convertit le fond.

Usage :
    python tools/preparer_decor.py <planche_elements.png> <plateforme.png> <fond.png>

Sorties dans public/sprites/ :
    fond-ciel.webp            fond sans transparence
    plateforme.webp           plateforme détourée, rognée
    elements/<cellule>-<n>.webp   un fichier par objet (cellules : arches, bannieres, nuages, herbes)
    (prod/contact-elements.png : planche de contrôle numérotée, hors site)
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORTIE = os.path.join(RACINE, "public", "sprites")
CELLULES = ["arches", "bannieres", "nuages", "herbes"]  # haut-gauche, haut-droite, bas-gauche, bas-droite


def detourer(img):
    """Retire le magenta #FF00FF (fondu en douceur) et corrige la frange rosée des bords."""
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = (r + b) / 2 - g
    alpha = 1 - np.clip((m - 70) / 90, 0, 1)
    out = a.copy()
    frange = (alpha > 0) & (alpha < 1)
    for c, v in ((0, 255), (2, 255)):
        ch = out[..., c]
        ch[frange] = np.clip((ch[frange] - (1 - alpha[frange]) * v) / np.maximum(alpha[frange], 0.05), 0, 255)
    rgba = np.dstack([out, alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def rogner(img, marge=2):
    box = img.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    if not box:
        return None
    x0, y0, x1, y1 = box
    return img.crop((max(0, x0 - marge), max(0, y0 - marge), x1 + marge, y1 + marge))


def trouver_filet(lum_profil, centre, ecart):
    """Position du filet clair le plus proche du centre."""
    zone = lum_profil[centre - ecart:centre + ecart]
    return centre - ecart + int(np.argmax(zone))


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    elements, plateforme, fond = sys.argv[1:]
    os.makedirs(os.path.join(SORTIE, "elements"), exist_ok=True)

    # Fond : conversion directe.
    f = Image.open(fond).convert("RGB")
    f.save(os.path.join(SORTIE, "fond-ciel.webp"), quality=86, method=6)
    print("fond-ciel.webp", f.size)

    # Plateforme : détourage + rognage.
    p = rogner(detourer(Image.open(plateforme)))
    p.save(os.path.join(SORTIE, "plateforme.webp"), quality=90, method=6, lossless=False)
    print("plateforme.webp", p.size)

    # Planche d'éléments : 4 cellules séparées par un filet clair.
    im = Image.open(elements).convert("RGB")
    W, H = im.size
    lum = np.asarray(im.convert("L")).astype(np.float32)
    xc = trouver_filet(lum[: H // 4].mean(axis=0), W // 2, W // 20)
    yc = trouver_filet(lum[:, : W // 4].mean(axis=1), H // 2, H // 20)
    marge = 10
    boites = [(0, 0, xc, yc), (xc, 0, W, yc), (0, yc, xc, H), (xc, yc, W, H)]
    contact = []
    for nom, (x0, y0, x1, y1) in zip(CELLULES, boites):
        cell = detourer(im.crop((x0 + marge, y0 + marge, x1 - marge, y1 - marge)))
        alpha = np.asarray(cell.getchannel("A")) > 128
        epais = ndimage.binary_dilation(alpha, iterations=7)  # soude mât + drapeau, tige + fleur
        etiquettes, n = ndimage.label(epais)
        objets = []
        for k in range(1, n + 1):
            masque = (etiquettes == k) & alpha
            if masque.sum() < 900:
                continue
            ys, xs = np.where(masque)
            objets.append((ys.min(), xs.min(), k, masque))
        objets.sort(key=lambda o: (o[0] // 120, o[1]))  # lecture : lignes puis gauche-droite
        for i, (_, _, k, masque) in enumerate(objets, 1):
            piece = cell.copy()
            a = np.asarray(piece.getchannel("A")).copy()
            a[~ndimage.binary_dilation(masque, iterations=2)] = 0
            piece.putalpha(Image.fromarray(a))
            piece = rogner(piece)
            piece.save(os.path.join(SORTIE, "elements", f"{nom}-{i}.webp"), quality=90, method=6)
            contact.append((f"{nom}-{i}", piece))
            print(f"{nom}-{i}", piece.size)

    # Planche de contrôle (fond gris) pour vérifier le découpage.
    colonnes, taille = 6, 260
    lignes = (len(contact) + colonnes - 1) // colonnes
    feuille = Image.new("RGB", (colonnes * taille, lignes * (taille + 20)), (120, 130, 140))
    d = ImageDraw.Draw(feuille)
    for i, (nom, piece) in enumerate(contact):
        v = piece.copy()
        v.thumbnail((taille - 12, taille - 12))
        x, y = (i % colonnes) * taille, (i // colonnes) * (taille + 20)
        feuille.paste(v, (x + 6, y + 18), v)
        d.text((x + 6, y + 3), nom, fill=(255, 255, 255))
    feuille.save(os.path.join(RACINE, "prod", "contact-elements.png"))
    print("total", len(contact))


if __name__ == "__main__":
    main()
