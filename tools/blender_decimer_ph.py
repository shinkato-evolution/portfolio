"""Allège des modèles Poly Haven pour le web (à lancer dans Blender, sans interface).

    blender -b --python tools/blender_decimer_ph.py -- <dossier_source> <dossier_sortie> <id> [<id> ...]

Pour chaque <id> : importe <dossier_source>/<id>/<id>_1k.gltf, fusionne les maillages, réduit à ~CIBLE triangles (décimation),
recentre le modèle (centre en X/Y, base posée sur le sol), réduit les textures à 512 px et exporte <dossier_sortie>/<id>.glb.
Écrit aussi <dossier_sortie>/<id>.json (dimensions du modèle en mètres, triangles avant/après).
"""
import json
import os
import sys

import bpy

CIBLE = 14000
TEX = 512


def main():
    args = sys.argv[sys.argv.index("--") + 1:]
    src, out, ids = args[0], args[1], args[2:]
    os.makedirs(out, exist_ok=True)
    for id in ids:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=os.path.join(src, id, f"{id}_1k.gltf"))
        meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
        bpy.ops.object.select_all(action="DESELECT")
        for o in meshes:
            o.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        if len(meshes) > 1:
            bpy.ops.object.join()
        obj = bpy.context.view_layer.objects.active
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        avant = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        mod = obj.modifiers.new("dec", "DECIMATE")
        mod.ratio = min(1.0, CIBLE / max(1, avant))
        bpy.ops.object.modifier_apply(modifier="dec")
        apres = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        # Recentrage : centre X/Y, base à Z = 0 (Blender est en Z vers le haut ; l'export le convertit en Y vers le haut).
        xs = [v.co.x for v in obj.data.vertices]; ys = [v.co.y for v in obj.data.vertices]; zs = [v.co.z for v in obj.data.vertices]
        cx, cy, bz = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)
        for v in obj.data.vertices:
            v.co.x -= cx; v.co.y -= cy; v.co.z -= bz
        dims = [max(xs) - min(xs), max(zs) - min(zs), max(ys) - min(ys)]  # largeur, hauteur, profondeur
        for img in bpy.data.images:
            if img.size[0] > TEX:
                img.scale(TEX, TEX)
        bpy.ops.export_scene.gltf(filepath=os.path.join(out, f"{id}.glb"), export_format="GLB", export_image_format="JPEG", export_jpeg_quality=82, use_selection=False)
        json.dump({"largeur": dims[0], "hauteur": dims[1], "profondeur": dims[2], "triangles_avant": avant, "triangles_apres": apres}, open(os.path.join(out, f"{id}.json"), "w"))
        print(f"OK {id} {avant} -> {apres} triangles, dims {dims}")


main()
