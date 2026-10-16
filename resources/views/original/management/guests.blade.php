<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PUPSJ Hotel – Guests</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  
<meta name="csrf-token" content="{{ csrf_token() }}"><meta name="hrms-base" content="{{ url('/') }}">
<script type="application/json" id="original-bootstrap">{!! json_encode($originalBootstrap, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>
@vite(['resources/css/app.css', 'resources/js/original/management/guests.js'])
</head>
<body>
  <div class="staff-layout">
    <aside id="staffSidebar"></aside>
    <div class="staff-main-wrap">
      <header id="staffTopbar"></header>
      <main class="staff-content" id="guestsApp">
        <!-- Rendered dynamically by guests.js -->
      </main>
      <footer></footer>
    </div>
  </div>

  
  
  
  
  
  
  
  
</body>
</html>
