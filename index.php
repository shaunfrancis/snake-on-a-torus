<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width">
    <meta name="description" content="A new twist on the classic video game. It's Snake - on a torus! Can you top the leaderboard?" />
    <title>Snake On A Torus</title>
    <link rel="stylesheet" type="text/css" href="style.css" />
    <script type="text/javascript" src="three.js"></script>
    <script type="text/javascript" src="script.js"></script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-9JQ0TRRZ1C"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}

      if(localStorage.getItem("cookies") && localStorage.getItem("cookies") == 1) gtag('consent', 'default', { 'analytics_storage': "granted" });
      else gtag('consent', 'default', { 'analytics_storage': "denied" });

      gtag('js', new Date());
      gtag('config', 'G-9JQ0TRRZ1C');
    </script>
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@TennessineWeb">
    <meta name="twitter:title" content="Snake On A Torus">
    <meta name="twitter:description" content="A new twist on the classic video game. It's Snake - on a torus! Can you top the leaderboard?">
    <meta name="twitter:image" content="https://tennessine.co.uk/assets/slides/snake-on-a-torus-twitter.png">
    <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
</head>
<body>

    <div id="container">
      <?php $external_header = TRUE; $header_style = "white"; include '../components/header.php' ?>

      <div id="game-area"></div>

      <div id="game-header" class="interface">
        <div class="header-section-container">
          <div class="header-section-label">OPTIONS</div>
          <div class="header-section-item" id="header-option-buttons">
            <div class="header-section-button" id="header-pause-button"></div>
            <div class="header-section-button" id="header-sound-button"></div>
            <div class="header-section-button" id="header-quality-button"></div>
          </div>
        </div>
        <div class="header-section-container">
          <div class="header-section-label">SCORE</div>
          <div id="score" class="header-section-item">000000</div>
        </div>
        <div class="header-section-container">
          <div class="header-section-label">HI SCORE</div>
          <div id="high-score" class="header-section-item">000000</div>
        </div>
      </div>

      <div id="screen-interfaces"> 
        <div id="game-start-interface" class="interface">
          <div id="logo">
            <div id="logo-title">SNAKE</div>
            <div id="logo-subtitle" class="line-decoration"></div>
          </div>
          
          <div class="flashing-options">
            <div class="flashing-option" data-id="start">
              <div class="flashing-option-arrow"></div>  
              <div class="flashing-option-label">P1 START</div>
            </div>

            <div class="flashing-option" data-id="leaderboard">
              <div class="flashing-option-arrow"></div>  
              <div class="flashing-option-label">LEADERBOARD</div>
            </div>

            <div class="flashing-option" data-id="options">
              <div class="flashing-option-arrow"></div>  
              <div class="flashing-option-label">OPTIONS</div>
            </div>
          </div>

        </div>

        <div id="options-interface" class="interface">
          <h1 data-squeeze="true">OPTIONS</h1>
          
          <div class="table" id="options-table">

            <div class="table-row">
              <div class="table-cell">Quality</div>
              <div class="table-cell" id="quality-options-container"></div>
            </div>

            <div class="table-row">
              <div class="table-cell">Sound FX</div>
              <div class="table-cell" id="sound-options-container"></div>
            </div>

            <div class="table-row">
              <div class="table-cell">Swipes</div>
              <div class="table-cell" id="swipe-options-container"></div>
            </div>

          </div>

          <div class="flashing-options">
            <div class="flashing-option" data-id="back">
              <div class="flashing-option-arrow"></div>
              <div class="flashing-option-label">BACK</div>
            </div>
          </div>

        </div>

        <div id="leaderboard-interface" class="interface">
          <h1 data-squeeze="true">LEADERBOARD</h1>
          
          <div id="leaderboard-container" class="table">Downloading leaderboard...</div>

          <div class="flashing-options">
            <div class="flashing-option" data-id="back">
              <div class="flashing-option-arrow"></div>
              <div class="flashing-option-label">BACK</div>
            </div>
          </div>

        </div>

        <div id="game-over-interface" class="interface">
          <h1>GAME OVER</h1>

          <div id="game-over-score-container">
            <div id="game-over-score" class="line-decoration">000000</div>
          </div>

          <div id="game-over-score-interface"></div>

          <div class="flashing-options">
            <div class="flashing-option" data-id="menu">
              <div class="flashing-option-arrow"></div>
              <div class="flashing-option-label">MAIN MENU</div>
            </div>
          </div>

        </div>

        <div id="game-paused-interface" class="interface">
          <h1 data-squeeze="true">GAME PAUSED</h1>

          <div class="flashing-options">
            <div class="flashing-option" data-id="resume">
              <div class="flashing-option-arrow"></div>  
              <div class="flashing-option-label">RESUME</div>
            </div>

            <div class="flashing-option" data-id="quit">
              <div class="flashing-option-arrow"></div>  
              <div class="flashing-option-label">QUIT</div>
            </div>
          </div>

        </div>

        </div>

    </div>

      <div id="game-footer" class="interface">
        <h3>&copy; MMXXI TENNESSINE</h3>
      </div>
    </div>

    <div style="display:none">
      <img src="assets/icons/pause.svg" />
      <img src="assets/icons/play.svg" />
      <img src="assets/icons/mute.svg" />
      <img src="assets/icons/sound.svg" />
      <img src="assets/icons/low.svg" />
      <img src="assets/icons/med.svg" />
      <img src="assets/icons/high.svg" />
      <img src="assets/icons/max.svg" />
    </div>

</body>
</html>