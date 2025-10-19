@echo off
echo === NAGANO-3 サーバー起動スクリプト (Windows) ===
echo 現在の日時: %date% %time%
echo.

REM ポート8081の使用状況確認
echo 📡 ポート8081の使用状況確認...
netstat -an | findstr :8081
if %errorlevel%==0 (
    echo ポート8081は既に使用されています
) else (
    echo ポート8081は使用可能です
)
echo.

REM PHPのバージョン確認
echo 🐘 PHPバージョン確認...
php --version
echo.

REM プロジェクトディレクトリに移動
cd /d "C:\Users\aritahiroaki\NAGANO-3\N3-Development\modules\yahoo_auction_complete\new_structure" 2>nul
if %errorlevel%==0 (
    echo 📂 現在のディレクトリ: %cd%
) else (
    cd /d "/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure" 2>nul
    if %errorlevel%==0 (
        echo 📂 現在のディレクトリ: %cd%
    ) else (
        echo ❌ プロジェクトディレクトリが見つかりません
        pause
        exit /b 1
    )
)
echo.

REM PHPサーバーを8081ポートで起動
echo 🚀 PHPサーバーを8081ポートで起動します...
echo アクセスURL: http://localhost:8081
echo 停止方法: Ctrl+C
echo.
echo === サーバー起動中 ===

php -S localhost:8081 -t .