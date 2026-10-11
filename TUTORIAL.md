# Festify — Tutorial completo (versão final)

Faça **na ordem**. Cada parte começa dizendo **onde clicar**. Quando aparecer `SEU-USUARIO`, `SEU-REPOSITORIO` ou `SEU-ID`, troque pelos seus.

> **Por que a confirmação não aparecia no app?** Você testou no **modo demonstração** (sem Supabase). Nesse modo cada aparelho guarda os dados só para ele: a confirmação feita no celular do convidado nunca chega ao seu app. Com o Supabase ligado (Partes 2 a 4) tudo fica num lugar só e a lista atualiza **sozinha em poucos segundos**. Também corrigi o botão **Visualizar**: agora a confirmação feita por ali **é salva**.

---

## PARTE 1 — Baixar o pacote

1. Baixe o arquivo **festify-final.zip** que te mandei aqui no chat.
2. No computador, clique com o botão direito nele → **Extrair tudo…** → **Extrair**.
3. Vai aparecer a pasta **festify**. Deixe ela aberta; vamos usar na Parte 4.

---

## PARTE 2 — Supabase (o banco de dados)

### 2.1 Criar as tabelas novas
1. Entre em **supabase.com** → **Sign in** → clique no seu projeto.
2. No menu da esquerda clique em **SQL Editor** (ícone `>_`).
3. Clique em **+ New query** (ou no **+** no topo).
4. No computador, abra a pasta **festify → supabase → schema.sql** com o **Bloco de Notas**.
5. Aperte **Ctrl + A** (seleciona tudo) e **Ctrl + C** (copia).
6. Volte ao Supabase, clique dentro da área de texto e aperte **Ctrl + V**.
7. Clique no botão verde **Run** (canto de baixo à direita).
8. Tem que aparecer **Success. No rows returned**. ⚠️ Isso apaga os dados de teste da versão antiga.

### 2.2 Dizer que VOCÊ é o dono da plataforma
1. Ainda no **SQL Editor**, clique em **+ New query**.
2. Cole isto (com o SEU Gmail):
   ```sql
   insert into public.super_admins (email) values ('streetsttr@gmail.com') on conflict do nothing;
   ```
3. Clique em **Run** → **Success**.

### 2.3 Ligar os logins
1. Menu da esquerda → **Authentication** (ícone de pessoas).
2. Clique em **Sign In / Providers**.
3. Em **User Signups**: deixe **Allow new users to sign up** **LIGADO** (verde). Os buffets novos ficam “pendentes” até você liberar, então ninguém entra sem você deixar.
4. Na mesma tela procure **Confirm email** (fica na seção **User Signups** ou dentro de **Email**, na lista de provedores) e **DESLIGUE**. Ele precisa ficar desligado para o login com nome do buffet + senha (programa do Windows).
5. Confira também que o provedor **Email** está ligado (**Enable Email provider**).
6. Clique em **Save changes** / **Save**.

### 2.4 Copiar o endereço e a chave
1. Menu da esquerda → **Project Settings** (engrenagem) → **API Keys**.
2. Copie a **Publishable key** (começa com `sb_publishable_…`). Se só aparecer a aba **Legacy API Keys**, copie a chave **anon public**. ❌ Nunca use a chave **secret / service_role**.
3. Ainda em Project Settings, clique em **Data API** e copie a **Project URL** (algo como `https://abcdefgh.supabase.co`).
4. Guarde os dois num bloco de notas.

---

## PARTE 3 — Login com Google (Gmail)

### 3.1 Criar o projeto no Google
1. Entre em **console.cloud.google.com** com o seu Gmail.
2. No topo, clique no seletor de projeto (ao lado do logo **Google Cloud**) → **Novo projeto / New project**.
3. Nome: **Festify** → **Criar / Create**. Espere e selecione o projeto Festify no mesmo seletor.

### 3.2 Tela de consentimento
1. Menu **☰** (canto esquerdo) → **APIs e serviços / APIs & Services** → **Tela de consentimento OAuth / OAuth consent screen**.
2. Clique em **Começar / Get started**.
3. **Nome do app:** Festify · **E-mail de suporte:** o seu Gmail → **Próxima**.
4. **Público / Audience:** marque **Externo / External** → **Próxima**.
5. **Dados de contato:** o seu Gmail → **Próxima** → marque que concorda → **Continuar** → **Criar**.

### 3.3 Pegar o endereço de retorno no Supabase
1. Em outra aba: Supabase → **Authentication** → **Sign In / Providers** → clique em **Google**.
2. Lá embaixo aparece **Callback URL (for OAuth)** → clique no botão de copiar. É assim: `https://SEU-ID.supabase.co/auth/v1/callback`.

### 3.4 Criar a credencial
1. Volte ao Google Cloud → no menu da esquerda da tela de consentimento clique em **Clientes / Clients** → **+ Criar cliente / Create client**.
2. **Tipo de aplicativo:** **Aplicativo da Web / Web application** · **Nome:** Festify.
3. Em **URIs de redirecionamento autorizados / Authorized redirect URIs** clique em **+ Adicionar URI** e cole o Callback URL do passo 3.3.
4. Clique em **Criar / Create**.
5. Aparece uma janela com **ID do cliente / Client ID** e **Chave secreta / Client secret**. Copie os dois (tem botão de copiar).

### 3.5 Liberar para qualquer Gmail
1. No menu da esquerda clique em **Público / Audience**.
2. Em **Status de publicação**, clique em **Publicar aplicativo / Publish app** → **Confirmar**. Deve ficar **Em produção / In production**.

### 3.6 Ligar o Google no Supabase
1. Supabase → **Authentication** → **Sign In / Providers** → **Google**.
2. Ligue **Enable Sign in with Google**.
3. **Client IDs:** cole o ID do cliente · **Client Secret (for OAuth):** cole a chave secreta.
4. Clique em **Save**.

### 3.7 Endereços autorizados
1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL:** `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/` → **Save**.
3. Em **Redirect URLs** clique em **Add URL** e adicione (uma de cada vez, sempre **Save URLs**):
   - `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/**`
   - `app.festify.convites://login`  ← é o que faz o login do Google voltar para dentro do APK.

---

## PARTE 4 — GitHub (atualizar o app)

### 4.1 Enviar os arquivos novos
1. Abra **github.com** → seu repositório do Festify.
2. Entre na pasta onde está o **package.json** (se ele está na página inicial do repositório, fique nela).
3. Clique em **Add file** → **Upload files**.
4. Abra a pasta **festify** do seu computador, aperte **Ctrl + A** e **arraste tudo** para a área “Drag files here”.
   - Precisa ir junto a pasta **.github**. No Windows ela fica escondida: no Explorador de Arquivos clique em **Exibir → Mostrar → Itens ocultos**.
5. Espere todos os arquivos carregarem (a barra para de andar).
6. Lá embaixo, em **Commit changes**, escreva `versão final` → **Commit changes**.

> O pacote **não** traz o arquivo `public/config.js`, de propósito: assim nada que você ajustou nele é apagado. O endereço do Supabase vai pelas variáveis abaixo.

### 4.2 Variáveis do Supabase
1. No repositório: **Settings** (engrenagem no topo) → no menu da esquerda **Secrets and variables** → **Actions**.
2. Clique na aba **Variables** → **New repository variable**.
3. **Name:** `SUPABASE_URL` · **Value:** a Project URL → **Add variable**.
4. **New repository variable** de novo → **Name:** `SUPABASE_KEY` · **Value:** a Publishable key (ou anon) → **Add variable**.
5. Se essas variáveis já existiam, clique no lápis ✏️ ao lado e confira os valores.

### 4.3 Site no ar
1. **Settings** → **Pages** (menu da esquerda).
2. Em **Build and deployment → Source**, escolha **GitHub Actions**.

### 4.4 Esperar ficar verde
1. Clique na aba **Actions** (topo do repositório).
2. A execução mais recente (“versão final”) fica **amarela**. Espere uns 10–15 minutos até ficar **verde ✅**.
3. Se ficou vermelha ❌: clique nela, clique no passo vermelho e me mande um print.
4. Depois de verde, na página inicial do repositório, na direita, clique em **Releases** → a mais nova (**Festify N**) → lá estão **Festify.apk** e **Festify-Setup.exe**.

O site fica em: `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`

---

## PARTE 5 — Seu primeiro acesso (você, dono)

1. No computador, abra o **Chrome** em `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/?admin=1`.
2. Clique em **Entrar com Google (Gmail)** → escolha **streetsttr@gmail.com** → **Continuar**.
3. Aparece **“Qual é o nome do seu buffet?”** → digite o nome → **Pedir acesso**.
4. Como você é o dono, o painel abre na hora e aparece a aba **Liberações** (com um número vermelho quando alguém pede acesso).

---

## PARTE 6 — Instalar nos aparelhos

### Celular e tablet Android (APK)
1. No aparelho, abra o Chrome em github.com → seu repositório → **Releases** → **Festify.apk**.
2. Toque em **Baixar** → **Abrir**. Se pedir, toque em **Configurações → Permitir desta fonte** e volte.
3. Toque em **Atualizar/Instalar** (instala por cima do antigo).
4. Abra o Festify → **Entrar com Google (Gmail)** → abre o navegador → escolha a conta → o app volta sozinho, já logado. O login fica salvo.

### Computador — opção 1 (recomendada): instalar pelo Chrome
1. Abra o site `…/?admin=1` no Chrome.
2. Na barra de endereço, à direita, clique no ícone **Instalar** (um monitor com seta) → **Instalar**.
3. O Festify vira um programa no menu Iniciar. Entre com Google uma vez; fica salvo.

### Computador — opção 2: programa .exe (login com nome + senha)
1. Em **Releases** baixe **Festify-Setup.exe** e abra.
2. Se aparecer “O Windows protegeu o computador”: **Mais informações → Executar assim mesmo**.
3. No programa: aba **Primeiro acesso** → **Nome do buffet** (ex.: Buffet Magia & Farra) → **Crie uma senha** (mínimo 6) → repita → **Criar acesso e pedir liberação**.
4. Aparece **Aguardando liberação**. Você libera na aba **Liberações** (Parte 7). O programa abre sozinho em até 15 s (ou toque em **Já fui liberado — atualizar**).
5. Nas próximas vezes: aba **Entrar** → nome do buffet + senha.

### iPhone / iPad
Safari → abra o site → botão **Compartilhar** → **Adicionar à Tela de Início**.

---

## PARTE 7 — Liberar buffets (só você)

1. Painel → aba **Liberações** (no celular, barra de baixo).
2. Aba **Pendentes**: cada pedido mostra o buffet e quem pediu (Gmail ou “Nome + senha”).
3. Toque em **Liberar** ✅ — a pessoa entra no painel na hora.
4. Outras opções: **Bloquear** (tira o acesso daquela pessoa), **Remover** (apaga o login; temas e convites ficam), **Bloquear buffet inteiro** (site, biblioteca e convites do buffet saem do ar) e **Reativar buffet**.
5. Se alguém digitou o nome errado, ele mesmo toca em **Cancelar pedido** e pede de novo.

---

## PARTE 8 — Deixar o buffet com a cara dele (Ajustes)

1. Painel → **Ajustes**.
2. **Logo**: toque no quadrado → escolha a imagem.
3. **Banner da biblioteca** (a faixa grande do topo): toque em **Escolher imagem do banner**, escreva **Título** e **Texto**. A **Prévia** mostra como fica.
4. **WhatsApp do buffet** (DDD + número) → toque em **Testar número**.
5. **Endereço** e **Link do Google Maps** (opcional).
6. **Salvar ajustes**.
7. No topo, **Link da sua biblioteca de temas** → **Copiar** ou **Enviar**. É esse link que você divulga (Instagram, WhatsApp). Ao abrir, aparece a pergunta “Está preparado para essa data inesquecível?” e as nuvens revelam a biblioteca.

---

## PARTE 9 — Cadastrar temas (pode ter dezenas)

1. Painel → **Biblioteca** → **Adicionar tema**.
2. **Fotos do tema** → **Adicionar** → escolha uma ou várias fotos. Toque na ⭐ para escolher a capa; use as setas para ordenar.
3. **Nome do tema** (obrigatório).
4. **Para quem é**: **Menina** (convite rosa), **Menino** (azul) ou **Para todos** (vermelho).
5. Opcionais: **Emoji**, **Palavras-chave** (ajudam a busca: “dino, jurássico”), **Descrição**.
6. **Adicionar tema**. Só nome + 1 foto já basta.

---

## PARTE 10 — Gerar o convite

1. **Biblioteca** → no tema escolhido pelo cliente toque em **Gerar convite** (ou **Novo convite** na barra de baixo).
2. **Evento**: título, mensagem, data, horário, foto (da biblioteca ou do celular — a do celular fica só nesse convite) → **Próximo**.
3. **Local**: já vem com o endereço do buffet → **Próximo**.
4. **Presente**: ligue **Receber presente via Pix** se quiser, tipo de chave, chave e titular. O convite sempre mostra **“Valor de coração”** → **Próximo**.
5. **Visual**: Menina / Menino / Para todos (já vem do tema) → **Criar convite**.
6. Na janela **Convite pronto!**: **Enviar pelo WhatsApp** (para o cliente repassar) e **Copiar lista privada p/ o cliente** (o pai/mãe acompanha os confirmados sem acessar o painel).

---

## PARTE 11 — Acompanhar as confirmações

1. Painel → **Convites** → no card da festa toque em **Ver/Gerenciar Lista de Convidados**.
2. A lista mostra cada família com o **nome de cada adulto e criança**. Ela se atualiza **sozinha** (selo **Ao vivo**), a cada poucos segundos e sempre que você volta para o app. Se quiser, toque em **Atualizar**.
3. **Baixar Lista em PDF** (uma linha por pessoa, com caixinha de check-in para a portaria), **Copiar para WhatsApp** ou **Enviar no WhatsApp**.
4. Lixeira 🗑️ remove uma confirmação.

---

## PARTE 12 — Trocar a cor do app pela da sua logo

Hoje está um **azul provisório** (#1E88E5). Quando tiver a logo:
- **Só a cor:** GitHub → abra o arquivo **brand.config.js** → lápis ✏️ → troque `#1E88E5` pelo código da sua cor → **Commit changes**.
- **Logo como ícone do app:** GitHub → pasta **assets** → **Add file → Upload files** → envie a logo quadrada com o nome **logo.png** (1024×1024 de preferência) → **Commit changes**.

O GitHub gera tudo de novo (site, APK, .exe e ícones). Depois é só instalar o APK novo por cima. Ou me mande a logo/código aqui que eu ajusto.

---

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| Página do Google com **redirect_uri_mismatch** | O Callback URL do Supabase não foi colado certinho no Google (Parte 3.4). |
| Texto **Unsupported provider / provider is not enabled** | Google não está ligado no Supabase (Parte 3.6). |
| No APK, depois do Google abre o **site** em vez de voltar ao app | Falta `app.festify.convites://login` em **Redirect URLs** (Parte 3.7). |
| “Só aparecem testadores” no Google | Publique o app (Parte 3.5). |
| **O Supabase pediu confirmação de e-mail** | Desligue **Confirm email** (Parte 2.3). |
| Painel mostra **Modo demonstração** | As variáveis `SUPABASE_URL`/`SUPABASE_KEY` não foram criadas ou a execução do Actions ainda não ficou verde (Parte 4.2 e 4.4). |
| **Aguardando liberação** | Libere na aba **Liberações** (Parte 7). |
| Android diz **App não instalado** | Desinstale o Festify antigo e instale de novo (só acontece se o antigo foi instalado de outro lugar). |
