@echo off
echo Lotto Vite System - Ngrok URL Checker
echo ======================================

echo Checking ngrok tunnels...
echo.

curl -s http://localhost:4040/api/tunnels | findstr "public_url" | findstr "https://"

if %errorlevel% == 0 (
    echo.
    echo Public URL found above.
    echo You can also check the ngrok dashboard at: http://localhost:4040
) else (
    echo No public URL found. Make sure ngrok is running.
    echo Start the services with: start-docker.bat
    echo Then check again with this script.
)

echo.
pause