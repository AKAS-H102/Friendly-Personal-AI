@echo off
echo ========================================================
echo   Building Machi Personal AI Assistant for Windows 11
echo ========================================================
echo.

python -m venv venv
call venv\Scripts\activate

echo [1/3] Installing dependencies...
pip install -r requirements.txt

echo.
echo [2/3] Building standalone Windows executable with PyInstaller...
pyinstaller --noconfirm --onedir --windowed ^
    --name "MachiAssistant" ^
    --add-data "config.py;." ^
    main.py

echo.
echo [3/3] Build finished!
echo Distributable application is located at:
echo dist\MachiAssistant\MachiAssistant.exe
echo.
pause
