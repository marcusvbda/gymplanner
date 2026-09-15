# Treino

Plano de treino semanal. HTML estático, sem build e sem dependências.

## Subir na Vercel

Com a CLI, dentro da pasta:

```bash
npx vercel
```

No dashboard: **Add New → Project**, importa o repo, e em *Framework Preset* escolhe **Other**. Deixa build command e output directory vazios.

Também funciona igual no GitHub Pages, Netlify ou Cloudflare Pages.

## Rodar local

```bash
npx serve .
# ou
python3 -m http.server 8000
```

Abre `http://localhost:8000`. Não abra o arquivo com duplo clique: em `file://` o `fetch` do `plano.json` é bloqueado.

Para testar no celular na mesma rede, pega o IP da máquina (`ipconfig getifaddr en0` no Mac, `hostname -I` no Linux) e acessa `http://SEU_IP:8000`.

## Usar no celular

Abre no navegador e adiciona à tela de início. Abre em tela cheia, sem barra de endereço, e funciona sem sinal depois da primeira visita.

## Editar o treino

Tudo em `plano.json`. Cada dia tem `id`, `dia`, `foco`, `cor` e a lista de exercícios.

```json
{ "nome": "Supino reto", "sets": "4×4–6", "icone": "supino" }
```

O `id` do dia precisa ser único e estável: ele é a chave do que fica salvo. Se você renomear um `id`, as cargas daquele dia ficam órfãs.

Ícones disponíveis: `supino`, `inclinado`, `desenvolvimento`, `lateral`, `corda`, `tricepsTesta`, `puxada`, `remada`, `remadaBaixa`, `facepull`, `rosca`, `martelo`, `agachamento`, `stiff`, `extensora`, `flexora`, `panturrilha`, `abdomen`, `chestPress`, `legPress`. Ficam no objeto `I` dentro do `index.html`.

Depois de editar `plano.json` ou `index.html`, sobe o `VERSAO` no `sw.js`. Sem isso o service worker continua servindo a versão antiga em quem já abriu o app.

## Dados

Ficam no `localStorage`, na chave `treino-v1`:

- **cargas** — permanentes, sobrescritas quando você digita por cima
- **marcações** — guardam a data; aparecem só no dia em que foram feitas, então zeram sozinhas

Não há histórico: a carga anterior é substituída, não acumulada.

O botão **Exportar** baixa um JSON com tudo, e **Importar** funde de volta. Vale usar de vez em quando: o Safari no iOS descarta o storage de sites não visitados por 7 dias, e limpar dados de navegação apaga tudo.

## Arquivos

```
index.html      app inteiro (ícones SVG, estilos e lógica)
plano.json      o treino
manifest.json   PWA
sw.js           cache offline
vercel.json     headers para não cachear html/json/sw
icon-*.png      ícones
```
