@echo off
echo Setting up ngrok for Lotto Vite System...
echo =========================================

echo Adding ngrok authtoken...
ngrok config add-authtoken 31oFpxg4CrclEGlCXFWTUm2dApc_29M6e2kSg7YMD6youhYER

if %errorlevel% == 0 (
    echo Successfully added ngrok authtoken!
) else (
    echo Failed to add ngrok authtoken. Please make sure ngrok is installed and in your PATH.
    echo You can download ngrok from: https://ngrok.com/download
)

echo.
echo To start the Docker services with ngrok, run start-docker.bat
echo To stop the services, run stop-docker.bat