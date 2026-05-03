@echo off
chcp 65001 >nul
title Madmona - Remove Listing
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0REMOVE_LISTING.ps1"
