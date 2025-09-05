@echo off
echo Lotto Vite System - Update Docker Environment Variables
echo ======================================================

echo Please enter your MySQL root password:
set /p mysql_password="Password: "

echo Updating backend/.env.docker with your MySQL password...

powershell -Command "(Get-Content backend/.env.docker) -replace 'your_mysql_root_password', '%mysql_password%' | Set-Content backend/.env.docker"

echo.
echo Please enter your JWT secret (or press Enter to keep the default):
set /p jwt_secret="JWT Secret: "

if defined jwt_secret (
    powershell -Command "(Get-Content backend/.env.docker) -replace 'your-super-secret-jwt-key-change-this-in-production', '%jwt_secret%' | Set-Content backend/.env.docker"
    echo JWT secret updated.
) else (
    echo Using default JWT secret. Please change this in production!
)

echo.
echo Docker environment variables updated successfully!
echo.
echo To start the Docker services, run: start-docker.bat
echo.
pause