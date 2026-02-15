/**
 * Simple script to generate a tray icon PNG from an SVG.
 * For production, replace resources/trayIconTemplate.png with an actual
 * Mailtrap logo exported as a template image (black on transparent for macOS).
 *
 * For now, we create a minimal placeholder.
 * Run: node scripts/generate-tray-icon.js
 */

const fs = require('fs')
const path = require('path')

// Minimal 18x18 PNG (envelope icon placeholder, black on transparent)
// This is a valid 1-pixel PNG that will serve as a placeholder.
// Replace with actual Mailtrap logo for production.

// A simple black square 18x18 PNG in base64 (placeholder)
const PLACEHOLDER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAAXNSR0IArs4c6QAAAARnQU1BAACx' +
  'jwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABhSURBVDhPY2AYBYMBMDIw/P8PYhMDmBhQJIgG' +
  'TAwMDP9BbGIAEwMKkQJAbIIBRgZGBqIBiIPhP4hNDGBiQCFSAIhNMADyEckmGGBkYGIgGoD4aNgA' +
  'JoYRAyA+GgUAAOp0Dz0MHGoAAAAASUVORK5CYII='

const outDir = path.join(__dirname, '..', 'resources')
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

const outPath = path.join(outDir, 'trayIconTemplate.png')
fs.writeFileSync(outPath, Buffer.from(PLACEHOLDER_PNG_BASE64, 'base64'))
console.log(`Tray icon placeholder written to ${outPath}`)
console.log('Replace this with the actual Mailtrap logo for production.')
