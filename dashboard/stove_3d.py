"""
stove_3d.py - Visualizacao 3D estilizada do fogao, colorida por area-chave.

Recebe as cores ja resolvidas (dict {key_area: hex}) e devolve o HTML de um
canvas Three.js. NAO contem regra de negocio: quem decide "qual e a pior
severidade desta area" e `business_rules.compute_region_severities()`, e quem
traduz severidade -> cor e `styles.SEVERITY_COLOR_HEX`. Aqui so se desenha.

ATENCAO - MODELO PLACEHOLDER. E uma aproximacao generica de um fogao de piso,
NAO a geometria real de nenhum SKU da Whirlpool. Serve para comunicar "qual
regiao esta com problema", nunca como referencia de engenharia, medida ou
posicao real de componente. Ver "COMO TROCAR POR UM MODELO REAL" no fim.

PRINCIPIO DE COR (o que faz o modelo parecer produto e nao brinquedo):
cor de estado aparece so como DESTAQUE PONTUAL - discos dos queimadores,
esferas dos botoes, tiras finas, indicadores da base - do jeito que um
produto real usa luz indicadora. Pecas grandes (corpo, porta, cooktop) usam
so os neutros do Guia de Estilo. Pintar uma peca inteira de vermelho era o
que deixava o modelo com cara de bloco de montar colorido.

O Three.js e os addons vem do PROPRIO repositorio (`static/three/`, servido
pelo Streamlit em /app/static/ - ver `enableStaticServing` no config.toml),
nao de CDN: redes corporativas costumam bloquear CDNs externos, e nesse caso
o 3D simplesmente nao apareceria. Testado com a rede externa bloqueada.

Os addons (RoundedBoxGeometry, RoomEnvironment, OrbitControls) so existem
como ES modules, por isso o `importmap` abaixo - o build antigo UMD
(`three.min.js`) nao os inclui, e por isso foi removido do repositorio. Se os
modules falharem (navegador muito antigo), o canvas mostra a mensagem de erro
e o resto do dashboard segue funcionando: nada aqui e essencial ao resultado.
"""

from __future__ import annotations

import json

import styles

# Ordem fixa das areas-chave, igual a de `mock_data.KEY_AREAS`.
KEY_AREAS: list[str] = [
    "Mainback",
    "Coil Temps",
    "Main Vent Sys",
    "IPC Cooling",
    "IPC Comp",
    "CT Knobs",
    "Oven HMI",
]

# Siglas dos indicadores da base. CONVENCAO INTERNA DA EQUIPE - nao vem de
# nenhum documento do parceiro; conferir com quem for usar o dashboard se
# sao os rotulos mais claros. `build_legend_html()` publica a legenda delas.
AREA_ABBR: dict[str, str] = {
    "Mainback": "MB",
    "Coil Temps": "CT",
    "Main Vent Sys": "MV",
    "IPC Cooling": "IC",
    "IPC Comp": "IP",
    "CT Knobs": "CK",
    "Oven HMI": "HM",
}

# Caminhos servidos pelo proprio Streamlit a partir de `dashboard/static/`.
_THREE_MODULE_URL = "/app/static/three/three.module.js"
_THREE_ADDONS_URL = "/app/static/three/addons/"


def _structural_palette() -> dict[str, str]:
    """Neutros do Guia de Estilo usados nas pecas do modelo.

    Nenhuma cor nasce aqui: tudo vem de `styles.COLORS`, para manter a regra
    de que cor so existe em um lugar no projeto.
    """
    c = styles.COLORS
    return {
        "corpo": c["cinza_claro"],
        "cooktop": c["quase_preto"],
        "backsplash": c["cinza"],
        "moldura_porta": c["cinza"],
        "vidro_porta": c["light_accent_blue"],
        "botao": c["cinza_escuro"],
        "kickplate": c["cinza_medio"],
        "aro_queimador": c["quase_preto"],
        "texto_sigla": c["quase_preto"],
    }


def build_stove_html(
    region_colors: dict[str, str],
    neutral_color: str,
    height: int = 500,
) -> str:
    """Monta o HTML/JS do canvas 3D.

    region_colors: {key_area: cor_hex} - so as areas consultadas.
    neutral_color: cor das areas que NAO foram consultadas (ver
        `styles.NEUTRAL_REGION_COLOR`).
    """
    colors = {area: region_colors.get(area, neutral_color) for area in KEY_AREAS}

    colors_json = json.dumps(colors)
    abbr_json = json.dumps(AREA_ABBR)
    palette_json = json.dumps(_structural_palette())
    importmap_json = json.dumps(
        {"imports": {"three": _THREE_MODULE_URL, "three/addons/": _THREE_ADDONS_URL}}
    )

    return f"""
<style>
  /* O `st.iframe` sempre liga `scrolling`, e o <body> do iframe tem margem
     padrao de 8px: sem isto sobra uma barra de rolagem ao lado do modelo. */
  html, body {{ margin: 0; padding: 0; overflow: hidden; }}
  #stove-outer {{
    width: 100%; height: {height}px; border-radius: 12px; overflow: hidden;
    /* Degrade suave em vez de branco chapado: da um "chao" visual ao produto */
    background: linear-gradient(180deg, {styles.COLORS["cinza_extra_claro"]} 0%,
                                        {styles.COLORS["branco"]} 62%);
    position: relative;
  }}
  #stove-fallback {{
    display: none; position: absolute; inset: 0; padding: 16px;
    font-family: 'Open Sans', sans-serif; font-size: 13px;
    color: {styles.COLORS["cinza_escuro"]};
    align-items: center; justify-content: center; text-align: center;
  }}
</style>
<div id="stove-outer">
  <div id="stove-container" style="width:100%;height:100%;"></div>
  <div id="stove-fallback">
    Não foi possível carregar a biblioteca 3D (Three.js).<br>
    Os resultados numéricos acima não dependem desta visualização.
  </div>
</div>

<script type="importmap">{importmap_json}</script>
<script type="module">
const REGION_COLORS = {colors_json};
const REGION_ABBR   = {abbr_json};
const PALETTE       = {palette_json};
const NEUTRAL       = {json.dumps(neutral_color)};
const HEIGHT        = {height};

const container = document.getElementById('stove-container');
const fallback  = document.getElementById('stove-fallback');

let THREE, OrbitControls, RoundedBoxGeometry, RoomEnvironment;
try {{
  THREE              = await import('three');
  OrbitControls      = (await import('three/addons/OrbitControls.js')).OrbitControls;
  RoundedBoxGeometry = (await import('three/addons/RoundedBoxGeometry.js')).RoundedBoxGeometry;
  RoomEnvironment    = (await import('three/addons/RoomEnvironment.js')).RoomEnvironment;
}} catch (e) {{
  fallback.style.display = 'flex';
  throw e;
}}

const width = container.clientWidth || 600;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(42, width / HEIGHT, 0.1, 100);
camera.position.set(4.5, 3.15, 5.5);

// `alpha: true` deixa o degrade do CSS aparecer atras do modelo.
const renderer = new THREE.WebGLRenderer({{ antialias: true, alpha: true }});
renderer.setSize(width, HEIGHT);
// Cap em 1.5, nao 2: numa tela retina (devicePixelRatio 2) isso e a diferenca
// entre renderizar 4x ou 2.25x mais pixels por frame.
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// Ambiente sintetico (reflexo suave no metal) - gerado localmente, sem HDRI.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment()).texture;

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.3, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;              // panorar so faria o usuario se perder
controls.minDistance = 3.5;
controls.maxDistance = 12;
controls.maxPolarAngle = Math.PI / 2.05; // trava antes de passar por baixo do chao
// Gira sozinho ate a primeira interacao: areas-chave ficam em faces opostas
// (Mainback atras, Oven HMI na frente) e numa vista fixa justamente a regiao
// diagnosticada pode ficar escondida. Ao interagir, o controle e do usuario.
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;
controls.addEventListener('start', () => {{ controls.autoRotate = false; }});
controls.update();

// --- Iluminacao de tres pontos ------------------------------------------
scene.add(new THREE.HemisphereLight(0xffffff, 0xd8dadd, 0.55));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
keyLight.position.set(4, 6, 4);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.32);
fillLight.position.set(-4, 2, 2);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.38);
rimLight.position.set(-2, 3, -4);
scene.add(rimLight);

const root = new THREE.Group();
scene.add(root);

// --- Helpers -------------------------------------------------------------
function metalMat(color, roughness, metalness) {{
  return new THREE.MeshStandardMaterial({{
    color: color, roughness: roughness, metalness: metalness
  }});
}}

// Cor de estado com leve emissao: le como "luz indicadora acesa", nao como
// peca pintada.
function accentMat(colorHex, emissive) {{
  return new THREE.MeshStandardMaterial({{
    color: colorHex, roughness: 0.35, metalness: 0.1,
    emissive: new THREE.Color(colorHex), emissiveIntensity: emissive
  }});
}}

function add(geo, mat, x, y, z) {{
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  root.add(m);
  return m;
}}

function labelSprite(text) {{
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 44px Arial, Helvetica, sans-serif';
  ctx.fillStyle = PALETTE.texto_sigla;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({{
    map: new THREE.CanvasTexture(canvas), transparent: true
  }}));
  sprite.scale.set(0.34, 0.17, 1);
  return sprite;
}}

// --- Corpo, cooktop e backsplash ----------------------------------------
add(new RoundedBoxGeometry(3, 2, 2, 4, 0.06), metalMat(PALETTE.corpo, 0.5, 0.4), 0, 1, 0);
add(new RoundedBoxGeometry(3, 0.12, 2, 4, 0.04), metalMat(PALETTE.cooktop, 0.25, 0.5), 0, 2.06, 0);

// Backsplash: painel vertical ATRAS do cooktop, onde ele fica num fogao de
// piso de verdade. Antes o "Mainback" era uma tira solta na lateral, que
// aparecia esticada e deslocada dependendo do angulo.
add(new RoundedBoxGeometry(3, 0.55, 0.08, 3, 0.03),
    metalMat(PALETTE.backsplash, 0.5, 0.3), 0, 2.4, -0.98);
add(new THREE.BoxGeometry(2.8, 0.07, 0.02),
    accentMat(REGION_COLORS["Mainback"], 0.45), 0, 2.62, -0.93);

// --- Queimadores (Coil Temps): aro escuro + disco de status --------------
[[-0.8, 0.5], [0.8, 0.5], [-0.8, -0.5], [0.8, -0.5]].forEach(([x, z]) => {{
  add(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 32),
      metalMat(PALETTE.aro_queimador, 0.35, 0.4), x, 2.14, z);
  add(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 32),
      accentMat(REGION_COLORS["Coil Temps"], 0.5), x, 2.17, z);
}});

// --- Grelha de ventilacao (Main Vent Sys) --------------------------------
for (let i = -2; i <= 2; i++) {{
  add(new THREE.BoxGeometry(0.35, 0.04, 0.25),
      accentMat(REGION_COLORS["Main Vent Sys"], 0.3), i * 0.45, 2.13, -0.72);
}}

// --- Porta do forno: moldura + vidro translucido -------------------------
add(new RoundedBoxGeometry(2.5, 1.3, 0.1, 3, 0.04),
    metalMat(PALETTE.moldura_porta, 0.4, 0.35), 0, 0.85, 1.02);

add(new RoundedBoxGeometry(2.15, 0.95, 0.02, 3, 0.02), new THREE.MeshPhysicalMaterial({{
  color: PALETTE.vidro_porta, roughness: 0.05, metalness: 0.05,
  transmission: 0.55, transparent: true, opacity: 0.85
}}), 0, 0.85, 1.07);

// Faixa de status da HMI, no topo da moldura da porta.
add(new THREE.BoxGeometry(2.3, 0.08, 0.02),
    accentMat(REGION_COLORS["Oven HMI"], 0.45), 0, 1.46, 1.08);

// --- Botoes (CT Knobs): base neutra + esfera de status -------------------
for (let i = -1; i <= 1; i++) {{
  add(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 24),
      metalMat(PALETTE.botao, 0.4, 0.3), i * 0.7, 1.86, 1.03);
  add(new THREE.SphereGeometry(0.05, 16, 16),
      accentMat(REGION_COLORS["CT Knobs"], 0.4), i * 0.7, 1.93, 1.06);
}}

// --- Barra de status na base (kickplate) ---------------------------------
// IPC Comp e IPC Cooling sao componentes INTERNOS: num produto real nao tem
// superficie externa para pintar. Sem esta barra, duas das sete areas nunca
// apareceriam no 3D. Ela tambem garante que o estado das 7 areas seja legivel
// de frente, sem depender do angulo da camera.
add(new RoundedBoxGeometry(2.9, 0.22, 0.06, 3, 0.03),
    metalMat(PALETTE.kickplate, 0.5, 0.25), 0, 0.12, 1.06);

const TILE_W = 0.34, GAP = 0.06;
const AREAS = Object.keys(REGION_ABBR);
const totalW = AREAS.length * TILE_W + (AREAS.length - 1) * GAP;
let cursorX = -totalW / 2 + TILE_W / 2;

AREAS.forEach((area) => {{
  add(new RoundedBoxGeometry(TILE_W, 0.12, 0.03, 2, 0.02),
      accentMat(REGION_COLORS[area], 0.4), cursorX, 0.12, 1.1);
  const label = labelSprite(REGION_ABBR[area]);
  label.position.set(cursorX, 0.3, 1.12);
  root.add(label);
  cursorX += TILE_W + GAP;
}});

// --- Loop e resize (renderiza so quando algo mudou) ----------------------
//
// Um `requestAnimationFrame` que roda para sempre a 60fps - mesmo parado -
// e o maior custo continuo de uma cena 3D: cada frame refaz o shadow pass,
// os shaders dos materiais PBR e o composite do canvas transparente, o
// tempo todo, mesmo com a camera parada e o usuario mexendo em outra parte
// do dashboard. Aqui so se chama `controls.update()` + `renderer.render()`
// quando de fato ha algo novo para desenhar: enquanto `autoRotate` gira
// sozinho, ou enquanto o usuario arrasta/solta (o proprio `OrbitControls`
// dispara 'change' a cada frame de arrasto e de amortecimento do "flick").
// Assim que a camera se acomoda, o loop para de renderizar de verdade -
// so continua agendando o proximo `requestAnimationFrame`, que e virtualmente
// gratis - ate a proxima interacao reacender `dirty`.
let dirty = true;
controls.addEventListener('change', () => {{ dirty = true; }});

function loop() {{
  requestAnimationFrame(loop);
  if (controls.autoRotate) dirty = true;
  if (!dirty) return;
  dirty = false;
  controls.update();
  renderer.render(scene, camera);
}}
loop();

window.addEventListener('resize', () => {{
  const w = container.clientWidth || width;
  camera.aspect = w / HEIGHT;
  camera.updateProjectionMatrix();
  renderer.setSize(w, HEIGHT);
  dirty = true;
}});
</script>
"""


def build_legend_html() -> str:
    """Legenda do 3D, no HTML do proprio app (fora do iframe).

    Fica aqui, e nao em `app.py`, para que a explicacao das cores acompanhe o
    mesmo modulo que as desenha. Tres blocos, em ordem de importancia:
      1. os badges - o que cada cor significa ("nao consultada" e badge
         tambem, senao a legenda mistura duas linguagens visuais);
      2. a legenda das siglas da barra da base - sem isto as siglas viram
         adivinhacao;
      3. uma linha de apoio - como interagir + a ressalva do modelo.
    """
    siglas = " · ".join(f"<strong>{a}</strong> {n}" for n, a in AREA_ABBR.items())
    muted = styles.COLORS["cinza_escuro"]
    return (
        '<div class="legenda-3d">'
        '<span class="badge badge-normal">NORMAL</span>'
        '<span class="badge badge-atencao">ATENÇÃO</span>'
        '<span class="badge badge-vistoria">VISTORIA</span>'
        '<span class="badge badge-critico">CRÍTICO</span>'
        '<span class="badge badge-neutro">NÃO CONSULTADA</span>'
        "</div>"
        f'<div class="texto-corrido" style="font-size:0.74rem;color:{muted};'
        'margin-bottom:4px;">'
        f"Indicadores na base: {siglas}."
        "</div>"
        f'<div class="texto-corrido" style="font-size:0.74rem;color:{muted};'
        'margin-bottom:22px;">'
        "Arraste para girar, role para aproximar. Ilustrativo: indica "
        "<strong>em qual região</strong> está o pior caso, não a geometria "
        "nem a posição real do componente."
        "</div>"
    )


# ---------------------------------------------------------------------------
# COMO TROCAR POR UM MODELO REAL (.glb/.gltf), quando existir:
#
# 1. Coloque o arquivo em `static/` (ex.: `static/fogao.glb`) - assim ele e
#    servido por /app/static/ e continua sem depender de rede externa.
# 2. Importe o GLTFLoader (baixe `examples/jsm/loaders/GLTFLoader.js` para
#    `static/three/addons/`, como os outros addons) e troque os blocos de
#    geometria por:
#
#      const { GLTFLoader } = await import('three/addons/GLTFLoader.js');
#      new GLTFLoader().load('/app/static/fogao.glb', (gltf) => {
#          gltf.scene.traverse((n) => {
#              if (!n.isMesh) return;
#              n.castShadow = true; n.receiveShadow = true;
#              const area = REGION_MESH_NAMES[n.name];
#              if (area) {
#                  n.material = n.material.clone();
#                  n.material.emissive = new THREE.Color(REGION_COLORS[area]);
#                  n.material.emissiveIntensity = 0.4;
#              }
#          });
#          root.add(gltf.scene);
#      });
#
#    MANTENHA a barra da base (kickplate) mesmo com o modelo real: IPC Comp e
#    IPC Cooling continuarao sem superficie externa visivel, e sem ela essas
#    areas sumiriam da visualizacao.
# 3. REGION_MESH_NAMES (nome do mesh no CAD -> key_area) ainda NAO existe -
#    precisa ser levantado com o time de engenharia/CFD da Whirlpool.
# ---------------------------------------------------------------------------
