# IA Catequese v2

Assistente de apoio à preparação de encontros de catequese — reconstruído de raiz
sobre Next.js (App Router), com streaming de respostas em tempo real, UI em estilo
"vidro" (glassmorphism) e tipografia Geist Sans.

## O que mudou em relação à v1

- **UI redesenhada**: painel translúcido com `backdrop-filter`, fundo com manchas de cor
  suaves desfocadas, paleta neutra clara/escura automática (`prefers-color-scheme`),
  cantos bem arredondados, sombras suaves — inspirado na linguagem visual "vidro" da Apple.
- **Tipografia**: [Geist Sans](https://vercel.com/font), o sans-serif moderno da Vercel,
  via `next/font`.
- **Streaming real**: as respostas do Claude chegam token a token (não é preciso esperar
  pela resposta completa), com scroll automático suave enquanto o texto entra e um botão
  "ir para o fim" que só aparece quando o utilizador se afasta do fundo da conversa.
- **Animações**: transições subtis com `framer-motion` (entrada de mensagens, botão de
  scroll).
- **Markdown tratado**: lista/parágrafos com espaçamento consistente (corrige o problema
  de espaços grandes entre itens de listas que a v1 tinha).
- Mantém a mesma missão e o mesmo prompt de sistema da v1 (catequista experiente,
  estrutura de encontro de 45 min, fiel ao Catecismo, português europeu).

## Stack

- **Next.js (App Router)** — o mais adequado para deploy nativo na Vercel, com API routes
  server-side (mantém a `ANTHROPIC_API_KEY` fora do browser) e streaming HTTP nativo.
- **Tailwind CSS v4** — para o layout e utilitários; o efeito de vidro e a tipografia
  markdown estão em `app/globals.css`.
- **@anthropic-ai/sdk** — chama a Claude API diretamente (Files API para anexos, streaming
  nativo do SDK).
- **framer-motion** — animações.
- **react-markdown + remark-gfm** — renderização das respostas.

## Configuração

Cria um ficheiro `.env.local` na raiz do projeto:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Correr localmente

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Modelo

Por defeito usa `claude-haiku-4-5` (rápido e barato — $1/$5 por milhão de tokens
input/output), definido em `app/api/chat/route.js` (constante `MODEL`). Para um modelo
mais robusto, muda para `claude-sonnet-5` — nesse caso remove o parâmetro `temperature`
do pedido, porque o Sonnet 5 devolve erro 400 se `temperature`/`top_p`/`top_k` vierem
fora do valor por defeito.

## Deploy

### Vercel
1. Importa o repositório em [vercel.com/new](https://vercel.com/new).
2. Adiciona a variável de ambiente `ANTHROPIC_API_KEY` em Settings → Environment Variables.
3. Deploy — não é preciso configuração adicional (framework Next.js detectado automaticamente).

### GitHub
```bash
git init
git add .
git commit -m "IA Catequese v2 — glass UI, streaming, Geist"
git branch -M main
git remote add origin <URL_DO_TEU_REPOSITÓRIO>
git push -u origin main
```

## Notas

- O upload de ficheiros usa a Files API beta da Anthropic (`files-api-2025-04-14`) e só
  aceita PDF e texto simples como bloco `document` — `.docx`/`.xlsx` precisam de conversão
  prévia.
- Sem autenticação nem base de dados — é um MVP conversacional, sem histórico persistente
  entre sessões.
