@echo off
echo Starting Lotto Vite System with Docker and Ngrok...
echo ==================================================

echo Building and starting Docker containers with Ngrok...
docker-compose up -d

echo.
echo Waiting for services to start...
timeout /t 15 /nobreak >nul

echo.
echo Checking service status...
docker-compose ps

echo.
echo Getting Ngrok public URL...
timeout /t 5 /nobreak >nul
curl -s http://localhost:4040/api/tunnels | findstr "public_url"

echo.
echo To access the application:
echo 1. Local access: http://localhost
echo 2. Public access: Check the Ngrok URL above
echo 3. Ngrok dashboard: http://localhost:4040
echo.
echo To stop the services, run: stop-docker.bat