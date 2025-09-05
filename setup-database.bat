@echo off
echo Lotto Vite System - Database Setup
echo =================================

echo Creating database and importing schema...
echo Please enter your MySQL root password when prompted.

mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS lotto_vite_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if %errorlevel% == 0 (
    echo Database created successfully!
) else (
    echo Failed to create database. Please check your MySQL connection and try again.
    pause
    exit /b 1
)

echo Importing schema...
mysql -u root -p lotto_vite_system < database\schema.sql

if %errorlevel% == 0 (
    echo Schema imported successfully!
) else (
    echo Failed to import schema. Please check the schema file and try again.
    pause
    exit /b 1
)

echo.
echo Database setup completed!
echo.
echo Next steps:
echo 1. Update backend/.env with your database credentials
echo 2. Run the backend server: cd backend && npm start
echo 3. Run the frontend: cd frontend && npm run dev
echo.
pause