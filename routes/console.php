<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('chatbot:train', function () {
 $samples=json_decode(file_get_contents(resource_path('chatbot/training.json')),true);
 $model=\App\Services\IntentClassifier::train($samples);
 file_put_contents(resource_path('chatbot/model.json'),json_encode($model,JSON_PRETTY_PRINT));
 $evaluation=json_decode(file_get_contents(resource_path('chatbot/evaluation.json')),true);$correct=0;$details=[];
 foreach($evaluation as $s){$p=\App\Services\IntentClassifier::predict($s['text'],$model);$correct+=($p['intent']===$s['intent'])?1:0;$details[]=[...$s,'prediction'=>$p];}
 $report=['training_samples'=>count($samples),'evaluation_samples'=>count($evaluation),'correct'=>$correct,'accuracy'=>$correct/count($evaluation),'note'=>'Small authored seed dataset; not an independently validated benchmark.','results'=>$details];
 file_put_contents(resource_path('chatbot/evaluation-report.json'),json_encode($report,JSON_PRETTY_PRINT));
 $this->info('Trained '.count($samples).' examples; held-out accuracy '.round($report['accuracy']*100,1).'% on '.count($evaluation).' examples.');
});

Artisan::command('chatbot:evaluate', function () {
 $samples=json_decode(file_get_contents(resource_path('chatbot/review-evaluation.json')),true);$train=json_decode(file_get_contents(resource_path('chatbot/training.json')),true);$results=[];$matrix=[];$correct=0;$fallback=0;
 foreach($samples as $s){$p=\App\Services\IntentClassifier::predict($s['text']);$matrix[$s['intent']][$p['intent']]=($matrix[$s['intent']][$p['intent']]??0)+1;$correct+=(int)($s['intent']===$p['intent']);$fallback+=(int)($p['intent']==='fallback');$results[]=[...$s,'prediction'=>$p];}
 $metrics=[];foreach(array_keys($matrix) as $intent){$tp=$matrix[$intent][$intent]??0;$actual=array_sum($matrix[$intent]);$predicted=0;foreach($matrix as $row)$predicted+=$row[$intent]??0;$metrics[$intent]=['precision'=>$predicted?round($tp/$predicted,4):0,'recall'=>round($tp/$actual,4),'support'=>$actual];}
 $report=['evaluated_at'=>now()->toIso8601String(),'model_sha256'=>hash_file('sha256',resource_path('chatbot/model.json')),'training_samples'=>count($train),'evaluation_samples'=>count($samples),'correct'=>$correct,'accuracy'=>round($correct/count($samples),4),'fallback_rate'=>round($fallback/count($samples),4),'note'=>'New authored review questions, including out-of-scope requests. No exact overlap with training or the previous authored evaluation. Model was not retrained or tuned on these results. This is not a student usability study or independent external validation.','per_intent'=>$metrics,'confusion_matrix'=>$matrix,'results'=>$results];
 file_put_contents(resource_path('chatbot/review-evaluation-report.json'),json_encode($report,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));$this->info('Correct '.$correct.'/'.count($samples).' ('.round(100*$report['accuracy'],1).'%). Fallback rate '.round(100*$report['fallback_rate'],1).'%.');
})->purpose('Evaluate the frozen model on new authored review questions without retraining');
