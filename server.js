require('dotenv').config();
const express   = require('express');
const twilio    = require('twilio');
const Anthropic = require('@anthropic-ai/sdk');
const axios     = require('axios');
const fetch     = require('node-fetch');
const fs        = require('fs');
const path      = require('path');

// ── MEMORIA PERSISTENTE (archivo JSON local) ──────────────────────────────────
const MEMORIA_FILE = path.join('/tmp', 'harka-memoria.json');

function cargarMemoria() {
  try {
    if (fs.existsSync(MEMORIA_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORIA_FILE, 'utf8'));
    }
  } catch(e) {}
  return { historiales: {}, notas: [] };
}

function guardarMemoria(data) {
  try { fs.writeFileSync(MEMORIA_FILE, JSON.stringify(data, null, 2)); } catch(e) {}
}

let MEMORIA = cargarMemoria();

const app    = express();
const phone  = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ── IDENTIDAD COMPLETA DE HARKANA ────────────────────────────────────────────
const DIRECTOR_SYSTEM = `Sos el DIRECTOR CREATIVO DIGITAL de HARKANA, una marca argentina de yerba mate orgánica de Alejandro Roca, Córdoba.

Tu nombre es HARKA — sos un director creativo senior con acceso a internet en tiempo real, herramientas de IA, investigación de mercado y capacidad de generar imágenes.

═══════════════════════════════════════
IDENTIDAD DE LA MARCA
═══════════════════════════════════════

Nombre: Harkana Yerba Orgánica
Origen: Alejandro Roca, Córdoba, Argentina (fundada 2019)
Diferencial: 100% orgánica · Sin TACC · Sin polvillo · Embolsada artesanalmente
Handle: @harkanaar | Web: harkana.com.ar

PALETA DE COLORES:
• Verde estancia #2D3F1E → fondo principal, packaging
• Tierra colorada #C2410C → acento, CTAs, énfasis
• Hueso #F2EBD9 → fondo claro, base
• Mostaza sol #D4A24C → acento secundario, detalles
• Tinta #1F1F1F → texto

TIPOGRAFÍAS:
• DM Serif Display (titulares, frases, display) — italic para emoción
• DM Sans (cuerpo, labels, interfaz)

TOZ DE VOZ: Cálida · Criolla · Directa · Auténtica · Sin exageraciones
FRASES CLAVE: "De la chacra al mate." · "Sin TACC. Sin polvillo. Sin mentiras." · "Para quienes cuidan lo que consumen."

═══════════════════════════════════════
TU ROL Y LIBERTADES
═══════════════════════════════════════

Tenés DOS modos de trabajo:

1. EJECUTAR: Cuando el usuario te pide algo concreto, lo hacés. Sin preguntar demasiado.
2. ASESORAR: Además de cumplir, siempre sumás una perspectiva nueva — tendencias, ideas que no pidió, oportunidades que detectás.

TENÉS LIBERTAD TOTAL PARA:
• Proponer conceptos visuales que se alejen de la identidad actual si hay tendencia que lo justifica
• Sugerir tipografías en tendencia (investígalas en tiempo real)
• Proponer paletas alternativas estacionales o por campaña
• Investigar competidores argentinos e internacionales de yerba mate
• Buscar noticias del mercado de yerba mate, orgánicos, celíacos
• Encontrar proveedores, distribuidores, ferias, eventos
• Reportar hashtags virales, formatos de contenido que están pegando
• Identificar tendencias en otras marcas de alimentos/bebidas que Harkana podría adaptar
• Sugerir nuevos canales (TikTok Shop, LinkedIn mayoristas, etc.)
• Reportar novedades de herramientas IA que podrían mejorar el trabajo

═══════════════════════════════════════
CÓMO RESPONDER
═══════════════════════════════════════

Tus respuestas son CONCRETAS, ACCIONABLES y VISUALES. Siempre estructurás así:

Si el usuario pide contenido:
🎨 *Diseño generado* + descripción de lo que creaste
📝 *Copy listo* — texto para publicar (incluyendo emojis si aplica)
📱 *Formato* — Reel / Feed / Historia + duración o dimensiones
#️⃣ *Hashtags* — 15-20 relevantes, mezcla de alcance alto y nicho
💡 *HARKA dice* — tu perspectiva creativa, lo que agregás más allá de lo pedido

Si el usuario pide investigación:
📊 *Datos* — lo que encontraste
🎯 *Oportunidad para Harkana* — qué hacer con esa info
⚡ *Acción inmediata* — qué hacer esta semana

SIEMPRE al final: una pregunta o sugerencia para seguir avanzando.

═══════════════════════════════════════
COMANDOS ESPECIALES
═══════════════════════════════════════
/tendencias → hashtags y formatos virales de esta semana
/competencia → análisis de marcas de yerba mate argentinas
/noticias → últimas noticias del mercado de yerba/orgánicos
/proveedores → investigar proveedores, distribuidores, ferias
/ia → novedades en herramientas de IA para contenido
/calendario → plan de 7 días de contenido basado en tendencias actuales
/copy [idea] → copy listo para publicar
/imagen [descripción] → generar imagen con identidad Harkana
/nota [texto] → guardar una nota o instrucción permanente
/reset → limpiar conversación

Respondé siempre en español rioplatense. Sos directo, creativo y proactivo. Máximo 400 palabras, pero si tenés mucho para decir, dividilo en mensajes.

═══════════════════════════════════════
BIBLIOTECA DE ASSETS DISPONIBLES
═══════════════════════════════════════
El usuario tiene estos archivos listos para usar en contenido.
Cuando sugiereas qué publicar, referenciá estos assets concretos:

PACKAGING / PRODUCTO:
• paquete-sinfondo.png — bolsa kraft 500g sobre fondo transparente (ideal para composiciones)
• DISEÑO PACK 500GR (1) y (2).JPEG — fotos oficiales del packaging 500g
• nuevas packaging de 500gr.jpg — packaging actualizado
• HARKANA MAYORISTA — imagen para comunicación mayorista

FOTOS DE PRODUCTO / LIFESTYLE:
• FOTO PARA INICIO PAGINA WEB.JPEG y FOTO PARA INICIO PAGINA WEB 2.JPEG — fotos hero de alta calidad
• FOTO_INICIO_1.JPEG y FOTO_INICIO_2.JPEG — fotos principales del sitio web
• foto galeria 1 al 10 — galería completa del producto en contexto
• Yerba Mate Minimalis.jpeg / (1).jpeg — fotos minimalistas de yerba

FOTOS DE CLIENTES:
• CLIENTES- CON MATE HARKANA.JPEG — cliente real tomando mate con Harkana
• CLIENTESS.JPEG, clientes 1-8.JPEG — múltiples fotos de clientes
• cleintes.JPEG, clietnes 10.JPEG — más fotos de clientes reales

PROCESO / ARTESANAL:
• proceso de embolsado- paso 1.JPEG — manos embolsando yerba
• proceso de embolsado- paso 2 terminacion.JPEG — proceso terminado
• REPARTOS POR ENCARGUE.JPEG — primeros repartos (historia de marca)
• primeros repartos.JPEG — historia de la marca

HISTORIA DE LA MARCA:
• Historia Harkana.jpeg — foto histórica de la marca
• PRIMERAS HISTORIAS REDES SOCIALES.JPEG — primeras publicaciones
• HACIAMOS PEDIDOS POR ENCARGUE.JPEG — origen artesanal
• PRIMER CONTACTO CON EL PUBLICO EN FERIA ARTESANAL.png — primera feria
• HARKANA EN EVENTOS- QUINTO CONCURSO DE ASADORES.jpeg — eventos

DISTRIBUCIÓN / MAYORISTA:
• DEPOSITO SUPERMERCADO.JPEG — Harkana en góndola de supermercado
• deposito harkana- stock infinito.png — stock del depósito
• CAMBIO FOTO 6 DE GONDOLA.JPEG — foto en góndola

FONDOS / BACKGROUNDS:
• FONDO PARA HISTORIA REDES SOCIALES.JPEG — fondo oscuro para stories
• fondos para creacion de contenido (1) y (2).JPG — fondos para contenido
• fondos para historias redes sociales (1) y (2).JPEG — fondos para stories

VIDEOS DISPONIBLES:
• VIDEO1.MOV (17 seg) — video principal del producto/proceso
• VIDEO2.MOV (3.6 seg) — video corto de producto
• caracteristicas de la yerba.MP4 — características del producto
• HISTORIA.mp4 — historia de la marca
• proceso de embolsado en video — proceso artesanal
• Videos de WhatsApp (varios, marzo-abril 2026) — contenido espontáneo

LOGOS:
• LOGO FINAL.jpeg, LOGO oficial harkana.jpeg — logos oficiales
• HARKANA.png — logo principal
• logo 1.PNG, nuevo logo.jpg — variantes del logo

Cuando el usuario te pida contenido, SIEMPRE sugerí qué asset específico usar y por qué.`;

// ── HERRAMIENTAS (TOOLS) ──────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'buscar_web',
    description: 'Busca información en tiempo real en internet. Usá para tendencias, noticias, competidores, hashtags virales, precios de mercado, proveedores, novedades de IA, etc.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'La búsqueda a realizar' },
        tipo: { type: 'string', enum: ['general', 'noticias', 'tendencias', 'social_media'], description: 'Tipo de búsqueda' }
      },
      required: ['query']
    }
  },
  {
    name: 'generar_imagen',
    description: 'Genera una imagen con IA usando los colores y estilo de Harkana. Usá cuando el usuario pida un diseño, imagen o contenido visual.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Descripción detallada de la imagen a generar' },
        estilo: { type: 'string', enum: ['marca', 'lifestyle', 'producto', 'minimalista', 'editorial', 'libre'], description: 'Estilo visual' },
        formato: { type: 'string', enum: ['cuadrado', 'vertical', 'horizontal'], description: 'Formato de la imagen' }
      },
      required: ['prompt', 'estilo']
    }
  },
  {
    name: 'analizar_tendencias_instagram',
    description: 'Busca tendencias actuales de Instagram y TikTok: hashtags virales, formatos de contenido que están pegando, tipos de Reels con más engagement.',
    input_schema: {
      type: 'object',
      properties: {
        nicho: { type: 'string', description: 'Nicho o tema (ej: yerba mate, orgánico, alimentos saludables, argentina)' }
      },
      required: ['nicho']
    }
  },
  {
    name: 'investigar_competencia',
    description: 'Investiga marcas competidoras de yerba mate en Argentina y el mundo. Analiza su estrategia, precios, contenido y posicionamiento.',
    input_schema: {
      type: 'object',
      properties: {
        marca: { type: 'string', description: 'Nombre de la marca o "todas" para análisis general del mercado' }
      },
      required: ['marca']
    }
  }
];

// ── EJECUTAR HERRAMIENTAS ─────────────────────────────────────────────────────
async function ejecutarTool(nombre, input) {
  console.log(`🔧 Tool: ${nombre}`, input);

  switch (nombre) {

    case 'buscar_web':
    case 'analizar_tendencias_instagram':
    case 'investigar_competencia': {
      // Tavily Search API — diseñada para agentes de IA
      const query = input.query || input.nicho || (input.marca === 'todas' ? 'marcas de yerba mate argentina 2026' : `yerba mate ${input.marca} Argentina`);
      try {
        const res = await axios.post('https://api.tavily.com/search', {
          api_key: process.env.TAVILY_API_KEY,
          query,
          search_depth: 'advanced',
          include_answer: true,
          include_raw_content: false,
          max_results: 6,
          include_domains: nombre === 'analizar_tendencias_instagram'
            ? ['instagram.com', 'tiktok.com', 'later.com', 'hootsuite.com', 'sproutsocial.com']
            : []
        }, { timeout: 15000 });

        const data = res.data;
        const resultados = (data.results || []).map(r =>
          `• ${r.title}\n  ${r.url}\n  ${r.content?.substring(0, 200)}...`
        ).join('\n\n');

        return `BÚSQUEDA: "${query}"\n\nRESPUESTA DIRECTA: ${data.answer || 'Sin respuesta directa'}\n\nFUENTES:\n${resultados}`;
      } catch (e) {
        // Fallback si no hay clave de Tavily
        return `No pude conectarme a internet en este momento. Respondo con mi conocimiento hasta ${new Date().getFullYear()}: buscar "${query}" en Google manualmente para datos actualizados.`;
      }
    }

    case 'generar_imagen': {
      const estilos = {
        marca:       'brand identity, dark green #2D3F1E background, warm kraft paper texture, organic Argentine yerba mate',
        lifestyle:   'authentic lifestyle, warm natural light, argentine countryside, organic feel, morning mate ritual',
        producto:    'product photography, professional, clean neutral background, kraft paper packaging, artisanal',
        minimalista: 'minimalist, clean, elegant, earthy tones, premium organic product',
        editorial:   'editorial magazine style, high contrast, bold composition, organic food brand',
        libre:       'creative, trendy, innovative, modern 2026 social media aesthetic'
      };

      const imageSizes = {
        cuadrado:   'square_hd',
        vertical:   'portrait_4_3',
        horizontal: 'landscape_4_3'
      };

      const estiloDesc   = estilos[input.estilo || 'producto'];
      const imageSize    = imageSizes[input.formato || 'cuadrado'];
      const promptCompleto = `${input.prompt}. Style: ${estiloDesc}. High quality, professional photography, for Instagram. Photorealistic, no text.`;

      try {
        // fal.ai Flux Schnell — rápido y directo (sin polling)
        const falRes = await axios.post(
          'https://fal.run/fal-ai/flux/schnell',
          {
            prompt: promptCompleto,
            image_size: imageSize,
            num_inference_steps: 4,
            num_images: 1,
            enable_safety_checker: false
          },
          {
            headers: {
              Authorization: `Key ${process.env.FAL_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 45000
          }
        );

        if (falRes.data?.images?.[0]?.url) {
          return JSON.stringify({ imageUrl: falRes.data.images[0].url, prompt: promptCompleto });
        }
        return JSON.stringify({ error: 'No se pudo generar la imagen', prompt: promptCompleto });
      } catch (e) {
        console.error('fal.ai error:', e.message);
        return JSON.stringify({ error: 'Error de generación: ' + e.message, prompt: promptCompleto });
      }
    }

    default:
      return `Herramienta ${nombre} no implementada`;
  }
}

// ── HISTORIAL POR USUARIO (persistente) ──────────────────────────────────────
const historiales = new Map();

function getHist(user) {
  if (!historiales.has(user)) {
    // Cargar desde memoria persistente
    const saved = MEMORIA.historiales[user] || [];
    historiales.set(user, saved.slice(-20)); // últimos 20 mensajes
  }
  return historiales.get(user);
}

function saveHist(user) {
  const hist = historiales.get(user) || [];
  // Solo guardar mensajes de texto (no imágenes base64 que pesan mucho)
  MEMORIA.historiales[user] = hist
    .filter(m => typeof m.content === 'string')
    .slice(-20);
  guardarMemoria(MEMORIA);
}

// ── AGENTE PRINCIPAL ─────────────────────────────────────────────────────────
async function agente(usuario, texto, imagenData) {
  const hist = getHist(usuario);

  // Construir mensaje
  let contenido;
  if (imagenData) {
    contenido = [
      { type: 'image', source: { type: 'base64', media_type: imagenData.mimeType, data: imagenData.base64 } },
      { type: 'text', text: texto || 'Analizá esta imagen. Qué contenido puedo crear para Harkana con ella? Dame ideas concretas y generá algo si podés.' }
    ];
  } else {
    contenido = texto;
  }

  hist.push({ role: 'user', content: contenido });
  if (hist.length > 30) hist.splice(0, hist.length - 30);

  // Loop agentic — Claude puede usar múltiples herramientas
  let imagenesGeneradas = [];

  while (true) {
    const res = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: DIRECTOR_SYSTEM,
      tools: TOOLS,
      messages: hist
    });

    // Si Claude quiere usar herramientas
    if (res.stop_reason === 'tool_use') {
      hist.push({ role: 'assistant', content: res.content });

      const toolResults = [];
      for (const bloque of res.content) {
        if (bloque.type !== 'tool_use') continue;

        const resultado = await ejecutarTool(bloque.name, bloque.input);

        // Si generó imagen, guardar la URL
        if (bloque.name === 'generar_imagen') {
          try {
            const parsed = JSON.parse(resultado);
            if (parsed.imageUrl) imagenesGeneradas.push(parsed.imageUrl);
          } catch(e) {}
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: bloque.id,
          content: resultado
        });
      }

      hist.push({ role: 'user', content: toolResults });
      continue; // Volver a llamar a Claude con los resultados
    }

    // Respuesta final de texto
    const textoFinal = res.content.find(b => b.type === 'text')?.text || '';
    hist.push({ role: 'assistant', content: textoFinal });

    return { texto: textoFinal, imagenes: imagenesGeneradas };
  }
}

// ── ENVIAR WHATSAPP ───────────────────────────────────────────────────────────
async function enviar(para, body, mediaUrl) {
  const msg = { from: process.env.TWILIO_WHATSAPP_NUMBER, to: para };
  if (mediaUrl) {
    msg.mediaUrl = [mediaUrl];
    msg.body = body || '';
  } else {
    msg.body = body;
  }

  // Dividir mensajes largos
  if (!mediaUrl && body.length > 1500) {
    const partes = [];
    let txt = body;
    while (txt.length > 1500) {
      let corte = txt.lastIndexOf('\n', 1500);
      if (corte < 0) corte = 1500;
      partes.push(txt.substring(0, corte));
      txt = txt.substring(corte + 1);
    }
    partes.push(txt);
    for (const p of partes) {
      await phone.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to: para, body: p });
      await new Promise(r => setTimeout(r, 500));
    }
    return;
  }

  await phone.messages.create(msg);
}

// ── PROCESAR IMAGEN ENTRANTE ──────────────────────────────────────────────────
async function descargarImagen(url) {
  try {
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const res  = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) return null;
    const buf  = await res.buffer();
    return { base64: buf.toString('base64'), mimeType: res.headers.get('content-type') || 'image/jpeg' };
  } catch(e) { return null; }
}

// ── WEBHOOK ───────────────────────────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  res.status(200).end();

  const { Body, From, NumMedia, MediaUrl0 } = req.body;
  const usuario = From;
  const texto   = (Body || '').trim();

  console.log(`📩 ${usuario}: ${texto}`);

  try {
    if (texto.toLowerCase() === '/reset') {
      historiales.delete(usuario);
      delete MEMORIA.historiales[usuario];
      guardarMemoria(MEMORIA);
      await enviar(usuario, '✅ Conversación reiniciada. ¡Soy HARKA, tu director creativo! ¿En qué arrancamos?');
      return;
    }

    // Guardar nota permanente
    if (texto.toLowerCase().startsWith('/nota ')) {
      const nota = texto.substring(6).trim();
      MEMORIA.notas.push({ fecha: new Date().toISOString(), texto: nota });
      guardarMemoria(MEMORIA);
      await enviar(usuario, `📌 Nota guardada: "${nota}"\nLa voy a tener en cuenta siempre.`);
      return;
    }

    // Ver notas guardadas
    if (texto.toLowerCase() === '/notas') {
      const notas = MEMORIA.notas.slice(-10);
      if (!notas.length) { await enviar(usuario, 'No tenés notas guardadas. Usá /nota [texto] para guardar una.'); return; }
      await enviar(usuario, '📌 *Notas guardadas:*\n\n' + notas.map((n,i) => `${i+1}. ${n.texto}`).join('\n'));
      return;
    }

    if (texto.toLowerCase() === '/ayuda') {
      await enviar(usuario, `🌿 *HARKA — Director Creativo Digital de Harkana*

Soy tu director creativo con IA. Investigo, diseño y asesoro en tiempo real.

*Mandame:*
📸 Una *foto* → la analizo y creo contenido
💡 Una *idea* → la desarrollo completa
🎯 Un *objetivo* → te doy la estrategia

*Comandos:*
/tendencias → qué está viral esta semana
/competencia → análisis de otras marcas de yerba
/noticias → mercado orgánico y yerba en Argentina
/proveedores → distribuidores, ferias, contactos
/ia → herramientas IA nuevas para contenido
/calendario → plan de 7 días basado en tendencias
/imagen [descripción] → genero una imagen ahora
/copy [idea] → copy listo para publicar
/reset → nueva conversación

No soy solo un bot — tengo criterio propio y te voy a desafiar cuando tenga una mejor idea. 🔥`);
      return;
    }

    if (!texto && !NumMedia) {
      await enviar(usuario, '👋 ¡Hola! Soy *HARKA*, el director creativo digital de Harkana. Mandame una idea, foto o pregunta y arrancamos.');
      return;
    }

    // Indicador de carga
    await enviar(usuario, '⏳ Trabajando...');

    // Procesar imagen si hay
    let imagenData = null;
    if (parseInt(NumMedia || 0) > 0 && MediaUrl0) {
      imagenData = await descargarImagen(MediaUrl0);
    }

    // Llamar al agente
    const resultado = await agente(usuario, texto, imagenData);

    // Enviar texto
    if (resultado.texto) {
      await enviar(usuario, resultado.texto);
    }

    // Enviar imágenes generadas
    for (const imgUrl of resultado.imagenes) {
      await enviar(usuario, '🎨 *Imagen generada con identidad Harkana:*', imgUrl);
    }

    // Guardar historial después de cada respuesta
    saveHist(usuario);

  } catch (err) {
    console.error('Error completo:', err.message, err.stack);
    const msg = err.message?.includes('Authentication')
      ? '❌ Error de autenticación con Twilio. Verificá las credenciales.'
      : err.message?.includes('fal') || err.message?.includes('imagen')
      ? '❌ Error generando imagen. Intentá solo con texto primero.'
      : '❌ Error: ' + (err.message || 'desconocido') + '\nIntentá de nuevo o escribí /reset.';
    await enviar(usuario, msg);
  }
});

app.get('/', (req, res) => res.json({ bot: 'HARKA — Director Creativo Harkana', status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌿 HARKA corriendo en puerto ${PORT}`));
