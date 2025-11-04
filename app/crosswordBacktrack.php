<?php
namespace Wanatest\Crossword;

final class Backtracker
{
    private const SIZE      = 15;
    private const MAX_NODE  = 1_500_000;
    private const MAX_TRIES = 3000;

    /* ===== Helpers multibyte – privés à la classe =========== */
    private static function len(string $s): int           { return \mb_strlen($s, 'UTF-8'); }
    private static function chr(string $s,int $i): string { return \mb_substr($s,$i,1,'UTF-8'); }

    private static function logicChar(string $w,int $i,bool $rtl,bool $across): string
    {
        return ($rtl && $across) ? self::chr($w, self::len($w)-1-$i) : self::chr($w,$i);
    }

    /* ===== placement unique ================================= */
    private static function placeOnce(array $order,bool $rtl): array
    {
        $G = array_fill(0, self::SIZE, array_fill(0, self::SIZE, ''));
        $placed = [];

        /* --- closures internes --- */
        $can = function(string $w,int $x,int $y,bool $across) use (&$G,$rtl): bool {
            $L = Backtracker::len($w);
            if ($across) {
                if (!$rtl && $x+$L > Backtracker::SIZE) return false;
                if ( $rtl && $x-$L+1 < 0)               return false;
            } elseif ($y+$L > Backtracker::SIZE) return false;

            if ($across) {
                $prev = $rtl ? $G[$y][$x+1] ?? '' : $G[$y][$x-1] ?? '';
                $next = $rtl ? ($x-$L >=0 ? $G[$y][$x-$L] ?? '' : '')
                             : ($x+$L <Backtracker::SIZE ? $G[$y][$x+$L] ?? '' : '');
                if ($prev || $next) return false;
            } else {
                if (($y>0 && $G[$y-1][$x]) || ($y+$L <Backtracker::SIZE && $G[$y+$L][$x])) return false;
            }

            $cross=false;
            for($i=0;$i<$L;$i++){
                $cx = $across ? ($rtl? $x-$i : $x+$i) : $x;
                $cy = $across ? $y : $y+$i;
                $cell = $G[$cy][$cx];
                $c    = Backtracker::logicChar($w,$i,$rtl,$across);
                if($cell && $cell!==$c) return false;
                if($cell==$c) $cross=true;

                if(!$cell){
                    if($across){
                        if(($cy>0 && $G[$cy-1][$cx]) || ($cy<Backtracker::SIZE-1 && $G[$cy+1][$cx])) return false;
                    }else{
                        if(($cx>0 && $G[$cy][$cx-1]) || ($cx<Backtracker::SIZE-1 && $G[$cy][$cx+1])) return false;
                    }
                }
            }
            return $cross || empty(array_filter($G, fn($r)=>array_filter($r)));
        };

        $put = function(string $w,int $x,int $y,bool $across) use (&$G,&$placed,$rtl){
            for($i=0;$i<Backtracker::len($w);$i++){
                $cx=$across?($rtl?$x-$i:$x+$i):$x;
                $cy=$across?$y:$y+$i;
                $G[$cy][$cx]=Backtracker::logicChar($w,$i,$rtl,$across);
            }
            $placed[]=['word'=>$w,'x'=>$x,'y'=>$y,'dir'=>$across?'across':'down'];
        };

        /* 1ᵉʳ mot centré */
        $first=$order[0]['word']; $L0=self::len($first);
        $row=intdiv(self::SIZE,2);
        $col=$rtl?intdiv(self::SIZE+$L0,2)-1:intdiv(self::SIZE-$L0,2);
        $put($first,$col,$row,true);

        /* suivants */
        for($idx=1;$idx<count($order);$idx++){
            $w=$order[$idx]['word']; $L=self::len($w); $ok=false;
            for($i=0;$i<$L && !$ok;$i++){
                $letter=self::logicChar($w,$i,$rtl,true);
                foreach($placed as $p){
                    $pw=$p['word']; $pL=self::len($pw);
                    for($k=0;$k<$pL && !$ok;$k++){
                        if(self::logicChar($pw,$k,$rtl,$p['dir']==='across')!==$letter) continue;
                        if($p['dir']==='across'){ // vertical
                            $px=$rtl?$p['x']-$k:$p['x']+$k; $py=$p['y']-$i;
                            if($py>=0 && $py+$L<=self::SIZE && $can($w,$px,$py,false)){
                                $put($w,$px,$py,false); $ok=true; break;
                            }
                        }else{                   // across
                            $cy=$p['y']+$k; $px=$rtl?$p['x']+$i:$p['x']-$i;
                            $fit=!$rtl ? ($px>=0&&$px+$L<=self::SIZE)
                                       : ($px-$L+1>=0&&$px<self::SIZE);
                            if($fit && $can($w,$px,$cy,true)){
                                $put($w,$px,$cy,true); $ok=true; break;
                            }
                        }
                    }
                }
            }
        }
        return [$G,$placed];
    }

    /* -------- recherche multi-tries ------------------------------ */
    usort($pairs,fn($a,$b)=>mblen($b['word'])-mblen($a['word']));
    $bestG=[]; $bestP=[]; $bestN=0;

    for($t=0;$t<self::MAX_TRIES;$t++){
        if($t>0) shuffle($pairs);
        [$G,$pl]=self::placeOnce($pairs,$rtl);
        $cnt=count($pl);
        if($cnt>$bestN){ $bestN=$cnt; $bestG=$G; $bestP=$pl; }
        if($cnt>=$min) break;
    }

    if($bestN<$min) die("Grille insuffisante ({$bestN} mots).");

    /* -------- numérotation + rognage ----------------------------- */
    $map=[]; $num=1;
    $isStart=function($x,$y,$d,$G) use($rtl){
        return $d==='across'
          ? ($rtl ? (($x==self::SIZE-1||!$G[$y][$x+1])&&($x-1>=0&&$G[$y][$x-1]))
                  : (($x==0||!$G[$y][$x-1])&&($x+1<self::SIZE&&$G[$y][$x+1])))
          : (($y==0||!$G[$y-1][$x])&&($y+1<self::SIZE&&$G[$y+1][$x]));
    };
    for($y=0;$y<self::SIZE;$y++)
      for($x=0;$x<self::SIZE;$x++)
        if($bestG[$y][$x] && ($isStart($x,$y,'across',$bestG)||$isStart($x,$y,'down',$bestG)))
            $map[$y.'_'.$x]=$num++;

    $across=$down=[]; $minR=$minC=self::SIZE; $maxR=$maxC=0;
    foreach($bestP as $p){
        $dest=&($p['dir']==='across'?$across:$down);
        $dest[]=[
          'num'=>$map[$p['y'].'_'.$p['x']],
          'answer'=>$p['word'],
          'pattern'=>'('.mblen($p['word']).')',
          'dir'=>$p['dir'],'x'=>$p['x'],'y'=>$p['y']
        ];
        $L=mblen($p['word']);
        $minR=min($minR,$p['y']);
        $maxR=max($maxR,$p['dir']==='down'?$p['y']+$L-1:$p['y']);
        if($p['dir']==='across'){
            if($rtl){ $minC=min($minC,$p['x']-$L+1); $maxC=max($maxC,$p['x']); }
            else   { $minC=min($minC,$p['x']);      $maxC=max($maxC,$p['x']+$L-1); }
        }else{ $minC=min($minC,$p['x']); $maxC=max($maxC,$p['x']); }
    }
    usort($across,fn($a,$b)=>$a['num']<=>$b['num']);
    usort($down  ,fn($a,$b)=>$a['num']<=>$b['num']);

    $trim=[];
    for($y=$minR;$y<=$maxR;$y++){
        $row=[];
        for($x=$minC;$x<=$maxC;$x++) $row[]=$bestG[$y][$x];
        $trim[]=$row;
    }
    foreach($across as &$a){ $a['x']-=$minC; $a['y']-=$minR; }
    foreach($down   as &$d){ $d['x']-=$minC; $d['y']-=$minR; }

    return [$trim,$across,$down];
}

/* ====== Interface publique ======================================= */
function generateCrosswordBacktrack(array $pairs,bool $rtl=false,int $minWords=12): array
{
    return Backtracker::generate($pairs,$rtl,$minWords);
}
