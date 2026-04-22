@echo off
REM ============================================
REM Chrome을 CDP 포트 9222로 실행
REM (셀러라이프 자동화용 — 평소 Chrome 대체)
REM ============================================

echo.
echo [1/2] 현재 Chrome 프로세스 종료 중...
taskkill /F /IM chrome.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/2] CDP 모드로 Chrome 실행 중...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

timeout /t 3 /nobreak >nul

echo.
echo [확인] http://localhost:9222/json/version
echo   응답 나오면 OK. Chrome 그대로 평소처럼 사용하시면 됩니다.
echo.
echo 배치파일을 바탕화면에 바로가기로 만들어두세요.
echo 앞으로 Chrome 시작할 때 이 배치파일로 실행.
echo.
pause
