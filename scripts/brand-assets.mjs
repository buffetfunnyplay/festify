// ─────────────────────────────────────────────────────────────
// Gera TODOS os ícones do app a partir da cor da marca (brand.config.js).
// Se existir assets/logo.png (sua logo, quadrada, de preferência 1024x1024),
// ela é usada no lugar do desenho padrão.
//
//   node scripts/brand-assets.mjs
//
// Saídas: public/icon.svg, public/icons/*, public/manifest.webmanifest,
//         assets/* (Android), desktop/build/icon.png e icon.ico (Windows)
// ─────────────────────────────────────────────────────────────
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { BRAND } from '../brand.config.js'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const out = (p) => path.join(root, p)
const ensure = (p) => fs.mkdirSync(path.dirname(out(p)), { recursive: true })

const hex = (h) => h.replace('#', '').match(/../g).map((x) => parseInt(x, 16))
const mix = (a, b, t) => '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')
const base = hex(BRAND)
const light = mix(base, [255, 255, 255], 0.28)
const dark = mix(base, [10, 20, 40], 0.3)

// Envelope com balão — o mesmo desenho do app, nas cores da marca
const glyph = (scale = 1) => `
  <g transform="translate(256 262) scale(${scale}) translate(-256 -262)">
    <path d="M114 200h284v176a26 26 0 0 1-26 26H140a26 26 0 0 1-26-26z" fill="#fff"/>
    <path d="M114 200l142 112 142-112" fill="none" stroke="${BRAND}" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="256" cy="312" r="34" fill="#FF5C8A"/>
    <path d="M256 312c6-8 18-8 18 3 0 9-18 19-18 19s-18-10-18-19c0-11 12-11 18-3z" fill="#fff"/>
    <ellipse cx="352" cy="132" rx="38" ry="46" fill="#fff"/>
    <path d="M352 178l-7 10h14z" fill="#fff"/>
    <path d="M352 188c-6 18 8 26 0 42" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="340" cy="118" rx="9" ry="13" fill="${light}" opacity=".6"/>
  </g>`

const bgGradient = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>`
const svgIcon = (rounded = true) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bgGradient}<rect width="512" height="512" rx="${rounded ? 116 : 0}" fill="url(#g)"/>${glyph(1)}</svg>`
const svgForeground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${glyph(0.66)}</svg>`
const svgBackground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bgGradient}<rect width="512" height="512" fill="url(#g)"/></svg>`

const customLogo = fs.existsSync(out('assets/logo.png')) ? out('assets/logo.png') : null

async function iconPng(size, { rounded = true } = {}) {
  if (customLogo) return sharp(customLogo).resize(size, size, { fit: 'cover' }).png().toBuffer()
  return sharp(Buffer.from(svgIcon(rounded))).resize(size, size).png().toBuffer()
}

async function write(p, buf) {
  ensure(p)
  fs.writeFileSync(out(p), buf)
}

// ── Web / PWA ──
ensure('public/icon.svg')
fs.writeFileSync(out('public/icon.svg'), svgIcon(true))
await write('public/icons/icon-192.png', await iconPng(192))
await write('public/icons/icon-512.png', await iconPng(512))
await write('public/icons/favicon-32.png', await iconPng(32))
await write('public/icons/apple-touch-icon.png', await iconPng(180, { rounded: false }))
const maskable = customLogo
  ? await sharp({ create: { width: 512, height: 512, channels: 4, background: BRAND } })
      .composite([{ input: await sharp(customLogo).resize(380, 380, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), gravity: 'center' }])
      .png().toBuffer()
  : await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bgGradient}<rect width="512" height="512" fill="url(#g)"/>${glyph(0.78)}</svg>`)).png().toBuffer()
await write('public/icons/maskable-512.png', maskable)

const manifestPath = out('public/manifest.webmanifest')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
manifest.theme_color = BRAND
manifest.background_color = '#ffffff'
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

// ── Android (@capacitor/assets) ──
await write('assets/icon-only.png', await iconPng(1024))
if (customLogo) {
  await write('assets/icon-foreground.png', await sharp(customLogo).resize(680, 680, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).extend({ top: 172, bottom: 172, left: 172, right: 172, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer())
} else {
  await write('assets/icon-foreground.png', await sharp(Buffer.from(svgForeground)).resize(1024, 1024).png().toBuffer())
}
await write('assets/icon-background.png', await sharp(Buffer.from(svgBackground)).resize(1024, 1024).png().toBuffer())
const splashIcon = await iconPng(640)
const splash = await sharp({ create: { width: 2732, height: 2732, channels: 4, background: '#ffffff' } })
  .composite([{ input: splashIcon, gravity: 'center' }])
  .png().toBuffer()
await write('assets/splash.png', splash)
await write('assets/splash-dark.png', splash)

// ── Windows ──
const ico256 = await iconPng(256)
await write('desktop/build/icon.png', await iconPng(512))
await write('desktop/build/icon.ico', await pngToIco([await iconPng(16), await iconPng(32), await iconPng(48), ico256]))

console.log(`Ícones gerados com a cor ${BRAND}${customLogo ? ' usando assets/logo.png' : ''}.`)
