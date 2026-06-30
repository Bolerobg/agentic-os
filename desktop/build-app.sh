#!/bin/bash
# Build Agentic OS.app for macOS Desktop

APP_DIR="${HOME}/Desktop/Agentic OS.app"
REPO_DIR="/Users/bolero/Documents/agentic-os"

mkdir -p "${APP_DIR}/Contents/MacOS"
mkdir -p "${APP_DIR}/Contents/Resources"

# Launcher script
cat > "${APP_DIR}/Contents/MacOS/Agentic OS" << 'LAUNCHER'
#!/bin/bash
cd "/Users/bolero/Documents/agentic-os"
lsof -ti:8080 | xargs kill 2>/dev/null
sleep 1
echo "🚀 Agentic OS v2.0 — http://127.0.0.1:8080"
python3 server.py --port 8080 &
SERVER_PID=$!
for i in {1..20}; do
  if curl -s http://127.0.0.1:8080/api/status > /dev/null 2>&1; then break; fi
  sleep 1
done
open http://127.0.0.1:8080
echo "✅ Running | PID: $SERVER_PID | 4 agents · 57 skills · 3 LLMs"
wait $SERVER_PID
LAUNCHER
chmod +x "${APP_DIR}/Contents/MacOS/Agentic OS"

# Info.plist
cat > "${APP_DIR}/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
    <key>CFBundleExecutable</key><string>Agentic OS</string>
    <key>CFBundleIconFile</key><string>AppIcon</string>
    <key>CFBundleIdentifier</key><string>com.agenticos.dashboard</string>
    <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
    <key>CFBundleName</key><string>Agentic OS</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>CFBundleShortVersionString</key><string>2.0</string>
    <key>CFBundleVersion</key><string>2</string>
    <key>LSMinimumSystemVersion</key><string>11.0</string>
    <key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST

# Generate icon
python3 -c "
from PIL import Image, ImageDraw, ImageFont
import os, math
out = '${APP_DIR}/Contents/Resources'
os.makedirs(out + '/icon.iconset', exist_ok=True)
img = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
draw.ellipse([20, 20, 492, 492], fill=(30, 30, 40, 255))
draw.ellipse([40, 40, 472, 472], fill=(50, 50, 65, 255))
cx = cy = 256
draw.ellipse([cx-30, cy-30, cx+30, cy+30], fill=(100, 180, 255, 255))
nodes = [(cx-100, cy-80), (cx+100, cy-80), (cx-120, cy+40), (cx+120, cy+40), (cx-40, cy-120), (cx+40, cy-120)]
for nx, ny in nodes:
    draw.line([cx, cy, nx, ny], fill=(100, 180, 255, 100), width=3)
    draw.ellipse([nx-15, ny-15, nx+15, ny+15], fill=(130, 200, 255, 255))
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 40)
except:
    font = ImageFont.load_default()
draw.text((cx-12, cy-18), 'A', fill=(255, 255, 255, 255), font=font)
for s in [16, 32, 128, 256, 512]:
    img.resize((s, s), Image.LANCZOS).save(f'{out}/icon.iconset/icon_{s}x{s}.png')
    if s <= 256:
        img.resize((s*2, s*2), Image.LANCZOS).save(f'{out}/icon.iconset/icon_{s//2}x{s//2}@2x.png')
img.save(f'{out}/icon.iconset/icon_256x256@2x.png')
print('Icons generated')
"
iconutil -c icns -o "${APP_DIR}/Contents/Resources/AppIcon.icns" "${APP_DIR}/Contents/Resources/icon.iconset" 2>/dev/null
rm -rf "${APP_DIR}/Contents/Resources/icon.iconset"

touch "${APP_DIR}"
echo "✅ Agentic OS.app created on Desktop"
