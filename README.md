# Festify — convites digitais para buffets

Plataforma para **vários buffets**: cada um tem a sua biblioteca de temas (com banner e logo próprios), gera convites animados (envelope no céu com nuvens e balões, contagem regressiva, Pix “valor de coração”, confirmação com o nome de cada convidado) e acompanha a lista de presença **ao vivo**.

- **Passo a passo completo:** [TUTORIAL.md](TUTORIAL.md)
- **Banco de dados:** `supabase/schema.sql` (rodar no SQL Editor do Supabase)
- **Cor da marca:** `brand.config.js` · **Logo do app:** `assets/logo.png` (opcional)
- **APK Android + instalador Windows + site:** gerados pelo GitHub Actions (`.github/workflows/build-apk.yml`)

## Endereços

| Endereço | Tela |
|---|---|
| `?admin=1` | Painel do buffet (login Google ou nome + senha) |
| `?b=nome-do-buffet` | Biblioteca pública do buffet |
| `?b=nome-do-buffet&tema=slug` | Página do tema (fotos, miniatura, “Pedir convite online”) |
| `?festa=slug` | Convite do convidado |
| `?lista=token` | Lista privada do cliente |

## Rodar no computador (opcional)

```bash
npm install
npm run dev
```

Sem Supabase configurado em `public/config.js`, o app abre em **modo demonstração** (dados só no aparelho).
