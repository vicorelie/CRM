#!/usr/bin/env python3
import sys, json
from crossword_grid import CrosswordGrid

def main():
    raw = sys.stdin.read()
    # 1) Charger JSON et unwrap si dict
    try:
        pairs = json.loads(raw)
    except Exception as e:
        try:
            pairs = json.loads(json.loads(raw))
        except:
            print(json.dumps({"error":"Invalid input","detail":str(e),"raw":raw}), file=sys.stderr)
            sys.exit(1)

    if isinstance(pairs, dict):
        if 'data' in pairs and isinstance(pairs['data'], list):
            pairs = pairs['data']
        elif all(isinstance(v, dict) for v in pairs.values()):
            pairs = list(pairs.values())

    # 2) Validation
    if not isinstance(pairs, list) or not all(isinstance(p, dict) for p in pairs):
        print(json.dumps({"error":"Invalid pairs format","detail":type(pairs).__name__}), file=sys.stderr)
        sys.exit(1)

    rtl      = False
    grid_obj = None

    # 3) Essayer 15×15 puis 17×17
    for size in (15,17):
        g = CrosswordGrid(size=size, rtl=rtl, time_limit=5)
        if g.build(pairs, min_words=min(len(pairs),12)):
            grid_obj = g
            break

    if grid_obj:
        cells, across, down = grid_obj.export()
    else:
        # 4) Fallback horizontal (jusqu’à 12 mots)
        words = pairs[:12]
        maxL  = max(len(w['word']) for w in words)
        rows  = len(words)*2
        full  = [['' for _ in range(maxL)] for _ in range(rows)]
        acrossL = []
        num, row = 1, 0

        for p in words:
            w, clue = p['word'], p['clue']
            L = len(w)
            for i,ch in enumerate(w):
                full[row][i] = ch
            acrossL.append({
                'num':num,'answer':w,'clue':clue,
                'pattern':f'({L})','dir':'across','x':0,'y':row
            })
            num += 1; row += 2

        # trim rectangle
        used_rows = [i for i,r in enumerate(full) if any(r)]
        used_cols = [j for j in range(maxL) if any(full[i][j] for i in used_rows)]
        min_r, max_r = min(used_rows), max(used_rows)
        min_c, max_c = min(used_cols), max(used_cols)
        cells = [ full[i][min_c:max_c+1] for i in range(min_r,max_r+1) ]
        across, down = acrossL, []
        for e in across:
            e['x'] -= min_c; e['y'] -= min_r

    # 5) Sortie JSON
    result = {'cells':cells,'across':across,'down':down}
    sys.stdout.write(json.dumps(result, ensure_ascii=False))

if __name__=='__main__':
    main()
