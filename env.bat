@echo off
REM CodexBridge Build Helper - Sets up correct PATH for Rust GNU toolchain
setlocal

REM Add Rust toolchain self-contained tools (dlltool, ld, gcc) to PATH
set "RUST_SELF=%USERPROFILE%\.rustup\toolchains\stable-x86_64-pc-windows-gnu\lib\rustlib\x86_64-pc-windows-gnu\bin\self-contained"
set "RUST_BIN=%USERPROFILE%\.rustup\toolchains\stable-x86_64-pc-windows-gnu\bin"

REM Add MinGW-w64 if available
if exist "F:\workspace\mingw64\bin" (
    set "PATH=F:\workspace\mingw64\bin;%PATH%"
)

set "PATH=%RUST_SELF%;%RUST_BIN%;%PATH%"

echo CodexBridge Build Environment
echo Rust:
rustc --version
echo.

cd /d "%~dp0"
cmd /k
