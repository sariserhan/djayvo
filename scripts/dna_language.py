"""Pinned singer languages and script-aware lyric bounds; not pronunciation certification."""
import json
from pathlib import Path
import re
import random
import unicodedata

LANGUAGES=json.loads((Path(__file__).resolve().parents[1]/'assets/manifests/dna-languages.json').read_text())['languages']
SCRIPT_GROUPS={'ru':'CYRILLIC','uk':'CYRILLIC','bg':'CYRILLIC','ar':'ARABIC','fa':'ARABIC','ur':'ARABIC','he':'HEBREW','hi':'DEVANAGARI','ne':'DEVANAGARI','sa':'DEVANAGARI','bn':'BENGALI','ta':'TAMIL','te':'TELUGU','th':'THAI','el':'GREEK','ko':'HANGUL','sr':'LATIN|CYRILLIC','az':'LATIN|CYRILLIC|ARABIC','pa':'GURMUKHI|ARABIC','ja':'CJK|HIRAGANA|KATAKANA','zh':'CJK','yue':'CJK'}
# A small regional preference policy; only languages already identified in favorites can gain weight.
COUNTRY_LANGUAGES={
    'TR':['tr'],'RU':['ru'],'UA':['uk'],'AZ':['az'],'BG':['bg'],
    'ES':['es','ca'],'MX':['es'],'AR':['es'],'CO':['es'],'CL':['es'],'PE':['es'],
    'VE':['es'],'EC':['es'],'BO':['es'],'PY':['es'],'UY':['es'],'CR':['es'],
    'PA':['es'],'GT':['es'],'HN':['es'],'SV':['es'],'NI':['es'],'CU':['es'],'DO':['es'],
    'US':['en'],'GB':['en'],'AU':['en'],'NZ':['en'],'IE':['en'],'CA':['en','fr'],
    'PT':['pt'],'BR':['pt'],'FR':['fr'],'BE':['nl','fr','de'],'CH':['de','fr','it'],
    'DE':['de'],'AT':['de'],'NL':['nl'],'IT':['it'],'GR':['el'],'CY':['el','tr'],
    'DK':['da'],'FI':['fi','sv'],'SE':['sv'],'NO':['no'],'IS':['is'],'LT':['lt'],
    'PL':['pl'],'CZ':['cs'],'SK':['sk'],'HU':['hu'],'RO':['ro'],'MD':['ro'],
    'HR':['hr'],'RS':['sr'],'ME':['sr'],'BA':['hr','sr'],
    'JP':['ja'],'KR':['ko'],'CN':['zh'],'TW':['zh'],'HK':['yue','zh'],'MO':['yue','zh','pt'],
    'IN':['hi','bn','ta','te','pa','en'],'PK':['ur','pa'],'BD':['bn'],'NP':['ne'],
    'LK':['ta'],'TH':['th'],'VN':['vi'],'ID':['id'],'MY':['ms'],
    'SG':['en','zh','ms','ta'],'PH':['tl','en'],'IL':['he','ar'],'IR':['fa'],
    'SA':['ar'],'AE':['ar'],'EG':['ar'],'IQ':['ar'],'JO':['ar'],'LB':['ar'],
    'SY':['ar'],'KW':['ar'],'QA':['ar'],'BH':['ar'],'OM':['ar'],'YE':['ar'],
    'DZ':['ar'],'MA':['ar'],'TN':['ar'],'LY':['ar'],'SD':['ar'],
    'KE':['sw','en'],'TZ':['sw'],'HT':['ht','fr']}

def language(value):
    if not isinstance(value,str) or value not in LANGUAGES:raise ValueError('Choose a supported singing language')
    return value

def choose_language(rows, refs, seed, country=None):
    """One vote per favorite with an identified vocal language; unknowns do not vote."""
    if not isinstance(rows,list) or len(rows)!=len(refs):raise ValueError('Identify the language of every favorite')
    votes=[]
    for index,row in enumerate(rows,1):
        if not isinstance(row,dict) or type(row.get('index')) is not int or row['index']!=index:
            raise ValueError('Language evidence must match the favorite order')
        code=row.get('language')
        if 'language' not in row:raise ValueError('Use a language code or null for unknown')
        if code is not None:votes.append(language(code))
    counts={code:votes.count(code) for code in sorted(set(votes))}
    if country is not None and (not isinstance(country,str) or not re.fullmatch('[A-Z]{2}',country)):
        raise ValueError('Invalid country hint')
    regional=COUNTRY_LANGUAGES.get(country,[])
    weights={code:count*(1.5 if code in regional and len(counts)>1 else 1) for code,count in counts.items()}
    code=random.Random(seed).choices(list(weights),weights=list(weights.values()))[0] if votes else 'en'
    total=sum(weights.values())
    return {'code':code,'label':LANGUAGES[code],
            'basis':'weighted draw from interpreted favorite languages' if votes else 'English fallback: favorite languages unknown',
            'counts':counts,'unknown':len(refs)-len(votes),
            'probabilities':{code:weight/total for code,weight in weights.items()},
            'regional_boost':[code for code in weights if weights[code]>counts[code]]}

def lyric_units(lyrics, code):
    text=re.sub(r'\[[^\]]*\]','',lyrics)
    if code in ('ja','zh','yue','th'):return sum(c.isalpha() for c in text), (200,1400)
    return len(text.split()), (100,260)

def validate_script(lyrics, code):
    letters=[c for c in re.sub(r'\[[^\]]*\]','',lyrics) if c.isalpha()]
    expected=SCRIPT_GROUPS.get(code,'LATIN')
    if not letters or sum(bool(re.search(expected,unicodedata.name(c,''))) for c in letters)/len(letters)<.6:
        raise ValueError('Lyrics use the wrong writing system for the singing language')
