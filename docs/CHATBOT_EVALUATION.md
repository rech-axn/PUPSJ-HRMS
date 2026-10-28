# Chatbot evaluation — 18 October 2026

The existing classifier is a trained multinomial Naive Bayes intent model with 78 authored training examples and 13 FAQ intents. It uses a confidence threshold to hand uncertain questions to staff. Answers use the current system policy; the model does not perform bookings or payments.

A new set of 64 authored questions was created before running this evaluation, including 52 FAQ questions and 12 out-of-scope/security questions. There is no exact question overlap with training or the previous evaluation. The frozen model was not retrained or tuned using these results. This is an internal authored test, not an independent benchmark or an evaluation by HM students.

- Correct predictions: 50/64 (78.13%).
- Staff fallback: 35.94% of all questions.
- Errors: 14; 11 were supported questions passed to staff and 3 were assigned the wrong FAQ intent.
- All 12 out-of-scope/security questions passed to staff.
- Strongest areas on this small set: breakfast, capacity, accessibility, parking, outside-food policy (4/4 each).
- Areas needing more varied training examples and subsequent new testing: check-in, deposit/advance payment, requests, cancellations, promotions.

Recommendation: retain as a basic FAQ assistant with clear staff handoff. Do not claim validated human-level understanding. Collect consented, anonymized student questions for a separate development set; have instructors label an independent final test set, including paraphrases, Taglish, misspellings, ambiguous and out-of-scope queries. Evaluate accuracy, per-intent precision/recall, wrong-answer rate and handoff quality. Do not move this evaluation set into training and report it as unseen afterward.

Reproduce without training: `C:\xampp\php\php.exe artisan chatbot:evaluate`.

Detailed results and confusion matrix: `resources/chatbot/review-evaluation-report.json`. The existing `chatbot:train` command evaluates a separate older 26-question authored set; its score is not the score above.
