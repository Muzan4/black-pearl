@echo off
title Black Pearl - Local Server
echo Starting game server...
echo.
echo Open your browser to: http://localhost:8080
echo Press Ctrl+C to stop the server.
echo.
start "" http://localhost:8080
python -m http.server 8080 2>nul || py -m http.server 8080 2>nul || npx --yes serve . -p 8080
