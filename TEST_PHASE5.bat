@echo off
echo ================================================================
echo   TESTING: Phase 5 Self-Improving Agents
echo ================================================================
echo.

echo === TEST 1: performance-tracker ===
curl -s -X POST https://www.madmonacairo.com/api/agents/scheduler ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7" ^
  -d "{\"agent\":\"performance-tracker\"}"
echo.
echo.

echo === TEST 2: prompt-optimizer (auto-pick weakest agent) ===
curl -s -X POST https://www.madmonacairo.com/api/agents/scheduler ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7" ^
  -d "{\"agent\":\"prompt-optimizer\"}"
echo.
echo.

echo === TEST 3: prompt-optimizer (target content-marketing specifically) ===
curl -s -X POST https://www.madmonacairo.com/api/agents/scheduler ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7" ^
  -d "{\"agent\":\"prompt-optimizer\",\"args\":{\"target_agent\":\"content-marketing\"}}"
echo.
echo.

echo ================================================================
echo   View results at: madmonacairo.com/admin/performance
echo ================================================================
pause
