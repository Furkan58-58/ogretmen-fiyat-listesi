@echo off
title Fiyat Listesini Guncelle
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\publish_update.ps1"

