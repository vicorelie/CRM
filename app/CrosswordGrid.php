<?php
/***************************************************************************
 *  CrosswordGrid — Backtracking UTF-8 (LTR & RTL) — PHP ≥ 7.4
 *  
 *  • build(array $pairs, int $minWords) ⇒ self | false  
 *  • export() ⇒ array [ $cells, $across, $down ]  
 *  
 *  Chaque mot (après le premier) doit croiser au moins une lettre existante.  
 *  TIME_LIMIT (60 s) protège contre les recherches trop longues.  
 ***************************************************************************/

final class CrosswordGrid
{
    private int   $n;
    private bool  $rtl;
    private array $grid;    // [y][x] = null|string
    private array $placed;  // liste des mots placés
    private array $pairs;   // couples ['word','clue']
    private array $coords;  // positions valides par mot
    private float $start;   // timestamp du début du DFS

    private const TIME_LIMIT = 60;  // secondes max pour le DFS

    public function __construct(int $size = 15, bool $rtl = false)
    {
        $this->n   = $size;
        $this->rtl = $rtl;
        $this->grid = array_fill(0, $size, array_fill(0, $size, null));
    }

    /*======================== build() ========================*/
    public function build(array $pairs, int $minWords = 10)
    {
        $this->start  = microtime(true);

        // Trier les mots du plus long au plus court
        usort($pairs, static fn($a,$b) =>
            mb_strlen($b['word'],'UTF-8') <=> mb_strlen($a['word'],'UTF-8')
        );
        $this->pairs  = $pairs;
        $this->placed = [];

        // Pré-calculer toutes les positions possibles
        $this->coords = [];
        foreach ($pairs as $i => $p) {
            $pos = $this->allPositions($p['word']);
            if (empty($pos)) {
                // Impossible de placer ce mot
                return false;
            }
            $this->coords[$i] = $pos;
        }

        // Lancer la DFS pour placer >= $minWords mots
        return $this->dfs($minWords) ? $this : false;
    }

    /*======================== export() =======================*/
    public function export(): array
    {
        // 1) Numérotation des cases de départ
        $map = []; $num = 1;
        for ($y = 0; $y < $this->n; $y++) {
            for ($x = 0; $x < $this->n; $x++) {
                if ($this->grid[$y][$x] !== null
                    && ($this->isStart($x,$y,'across') || $this->isStart($x,$y,'down')))
                {
                    $map["{$y}-{$x}"] = $num++;
                }
            }
        }

        // 2) Construire les listes across / down
        $across = [];
        $down   = [];
        foreach ($this->placed as $p) {
            $entry = [
                'num'     => $map["{$p['y']}-{$p['x']}"],
                'answer'  => $p['word'],
                'clue'    => $p['clue'],
                'pattern' => '(' . mb_strlen($p['word'],'UTF-8') . ')',
                'dir'     => $p['dir'],
                'x'       => $p['x'],
                'y'       => $p['y'],
            ];
            if ($p['dir'] === 'across') {
                $across[] = $entry;
            } else {
                $down[]   = $entry;
            }
        }
        usort($across, static fn($a,$b)=> $a['num'] <=> $b['num']);
        usort($down,   static fn($a,$b)=> $a['num'] <=> $b['num']);

        // 3) Rogner la grille au rectangle minimal contenant tous les mots
        [$minR,$minC,$maxR,$maxC] = $this->bounds($this->placed);
        $cells = [];
        for ($y = $minR; $y <= $maxR; $y++) {
            $row = [];
            for ($x = $minC; $x <= $maxC; $x++) {
                $row[] = $this->grid[$y][$x];
            }
            $cells[] = $row;
        }

        // 4) Ajuster coordonnées (shift)
        foreach ($across as &$a) { $a['x'] -= $minC; $a['y'] -= $minR; }
        foreach ($down   as &$d) { $d['x'] -= $minC; $d['y'] -= $minR; }

        return [$cells, $across, $down];
    }

    /*=========================== dfs() ==========================*/
    private function dfs(int $goal): bool
    {
        // Timeout
        if (microtime(true) - $this->start > self::TIME_LIMIT) {
            return false;
        }
        // Objectif atteint ?
        if (count($this->placed) >= $goal) {
            return true;
        }

        // Choisir le mot avec le moins d'options de placement
        $best   = null;
        $fewest = PHP_INT_MAX;
        foreach ($this->coords as $i => $pos) {
            if (!isset($this->pairs[$i]['used']) && count($pos) < $fewest) {
                $fewest = count($pos);
                $best   = $i;
            }
        }
        if ($best === null) {
            return false;
        }

        $word = $this->pairs[$best]['word'];
        $clue = $this->pairs[$best]['clue'];

        // Essayer chaque position valide
        foreach ($this->coords[$best] as [$x,$y,$dir]) {
            if (!$this->fit($word,$x,$y,$dir)) {
                continue;
            }
            // Placer
            $this->place($word,$x,$y,$dir);
            $this->pairs[$best]['used'] = true;
            $this->placed[] = [
                'word'=>$word,'clue'=>$clue,'x'=>$x,'y'=>$y,'dir'=>$dir
            ];

            if ($this->dfs($goal)) {
                return true;
            }

            // Backtrack
            $this->remove($word,$x,$y,$dir);
            array_pop($this->placed);
            unset($this->pairs[$best]['used']);
        }

        return false;
    }

    /*--------------- allPositions() ----------------------------*/
    private function allPositions(string $w): array
    {
        $L    = mb_strlen($w,'UTF-8');
        $list = [];
        for ($y = 0; $y < $this->n; $y++) {
            for ($x = 0; $x < $this->n; $x++) {
                if ($this->fit($w,$x,$y,'across')) {
                    $list[] = [$x,$y,'across'];
                }
                if ($this->fit($w,$x,$y,'down')) {
                    $list[] = [$x,$y,'down'];
                }
            }
        }
        return $list;
    }

    /*---------------- place() -------------------------------*/
    private function place(string $w,int $x,int $y,string $d): void
    {
        $L = mb_strlen($w,'UTF-8');
        for ($i = 0; $i < $L; $i++) {
            $cx = $d==='across'
                ? ($this->rtl ? $x-$i : $x+$i)
                : $x;
            $cy = $d==='down'
                ? $y+$i
                : $y;
            $this->grid[$cy][$cx] = $this->char($w,$i,$d);
        }
    }

    /*---------------- remove() ------------------------------*/
    private function remove(string $w,int $x,int $y,string $d): void
    {
        $L = mb_strlen($w,'UTF-8');
        for ($i = 0; $i < $L; $i++) {
            $cx = $d==='across'
                ? ($this->rtl ? $x-$i : $x+$i)
                : $x;
            $cy = $d==='down'
                ? $y+$i
                : $y;

            // conserver si partagée par un autre mot
            $keep = false;
            foreach ($this->placed as $p) {
                $LL = mb_strlen($p['word'],'UTF-8');
                for ($k = 0; $k < $LL; $k++) {
                    $px = $p['dir']==='across'
                        ? ($this->rtl ? $p['x']-$k : $p['x']+$k)
                        : $p['x'];
                    $py = $p['dir']==='down'
                        ? $p['y']+$k
                        : $p['y'];
                    if ($px===$cx && $py===$cy) {
                        $keep = true;
                        break 2;
                    }
                }
            }
            if (!$keep) {
                $this->grid[$cy][$cx] = null;
            }
        }
    }

    /*---------------- char() -------------------------------*/
    private function char(string $w,int $i,string $d): string
    {
        return ($this->rtl && $d==='across')
            ? mb_substr($w,-1-$i,1,'UTF-8')
            : mb_substr($w,   $i,  1,'UTF-8');
    }

    /*---------------- fit() -------------------------------*/
    private function fit(string $w,int $x,int $y,string $d): bool
    {
        $L = mb_strlen($w,'UTF-8');
        // bordures
        if ($d==='across') {
            if (!$this->rtl && $x+$L > $this->n) return false;
            if ( $this->rtl && $x-$L+1 < 0)      return false;
        } else {
            if ($y+$L > $this->n) return false;
        }
        $over = 0;
        for ($i = 0; $i < $L; $i++) {
            $cx = $d==='across'
                ? ($this->rtl ? $x-$i : $x+$i)
                : $x;
            $cy = $d==='down'
                ? $y+$i
                : $y;
            $cell = $this->grid[$cy][$cx];
            $c    = $this->char($w,$i,$d);
            if ($cell !== null) {
                if ($cell !== $c) return false;
                $over++;
            } else {
                // pas d'adjacence parallèle
                if ($d==='across' &&
                   (($cy>0            && $this->grid[$cy-1][$cx])||
                    ($cy+1<$this->n   && $this->grid[$cy+1][$cx]))) return false;
                if ($d==='down'  &&
                   (($cx>0            && $this->grid[$cy][$cx-1])||
                    ($cx+1<$this->n   && $this->grid[$cy][$cx+1]))) return false;
            }
        }
        // doit croiser si non premier mot
        if (!empty($this->placed) && $over===0) {
            return false;
        }
        // cases avant/après
        if ($d==='across') {
            $prev = $this->rtl
                ? ($x+1<$this->n?$this->grid[$y][$x+1]:null)
                : ($x-1>=0      ?$this->grid[$y][$x-1]:null);
            $next = $this->rtl
                ? ($x-$L>=0     ?$this->grid[$y][$x-$L]:null)
                : ($x+$L<$this->n?$this->grid[$y][$x+$L]:null);
            if ($prev || $next) return false;
        } else {
            if (($y>0 && $this->grid[$y-1][$x])||
                ($y+$L<$this->n&&$this->grid[$y+$L][$x])) return false;
        }
        return true;
    }

    /*---------------- isStart() ----------------------------*/
    private function isStart(int $x,int $y,string $d): bool
    {
        if ($d==='across') {
            $left  = $this->rtl
                ? ($x==$this->n-1 || $this->grid[$y][$x+1]===null)
                : ($x==0           || $this->grid[$y][$x-1]===null);
            $right = $this->rtl
                ? ($x>0 && $this->grid[$y][$x-1]!==null)
                : ($x+1<$this->n && $this->grid[$y][$x+1]!==null);
            return $left && $right;
        }
        // down
        $up   = ($y==0 || $this->grid[$y-1][$x]===null);
        $down = ($y+1<$this->n && $this->grid[$y+1][$x]!==null);
        return $up && $down;
    }

    /*---------------- bounds() -----------------------------*/
    private function bounds(array $pl): array
    {
        $minR=$minC=$this->n;
        $maxR=$maxC=0;
        foreach ($pl as $p) {
            $L = mb_strlen($p['word'],'UTF-8');
            $minR = min($minR, $p['y']);
            $maxR = max($maxR,
                $p['dir']==='down' ? $p['y']+$L-1 : $p['y']
            );
            if ($p['dir']==='across') {
                if ($this->rtl) {
                    $minC = min($minC, $p['x']-$L+1);
                    $maxC = max($maxC, $p['x']);
                } else {
                    $minC = min($minC, $p['x']);
                    $maxC = max($maxC, $p['x']+$L-1);
                }
            } else {
                $minC = min($minC, $p['x']);
                $maxC = max($maxC, $p['x']);
            }
        }
        return [$minR,$minC,$maxR,$maxC];
    }
}
