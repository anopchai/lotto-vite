@echo off
echo Starting Lotto Vite System with Docker...
echo ========================================

echo Building and starting Docker containers...
docker-compose up -d

echo.
echo Waiting for services to start...
timeout /t 10 /nobreak >nul

echo.
echo Checking service status...
docker-compose ps

echo.
echo To access the application:
echo 1. Open your browser and go to http://localhost
echo 2. For public access, check the ngrok URL at http://localhost:4040
echo    The public URL will be displayed in the ngrok dashboard
echo.
echo To stop the services, run: docker-compose down