param([string]$SdkRoot = $env:ANDROID_HOME)
$ErrorActionPreference = 'Stop'
if (-not $SdkRoot) { $SdkRoot = Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
$workspace = Split-Path $PSScriptRoot -Parent
$output = [IO.Path]::GetFullPath((Join-Path $workspace 'dist/android-build'))
$tools = Join-Path $SdkRoot 'build-tools/36.0.0'
$platform = Join-Path $SdkRoot 'platforms/android-36/android.jar'
if (-not (Test-Path -LiteralPath $platform)) { throw 'Install Android platform 36 and build-tools 36.0.0 first.' }
function Run-Tool([string]$Tool, [string[]]$ToolArgs) { & $Tool @ToolArgs; if ($LASTEXITCODE -ne 0) { throw "Build failed: $Tool" } }
$generated = Join-Path $output 'generated'
$classes = Join-Path $output 'classes'
$dex = Join-Path $output 'dex'
foreach ($directory in @($output,$generated,$classes,$dex)) { New-Item -ItemType Directory -Force -Path $directory | Out-Null }
$compiled = Join-Path $output 'compiled.zip'
$unsigned = Join-Path $output 'unsigned.apk'
$aligned = Join-Path $output 'aligned.apk'
$apk = Join-Path $workspace 'dist/TienLo-Android-test.apk'
Run-Tool (Join-Path $tools 'aapt2.exe') @('compile','--dir',(Join-Path $PSScriptRoot 'app/res'),'-o',$compiled)
Run-Tool (Join-Path $tools 'aapt2.exe') @('link','-I',$platform,'--manifest',(Join-Path $PSScriptRoot 'app/AndroidManifest.xml'),'--java',$generated,'-o',$unsigned,$compiled)
$sources = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'app/src') -Recurse -Filter '*.java' | ForEach-Object FullName) + @(Get-ChildItem -LiteralPath $generated -Recurse -Filter '*.java' | ForEach-Object FullName)
Run-Tool 'javac' (@('-encoding','UTF-8','--release','8','-classpath',$platform,'-d',$classes) + $sources)
$bytecode = @(Get-ChildItem -LiteralPath $classes -Recurse -Filter '*.class' | ForEach-Object FullName)
Run-Tool (Join-Path $tools 'd8.bat') (@('--lib',$platform,'--min-api','26','--output',$dex) + $bytecode)
Run-Tool 'jar' @('uf',$unsigned,'-C',$dex,'classes.dex')
Run-Tool (Join-Path $tools 'zipalign.exe') @('-f','4',$unsigned,$aligned)
$keyDirectory = Join-Path $env:USERPROFILE '.android'
New-Item -ItemType Directory -Force -Path $keyDirectory | Out-Null
$testKey = Join-Path $keyDirectory 'tienlo-test.keystore'
if (-not (Test-Path -LiteralPath $testKey)) { Run-Tool 'keytool' @('-genkeypair','-keystore',$testKey,'-alias','tienlo-test','-keyalg','RSA','-keysize','2048','-validity','10000','-storepass','android','-keypass','android','-dname','CN=TienLo Test,O=Local Development,C=VN') }
Run-Tool (Join-Path $tools 'apksigner.bat') @('sign','--ks',$testKey,'--ks-key-alias','tienlo-test','--ks-pass','pass:android','--key-pass','pass:android','--out',$apk,$aligned)
Run-Tool (Join-Path $tools 'apksigner.bat') @('verify','--verbose',$apk)
Get-FileHash -LiteralPath $apk -Algorithm SHA256
Write-Output "APK test: $apk"
