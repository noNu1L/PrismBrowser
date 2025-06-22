@echo off
setlocal

REM Define paths
set "SRC_DIR=renderer\dashboard_src"
set "DEST_DIR=renderer\dashboard"
set "REPO_URL=https://github.com/MetaCubeX/Yacd-meta.git"

REM Check for git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Git is not installed or not in PATH. Please install Git and try again.
    exit /b 1
)

REM Check for pnpm
pnpm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo pnpm is not installed or not in PATH.
    echo Please install it globally by running: npm install -g pnpm
    exit /b 1
)

REM --- Step 1: Get latest source code ---
echo.
echo === Updating Yacd-meta source code ===
if exist "%SRC_DIR%" (
    echo Directory %SRC_DIR% exists. Pulling latest changes...
    pushd "%SRC_DIR%" && git pull && popd
    if %errorlevel% neq 0 (
        echo Failed to pull latest changes.
        exit /b 1
    )
) else (
    echo Directory %SRC_DIR% not found. Cloning repository...
    git clone %REPO_URL% "%SRC_DIR%"
    if %errorlevel% neq 0 (
        echo Failed to clone repository.
        exit /b 1
    )
)

REM --- Step 2: Build the project ---
echo.
echo === Building Yacd-meta ===
pushd "%SRC_DIR%"

echo Installing dependencies with pnpm...
pnpm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies.
    popd
    exit /b 1
)

echo Building project...
pnpm build
if %errorlevel% neq 0 (
    echo Build failed.
    popd
    exit /b 1
)

popd

REM --- Step 3: Replace old dashboard with new build ---
echo.
echo === Updating dashboard files ===

REM Check if build output exists
if not exist "%SRC_DIR%\public" (
    echo Build output directory '%SRC_DIR%\public' not found. Something went wrong.
    exit /b 1
)

echo Removing old dashboard directory: %DEST_DIR%
if exist "%DEST_DIR%" (
    rmdir /s /q "%DEST_DIR%"
)

echo Copying new build to %DEST_DIR%
xcopy "%SRC_DIR%\public" "%DEST_DIR%\" /E /I /Q /Y

echo.
echo === Dashboard update completed successfully! ===
echo You can now run the application to see the changes.

endlocal 