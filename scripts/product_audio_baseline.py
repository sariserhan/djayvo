"""Expand the preserved Q0 baseline to ten authorized inputs, without training."""
import argparse
import json
from pathlib import Path
from q0_audit import ROOT, inputs, digest, run

def cohort():
    rows=inputs()
    ledger=json.loads((ROOT/'renders/licensed-evaluation-20261018/manifest-final.json').read_text())
    ids=['ls-7976-110124-0019','ls-1988-147956-0018','ls-777-126732-0074','ls-84-121123-0012','commons-claps']
    for identifier in ids:
        row=next(r for r in ledger['clips'] if r['id']==identifier)
        if row['consent']['local_processing'] is not True or row['license']['id'] not in ('CC-BY-4.0','CC0-1.0','PD-author') or digest(row['path'])!=row['sha256']:
            raise ValueError('Authorization or input checksum failed')
        rows.append(row)
    assert len(rows)==10 and len({r['sha256'] for r in rows})==10
    return rows

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--renderer',type=Path,default=ROOT/'build-product/jamloom_remix')
    args=parser.parse_args()
    run(args.output.resolve(),args.renderer,cohort(),
        'Ten fixed inputs: prior five Q0 sources plus four other licensed speakers and claps. Selected before rendering; not 20-source release cohort. Local owner-only packet.')
