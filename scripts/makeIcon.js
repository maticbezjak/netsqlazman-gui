/**
 * scripts/makeIcon.js
 * Converts build/icon.svg → build/icon.png (1024×1024)
 *
 * Usage:  node scripts/makeIcon.js
 * Deps:   @resvg/resvg-js  (npm install --save-dev @resvg/resvg-js)
 */

const { Resvg } = require('@resvg/resvg-js')
const fs = require('fs')
const path = require('path')

const svgPath = path.resolve(__dirname, '../build/icon.svg')
const pngPath = path.resolve(__dirname, '../build/icon.png')

const svg = fs.readFileSync(svgPath, 'utf-8')

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1024 },
  background: 'transparent',
})

const rendered = resvg.render()
const pngBuffer = rendered.asPng()

fs.writeFileSync(pngPath, pngBuffer)
console.log(`✓ ${pngPath}  (${(pngBuffer.length / 1024).toFixed(0)} KB, 1024×1024)`)
