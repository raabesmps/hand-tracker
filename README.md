# hand-tracker

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![MediaPipe Hands](https://img.shields.io/badge/MediaPipe_Hands-00897B?style=for-the-badge)

Rastreamento de mão pela webcam, direto no navegador, usando o MediaPipe Hands do Google. Sem back-end, sem build, sem dependências — HTML, CSS e JavaScript puro (ES Modules) rodando 100% no cliente. A câmera nunca sai da sua máquina: todo o processamento acontece localmente.

## Demo

_(a subir — link do Netlify entra aqui após o primeiro deploy)_

## Funcionalidades

- **Rastreamento de mão em tempo real** — esqueleto da mão desenhado sobre o vídeo, com seleção automática entre a mão direita e a esquerda (prioriza a direita; se ela sair de quadro, o controle passa pra outra mão visível).
- **Modo Desenho** ✏️ — desenha no ar com o dedo indicador, com suavização de traço (curvas, não linhas retas) e um gesto de "mão aberta segurada" pra limpar a tela.
- **Modo Fatiar** 🍉 — mini-jogo estilo Fruit Ninja: frutas reconhecíveis (melancia, laranja, maçã, kiwi, limão) sobem em arco físico e são cortadas ao meio na direção real do movimento da mão, com placar, combo e um golpe especial via pinça.
- **Modo Mouse** 🖱️ — transforma a mão num cursor de verdade: aponte pra qualquer botão da página e feche a pinça pra clicar, sem precisar de mouse físico. Pensado como demonstração de acessibilidade (uso por pessoas com dificuldade motora).

## Stack

- JavaScript puro com [ES Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) — sem framework, sem bundler
- [MediaPipe Hands](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) (via CDN) pra detecção dos 21 pontos da mão
- Canvas API nativa pra todo o desenho, física e composição visual
- CSS3 puro pra estilo (variáveis, gradientes, animações)

## Estrutura do projeto

```
hand-tracker/
├── index.html
├── netlify.toml
└── assets/
    ├── css/
    │   └── style.css        # todo o visual
    ├── includes/
    │   ├── header.html      # título + descrição
    │   └── footer.html      # créditos
    └── js/
        ├── main.js           # orquestra o loop de renderização
        ├── constants.js      # tamanhos, cores, thresholds
        ├── state.js          # estado compartilhado (mão, modo, sensibilidade)
        ├── geometry.js       # distância ponto-ponto, ponto-segmento, geometria da mão
        ├── handTracking.js   # MediaPipe + câmera + seleção de mão
        ├── videoRenderer.js  # vídeo espelhado + esqueleto + cursor
        ├── hud.js            # badges de status (mão/pinça/fps)
        ├── ui.js             # botões, slider, textos de dica
        ├── includes.js       # carrega os includes de header/footer
        └── modes/
            ├── drawMode.js    # modo Desenho
            ├── sliceGame.js   # modo Fatiar
            └── mouseMode.js   # modo Mouse
```

Os "includes" de header/footer são carregados em tempo de execução via `fetch()` (ver `assets/js/includes.js`) — sem servidor de template, sem build step, funciona em qualquer host estático.

## Rodando o projeto localmente

Não tem instalação nenhuma. Só precisa servir os arquivos por HTTP (a API de câmera exige um contexto seguro, então abrir o `index.html` direto como `file://` não funciona em todo navegador).

Clone o repositório:

```bash
git clone https://github.com/raabesmps/hand-tracker.git
cd hand-tracker
```

E sirva com qualquer servidor estático, por exemplo:

```bash
npx serve .
# ou
python -m http.server 8000
```

Abra o endereço indicado, permita o acesso à câmera, e pronto.

## Deploy

Deploy estático direto no [Netlify](https://www.netlify.com/) (`netlify.toml` na raiz, sem comando de build — é só publicar os arquivos como estão).
