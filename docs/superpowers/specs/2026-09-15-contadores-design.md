# Contadores (Água, Proteína, Calorias) — Design

## Objetivo
Adicionar ao PWA de treino três contadores diários — água (ml), proteína (g)
e calorias (kcal) — cada um com meta configurável, registro rápido de
consumo e visualização de progresso. Acesso via um bottom nav estilo app
nativo, com o treino permanecendo como tela inicial.

## Contexto
O app é hoje um `index.html` único (CSS e JS embutidos, sem build, sem
framework), com estado persistido em `localStorage` sob a chave
`treino-v1`. O padrão de "carga" do exercício (input que salva sozinho com
debounce de 300ms) é o modelo a seguir para a meta de cada contador.

## Navegação
- Novo `<nav>` fixo no rodapé (`position:fixed; bottom:0`), sempre visível,
  com 4 itens: **Treino** (ícone atual da home), **Água**, **Proteína**,
  **Calorias**.
- Cada item alterna qual `<section>` de nível superior fica visível
  (`display:none` nas demais) — sem hash routing, sem reload.
- A tela de Treino é a inicial (estado padrão ao abrir o app).
- A barra de descanso (`.timer`) permanece fixa acima do bottom nav, e só é
  exibida quando a aba Treino está ativa.
- `body { padding-bottom }` é ajustado para acomodar o novo nav.

## Tela de contador (componente único, parametrizado)
Um único template HTML/JS é reaproveitado para os 3 contadores, variando:
rótulo, unidade, valores dos atalhos e chave de estado.

Elementos, de cima para baixo:
1. Input de meta diária (ex. "Meta diária (ml)"), valor numérico, salva
   automaticamente com debounce (mesmo padrão da carga).
2. Mostrador de progresso:
   - Número grande: consumido / meta.
   - Barra de progresso (reaproveita estilo `.bar`/`.bar i` do treino),
     largura = min(consumido/meta, 100%).
   - Texto de status:
     - Se consumido ≤ meta: "faltam X <unidade>" + "Y% da meta".
     - Se consumido > meta: "passou X <unidade>" + "Y%" (>100%), com cor de
       destaque (`--acc`) na barra/texto para sinalizar que passou.
   - Se meta não definida (0 ou vazio): mostra apenas o consumido, sem
     texto de progresso/percentual.
3. Atalhos rápidos (botões), valores por contador:
   - Água: +250ml, +500ml
   - Proteína: +20g, +40g
   - Calorias: +200kcal, +500kcal
4. Input numérico manual + botão "Adicionar" para valor customizado
   (soma ao consumido; não substitui).
5. Botão "Resetar" — zera apenas o consumido do contador (mantém a meta).
   Não há reset automático por data.

## Estado e persistência
Novo objeto em `localStorage`, chave `contadores-v1`:
```json
{
  "agua":     { "meta": 2000, "consumido": 750 },
  "proteina": { "meta": 120,  "consumido": 40  },
  "calorias": { "meta": 2200, "consumido": 850 }
}
```
- Persistência via mesmo padrão de debounce (300ms) usado em `salvar()`
  para o treino, mas em uma função separada para não misturar com o
  estado do treino (`ST`/`treino-v1` continuam intocados).
- Sem relação com a data (`HOJE`): os valores acumulam até o usuário
  clicar em "Resetar" manualmente, por contador.

## Escopo de implementação
Tudo dentro de `index.html`, seguindo o padrão existente (vanilla JS,
sem dependências):
- CSS: bottom nav, tela de contador (mostrador, barra, atalhos, inputs).
- HTML: `<nav>` do bottom nav + estrutura de contador gerada via template
  JS (uma function que recebe config `{chave, label, unidade, atalhos}` e
  produz o HTML/handlers dos 3 contadores).
- JS: estado `CONTADORES`, `carregarContadores()`/`salvarContadores()`,
  render de progresso, handlers de clique (atalho/adicionar/resetar) e de
  input (meta e valor manual), troca de aba do bottom nav.
- Não altera a lógica de treino existente (`ST`, `PLANO`, timer, export/
  import), exceto o ajuste de layout para dar espaço ao bottom nav.

## Fora de escopo
- Sincronização entre dispositivos / backend.
- Histórico por dia ou por data (é um contador "global" que só reseta por
  ação manual, conforme pedido).
- Export/import dos contadores (pode ser considerado depois, não pedido
  agora).
