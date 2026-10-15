param(
  [string]$SdkRoot = "$env:LOCALAPPDATA\Android\Sdk",
  [string]$JdkRoot = 'C:\Program Files\Java\jdk-21.0.12.1',
  [string]$ToolsRoot = '',
  [string]$AndroidJar = ''
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$buildRoot = Join-Path $PSScriptRoot 'build'
if (!$ToolsRoot) { $ToolsRoot = Join-Path $SdkRoot 'build-tools\36.0.0' }
if (!$AndroidJar) { $AndroidJar = Join-Path $SdkRoot 'platforms\android-36\android.jar' }
$artifactRoot = Join-Path $projectRoot 'artifacts'
$keyRoot = Join-Path $PSScriptRoot 'signing'
foreach ($folder in @($buildRoot,$artifactRoot,$keyRoot,"$buildRoot\classes","$buildRoot\assets","$buildRoot\dex")) { New-Item -ItemType Directory -Path $folder -Force | Out-Null }
function Invoke-Checked([string]$Exe,[string[]]$Arguments) { & $Exe @Arguments; if($LASTEXITCODE -ne 0){throw "Command failed: $Exe ($LASTEXITCODE)"} }
foreach($name in @('index.html','app.js','ui.js','styles.css','theme.css')) { Copy-Item -LiteralPath (Join-Path $projectRoot $name) -Destination (Join-Path "$buildRoot\assets" $name) }
Invoke-Checked "$JdkRoot\bin\javac.exe" @('--release','8','-encoding','UTF-8','-classpath',$androidJar,'-d',"$buildRoot\classes","$PSScriptRoot\src\app\liferadar\personal\MainActivity.java","$PSScriptRoot\src\app\liferadar\personal\ReminderReceiver.java")
Invoke-Checked "$JdkRoot\bin\jar.exe" @('cf',"$buildRoot\classes.jar",'-C',"$buildRoot\classes",'.')
Invoke-Checked "$JdkRoot\bin\java.exe" @('-cp',"$toolsRoot\lib\d8.jar",'com.android.tools.r8.D8','--lib',$androidJar,'--min-api','26','--output',"$buildRoot\dex","$buildRoot\classes.jar")
Invoke-Checked "$toolsRoot\aapt.exe" @('package','-f','-M',"$PSScriptRoot\AndroidManifest.xml",'-S',"$PSScriptRoot\res",'-A',"$buildRoot\assets",'-I',$androidJar,'-F',"$buildRoot\unsigned.apk")
Invoke-Checked "$JdkRoot\bin\jar.exe" @('uf',"$buildRoot\unsigned.apk",'-C',"$buildRoot\dex",'classes.dex')
Invoke-Checked "$toolsRoot\zipalign.exe" @('-f','4',"$buildRoot\unsigned.apk","$buildRoot\aligned.apk")
$keyFile = Join-Path $keyRoot 'personal-debug.keystore'
if(!(Test-Path -LiteralPath $keyFile)) { Invoke-Checked "$JdkRoot\bin\keytool.exe" @('-genkeypair','-keystore',$keyFile,'-storepass','android','-keypass','android','-alias','liferadar','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=Life Radar Personal Build') }
$apkPath = Join-Path $artifactRoot 'LifeRadar-1.0.1.apk'
Invoke-Checked "$JdkRoot\bin\java.exe" @('-jar',"$toolsRoot\lib\apksigner.jar",'sign','--ks',$keyFile,'--ks-key-alias','liferadar','--ks-pass','pass:android','--key-pass','pass:android','--out',$apkPath,"$buildRoot\aligned.apk")
Invoke-Checked "$JdkRoot\bin\java.exe" @('-jar',"$toolsRoot\lib\apksigner.jar",'verify','--verbose',$apkPath)
Invoke-Checked "$toolsRoot\aapt.exe" @('dump','badging',$apkPath)
Get-Item -LiteralPath $apkPath | Select-Object FullName,Length
Get-FileHash -LiteralPath $apkPath -Algorithm SHA256
