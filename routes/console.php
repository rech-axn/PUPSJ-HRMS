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
