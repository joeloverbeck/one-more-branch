# Pipelines narrativos para generar personajes con LLM en ficción interactiva ramificada

## Por qué un pipeline de personajes no es una lista de rasgos

En teoría narrativa, “personaje” no equivale a “ficha de atributos”: es una entidad del *storyworld* (mundo de la historia) cuya inteligibilidad depende de cómo participa en estados y eventos, y de cómo el texto/medio la presenta. Una formulación muy usada en narratología define al personaje como una figura basada en texto/medio dentro de un mundo de historia, normalmente humana o antropomórfica; y distingue “personajes” (del mundo ficcional) de “personas” (del mundo real). citeturn17view0

Esa distinción importa mucho para pipelines con LLM, porque muchos campos típicos de una “ficha” (likes/dislikes, miedos, debilidades, voz, secretos, etc.) **no son independientes**: en narratología, el proceso de “caracterización” (atribuir propiedades) puede ser directo o indirecto y se apoya en inferencias del lector a partir de acciones, habla, apariencia, entorno, analogías y contrastes. Si pedís al modelo que “invente” 15 facetas como si fueran ortogonales, lo ponés en una tarea de satisfacción de restricciones con dependencias ocultas, lo que aumenta incoherencias internas (ej.: un “miedo” que contradice el “objetivo”; una “voz” que no encaja con sociología/educación). citeturn9view0turn10view0turn17view0

La vía clásica para evitar esto es *invertir el orden*: primero definir la **función/acción** (qué hace, por qué, contra qué, con qué coste), y sólo después derivar rasgos expresivos. Ya en la tradición aristotélica, entity["people","Aristóteles","ancient greek philosopher"] liga el carácter a decisiones y elecciones moralmente relevantes: el carácter se manifiesta en lo que el agente elige o evita bajo presión, y la acción es central. citeturn13search1turn13search3

Además, para interactive storytelling, “personaje” suele ser simultáneamente: (a) **agente intencional** (planifica/elige), (b) **artefacto dramático** (cumple un rol en una estructura), y (c) **superficie textual** (voz, descripciones, tics). Separar esas capas en la generación reduce fricción: no le pedís a la LLM que “descubra” dependencias; se las das como estructura. Esta idea (separar y luego integrar) es coherente con enfoques de IA narrativa que tratan la believability como percepción de agencia intencional y justifican acciones por metas. citeturn1search7turn9view2turn17view0

## Pipelines canónicos en teoría narrativa, dramaturgia, actuación e IA narrativa

Hay varias “escuelas” que, vistas como ingeniería de datos, son pipelines con **entradas/salidas** bastante claras. Lo útil para vuestro caso es extraer sus *interfaces*.

La línea “funcional-estructural” define primero **roles en la acción** y después “rellena” con rasgos. En entity["book","Morfología del cuento","propp 1928 study"], entity["people","Vladímir Propp","russian folklorist"] describe funciones/sferas de acción distribuidas entre dramatis personae, lo que permite “castear” personajes por función antes que por psicología. citeturn0search7turn0search19turn8search14

Una formalización compatible es el modelo actancial asociado a entity["people","Algirdas Julien Greimas","semiotician"]: descomponer cualquier acción narrativizada en seis actantes (sujeto/objeto, ayudante/oponente, destinador/destinatario), organizados por ejes (deseo, poder, transmisión). Esto es extremadamente “LLM-friendly” porque convierte la pregunta “¿quién es este personaje?” en “¿qué papel cumple en esta acción?”. citeturn18view0turn8search5

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["Greimas actantial model diagram subject object sender receiver helper opponent","Vladimir Propp character roles diagram hero villain donor helper dispatcher princess false hero","Stanislavski objectives obstacles tactics diagram acting","BDI agent architecture diagram beliefs desires intentions"],"num_per_query":1}

La línea “dramaturgia por premisa” arranca en tema/premisa y exige que el personaje esté motivado por su “estructura ósea” (dimensiones) y por fuerzas en conflicto. En entity["book","The Art of Dramatic Writing","egri 1942 writing craft"], entity["people","Lajos Egri","playwriting teacher"] propone analizar personajes en tres dimensiones (fisiología, sociología, psicología) y subraya que la psicología emerge de las otras dos en interacción; además insiste en motivación y cambio, no en listas sueltas. citeturn11view0turn4search7

La tradición de actuación convierte “construcción de personaje” en un pipeline operativo: **circunstancias dadas → objetivo → obstáculos → acciones/tácticas**. En técnicas derivadas de entity["people","Konstantín Stanislavski","theatre practitioner"], el trabajo se segmenta en unidades con objetivos expresados como verbos activos y se organiza una “línea de acción” y superobjetivo; esto es casi un modelo de planificación (y por tanto encaja con NPC agendas). citeturn10view1turn5search0 Una versión muy productizable es el cuestionario de entity["people","Uta Hagen","acting teacher"] (nueve preguntas) que fuerza dependencias: identidad y circunstancias antes que tácticas. citeturn5search1turn5search4

Desde narratología textual, entity["people","Shlomith Rimmon-Kenan","literary theorist"] en entity["book","Narrative Fiction: Contemporary Poetics","rimmon-kenan narratology book"] distingue indicadores de carácter: (1) definición directa (atribución explícita de rasgo) y (2) presentación indirecta (el rasgo se infiere). Para un generador, esto sugiere separar (a) “verdades internas del personaje” de (b) “cómo el texto deja que el jugador lo infiera” (acciones, habla, apariencia, ambiente, analogías). citeturn9view0turn10view0

En teoría de la novela, entity["people","E. M. Forster","english novelist"] aporta una clasificación pragmática: personajes “planos” (construidos alrededor de una sola cualidad/idea) y “redondos” (capaces de sorprender de manera convincente). Como metadato de generación, esto es oro: os permite decidir explícitamente cuánta “complejidad” necesitáis (y en qué NPCs), en lugar de pedir complejidad indiscriminada. citeturn11view2turn2search1turn17view0

En IA narrativa e interactive drama, el foco se desplaza a “believability” como **intencionalidad explicable**. En “Narrative Planning: Balancing Plot and Character”, entity["people","Mark Owen Riedl","computer scientist"] y entity["people","Robert Michael Young","computer scientist"] argumentan que, además de causalidad de trama, hay que sostener la percepción de que los personajes actúan como agentes con metas; su enfoque de planificación intenta justificar acciones por objetivos. citeturn1search7turn1search3 Y en entity["video_game","Façade","interactive drama 2005"], entity["people","Michael Mateas","interactive drama researcher"] destaca el nivel de “beats” como unidad que combina aspectos de historia y personaje (un punto de integración muy útil para vuestro “plan page → lorekeep → write page”). citeturn9view3turn1search6

## Dependencias reales entre aspectos de un personaje

Si convertimos todo lo anterior en un grafo de dependencias (para evitar degradación por generación desalineada), la idea central es: **los rasgos expresivos deben estar condicionados por la estructura de acción y por la posición social/material del personaje**, y el texto “muestra” esos rasgos indirectamente mediante acciones y habla. citeturn13search1turn11view0turn10view0

Un conjunto de dependencias “de alta carga” que se repiten en casi todas las tradiciones:

La **función en la acción** (rol actancial / esfera funcional) condiciona qué información es relevante generar. Si un NPC es “ayudante” o “oponente” en el eje de poder, lo crítico es *cómo* habilita/impide la conjunción sujeto–objeto (recursos, chantaje, sabotaje, guía), y eso precede a “gustos” o “miedos”. citeturn18view0turn0search7

El **objetivo** existe en varios niveles: objetivos locales (unidad/escena) y superobjetivo (línea de acción). Esto fuerza consistencia: un “dilema” creíble suele ser un choque entre objetivo de escena y superobjetivo, o entre superobjetivo y restricción ética/social. citeturn10view1turn5search1

La triada de entity["people","Joseph Bates","computer scientist"] sobre believability en agentes interactivos subraya que la expresividad emocional, bien temporizada y clara, sostiene la ilusión de vida; aplicada a narrativa, esto convierte “miedos” y “tensiones internas” en *mecanismos de expresión* ligados a estímulos y a stakes, no en campos aislados. citeturn10view2

La fórmula de entity["people","Mieke Bal","cultural theorist"] (actor → personaje) y de narratología clásica separa “actor” como ejecutor de eventos de “personaje” como actor dotado de rasgos distintivos; operativamente, esto sugiere que primero defináis al NPC como **conjunto de posibles acciones relevantes** (actor/agente) y luego añadáis rasgos y presentación. citeturn6search1turn17view0

Rimmon-Kenan aporta un checklist directo para vuestra ingeniería: la caracterización indirecta viene de acciones (comisión/omisión/acción contemplada), características del habla, apariencia externa, y entorno (físico y humano), además de refuerzo por analogía (nombres, paisaje, contrastes). Esto es, literalmente, una taxonomía de *salidas textuales* que dependen de la “capa agente”. citeturn10view0turn9view0

Por último, la incompletitud es una ventaja: muchos enfoques narratológicos resaltan que los personajes, como entidades ficcionales, tienen “huecos” y que la caracterización se construye progresivamente; para LLMs, “no generar” lo que no es necesario reduce contradicciones y baja el coste de coherencia. citeturn17view0

## Pipeline propuesto para generar personajes a partir de un concepto de historia

Este pipeline está diseñado para vuestro contexto (ramificación, lorekeeping, agendas) y para minimizar degradación por dependencias implícitas. La idea es producir artefactos intermedios equivalentes a vuestros “kernels” y “hardening”, pero para personajes.

**Entrada canónica**: *story concept* ya existente en vuestro sistema (conflict types/axes, direction of change, genre frame), más un “casting brief” derivado (número aproximado de NPCs activos por arco/área, densidad social, tono). La idea de derivar subtareas y resolverlas en secuencia está alineada con evidencia en prompting: descomposición “least-to-most” y búsqueda deliberada tipo “tree of thoughts” mejoran rendimiento en tareas complejas al separar fases y permitir evaluación/selección. citeturn7search0turn7search7turn7search11

**Salida final**: un **Character Package** por NPC con 4 capas separadas (Kernel → Agency Model → Social/Embodiment → Presentation), más una “matriz de relaciones” del elenco.

A continuación, el pipeline (entradas/salidas por etapa), en el orden recomendado:

**Etapa de reparto funcional**  
Salida: *Cast Map* (lista de roles requeridos).  
Aquí la LLM no inventa personas; asigna **funciones**: esferas proppianas o actantes greimasianos, y etiquetas de “plano/redondo” según necesidad dramática. Esto reduce el espacio de búsqueda y fija dependencias antes de entrar en psicología. citeturn18view0turn0search7turn11view2turn17view0

**Etapa de Character Kernel**  
Salida: *Character Kernel* por rol: `{actant_role, sphere_role, superobjective, immediate_objectives, primary_opposition, stakes, constraints}`.  
El kernel se centra en acción y elección bajo presión (Aristóteles) y en objetivos/obstáculos (Stanislavski/Hagen). Es el equivalente a vuestro “story kernel”: mínimo, evaluable, y todavía sin decoración. citeturn13search1turn10view1turn5search1

**Etapa de motivación y tridimensionalidad**  
Salida: *Motivation Core*: `{physiology, sociology, psychology}` y justificación causal breve (“por qué”): psicología emerge de fisiología+sociología, no al revés. Esto permite que “debilidades”, “miedos” y “tensiones internas” se definan como **derivaciones** de restricciones y contexto, como plantea Egri. citeturn11view0turn4search7

**Etapa de agencia para NPC agendas**  
Salida: *Agency Model* compatible con vuestro módulo “Determine changes in NPC agendas”: `{beliefs, desires/goals, intentions, plan_library, replanning_policy}`.  
La separación creencia–deseo–intención es canónica en arquitecturas BDI, útil cuando queréis que el NPC cambie de plan por nueva información sin “cambiar de personalidad”. citeturn10view3turn3search13 Para la capa táctica, planificación orientada a objetivos (GOAP) es productizable en juegos porque permite replanificación ante bloqueos y desacopla metas de acciones; es análogo a “Account for info changes”. citeturn18view2

**Etapa de red social y tensiones dramáticas**  
Salida: *Relationship Web*: relaciones tipadas y tensiones por aristas.  
Aquí generáis “dilemas” y “secretos” como propiedades relacionales (no intrínsecas): un secreto es casi siempre *información* que afecta objetivos de otro; un dilema es casi siempre *choque* entre objetivos/valores en un contexto social. Esta manera de modelar encaja con narratología (caracterización por entorno humano y contrastes) y con planificación narrativa (acciones justificadas por intenciones y relaciones). citeturn10view0turn9view2turn17view0

**Etapa de presentación textual controlada**  
Salida: *Presentation Layer*: voz, idiolecto, tics, apariencia, muestras de habla, pero como “plantillas” condicionadas por (sociología, objetivos, estado emocional).  
En lugar de “Speech patterns” como campo libre, lo tratáis como una función: `voice(state, target, intention) -> utterance_style`. Esto sigue la idea de que la caracterización indirecta se realiza mediante habla/acción/apariencia/entorno y que el texto induce inferencias, no declara listas. citeturn10view0turn9view0turn17view0

**Etapa de evaluación y hardening**  
Salida: *Hardened Character Kernel* + pruebas superadas.  
Aplicáis evaluadores automáticos de coherencia: (a) pruebas de elección bajo presión (si cambia la situación, ¿la elección cambia de forma explicable?), (b) pruebas de intencionalidad (¿cada acción importante tiene una meta plausible?), (c) pruebas de consistencia con rol funcional (¿sigue siendo ayudante/oponente respecto a la acción principal?), y (d) pruebas de “capaz de sorprender de manera convincente” si marcasteis “redondo”. La base teórica para estas pruebas está repartida entre Aristóteles (carácter como elección), Forster (criterio de redondez) y Riedl/Young (intencionalidad para believability). citeturn13search1turn11view2turn1search7turn1search3

Un ejemplo mínimo de *Character Kernel* (formato ilustrativo para vuestra app; campos “derivados” no aparecen todavía):

```json
{
  "id": "npc_inkkeeper",
  "cast_function": {
    "actant_role": "helper",
    "propp_sphere": "donor_or_helper",
    "flat_or_round": "round"
  },
  "dramatic_engine": {
    "superobjective": "mantener el control del barrio sin exponerse",
    "stakes": ["estatus", "seguridad_fisica", "secreto_comprometedor"],
    "primary_opposition": "antagonista_faccion_rival",
    "constraints": ["no puede recurrir a violencia directa", "debe proteger a un tercero"]
  },
  "scene_objectives": [
    {"when": "player_asks_about_missing_child", "objective": "desviar_sin_mentir"},
    {"when": "rival_enters_shop", "objective": "expulsar_sin_escalar"}
  ]
}
```

(El ejemplo es una propuesta de estructura; el orden de generación está motivado por los modelos de rol funcional y por objetivos/acciones antes que por rasgos decorativos). citeturn18view0turn10view1turn10view0

## Taxonomía operativa para traducir a enums

La taxonomía más útil para vuestro caso separa **clasificación dramática** (estable), **clasificación agencial** (estable con estado), y **clasificación expresiva** (dependiente de escena). A continuación propongo un conjunto de enums agrupados, con justificación teórica cuando existe.

**Enums de función narrativa** (decidir temprano; alimenta todo lo demás)  
`actant_role`: `subject | object | sender | receiver | helper | opponent`. Basado en la descomposición actancial de la acción. citeturn18view0turn8search5  
`propp_sphere`: `hero | villain | donor | helper | dispatcher | sought_for_person_or_prize | false_hero`. Útil si trabajáis con estructuras de cuento/aventura y queréis “casteo” rápido por función. citeturn0search7turn0search19  
`character_depth`: `flat | round`. Metadato de complejidad; no obliga a “rellenar” rasgos, os obliga a diseñar el tipo de sorpresa/consistencia. citeturn11view2turn17view0

**Enums de objetivos y presión dramática** (decidir temprano; conecta con agendas)  
`objective_scope`: `beat | scene_unit | sequence | arc | global_superobjective`. La distinción unidad/superobjetivo viene de análisis por objetivos encadenados. citeturn10view1turn5search1  
`goal_orientation`: `approach | avoid | prevent | restore | reveal | conceal`. (Propuesta operativa para planificación; especialmente útil en ramificación porque “revelar/ocultar” controla flujo de información y secretos). Se alinea con la idea de metas como estados deseados en planificación/GOAP. citeturn18view2turn9view2  
`opposition_mode`: `active_opponent | systemic_constraint | internal_conflict | social_norm`. (Propuesta; conecta oposición con estructura de mundo y con dilemas). La prioridad de oposición para crear agencia intencional aparece en planificación narrativa y en actuación (obstáculo). citeturn9view2turn5search1

**Enums de construcción tridimensional** (decidir medio; derivar consistencia)  
`physiology_tags`: `visible_disability | chronic_condition | exceptional_beauty | exceptional_strength | age_marker_young | age_marker_old | etc`. Egri trata fisiología como dimensión que colorea la visión del mundo. citeturn11view0  
`sociology_tags`: `class_low | class_middle | class_high | institution_tied | outsider | migrant | local | education_low | education_high | occupation_core`. Sociología como determinante de reacciones y acceso. citeturn11view0  
`psychology_driver`: `ambition | resentment | guilt | protective_instinct | curiosity | ideology_bound | attachment_hunger | etc`. (Propuesta derivada: en Egri, psicología emerge de fisiología+sociología; aquí lo convertís en enum de “driver dominante” para controlar consistencia). citeturn11view0turn4search7

**Enums de caracterización textual** (decidir tarde; depende de escena)  
`characterization_channel`: `direct_definition | action_commission | action_omission | contemplated_action | speech_style | external_appearance | environment_physical | environment_human | analogy_naming | analogy_contrast`. Es casi una transcripción de la taxonomía de indicadores (directo/indirecto) y de sus subcanales. citeturn10view0turn9view0  
`voice_register`: `formal | neutral | colloquial | ceremonial | technical | vulgar | poetic`. (Propuesta práctica; se instancia por sociología/educación y por intención comunicativa). Su utilidad se apoya en que el habla es un canal central de caracterización indirecta. citeturn10view0turn9view0

**Enums agenciales para agendas** (estable + estado)  
`intentionality_model`: `bd i_like | goap_like | scripted | hybrid`. Los tres primeros tienen bases conocidas: BDI separa estados mentales; GOAP planifica hacia estados; “scripted” es útil para personajes planos o roles menores. citeturn10view3turn18view2turn11view2  
`emotion_salience`: `low | medium | high`. (Propuesta) Dado que la expresión emocional temporizada afecta a believability en agentes, os sirve para decidir cuánto “emote” necesita el NPC en texto y cuánta variación tolera. citeturn10view2turn3search18  
`replanning_policy`: `never | on_failure | on_new_information | periodic`. GOAP enfatiza replanning ante obstáculos e información nueva; esto mapea bien con vuestro “Account for info changes”. citeturn18view2

**Enums de relación social** (decidir medio; impulsa secretos/dilemas)  
`relationship_type`: `kin | ally | rival | patron | client | mentor | subordinate | romantic | ex_romantic | creditor | debtor | informant | blackmailer`. (Propuesta) Es coherente con que el entorno humano y los contrastes/analogías refuerzan caracterización, y con que la acción se organiza por oposición/ayuda. citeturn10view0turn18view0  
`relationship_valence`: `positive | negative | ambivalent`. (Propuesta) Útil para controlar dilemas y cambios graduales tras páginas. La idea de constelaciones por paralelos/contrastes aparece en teoría de personaje como parte de redes significantes. citeturn17view0

## Validación, hardening e integración con vuestro “page pipeline”

Dado vuestro pipeline (“Plan page → Account for info changes → Lorekeep → Write page → Analyze written page → Determine changes in NPC agendas”), la integración más robusta es tratar el **Character Package como fuente de verdad** y generar “presentación” *por página* desde estado actual y objetivos de escena.

En la práctica, eso significa que el “Lorekeep” no debería guardar un bloque monolítico tipo “Personality/Likes/Fears…”, sino cuatro documentos versionados: `kernel.yaml`, `agency.json`, `social_embodiment.json`, `presentation_templates.json`. Esto está alineado con la idea narratológica de que la caracterización se construye y puede incluso subvertirse, y con la distinción entre rasgos internos y su presentación discursiva. citeturn17view0turn10view0

Para evitar degradación y acumulación de errores al encadenar LLMs, os conviene aplicar dos patrones demostrados en investigación de prompting: (1) **descomposición secuencial** (resolver subproblemas en orden, donde cada salida constriñe la siguiente) y (2) **múltiples candidatos + selección por consistencia** (self-consistency / deliberación), en lugar de un único muestreo. Aunque estos trabajos se miden en tareas de razonamiento, su contribución clave es metodológica: cuando el problema es complejo, la descomposición y la evaluación/selección mejoran fiabilidad. citeturn7search0turn7search1turn7search11

En vuestro caso, “Evaluate story kernels” tiene un análogo directo: **Evaluate character kernels** con pruebas automatizables:

Primero, *prueba de intencionalidad*: para cada acción crítica previsible, ¿existe un objetivo y una justificación mínima? Esto replica la motivación de la planificación narrativa centrada en believability. citeturn1search7turn9view2

Segundo, *prueba de objetivos encadenados*: ¿los objetivos de escena son verbos activos dirigidos a otros (no introspectivos), y se conectan en una línea de acción coherente? Esto viene del análisis por unidades/objetivos y superobjetivo. citeturn10view1turn5search1

Tercero, *prueba de tridimensionalidad*: si la psicología no se puede explicar como consecuencia de sociología+fisiología+historial, el NPC falla (o se marca como deliberadamente “plano”, lo cual también está permitido). Esto es una traducción directa de Egri a evaluación. citeturn11view0turn4search7

Cuarto, *prueba de canal de caracterización*: si vuestro “Write page” introduce un rasgo nuevo, debe entrar por un canal permitido (acción/habla/apariencia/entorno/analogía) y dejar rastro en lore (para que el jugador pueda inferirlo de manera consistente en ramas futuras), siguiendo la distinción de caracterización directa/indirecta. citeturn10view0turn9view0

Con esto, vuestro sistema puede generar NPCs desde un concepto de historia sin caer en la trampa de “generar muchos campos independientes”: en vez de pedir 15 características, generáis **estructura de acción + restricciones**, y sólo después generáis superficie textual condicionada, lo que reduce contradicciones y encaja naturalmente con agendas que cambian cuando cambia la información. citeturn13search1turn18view2turn7search0turn17view0