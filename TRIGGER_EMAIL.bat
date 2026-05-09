@echo off
echo ===========================================
echo  Sending All 40 Content Pieces to Email
echo ===========================================
echo.

curl -X POST "https://www.madmonacairo.com/api/agents/email-content-digest" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7"

echo.
echo.
echo ===========================================
echo  Check madmona.admin@gmail.com inbox now!
echo ===========================================
pause
