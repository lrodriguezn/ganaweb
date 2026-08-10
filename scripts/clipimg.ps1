param(
    [string]$RemoteHost = "144.91.69.177",
    [string]$RemoteUser = "lrodriguezn",
    [string]$RemoteDirectory = "/tmp/herdr-clipboard-images-1000"
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$image = [System.Windows.Forms.Clipboard]::GetImage()

if ($null -eq $image) {
    Write-Host "No hay una imagen en el portapapeles." -ForegroundColor Red
    Write-Host "Usa Win + Shift + S para copiar una captura e intenta nuevamente."
    exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$fileName = "clipboard-$timestamp.png"
$localFile = Join-Path $env:TEMP $fileName
$remoteFile = "$RemoteDirectory/$fileName"
$destination = "${RemoteUser}@${RemoteHost}:$remoteFile"

try {
    $image.Save(
        $localFile,
        [System.Drawing.Imaging.ImageFormat]::Png
    )

    Write-Host "Imagen guardada temporalmente en:"
    Write-Host $localFile -ForegroundColor Cyan

    ssh "${RemoteUser}@${RemoteHost}" "mkdir -p '$RemoteDirectory'"

    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo crear el directorio remoto."
    }

    scp $localFile $destination

    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo copiar la imagen a la VPS."
    }

    Set-Clipboard -Value $remoteFile

    Write-Host ""
    Write-Host "Imagen enviada correctamente." -ForegroundColor Green
    Write-Host "Ruta en la VPS:"
    Write-Host $remoteFile -ForegroundColor Yellow
    Write-Host ""
    Write-Host "La ruta también quedó copiada en el portapapeles."
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    if (Test-Path $localFile) {
        Remove-Item $localFile -Force
    }

    if ($null -ne $image) {
        $image.Dispose()
    }
}