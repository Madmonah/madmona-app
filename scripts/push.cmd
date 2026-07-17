@echo off
cd /d E:\madmona-app
git add .gitignore
git commit -m "chore: ignore local WhatsApp session + scratch outputs" -m "the .wa-profile folder holds a LINKED WhatsApp session - committing it would let anyone with the repo read every Madmona chat. Also ignores 64MB brochures and scan screenshots."
git push origin main 2>&1 | findstr "main"
