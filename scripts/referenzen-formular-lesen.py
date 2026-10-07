#!/usr/bin/env python3
"""
Liest ein ausgefülltes Referenzen-Formular (ip3-referenzen-formular.docx) und gibt die
Werte aller Felder als JSON aus. Grundlage sind die Tags der Inhaltssteuerelemente:
ref:<id>:<feld> für bestehende Referenzen, neu:<n>:<feld> für neue.

Ausgabe:
    {"ref": {"<id>": {"<feld>": wert, ...}, ...},
     "neu": {"1": {...}, "2": {...}, "3": {...}}}

Werte:
    Textfelder              Text ohne Platzhalter (Platzhalter sichtbar: "")
    text, rueckfragen       Absätze mit "\\n\\n" verbunden, leere Absätze entfallen
    Auswahlfelder           angezeigter Text (Platzhalter: "")
    umfang:<Begriff>        true / false
    bild, foto2, foto3      {"status": "bild vorhanden", "ziel": "media/image3.jpg",
                             "breite_px": 1400, "hoehe_px": 788, "platzhalter": false,
                             "format": "JPEG", "bytes": 263186, "sha256": "..."}
                            sonst {"status": "kein bild"} bzw. "bild verknüpft"

Aufruf:
    python3 scripts/referenzen-formular-lesen.py FORMULAR.docx [-o werte.json] [--vorlage LEER.docx] [--bilder ORDNER]

    --vorlage  ergänzt bei Bildern "geaendert": true/false (Vergleich mit dem leeren Formular)
    --bilder   speichert jedes Bild, das kein Platzhalter ist, als <art>_<schluessel>_<feld>.<endung>;
               zusammen mit --vorlage nur die neu eingefügten oder ersetzten Fotos

Text, der im grauen Feldkasten neben dem Steuerelement steht (in Word passiert das, wenn man
rechts neben einen kurzen Eintrag klickt), wird bei Textfeldern mit übernommen; LibreOffice
speichert mehrere Absätze ebenfalls so. Hinweise dazu und zu Unstimmigkeiten (doppelte Tags,
fehlende Felder) gehen nach stderr.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import posixpath
import re
import sys
import zipfile
from pathlib import Path

from lxml import etree

try:
    from PIL import Image
except ImportError:  # Pixelmaße sind dann nicht verfügbar
    Image = None

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
W14 = 'http://schemas.microsoft.com/office/word/2010/wordml'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PR = 'http://schemas.openxmlformats.org/package/2006/relationships'
RT_DOC = R + '/officeDocument'
RT_GLOSSAR = R + '/glossaryDocument'


def w(tag):
    return f'{{{W}}}{tag}'


FELDER = (['titel', 'kategorie', 'ort', 'jahr', 'leistung', 'speicher', 'module', 'wechselrichter', 'netzebene',
           'komponenten'] + [f'umfang:{b}' for b in ('Planung', 'Genehmigung', 'Netzanschluss', 'Montage',
                                                      'Inbetriebnahme', 'Speicherintegration', 'Ladeinfrastruktur',
                                                      'Betriebsführung', 'Monitoring')]
          + ['text', 'fotograf', 'freigabe', 'startseite', 'reihenfolge', 'rueckfragen', 'bild', 'foto2', 'foto3'])
PLATZHALTER_STILE = {'Platzhaltertext', 'PlaceholderText'}
BLOCKFELDER = {'text', 'rueckfragen'}
PARSER = etree.XMLParser(resolve_entities=False, no_network=True, huge_tree=True, remove_blank_text=False)


def hinweis(text):
    print(f'Hinweis: {text}', file=sys.stderr)


# --------------------------------------------------------------------------- Paket


def lade_rels(z: zipfile.ZipFile, teil: str) -> dict:
    """Beziehungen eines Teils: rId -> (Ziel im Paket, Ziel wie angegeben, extern?)."""
    ordner, name = posixpath.split(teil)
    pfad = posixpath.join(ordner, '_rels', name + '.rels')
    if pfad not in z.namelist():
        return {}
    rels = {}
    for rel in etree.fromstring(z.read(pfad), PARSER).iter(f'{{{PR}}}Relationship'):
        ziel = rel.get('Target', '')
        extern = rel.get('TargetMode') == 'External'
        if extern:
            voll = ziel
        elif ziel.startswith('/'):
            voll = ziel.lstrip('/')
        else:
            voll = posixpath.normpath(posixpath.join(ordner, ziel))
        rels[rel.get('Id')] = (voll, ziel, extern, rel.get('Type'))
    return rels


def hauptteil(z: zipfile.ZipFile) -> str:
    """Pfad des Hauptdokuments laut _rels/.rels (normalerweise word/document.xml)."""
    for voll, _, extern, typ in lade_rels(z, '').values():
        if typ == RT_DOC and not extern:
            return voll
    return 'word/document.xml'


def platzhaltertexte(z: zipfile.ZipFile, dokument: str) -> dict:
    """docPart-Name -> Platzhaltertext aus dem Glossardokument."""
    texte = {}
    for voll, _, extern, typ in lade_rels(z, dokument).values():
        if typ == RT_GLOSSAR and not extern and voll in z.namelist():
            glossar = etree.fromstring(z.read(voll), PARSER)
            for teil in glossar.iter(w('docPart')):
                name = teil.find(f"{w('docPartPr')}/{w('name')}")
                koerper = teil.find(w('docPartBody'))
                if name is not None and koerper is not None:
                    texte[name.get(w('val'))] = text_aus(koerper).strip()
    return texte


# --------------------------------------------------------------------------- Text


XML_SPACE = '{http://www.w3.org/XML/1998/namespace}space'


def auslassen(el, ohne=None) -> bool:
    """Gelöschter Text (Änderungsverfolgung) oder Text innerhalb von `ohne`."""
    for vorfahr in el.iterancestors():
        if vorfahr.tag in (w('del'), w('moveFrom')) or vorfahr is ohne:
            return True
    return False


def text_aus(el, ohne=None) -> str:
    """Sichtbarer Text eines Elements wie in Word; `ohne` blendet einen Teilbaum aus."""
    teile = []
    for n in el.iter():
        t = n.tag
        if t == w('t'):
            if not auslassen(n, ohne):
                text = n.text or ''
                if n.get(XML_SPACE) != 'preserve':
                    text = text.strip(' \t\r\n')   # Word ignoriert Randleerzeichen ohne xml:space
                teile.append(text)
            continue
        if ohne is not None and t in (w('tab'), w('br'), w('cr'), w('noBreakHyphen'), w('sym')) and \
                auslassen(n, ohne):
            continue
        elif t == w('tab') and n.getparent() is not None and n.getparent().tag == w('r'):
            teile.append('\t')
        elif t in (w('br'), w('cr')):
            teile.append('\n')
        elif t == w('noBreakHyphen'):
            teile.append('-')
        elif t == w('sym'):
            code = n.get(w('char'))
            if code:
                try:
                    teile.append(chr(int(code, 16)))
                except ValueError:
                    pass
    return ''.join(teile)


def nur_platzhalterstil(inhalt) -> bool:
    laeufe = [r for r in inhalt.iter(w('r')) if text_aus(r).strip()]
    if not laeufe:
        return False
    for r in laeufe:
        stil = r.find(f"{w('rPr')}/{w('rStyle')}")
        if stil is None or stil.get(w('val')) not in PLATZHALTER_STILE:
            return False
    return True


def zeigt_platzhalter(pr) -> bool:
    e = pr.find(w('showingPlcHdr'))
    if e is None:
        return False
    v = e.get(w('val'))
    return v is None or v.lower() not in ('0', 'false', 'off')


# --------------------------------------------------------------------------- Werte


def bildinfo(z, rels, inhalt, pr) -> dict:
    blips = list(inhalt.iter(f'{{{A}}}blip'))
    if not blips:
        return {'status': 'kein bild', 'platzhalter': zeigt_platzhalter(pr)}
    kandidaten = []
    for blip in blips:
        rid = blip.get(f'{{{R}}}embed') or blip.get(f'{{{R}}}link')
        if not rid or rid not in rels:
            kandidaten.append({'status': 'bild fehlt', 'rid': rid})
            continue
        voll, ziel, extern, _ = rels[rid]
        if extern:
            kandidaten.append({'status': 'bild verknüpft', 'ziel': ziel, 'platzhalter': False})
            continue
        if voll not in z.namelist():
            kandidaten.append({'status': 'bild fehlt', 'ziel': ziel})
            continue
        daten = z.read(voll)
        info = {'status': 'bild vorhanden', 'ziel': ziel, 'breite_px': None, 'hoehe_px': None,
                'platzhalter': zeigt_platzhalter(pr), 'format': None, 'bytes': len(daten),
                'sha256': hashlib.sha256(daten).hexdigest(), '_daten': daten, '_pfad': voll}
        if Image is not None:
            try:
                with Image.open(io.BytesIO(daten)) as im:
                    info['breite_px'], info['hoehe_px'] = im.size
                    info['format'] = im.format
                    if im.info.get('ip3') == 'platzhalter':
                        info['platzhalter'] = True
            except Exception:  # z. B. EMF/WMF
                info['format'] = posixpath.splitext(voll)[1].lstrip('.').upper() or None
        kandidaten.append(info)
    if len(kandidaten) > 1:
        hinweis(f'{len(kandidaten)} Bilder in einem Bildfeld, das erste echte Foto wird gemeldet')
    echte = [k for k in kandidaten if k.get('status') == 'bild vorhanden' and not k.get('platzhalter')]
    return (echte or kandidaten)[0]


def eigene_zelle(sdt):
    """Tabellenzelle, die nur dieses eine Feld enthält (jedes Textfeld hat eine eigene Zelle)."""
    for vorfahr in sdt.iterancestors():
        if vorfahr.tag == w('tc'):
            felder = [s for s in vorfahr.iter(w('sdt')) if s.find(f"{w('sdtPr')}/{w('tag')}") is not None]
            return vorfahr if len(felder) == 1 else None
        if vorfahr.tag in (w('tbl'), w('body')):
            return None
    return None


def absaetze_aus(wurzel, ohne=None) -> list[str]:
    return [text_aus(p, ohne).strip() for p in wurzel.iter(w('p'))]


def wert_lesen(sdt, pr, feld, z, rels, platzhalter_texte, tag):
    inhalt = sdt.find(w('sdtContent'))
    if inhalt is None:
        inhalt = etree.Element(w('sdtContent'))
    kreuz = pr.find(f'{{{W14}}}checkbox')
    if kreuz is not None:
        an = kreuz.find(f'{{{W14}}}checked')
        if an is not None:
            v = an.get(f'{{{W14}}}val')
            return v is None or v.lower() in ('1', 'true', 'on')
        return text_aus(inhalt).strip() in ('\u2612', '\u2611', '\u2714', '\u2713', 'x', 'X')
    if pr.find(w('picture')) is not None:
        return bildinfo(z, rels, inhalt, pr)

    block = feld in BLOCKFELDER or inhalt.find(w('p')) is not None
    trenner = '\n\n' if block else ' '
    if inhalt.find(w('p')) is not None:
        eigener_text = trenner.join(a for a in absaetze_aus(inhalt) if a)
    else:
        eigener_text = text_aus(inhalt).strip()
    ph = pr.find(f"{w('placeholder')}/{w('docPart')}")
    ph_text = platzhalter_texte.get(ph.get(w('val'))) if ph is not None else None
    platzhalter = zeigt_platzhalter(pr) or bool(
        ph_text and eigener_text == ph_text and nur_platzhalterstil(inhalt))

    liste = pr.find(w('dropDownList'))
    if liste is None:
        liste = pr.find(w('comboBox'))
    zelle = eigene_zelle(sdt)
    aussen = ''
    if zelle is not None:   # Text, der in derselben Zelle neben dem Feld steht (Klick rechts neben das Feld)
        aussen = trenner.join(a for a in absaetze_aus(zelle, ohne=sdt) if a)

    if liste is not None:   # Auswahlfelder: nur der gewählte Wert, Zusatztext nur als Hinweis
        if aussen:
            hinweis(f'{tag}: Text neben dem Auswahlfeld nicht übernommen: {aussen!r}')
        if platzhalter:
            return ''
        for eintrag in liste.iter(w('listItem')):
            anzeige = eintrag.get(w('displayText')) or eintrag.get(w('value')) or ''
            if anzeige == eigener_text and eintrag.get(w('value')) == '':
                return ''                                    # Eintrag "auswählen" ohne Wert
        return eigener_text

    if zelle is None:
        return '' if platzhalter else eigener_text
    if aussen:
        hinweis(f'{tag}: Text außerhalb des Feldes, aber im Feldkasten übernommen: {aussen!r}')
    absaetze = absaetze_aus(zelle, ohne=inhalt if platzhalter else None)
    return trenner.join(a for a in absaetze if a)


def lies(pfad, vorlage=None, bilder_ordner=None) -> dict:
    with zipfile.ZipFile(pfad) as z:
        dokument = hauptteil(z)
        wurzel = etree.fromstring(z.read(dokument), PARSER)
        rels = lade_rels(z, dokument)
        ph_texte = platzhaltertexte(z, dokument)
        ergebnis = {'ref': {}, 'neu': {}}
        for sdt in wurzel.iter(w('sdt')):
            pr = sdt.find(w('sdtPr'))
            if pr is None:
                continue
            tag_el = pr.find(w('tag'))
            if tag_el is None:
                continue
            tag = tag_el.get(w('val')) or ''
            teile = tag.split(':', 2)
            if len(teile) != 3 or teile[0] not in ergebnis:
                continue
            art, schluessel, feld = teile
            ziel = ergebnis[art].setdefault(schluessel, {})
            if feld in ziel:
                hinweis(f'Tag doppelt, spätere Fassung verworfen: {tag}')
                continue
            ziel[feld] = wert_lesen(sdt, pr, feld, z, rels, ph_texte, tag)

    for art, eintraege in ergebnis.items():
        for schluessel, felder in list(eintraege.items()):
            fehlen = [f for f in FELDER if f not in felder]
            if fehlen:
                hinweis(f'{art}:{schluessel}: Felder fehlen: {", ".join(fehlen)}')
            # feste Reihenfolge wie im Formular, unbekannte Felder am Ende
            eintraege[schluessel] = {f: felder[f] for f in FELDER if f in felder} | \
                                    {f: v for f, v in felder.items() if f not in FELDER}

    if vorlage:
        alt = lies(vorlage)
        for art, eintraege in ergebnis.items():
            for schluessel, felder in eintraege.items():
                for feld, wert in felder.items():
                    if isinstance(wert, dict) and 'sha256' in wert:
                        alt_wert = alt.get(art, {}).get(schluessel, {}).get(feld)
                        alt_hash = alt_wert.get('sha256') if isinstance(alt_wert, dict) else None
                        wert['geaendert'] = wert['sha256'] != alt_hash

    if bilder_ordner:
        ordner = Path(bilder_ordner)
        ordner.mkdir(parents=True, exist_ok=True)
        for art, eintraege in ergebnis.items():
            for schluessel, felder in eintraege.items():
                for feld, wert in felder.items():
                    if not (isinstance(wert, dict) and wert.get('_daten')) or wert.get('platzhalter'):
                        continue
                    if vorlage and not wert.get('geaendert'):
                        continue                         # mit Vorlage nur neue oder ersetzte Fotos
                    endung = (posixpath.splitext(wert['_pfad'])[1] or '.bin').lower()
                    name = re.sub(r'[^A-Za-z0-9_-]+', '-', f'{art}_{schluessel}_{feld}')
                    datei = ordner / f'{name}{endung}'
                    datei.write_bytes(wert['_daten'])
                    wert['datei'] = str(datei)

    for eintraege in ergebnis.values():
        for felder in eintraege.values():
            for wert in felder.values():
                if isinstance(wert, dict):
                    wert.pop('_daten', None)
                    wert.pop('_pfad', None)
    return ergebnis


def main():
    ap = argparse.ArgumentParser(description='Liest das ausgefüllte Referenzen-Formular als JSON.')
    ap.add_argument('datei', type=Path)
    ap.add_argument('-o', '--ausgabe', type=Path)
    ap.add_argument('--vorlage', type=Path, help='leeres Formular zum Vergleich der Bilder')
    ap.add_argument('--bilder', type=Path, help='Ordner für die eingefügten Fotos')
    args = ap.parse_args()
    ergebnis = lies(args.datei, args.vorlage, args.bilder)
    text = json.dumps(ergebnis, ensure_ascii=False, indent=2)
    if args.ausgabe:
        args.ausgabe.write_text(text + '\n', encoding='utf-8')
    else:
        print(text)


if __name__ == '__main__':
    main()
