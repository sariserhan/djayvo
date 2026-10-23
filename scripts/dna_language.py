"""Pinned singer languages and script-aware lyric bounds; not pronunciation certification."""
import json
from pathlib import Path
import re
import unicodedata

LANGUAGES=json.loads((Path(__file__).resolve().parents[1]/'assets/manifests/dna-languages.json').read_text())['languages']
SCRIPT_GROUPS={'ru':'CYRILLIC','uk':'CYRILLIC','bg':'CYRILLIC','ar':'ARABIC','fa':'ARABIC','ur':'ARABIC','he':'HEBREW','hi':'DEVANAGARI','ne':'DEVANAGARI','sa':'DEVANAGARI','bn':'BENGALI','ta':'TAMIL','te':'TELUGU','th':'THAI','el':'GREEK','ko':'HANGUL','sr':'LATIN|CYRILLIC','az':'LATIN|CYRILLIC|ARABIC','pa':'GURMUKHI|ARABIC','ja':'CJK|HIRAGANA|KATAKANA','zh':'CJK','yue':'CJK'}

def language(value):
    if not isinstance(value,str) or value not in LANGUAGES:raise ValueError('Choose a supported singing language')
    return value

def lyric_units(lyrics, code):
    text=re.sub(r'\[[^\]]*\]','',lyrics)
    if code in ('ja','zh','yue','th'):return sum(c.isalpha() for c in text), (200,1400)
    return len(text.split()), (100,260)

def validate_script(lyrics, code):
    letters=[c for c in re.sub(r'\[[^\]]*\]','',lyrics) if c.isalpha()]
    expected=SCRIPT_GROUPS.get(code,'LATIN')
    if not letters or sum(bool(re.search(expected,unicodedata.name(c,''))) for c in letters)/len(letters)<.6:
        raise ValueError('Lyrics use the wrong writing system for the singing language')
