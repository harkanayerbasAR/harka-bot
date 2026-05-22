# HARKA — Director Creativo Digital de Harkana

Bot de WhatsApp con IA que actúa como director creativo senior.
Investiga tendencias en tiempo real, genera imágenes con identidad de marca y asesora estratégicamente.

---

## Qué puede hacer

- 🔍 **Investigar** — tendencias, hashtags virales, competidores, noticias de yerba mate, proveedores, ferias
- 🎨 **Generar imágenes** — diseños con paleta y estilo de Harkana (o con libertad creativa)
- 📝 **Crear copy** — textos listos para publicar con voz de marca
- 📅 **Planificar** — calendarios de contenido basados en tendencias reales de esa semana
- 🧠 **Asesorar** — estrategia de marca, nuevos mercados, posicionamiento nacional
- 💡 **Innovar** — propone ideas que vos no pediste pero que pueden hacer crecer la marca

---

## APIs necesarias (todas tienen plan gratuito para empezar)

| Servicio | Para qué | Dónde conseguir |
|----------|----------|----------------|
| **Twilio** | WhatsApp | twilio.com |
| **Anthropic** | Inteligencia del bot (Claude) | console.anthropic.com |
| **fal.ai** | Generar imágenes con IA | fal.ai |
| **Tavily** | Búsqueda web en tiempo real | tavily.com |
| **Railway** | Servidor donde corre el bot | railway.app |

---

## PASO A PASO

### 1. Twilio (WhatsApp)
1. Ir a twilio.com → Sign up
2. Ir a **Messaging → Try it out → Send a WhatsApp message**
3. Activar el **WhatsApp Sandbox**
4. Desde tu WhatsApp, escribir al número de Twilio el código que te dan
5. Guardar: Account SID + Auth Token + número del sandbox

### 2. Anthropic Claude
1. Ir a console.anthropic.com → crear cuenta
2. Ir a **API Keys** → Create Key
3. Guardar la key (sk-ant-...)
4. Cargar $5 USD de crédito (dura meses con uso normal)

### 3. fal.ai (imágenes)
1. Ir a fal.ai → Sign up
2. Ir a **Dashboard → API Keys** → crear key
3. Tienen créditos gratis al registrarse

### 4. Tavily (búsqueda web)
1. Ir a tavily.com → Sign up
2. Crear API key
3. Plan gratuito: 1000 búsquedas/mes

### 5. Subir a Railway
1. Ir a railway.app → "Start a New Project"
2. Conectar con GitHub
3. Subir la carpeta `whatsapp-bot` a un repositorio GitHub nuevo
4. Railway detecta Node.js y despliega automáticamente
5. Copiá la URL pública que te da Railway (ej: https://harka-bot.up.railway.app)

### 6. Variables de entorno en Railway
En tu proyecto Railway → **Variables**, agregar exactamente estas:

```
TWILIO_ACCOUNT_SID      = (el tuyo)
TWILIO_AUTH_TOKEN       = (el tuyo)
TWILIO_WHATSAPP_NUMBER  = whatsapp:+14155238886
ANTHROPIC_API_KEY       = (el tuyo)
FAL_KEY                 = (el tuyo de fal.ai)
TAVILY_API_KEY          = (el tuyo de tavily)
PORT                    = 3000
```

### 7. Conectar Twilio con el bot
1. En Twilio → **Messaging → Settings → WhatsApp Sandbox Settings**
2. En "When a message comes in" pegar:
   ```
   https://TU-URL.up.railway.app/webhook
   ```
3. Guardar

### 8. Probar
Escribile al número de Twilio desde tu WhatsApp:
- `/ayuda` → ver todos los comandos
- `/tendencias` → qué está viral esta semana
- `/imagen foto del paquete sobre yerba mate seca` → genera una imagen
- "quiero un reel para el lanzamiento" → te da estrategia completa
- Mandá una foto del packaging → la analiza y crea contenido

---

## Costo estimado mensual

| Servicio | Costo |
|----------|-------|
| Railway | Gratis (hasta 500h/mes) |
| Twilio sandbox | Gratis (para pruebas) |
| Anthropic Claude | ~$3-10 USD/mes según uso |
| fal.ai | ~$2-5 USD/mes según imágenes |
| Tavily | Gratis hasta 1000 búsquedas |
| **TOTAL** | **~$5-15 USD/mes** |

---

## Para producción (número propio de WhatsApp)
Cuando quieras tener un número propio de WhatsApp Business para el bot
(no el sandbox de Twilio), hay que hacer verificación de negocio en Meta.
Twilio cobra ~$0.005 por mensaje adicional.
