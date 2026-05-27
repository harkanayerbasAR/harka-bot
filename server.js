require('dotenv').config();
const express   = require('express');
const twilio    = require('twilio');
const Anthropic = require('@anthropic-ai/sdk');
const axios     = require('axios');
const fetch     = require('node-fetch');

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
/reset → limpiar conversación

Respondé siempre en español rioplatense. Sos directo, creativo y proactivo. Máximo 400 palabras, pero si tenés mucho para decir, dividilo en mensajes.`;

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

// ── HISTORIAL POR USUARIO ─────────────────────────────────────────────────────
const historiales = new Map();

function getHist(user) {
  if (!historiales.has(user)) historiales.set(user, []);
  return historiales.get(user);
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
      await enviar(usuario, '✅ Conversación reiniciada. ¡Soy HARKA, tu director creativo! ¿En qué arrancamos?');
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

  } catch (err) {
    console.error('Error:', err);
    await enviar(usuario, '❌ Algo salió mal. Intentá de nuevo. Si persiste, escribí /reset.');
  }
});

app.get('/', (req, res) => res.json({ bot: 'HARKA — Director Creativo Harkana', status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌿 HARKA corriendo en puerto ${PORT}`));
