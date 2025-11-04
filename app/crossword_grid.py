# crossword_grid.py
import time

class CrosswordGrid:
    def __init__(self, size=15, rtl=False, time_limit=60):
        self.n = size
        self.rtl = rtl
        self.grid = [[None]*size for _ in range(size)]
        self.pairs = []
        self.placed = []
        self.coords = {}
        self.start = None
        self.time_limit = time_limit

    def build(self, pairs, min_words=10):
        # Trier du plus long au plus court
        self.pairs = sorted(pairs, key=lambda p: len(p['word']), reverse=True)
        self.placed = []
        self.start = time.time()
        self.coords = {}
        # Pré-calcul positions
        for i, p in enumerate(self.pairs):
            pos = self._all_positions(p['word'])
            if not pos:
                return False
            self.coords[i] = pos
        return self._dfs(min_words)

    def export(self):
        # Numérotation
        num = 1
        mapnum = {}
        for y in range(self.n):
            for x in range(self.n):
                if self.grid[y][x] and (self._is_start(x,y,'across') or self._is_start(x,y,'down')):
                    mapnum[f"{y}-{x}"] = num; num += 1

        across, down = [], []
        for p in self.placed:
            entry = {
                'num': mapnum[f"{p['y']}-{p['x']}"],
                'answer': p['word'],
                'clue': p['clue'],
                'pattern': f"({len(p['word'])})",
                'dir': p['dir'],
                'x': p['x'],
                'y': p['y']
            }
            (across if p['dir']=='across' else down).append(entry)

        across.sort(key=lambda e: e['num'])
        down.sort(key=lambda e: e['num'])

        # Rogner
        min_r = min(p['y'] for p in self.placed)
        max_r = max(p['y'] + (len(p['word'])-1 if p['dir']=='down' else 0) for p in self.placed)
        min_c = min(p['x'] - (len(p['word'])-1 if (self.rtl and p['dir']=='across') else 0) for p in self.placed)
        max_c = max(p['x'] + (len(p['word'])-1 if (not self.rtl and p['dir']=='across') else 0) for p in self.placed)

        cells = [
            [ self.grid[y][x] for x in range(min_c, max_c+1) ]
            for y in range(min_r, max_r+1)
        ]

        for lst in (across, down):
            for e in lst:
                e['x'] -= min_c
                e['y'] -= min_r

        return cells, across, down

    def _dfs(self, goal):
        if time.time() - self.start > self.time_limit:
            return False
        if len(self.placed) >= goal:
            return True

        # Choisir mot avec moins d’options
        choices = [i for i in self.coords if not self.pairs[i].get('used')]
        best = min(choices, key=lambda i: len(self.coords[i]), default=None)
        if best is None:
            return False

        w, clue = self.pairs[best]['word'], self.pairs[best]['clue']
        for x, y, dir in self.coords[best]:
            if not self._fit(w, x, y, dir):
                continue
            self._place(w, x, y, dir)
            self.pairs[best]['used'] = True
            self.placed.append({'word':w,'clue':clue,'x':x,'y':y,'dir':dir})

            if self._dfs(goal):
                return True

            # backtrack
            self._remove(w, x, y, dir)
            self.placed.pop()
            del self.pairs[best]['used']

        return False

    def _all_positions(self, w):
        res, L = [], len(w)
        for y in range(self.n):
            for x in range(self.n):
                for dir in ('across','down'):
                    if self._fit(w, x, y, dir):
                        res.append((x, y, dir))
        return res

    def _place(self, w, x, y, dir):
        for i, ch in enumerate(self._chars(w, dir)):
            cx = (x - i) if (self.rtl and dir=='across') else (x + i if dir=='across' else x)
            cy = (y + i) if dir=='down' else y
            self.grid[cy][cx] = ch

    def _remove(self, w, x, y, dir):
        for i, ch in enumerate(self._chars(w, dir)):
            cx = (x - i) if (self.rtl and dir=='across') else (x + i if dir=='across' else x)
            cy = (y + i) if dir=='down' else y
            keep = any(
                (cx == (p['x'] - k if (self.rtl and p['dir']=='across') else (p['x']+k if p['dir']=='across' else p['x'])))
                and (cy == (p['y']+k if p['dir']=='down' else p['y']))
                for p in self.placed for k in range(len(p['word']))
            )
            if not keep:
                self.grid[cy][cx] = None

    def _chars(self, w, dir):
        return list(w[::-1]) if (self.rtl and dir=='across') else list(w)

    def _fit(self, w, x, y, dir):
        L = len(w)
        # bordures
        if dir=='across':
            if (not self.rtl and x+L>self.n) or (self.rtl and x-L+1<0):
                return False
        else:
            if y+L>self.n:
                return False

        over = 0
        for i, ch in enumerate(self._chars(w, dir)):
            cx = (x - i) if (self.rtl and dir=='across') else (x + i if dir=='across' else x)
            cy = (y + i) if dir=='down' else y
            cell = self.grid[cy][cx]
            if cell is not None:
                if cell != ch: return False
                over += 1
            else:
                if dir=='across' and ((cy>0 and self.grid[cy-1][cx]) or (cy+1<self.n and self.grid[cy+1][cx])):
                    return False
                if dir=='down' and ((cx>0 and self.grid[cy][cx-1]) or (cx+1<self.n and self.grid[cy][cx+1])):
                    return False

        if self.placed and over==0:
            return False

        # cases avant/après
        if dir=='across':
            prev = self.grid[y][x+1] if self.rtl else (self.grid[y][x-1] if x-1>=0 else None)
            nxt  = self.grid[y][x-L] if self.rtl else (self.grid[y][x+L] if x+L<self.n else None)
            if prev or nxt: return False
        else:
            if (y>0 and self.grid[y-1][x]) or (y+L<self.n and self.grid[y+L][x]):
                return False

        return True

    def _is_start(self, x, y, dir):
        if dir=='across':
            left  = (x==self.n-1 or not self.grid[y][x+1]) if self.rtl else (x==0 or not self.grid[y][x-1])
            right = (x>0 and self.grid[y][x-1]) if self.rtl else (x+1<self.n and self.grid[y][x+1])
            return left and right
        up   = (y==0 or not self.grid[y-1][x])
        down = (y+1<self.n and self.grid[y+1][x])
        return up and down
