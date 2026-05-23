@echo off
REM iTrun Build Helper - Sets up correct PATH for Rust MSVC toolchain
setlocal

set "CARGO_HOME=F:\.cargo"
set "RUSTUP_HOME=F:\.rustup"
set "PATH=%CARGO_HOME%\bin;%PATH%"

REM VS Build Tools (MSVC)
set "VSINSTALLDIR=F:\vsbuildtools"
set "PATH=%VSINSTALLDIR%\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64;%PATH%"
set "LIB=%VSINSTALLDIR%\VC\Tools\MSVC\14.44.35207\lib\x64"

echo iTrun Build Environment
echo Rust:
rustc --version
echo.
echo Run: cargo tauri dev
echo.

cd /d "%~dp0"
cmd /k
