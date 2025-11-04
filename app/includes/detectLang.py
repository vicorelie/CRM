#!/usr/bin/env python3
# includes/detectLang.py

import site
# Ajoute automatiquement le site-packages utilisateur
site.addsitedir(site.USER_SITE)

import sys
from langdetect import detect_langs, DetectorFactory

# Fix du seed pour reproductibilité
DetectorFactory.seed = 0

def detect_language(text: str) -> str:
    text = text.strip()
    if not text:
        return "inconnue"
    try:
        # On ne garde que FR, EN, AR, RU, HE, IW
        allowed = {"fr", "en", "ar", "ru", "he", "iw"}
        probs   = sorted(detect_langs(text), key=lambda x: x.prob, reverse=True)
        for p in probs:
            if p.lang in allowed:
                return p.lang
        return probs[0].lang
    except:
        return "inconnue"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("inconnue")
        sys.exit(0)
    path = sys.argv[1]
    try:
        with open(path, encoding="utf-8") as f:
            content = f.read()
    except:
        print("inconnue")
        sys.exit(0)

    lang = detect_language(content)
    print(lang)
