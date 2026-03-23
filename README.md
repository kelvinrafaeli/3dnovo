# 3dnovo - Gerador de Planta 2D e 3D

Sistema web para coletar dados do terreno e perfil do cliente via formulario e gerar um pacote de prompts para:

- planta 2D tecnica detalhada
- renderizacao 2D no Nano Banana 2 (modelo configuravel)
- geracao 3D total
- geracao 3D por comodo
- estudo de fachada

## Requisitos

- Node.js 18+
- Chave da API Google AI

## Como executar

1. Instale dependencias:

```bash
npm install
```

2. Configure ambiente:

```bash
copy .env.example .env
```

3. Edite `.env` com sua chave:

```env
JSON_BODY_LIMIT=25mb
GOOGLE_API_KEY=sua_chave
NANO_BANANA_MODEL=gemini-3.1-flash-image-preview
FALLBACK_MODEL=gemini-2.5-flash-image
PLAN_EXTRACT_MODEL=gemini-2.5-pro
PLAN_EXTRACT_FALLBACK_MODEL=gemini-2.5-flash
LOCAL_RENDER_FALLBACK=true
PORT=3000
```

4. Inicie servidor:

```bash
npm run dev ( em outro terminal npm run dev:api)
```



5. Acesse:

- http://localhost:3000

## Endpoints

- `GET /api/health`
- `POST /api/plan/generate`
- `POST /api/plan/render-2d`
- `POST /api/plan/extract-2d-data`
- `POST /api/plan/render-3d-package`
- `POST /api/plan/render-3d-item`

## Fluxo 3D na interface

1. Preencha o formulario e clique em "Gerar pacote 2D + 3D".
2. Na secao de resultados, clique em "Gerar Pacote 3D Completo".
3. O sistema renderiza automaticamente:
	- 3D total da edificacao
	- fachada 3D
	- 3D INTERNO por comodo

A interface usa a rota `render-3d-item` em sequencia para maior estabilidade e para evitar respostas muito grandes em uma unica conexao.
Antes do 3D, o sistema extrai automaticamente da planta 2D gerada: medidas, cotas, comodos, portas e janelas.
Esse JSON de extracao vira a base oficial dos prompts 3D (total, fachada e por comodo).
Opcionalmente, a imagem 2D pode ser usada como apoio visual, mas a base principal e sempre o que foi extraido da planta 2D.
Para consistencia visual, o sistema fixa um lock unico de projeto e usa a imagem do 3D total como ancora para fachada e comodos.
Assim, cobertura, volumetria externa e logica da area externa se mantem iguais entre todas as imagens.
Cada render de comodo e interno (camera dentro do ambiente) e segue a assinatura visual do mesmo projeto.
Os renders internos tambem reutilizam referencias dos comodos adjacentes ja gerados para manter portas/janelas coerentes entre sala, cozinha e demais ambientes conectados.
Se o backend receber imagem de referencia muito grande, ajuste `JSON_BODY_LIMIT` no `.env`.
O prompt 3D foi reforcado para manter fidelidade rigorosa a planta 2D, sem inventar portas, janelas ou paredes fora do que foi definido.

Se houver limite de quota na API, o sistema retorna fallback local para manter o fluxo de visualizacao.

## Observacoes

- O campo `NANO_BANANA_MODEL` pode ser alterado para outro modelo suportado na sua conta.
- Se a API retornar quota excedida (429), o sistema aplica fallback local e gera um blueprint SVG temporario para nao interromper o fluxo.
- A API de renderizacao pode retornar texto e/ou imagem em base64, dependendo do modelo configurado.
- Revise e valide tecnicamente o projeto arquitetonico com profissional habilitado antes de executar obra.
