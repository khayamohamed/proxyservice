param(
  [string]$OutputPath = "C:\Users\pc\Downloads\11 (2)\11\certs\localhost-dev.pfx",
  [string]$Password = "localdev123"
)

$ErrorActionPreference = "Stop"

$targetDir = Split-Path -Parent $OutputPath
if (-not (Test-Path $targetDir)) {
  New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$cert = New-SelfSignedCertificate `
  -DnsName "localhost", "127.0.0.1" `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -FriendlyName "ProxyServices Local HTTPS Dev"

$securePassword = ConvertTo-SecureString -String $Password -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $OutputPath -Password $securePassword | Out-Null

Write-Host "Self-signed dev certificate generated:" $OutputPath
Write-Host "Passphrase:" $Password
