// Usado pelo GitHub Actions depois de "npx cap add android":
// registra o endereço app.festify.convites://  para o login com Google
// voltar para dentro do app (o navegador abre → Google → volta ao app).
const fs = require('fs')
const file = process.argv[2] || 'android/app/src/main/AndroidManifest.xml'
let xml = fs.readFileSync(file, 'utf8')
const scheme = 'app.festify.convites'

if (xml.includes(`android:scheme="${scheme}"`)) {
  console.log('Manifesto já tem o retorno do login.')
  process.exit(0)
}

const filter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${scheme}" />
            </intent-filter>
`
// Coloca logo depois do intent-filter principal (MAIN/LAUNCHER) da MainActivity
const launcherEnd = xml.indexOf('</intent-filter>', xml.indexOf('android.intent.category.LAUNCHER'))
if (launcherEnd < 0) {
  console.error('Não achei a MainActivity no AndroidManifest.xml')
  process.exit(1)
}
const at = launcherEnd + '</intent-filter>'.length
xml = xml.slice(0, at) + filter + xml.slice(at)
fs.writeFileSync(file, xml)
console.log('Retorno do login com Google registrado no app (app.festify.convites://).')
