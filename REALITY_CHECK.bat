@echo off
cd /d C:\madmona-app

echo ============================================
echo  REALITY CHECK - File system vs Git
echo ============================================
echo.

echo [TEST 1] What does the OS actually see in buffer.ts?
echo --- First 5 lines (REAL disk content): ---
type src\lib\buffer.ts | more +0 | findstr /n "^" | findstr /b "[1-5]:"
echo.

echo [TEST 2] What does git see?
echo --- git show HEAD:src/lib/buffer.ts (first 5 lines): ---
git show HEAD:src/lib/buffer.ts | more +0 | findstr /n "^" | findstr /b "[1-5]:"
echo.

echo [TEST 3] Check hashes side by side
echo --- File hash (current disk): ---
git hash-object src/lib/buffer.ts
echo --- HEAD hash (last commit):  ---
git ls-files -s src/lib/buffer.ts
echo.

echo [TEST 4] File modification time + size
dir src\lib\buffer.ts | findstr buffer.ts
echo.

echo [TEST 5] File size
for %%I in (src\lib\buffer.ts) do echo Size: %%~zI bytes
echo.

echo [TEST 6] Search for the unique GraphQL string
echo --- Looking for "GraphQL" in disk file: ---
findstr /c:"GraphQL" src\lib\buffer.ts
echo.

echo ============================================
echo  This will tell us if the files are real
echo  or virtual/cached writes.
echo ============================================
pause
