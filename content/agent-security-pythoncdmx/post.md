Se me heló la sangre en una demo de agentes en Python CDMX.

No porque algo fallara. Porque funcionó perfecto.

Hazel Saenz mostraba cómo construir agentes con Python, Strands y Ollama, capaces de resolver problemas reales.

Un momento el agente consultaba un JSON local. Al siguiente, controlaba Spotify.

Mismo comando. Misma interfaz.

Ahí entendí algo que no había visto tan claro: para el modelo, una función local y una API que modifica el mundo real se ven casi iguales. Para seguridad, no lo son. Tienen radios de impacto completamente distintos.

Rodrigo Cambray lo remató en la siguiente charla: la seguridad no se agrega al final, se diseña desde el inicio.

OWASP le puso nombre a esto: Excessive Agency. Demasiada funcionalidad, permisos o autonomía juntos.

Me fui de esa sala con 6 reglas que ahora aplico para que mis agentes no se vuelvan peligrosos:

1️⃣ Un tool por capacidad concreta

No mezcles "leer calendario" y "enviar email" en la misma función. Si un tool hace una sola cosa, es mucho más fácil auditar qué puede salir mal.

2️⃣ El menor scope posible

Si tu agente solo necesita leer, no le des permiso de escribir. OAuth no es un checkbox de configuración, es tu primera línea de defensa.

3️⃣ Confirmación antes de acciones sensibles

Previsualiza. Confirma intención. Antes de que el agente mande el email o borre el archivo, un humano dice sí.

4️⃣ Mensajes de otros agentes como entrada no confiable

En sistemas multiagente, delegar no es confiar. Trata lo que te manda otro agente igual que un input externo.

5️⃣ Registro y reversión desde el diseño

Si no puedes ver qué hizo tu agente ni deshacerlo, no está listo para producción.

6️⃣ Solo el contexto necesario

No subas todo tu workspace al modelo. Menos contexto es menos superficie de ataque.

Por la regla 6 estoy construyendo katsi (saber, en totonaco), un MCP local-first que entrega solo el contexto relevante en vez de mandar todo el workspace.

https://github.com/jeanethS/katsi

La pregunta ya no es solo "¿qué puede hacer mi agente?".

Es "¿qué puede hacer si se equivoca?".

¿Cuál de estas 6 le falta hoy a tu agente?

#AISecurity #AIAgents #Python #MCP #Cybersecurity
