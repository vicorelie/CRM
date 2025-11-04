<?php
/**
 *  crosswordGridEngine.php — moteur 15×15 UTF-8 (LTR & RTL)
 *  --------------------------------------------------------
 *  [$grid , $across , $down] = generateGrid($pairs , $rtl);
 *    • $pairs : [['word'=>'APPLE','clue'=>'Fruit'], …]
 *    • $rtl   : true  ↔ hébreu / arabe (across droite→gauche)
 */

const SIZE      = 15;
const MAX_TRIES = 3000;   // ↑ tentatives

/* helpers multibyte */
function mblen(string $s): int            { return mb_strlen($s,'UTF-8'); }
function mbchr(string $s,int $i): string  { return mb_substr($s,$i,1,'UTF-8'); }

/* lettre logique (across RTL inversé, sinon inchangée) */
function ch(string $w,int $i,bool $rtl,string $dir): string
{ return ($rtl && $dir==='across') ? mbchr($w,mblen($w)-1-$i) : mbchr($w,$i); }

/* ================================================================== */
function placeAll(array $order,bool $rtl): array
{
    $G = array_fill(0,SIZE,array_fill(0,SIZE,''));
    $placed = [];

    $can=function($w,$x,$y,$dir)use(&$G,$rtl){
        $L=mblen($w);
        if($dir==='across'){
            if(!$rtl && $x+$L>SIZE) return false;
            if( $rtl && $x-$L+1<0 ) return false;
        }elseif($y+$L>SIZE) return false;

        /* bordures avant/après */
        if($dir==='across'){
            $prev=$rtl?($G[$y][$x+1]??''):($G[$y][$x-1]??'');
            $next=$rtl?($x-$L>=0?$G[$y][$x-$L]??'':'')
                      :($x+$L<SIZE?$G[$y][$x+$L]??'':'');
            if($prev||$next) return false;
        }else{
            if(($y>0&&$G[$y-1][$x])||($y+$L<SIZE&&$G[$y+$L][$x])) return false;
        }

        for($i=0;$i<$L;$i++){
            $cx=$dir==='across'?($rtl?$x-$i:$x+$i):$x;
            $cy=$dir==='down'  ?  $y+$i             :$y;
            $cell=$G[$cy][$cx]; $c=ch($w,$i,$rtl,$dir);
            if($cell && $cell!==$c) return false;

            if(!$cell){ // pas d’adjacence parallèle
                if($dir==='across'){
                    if(($cy>0&&$G[$cy-1][$cx])||($cy<SIZE-1&&$G[$cy+1][$cx])) return false;
                }else{
                    if(($cx>0&&$G[$cy][$cx-1])||($cx<SIZE-1&&$G[$cy][$cx+1])) return false;
                }
            }
        }
        return true;
    };

    $put=function($w,$x,$y,$dir)use(&$G,&$placed,$rtl){
        for($i=0;$i<mblen($w);$i++){
            $cx=$dir==='across'?($rtl?$x-$i:$x+$i):$x;
            $cy=$dir==='down'  ?  $y+$i             :$y;
            $G[$cy][$cx]=ch($w,$i,$rtl,$dir);
        }
        $placed[]=['word'=>$w,'x'=>$x,'y'=>$y,'dir'=>$dir];
    };

    /* 1ᵉʳ mot centré */
    $w0=$order[0]['word']; $L0=mblen($w0);
    $row=intdiv(SIZE,2);
    $col=$rtl?intdiv(SIZE+$L0,2)-1:intdiv(SIZE-$L0,2);
    $put($w0,$col,$row,'across');

    /* suivants — croisement ≥1 lettre, sinon ignoré */
    for($k=1;$k<count($order);$k++){
        $w=$order[$k]['word']; $L=mblen($w); $placedOK=false;
        for($i=0;$i<$L && !$placedOK;$i++){
            $c=ch($w,$i,$rtl,'across');
            foreach($placed as $p){
              $pw=$p['word']; $pL=mblen($pw);
              for($j=0;$j<$pL && !$placedOK;$j++){
                if(ch($pw,$j,$rtl,$p['dir'])!==$c) continue;
                if($p['dir']==='across'){
                    $px=$rtl?$p['x']-$j:$p['x']+$j; $py=$p['y']-$i;
                    if($py>=0&&$py+$L<=SIZE&&$can($w,$px,$py,'down')){
                        $put($w,$px,$py,'down'); $placedOK=true; break;
                    }
                }else{
                    $cy=$p['y']+$j; $px=$rtl?$p['x']+$i:$p['x']-$i;
                    $fit=!$rtl?($px>=0&&$px+$L<=SIZE):($px-$L+1>=0&&$px<SIZE);
                    if($fit&&$can($w,$px,$cy,'across')){
                        $put($w,$px,$cy,'across'); $placedOK=true; break;
                    }
                }
              }
            }
        }
    }
    return [$G,$placed];
}

/* ================================================================= */
function generateGrid(array $pairs,bool $rtl=false,int $minWords=10): array
{
    usort($pairs,fn($a,$b)=>mblen($b['word'])-mblen($a['word'])); // long→court base
    $bestGrid=$bestPlaced=[]; $bestScore=-INF;

    for($t=0;$t<MAX_TRIES;$t++){
        if($t>0) shuffle($pairs);
        [$G,$pl] = placeAll($pairs,$rtl);
        $count   = count($pl);

        /* score = densité */
        $minR=$minC=SIZE;$maxR=$maxC=0;
        foreach($pl as $p){
            $L=mblen($p['word']);
            $minR=min($minR,$p['y']);
            $maxR=max($maxR,$p['dir']==='down'?$p['y']+$L-1:$p['y']);
            if($p['dir']==='across'){
                if($rtl){ $minC=min($minC,$p['x']-$L+1); $maxC=max($maxC,$p['x']); }
                else    { $minC=min($minC,$p['x']);      $maxC=max($maxC,$p['x']+$L-1); }
            }else{ $minC=min($minC,$p['x']); $maxC=max($maxC,$p['x']); }
        }
        $area = ($maxR-$minR+1)*($maxC-$minC+1);
        $score = $count*100 - $area;

        if($score>$bestScore){ $bestScore=$score; $bestGrid=$G; $bestPlaced=$pl; }

        if($count >= $minWords) break;
    }

    if(count($bestPlaced) < $minWords){
        // Dernier recours : si <4 mots, on jette l’erreur ; sinon on accepte
        if(count($bestPlaced) < 4) die("Impossible de croiser au moins 4 mots.");
    }

    /* numérotation */
    $map=[]; $n=1;
    $isStart=function($x,$y,$d,$G,$rtl){
        return $d==='across'
          ? ($rtl ? (($x==SIZE-1||!$G[$y][$x+1])&&($x-1>=0&&$G[$y][$x-1]))
                  : (($x==0||!$G[$y][$x-1])&&($x+1<SIZE&&$G[$y][$x+1])))
          : (($y==0||!$G[$y-1][$x])&&($y+1<SIZE&&$G[$y+1][$x]));
    };
    for($y=0;$y<SIZE;$y++)
     for($x=0;$x<SIZE;$x++)
      if($bestGrid[$y][$x] && ($isStart($x,$y,'across',$bestGrid,$rtl)||$isStart($x,$y,'down',$bestGrid,$rtl)))
        $map[$y.'_'.$x]=$n++;

    /* listes */
    $across=$down=[]; foreach($bestPlaced as $p){
        $ref = ($p['dir']==='across') ? $across : $down;
        $ref[]=[
          'num'=>$map[$p['y'].'_'.$p['x']],
          'answer'=>$p['word'],
          'clue'=>'',
          'pattern'=>'('.mblen($p['word']).')',
          'dir'=>$p['dir'],
          'x'=>$p['x'],'y'=>$p['y']
        ];
        if($p['dir']==='across') $across=$ref; else $down=$ref;
    }
    usort($across,fn($a,$b)=>$a['num']<=>$b['num']);
    usort($down  ,fn($a,$b)=>$a['num']<=>$b['num']);

    /* rognage */
    $minR=$minC=SIZE;$maxR=$maxC=0;
    foreach($bestPlaced as $p){
        $L=mblen($p['word']);
        $minR=min($minR,$p['y']);
        $maxR=max($maxR,$p['dir']==='down'?$p['y']+$L-1:$p['y']);
        if($p['dir']==='across'){
            if($rtl){ $minC=min($minC,$p['x']-$L+1); $maxC=max($maxC,$p['x']); }
            else   { $minC=min($minC,$p['x']);      $maxC=max($maxC,$p['x']+$L-1); }
        }else{ $minC=min($minC,$p['x']); $maxC=max($maxC,$p['x']); }
    }
    $gridTrim=[];
    for($y=$minR;$y<=$maxR;$y++){
        $row=[]; for($x=$minC;$x<=$maxC;$x++) $row[]=$bestGrid[$y][$x];
        $gridTrim[]=$row;
    }
    foreach($across as &$a){ $a['x']-=$minC; $a['y']-=$minR; }
    foreach($down   as &$d){ $d['x']-=$minC; $d['y']-=$minR; }

    return [$gridTrim,$across,$down];
}
