#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Gta lV — сборка фанатского «эмулятора GTA 6»
#  Требования: bash, node/npm, python3, curl
#  JDK подтягивается автоматически (pip: jdk4py), если java нет.
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

TOOLS=/tmp/gta-tools
mkdir -p "$TOOLS" dist

echo "== 1/5 Инструменты сборки (npm) =="
if [ ! -f "$TOOLS/apktool.jar" ]; then
  (cd "$TOOLS" && rm -f *.tgz && npm pack @postar/apktool-node@0.3.4 --silent >/dev/null && tar -xzf *.tgz && cp package/lib/apktool.jar package/lib/apksigner.jar "$TOOLS/" && rm -rf package *.tgz)
fi

echo "== 2/5 JDK =="
if ! command -v java >/dev/null 2>&1; then
  python3 -m pip install --break-system-packages --quiet jdk4py
  JAVA_HOME=$(python3 -c "import jdk4py, os; print(os.path.join(os.path.dirname(jdk4py.__file__), 'java-runtime'))")
  export PATH="$JAVA_HOME/bin:$PATH"
fi

echo "== 3/5 Подрезка видео (1 c в начале) =="
if [ ! -f emulator/assets/video/gameplay.mp4 ]; then
  python3 -m pip install --break-system-packages --quiet imageio-ffmpeg
  FFMPEG=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")
  mkdir -p emulator/assets/video
  "$FFMPEG" -y -ss 1.0 -i VID_20261127_010751_579.mp4 -map 0 -c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart emulator/assets/video/gameplay.mp4
fi

echo "== 4/6 Сборка APK =="
rm -f dist/GtaV_unsigned.apk dist/Gta-lV-unsigned.apk
java -jar "$TOOLS/apktool.jar" b -f -o dist/GtaV_unsigned.apk emulator

echo "== 5/6 Выравнивание resources.arsc (Android 11+) =="
python3 tools/align_arsc.py dist/GtaV_unsigned.apk dist/Gta-lV-unsigned.apk

echo "== 6/6 Подпись (debug keystore) =="
if [ ! -f keystore.jks ]; then
  keytool -genkeypair -keystore keystore.jks -alias gtalv -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass androiddebugkey -keypass androiddebugkey -dname "CN=Gta lV, OU=ViperEngine, O=ViceCity, L=ViceCity, S=VC, C=US"
fi
rm -f "dist/Gta lV.apk"
java -jar "$TOOLS/apksigner.jar" sign --ks keystore.jks --ks-pass pass:androiddebugkey --ks-key-alias gtalv \
  --key-pass pass:androiddebugkey --out "dist/Gta-lV.apk" dist/Gta-lV-unsigned.apk
java -jar "$TOOLS/apksigner.jar" verify --verbose "dist/Gta-lV.apk"

echo
echo "Готово → dist/Gta-lV.apk"
echo "Установка: adb install \"dist/Gta-lV.apk\""
