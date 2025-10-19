#!/bin/bash

# 必要なライブラリインストール
pip install requests flask pandas playwright

# Playwright初期化
python -m playwright install

echo "✅ 必要なライブラリインストール完了"
