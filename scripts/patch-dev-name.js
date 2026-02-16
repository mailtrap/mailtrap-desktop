/**
 * Patches the Electron.app bundle in node_modules so that the macOS dock
 * and menu bar show "Mailtrap" instead of "Electron" during development.
 */
const fs = require('fs')
const path = require('path')

const plistPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'electron',
  'dist',
  'Electron.app',
  'Contents',
  'Info.plist'
)

if (!fs.existsSync(plistPath)) {
  console.log('[patch-dev-name] Electron.app Info.plist not found, skipping.')
  process.exit(0)
}

let plist = fs.readFileSync(plistPath, 'utf8')

const replacements = [
  [/<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/, '<key>CFBundleDisplayName</key>\n\t<string>Mailtrap</string>'],
  [/<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>/, '<key>CFBundleName</key>\n\t<string>Mailtrap</string>'],
  [/<key>CFBundleExecutable<\/key>\s*<string>[^<]*<\/string>/, '<key>CFBundleExecutable</key>\n\t<string>Electron</string>']
]

let changed = false
for (const [pattern, replacement] of replacements) {
  if (pattern.test(plist)) {
    const before = plist
    plist = plist.replace(pattern, replacement)
    if (plist !== before) changed = true
  }
}

if (changed) {
  fs.writeFileSync(plistPath, plist, 'utf8')
  console.log('[patch-dev-name] Patched Electron.app to show "Mailtrap" in dock/menu.')
} else {
  console.log('[patch-dev-name] Already patched or no changes needed.')
}
