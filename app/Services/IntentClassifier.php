<?php
namespace App\Services;
class IntentClassifier {
 public static function tokens(string $text):array {return array_values(array_filter(preg_split('/[^a-z0-9]+/',preg_replace(['/check[ -]+in/','/check[ -]+out/'],['checkin','checkout'],strtolower($text))),fn($w)=>strlen($w)>1&&!in_array($w,['the','is','are','and','to','for','of','in','my','can','do','does','you','your','me','it','a','an','i','we','have','what','how','when'])));}
 public static function train(array $samples):array {
  $m=['classes'=>[],'vocabulary'=>[],'documents'=>count($samples)];
  foreach($samples as $s){$k=$s['intent'];$m['classes'][$k]??=['documents'=>0,'tokens'=>0,'counts'=>[]];$m['classes'][$k]['documents']++;
   foreach(self::tokens($s['text']) as $w){$m['vocabulary'][$w]=true;$m['classes'][$k]['tokens']++;$m['classes'][$k]['counts'][$w]=($m['classes'][$k]['counts'][$w]??0)+1;}
  }return $m;
 }
 public static function predict(string $text,?array $model=null):array {
  $m=$model??json_decode(file_get_contents(resource_path('chatbot/model.json')),true);$words=array_values(array_filter(self::tokens($text),fn($w)=>isset($m['vocabulary'][$w])));
  if(count(array_unique($words))<1)return ['intent'=>'fallback','confidence'=>0];$scores=[];$v=count($m['vocabulary']);
  foreach($m['classes'] as $k=>$c){$score=log($c['documents']/$m['documents']);foreach($words as $w)$score+=log((($c['counts'][$w]??0)+0.25)/($c['tokens']+0.25*$v));$scores[$k]=$score;}
  arsort($scores);$best=array_key_first($scores);$max=$scores[$best];$sum=array_sum(array_map(fn($x)=>exp($x-$max),$scores));$confidence=1/$sum;
  return ['intent'=>$confidence>=.48?$best:'fallback','confidence'=>round($confidence,4)];
 }
}
