/* ============================================================
   Leo con Pau · datos del juego
   Todo el contenido educativo vive aquí.
   ============================================================ */
(function (root) {
  "use strict";

  const data = {
    app: {
      brand: "Leo con Pau",
      mascot: "Búho Sabio",
    },

    /* Cinco vocales con una palabra y un emoji que empieza por esa vocal. */
    vowels: [
      { letter: "a", word: "abeja", emoji: "🐝", color: "#FF6B6B" },
      { letter: "e", word: "elefante", emoji: "🐘", color: "#FFB020" },
      { letter: "i", word: "isla", emoji: "🏝️", color: "#20C997" },
      { letter: "o", word: "oso", emoji: "🐻", color: "#845EF7" },
      { letter: "u", word: "uva", emoji: "🍇", color: "#4D96FF" },
    ],

    /*
      Familias de sílabas. `byVowel` permite casos especiales:
      c + e = ce, g + e = gue, qu solo se combina con e / i.
    */
    families: [
      {
        id: "m", letter: "m", name: "eme", color: "#FF6B6B",
        syllables: ["ma", "me", "mi", "mo", "mu"],
      },
      {
        id: "p", letter: "p", name: "pe", color: "#FF922B",
        syllables: ["pa", "pe", "pi", "po", "pu"],
      },
      {
        id: "s", letter: "s", name: "ese", color: "#20C997",
        syllables: ["sa", "se", "si", "so", "su"],
      },
      {
        id: "l", letter: "l", name: "ele", color: "#4D96FF",
        syllables: ["la", "le", "li", "lo", "lu"],
      },
      {
        id: "t", letter: "t", name: "te", color: "#845EF7",
        syllables: ["ta", "te", "ti", "to", "tu"],
      },
      {
        id: "d", letter: "d", name: "de", color: "#F06595",
        syllables: ["da", "de", "di", "do", "du"],
      },
      {
        id: "n", letter: "n", name: "ene", color: "#0CA678",
        syllables: ["na", "ne", "ni", "no", "nu"],
      },
      {
        id: "f", letter: "f", name: "efe", color: "#F59F00",
        syllables: ["fa", "fe", "fi", "fo", "fu"],
      },
      {
        id: "r", letter: "r", name: "erre", color: "#E8590C",
        syllables: ["ra", "re", "ri", "ro", "ru"],
      },
      {
        id: "b", letter: "b", name: "be", color: "#FAB005",
        syllables: ["ba", "be", "bi", "bo", "bu"],
      },
      {
        id: "v", letter: "v", name: "uve", color: "#7048E8",
        syllables: ["va", "ve", "vi", "vo", "vu"],
      },
      {
        id: "c", letter: "c", name: "ce", color: "#E64980",
        syllables: ["ca", "ce", "ci", "co", "cu"],
        byVowel: { a: "ca", e: "ce", i: "ci", o: "co", u: "cu" },
      },
      {
        id: "qu", letter: "qu", name: "cu", color: "#1098AD",
        syllables: ["que", "qui"],
        byVowel: { e: "que", i: "qui" },
        vowelHint: "La qu va con e y con i",
      },
      {
        id: "g", letter: "g", name: "ge", color: "#0CA678",
        syllables: ["ga", "gue", "gui", "go", "gu"],
        byVowel: { a: "ga", e: "gue", i: "gui", o: "go", u: "gu" },
        vowelHint: "Con e y con i, la g suena suave",
      },
      {
        id: "j", letter: "j", name: "jota", color: "#9775FA",
        syllables: ["ja", "je", "ji", "jo", "ju"],
      },
      {
        id: "ch", letter: "ch", name: "che", color: "#FF8FAB",
        syllables: ["cha", "che", "chi", "cho", "chu"],
      },
      {
        id: "ll", letter: "ll", name: "elle", color: "#F9C74F",
        syllables: ["lla", "lle", "lli", "llo", "llu"],
      },
      {
        id: "ñ", letter: "ñ", name: "eñe", color: "#43AA8B",
        syllables: ["ña", "ñe", "ñi", "ño", "ñu"],
      },
      {
        id: "y", letter: "y", name: "ye", color: "#577590",
        syllables: ["ya", "ye", "yi", "yo", "yu"],
      },
      {
        id: "z", letter: "z", name: "zeta", color: "#F9844A",
        syllables: ["za", "ze", "zi", "zo", "zu"],
      },
      {
        id: "h", letter: "h", name: "hache", color: "#90BE6D",
        syllables: ["ha", "he", "hi", "ho", "hu"],
        vowelHint: "La h es muda: se lee como la vocal",
      },
    ],

    /* Palabras para construir y leer. level: 1 fácil, 2 medio, 3 reto. */
    categories: [
      {
        id: "animales", name: "Animales", emoji: "🐾",
        words: [
          { id: "gato", text: "gato", syllables: ["ga", "to"], emoji: "🐱", level: 1 },
          { id: "pato", text: "pato", syllables: ["pa", "to"], emoji: "🦆", level: 1 },
          { id: "rana", text: "rana", syllables: ["ra", "na"], emoji: "🐸", level: 1 },
          { id: "leon", text: "león", syllables: ["le", "ón"], emoji: "🦁", level: 2 },
          { id: "conejo", text: "conejo", syllables: ["co", "ne", "jo"], emoji: "🐰", level: 2 },
          { id: "tortuga", text: "tortuga", syllables: ["tor", "tu", "ga"], emoji: "🐢", level: 2 },
          { id: "jirafa", text: "jirafa", syllables: ["ji", "ra", "fa"], emoji: "🦒", level: 2 },
          { id: "caballo", text: "caballo", syllables: ["ca", "ba", "llo"], emoji: "🐴", level: 2 },
          { id: "oveja", text: "oveja", syllables: ["o", "ve", "ja"], emoji: "🐑", level: 2 },
          { id: "ballena", text: "ballena", syllables: ["ba", "lle", "na"], emoji: "🐳", level: 2 },
          { id: "caracol", text: "caracol", syllables: ["ca", "ra", "col"], emoji: "🐌", level: 2 },
          { id: "raton", text: "ratón", syllables: ["ra", "tón"], emoji: "🐭", level: 2 },
          { id: "mariposa", text: "mariposa", syllables: ["ma", "ri", "po", "sa"], emoji: "🦋", level: 3 },
          { id: "elefante", text: "elefante", syllables: ["e", "le", "fan", "te"], emoji: "🐘", level: 3 },
        ],
      },
      {
        id: "casa", name: "En casa", emoji: "🏠",
        words: [
          { id: "casa", text: "casa", syllables: ["ca", "sa"], emoji: "🏠", level: 1 },
          { id: "mesa", text: "mesa", syllables: ["me", "sa"], emoji: "🍽️", level: 1 },
          { id: "cama", text: "cama", syllables: ["ca", "ma"], emoji: "🛏️", level: 1 },
          { id: "silla", text: "silla", syllables: ["si", "lla"], emoji: "🪑", level: 2 },
          { id: "puerta", text: "puerta", syllables: ["puer", "ta"], emoji: "🚪", level: 2 },
          { id: "ventana", text: "ventana", syllables: ["ven", "ta", "na"], emoji: "🪟", level: 2 },
          { id: "lampara", text: "lámpara", syllables: ["lám", "pa", "ra"], emoji: "💡", level: 2 },
          { id: "reloj", text: "reloj", syllables: ["re", "loj"], emoji: "⏰", level: 2 },
          { id: "mochila", text: "mochila", syllables: ["mo", "chi", "la"], emoji: "🎒", level: 2 },
          { id: "cuaderno", text: "cuaderno", syllables: ["cua", "der", "no"], emoji: "📓", level: 2 },
          { id: "tijeras", text: "tijeras", syllables: ["ti", "je", "ras"], emoji: "✂️", level: 2 },
          { id: "lapiz", text: "lápiz", syllables: ["lá", "piz"], emoji: "✏️", level: 2 },
          { id: "telefono", text: "teléfono", syllables: ["te", "lé", "fo", "no"], emoji: "📱", level: 3 },
        ],
      },
      {
        id: "comida", name: "Comida", emoji: "🍎",
        words: [
          { id: "sopa", text: "sopa", syllables: ["so", "pa"], emoji: "🍲", level: 1 },
          { id: "uva", text: "uva", syllables: ["u", "va"], emoji: "🍇", level: 1 },
          { id: "pera", text: "pera", syllables: ["pe", "ra"], emoji: "🍐", level: 1 },
          { id: "jugo", text: "jugo", syllables: ["ju", "go"], emoji: "🧃", level: 1 },
          { id: "torta", text: "torta", syllables: ["tor", "ta"], emoji: "🎂", level: 2 },
          { id: "fresa", text: "fresa", syllables: ["fre", "sa"], emoji: "🍓", level: 2 },
          { id: "banana", text: "banana", syllables: ["ba", "na", "na"], emoji: "🍌", level: 2 },
          { id: "galleta", text: "galleta", syllables: ["ga", "lle", "ta"], emoji: "🍪", level: 2 },
          { id: "helado", text: "helado", syllables: ["he", "la", "do"], emoji: "🍦", level: 2 },
          { id: "limon", text: "limón", syllables: ["li", "món"], emoji: "🍋", level: 2 },
          { id: "naranja", text: "naranja", syllables: ["na", "ran", "ja"], emoji: "🍊", level: 2 },
          { id: "manzana", text: "manzana", syllables: ["man", "za", "na"], emoji: "🍎", level: 2 },
          { id: "sandia", text: "sandía", syllables: ["san", "dí", "a"], emoji: "🍉", level: 3 },
          { id: "zanahoria", text: "zanahoria", syllables: ["za", "na", "ho", "ria"], emoji: "🥕", level: 3 },
        ],
      },
      {
        id: "naturaleza", name: "Naturaleza", emoji: "🌳",
        words: [
          { id: "luna", text: "luna", syllables: ["lu", "na"], emoji: "🌙", level: 1 },
          { id: "nube", text: "nube", syllables: ["nu", "be"], emoji: "☁️", level: 1 },
          { id: "rosa", text: "rosa", syllables: ["ro", "sa"], emoji: "🌹", level: 1 },
          { id: "hoja", text: "hoja", syllables: ["ho", "ja"], emoji: "🍃", level: 1 },
          { id: "arbol", text: "árbol", syllables: ["ár", "bol"], emoji: "🌳", level: 2 },
          { id: "playa", text: "playa", syllables: ["pla", "ya"], emoji: "🏖️", level: 2 },
          { id: "rio", text: "río", syllables: ["rí", "o"], emoji: "🏞️", level: 2 },
          { id: "montana", text: "montaña", syllables: ["mon", "ta", "ña"], emoji: "⛰️", level: 2 },
          { id: "jardin", text: "jardín", syllables: ["jar", "dín"], emoji: "🌷", level: 2 },
          { id: "bosque", text: "bosque", syllables: ["bos", "que"], emoji: "🌲", level: 2 },
          { id: "cielo", text: "cielo", syllables: ["cie", "lo"], emoji: "🌌", level: 2 },
          { id: "estrella", text: "estrella", syllables: ["es", "tre", "lla"], emoji: "⭐", level: 3 },
        ],
      },
      {
        id: "cuerpo", name: "Mi cuerpo", emoji: "✋",
        words: [
          { id: "mano", text: "mano", syllables: ["ma", "no"], emoji: "✋", level: 1 },
          { id: "dedo", text: "dedo", syllables: ["de", "do"], emoji: "👆", level: 1 },
          { id: "ojo", text: "ojo", syllables: ["o", "jo"], emoji: "👁️", level: 1 },
          { id: "boca", text: "boca", syllables: ["bo", "ca"], emoji: "👄", level: 1 },
          { id: "pelo", text: "pelo", syllables: ["pe", "lo"], emoji: "💇", level: 1 },
          { id: "cara", text: "cara", syllables: ["ca", "ra"], emoji: "😊", level: 1 },
          { id: "codo", text: "codo", syllables: ["co", "do"], emoji: "💪", level: 1 },
          { id: "nariz", text: "nariz", syllables: ["na", "riz"], emoji: "👃", level: 2 },
          { id: "oreja", text: "oreja", syllables: ["o", "re", "ja"], emoji: "👂", level: 2 },
          { id: "diente", text: "diente", syllables: ["dien", "te"], emoji: "🦷", level: 2 },
          { id: "lengua", text: "lengua", syllables: ["len", "gua"], emoji: "👅", level: 2 },
          { id: "rodilla", text: "rodilla", syllables: ["ro", "di", "lla"], emoji: "🦵", level: 3 },
        ],
      },
      {
        id: "juguetes", name: "Juguetes", emoji: "🧸",
        words: [
          { id: "coche", text: "coche", syllables: ["co", "che"], emoji: "🚗", level: 1 },
          { id: "globo", text: "globo", syllables: ["glo", "bo"], emoji: "🎈", level: 2 },
          { id: "avion", text: "avión", syllables: ["a", "vión"], emoji: "✈️", level: 2 },
          { id: "osito", text: "osito", syllables: ["o", "si", "to"], emoji: "🧸", level: 2 },
          { id: "robot", text: "robot", syllables: ["ro", "bot"], emoji: "🤖", level: 2 },
          { id: "muneca", text: "muñeca", syllables: ["mu", "ñe", "ca"], emoji: "🪆", level: 2 },
          { id: "cometa", text: "cometa", syllables: ["co", "me", "ta"], emoji: "🪁", level: 2 },
          { id: "tambor", text: "tambor", syllables: ["tam", "bor"], emoji: "🥁", level: 2 },
          { id: "pelota", text: "pelota", syllables: ["pe", "lo", "ta"], emoji: "⚽", level: 2 },
          { id: "dados", text: "dados", syllables: ["da", "dos"], emoji: "🎲", level: 2 },
          { id: "bicicleta", text: "bicicleta", syllables: ["bi", "ci", "cle", "ta"], emoji: "🚲", level: 3 },
          { id: "patinete", text: "patinete", syllables: ["pa", "ti", "ne", "te"], emoji: "🛴", level: 3 },
          { id: "guitarra", text: "guitarra", syllables: ["gui", "ta", "rra"], emoji: "🎸", level: 3 },
        ],
      },
    ],

    /* Frases cortas para lectura y una pregunta de comprensión. */
    phrases: [
      {
        id: "mama", text: "Mi mamá me ama.", words: ["Mi", "mamá", "me", "ama"], emoji: "👩‍👧",
        question: {
          prompt: "¿Quién me ama?",
          spoken: "¿Quién me ama? ¿La mamá, el gato o la luna?",
          answer: "mama",
          options: [
            { id: "mama", label: "mamá", emoji: "👩" },
            { id: "gato", label: "gato", emoji: "🐱" },
            { id: "luna", label: "luna", emoji: "🌙" },
          ],
        },
      },
      {
        id: "luna", text: "La luna sale de noche.", words: ["La", "luna", "sale", "de", "noche"], emoji: "🌙",
        question: {
          prompt: "¿Qué sale de noche?",
          spoken: "¿Qué sale de noche? ¿La luna, el sol o la casa?",
          answer: "luna",
          options: [
            { id: "luna", label: "luna", emoji: "🌙" },
            { id: "sol", label: "sol", emoji: "☀️" },
            { id: "casa", label: "casa", emoji: "🏠" },
          ],
        },
      },
      {
        id: "gato", text: "El gato toma sopa.", words: ["El", "gato", "toma", "sopa"], emoji: "🐱",
        question: {
          prompt: "¿Qué toma el gato?",
          spoken: "¿Qué toma el gato? ¿Sopa, jugo o pera?",
          answer: "sopa",
          options: [
            { id: "sopa", label: "sopa", emoji: "🍲" },
            { id: "jugo", label: "jugo", emoji: "🧃" },
            { id: "pera", label: "pera", emoji: "🍐" },
          ],
        },
      },
      {
        id: "casa", text: "La casa es bonita.", words: ["La", "casa", "es", "bonita"], emoji: "🏠",
        question: {
          prompt: "¿Cómo es la casa?",
          spoken: "¿Cómo es la casa? ¿Bonita, grande o sucia?",
          answer: "bonita",
          options: [
            { id: "bonita", label: "bonita", emoji: "✨" },
            { id: "grande", label: "grande", emoji: "🏠" },
            { id: "sucia", label: "sucia", emoji: "🧹" },
          ],
        },
      },
      {
        id: "pato", text: "El pato nada en el agua.", words: ["El", "pato", "nada", "en", "el", "agua"], emoji: "🦆",
        question: {
          prompt: "¿Dónde nada el pato?",
          spoken: "¿Dónde nada el pato? ¿En el agua, en la arena o en la nieve?",
          answer: "agua",
          options: [
            { id: "agua", label: "agua", emoji: "💧" },
            { id: "arena", label: "arena", emoji: "🏖️" },
            { id: "nieve", label: "nieve", emoji: "❄️" },
          ],
        },
      },
      {
        id: "estrella", text: "Yo veo una estrella.", words: ["Yo", "veo", "una", "estrella"], emoji: "⭐",
        question: {
          prompt: "¿Qué veo?",
          spoken: "¿Qué veo? ¿Una estrella, la luna o el sol?",
          answer: "estrella",
          options: [
            { id: "estrella", label: "estrella", emoji: "⭐" },
            { id: "luna", label: "luna", emoji: "🌙" },
            { id: "sol", label: "sol", emoji: "☀️" },
          ],
        },
      },
      {
        id: "osito", text: "Mi osito duerme.", words: ["Mi", "osito", "duerme"], emoji: "🧸",
        question: {
          prompt: "¿Quién duerme?",
          spoken: "¿Quién duerme? ¿El osito, el gato o el pato?",
          answer: "osito",
          options: [
            { id: "osito", label: "osito", emoji: "🧸" },
            { id: "gato", label: "gato", emoji: "🐱" },
            { id: "pato", label: "pato", emoji: "🦆" },
          ],
        },
      },
      {
        id: "cuento", text: "Leo un cuento.", words: ["Leo", "un", "cuento"], emoji: "📖",
        question: {
          prompt: "¿Qué leo?",
          spoken: "¿Qué leo? ¿Un cuento, una sopa o un globo?",
          answer: "cuento",
          options: [
            { id: "cuento", label: "cuento", emoji: "📖" },
            { id: "sopa", label: "sopa", emoji: "🍲" },
            { id: "globo", label: "globo", emoji: "🎈" },
          ],
        },
      },
      {
        id: "mariposa", text: "La mariposa vuela.", words: ["La", "mariposa", "vuela"], emoji: "🦋",
        question: {
          prompt: "¿Quién vuela?",
          spoken: "¿Quién vuela? ¿La mariposa, la tortuga o el pez?",
          answer: "mariposa",
          options: [
            { id: "mariposa", label: "mariposa", emoji: "🦋" },
            { id: "tortuga", label: "tortuga", emoji: "🐢" },
            { id: "pez", label: "pez", emoji: "🐟" },
          ],
        },
      },
      {
        id: "sol", text: "El sol brilla.", words: ["El", "sol", "brilla"], emoji: "☀️",
        question: {
          prompt: "¿Qué brilla?",
          spoken: "¿Qué brilla? ¿El sol, la luna o la estrella?",
          answer: "sol",
          options: [
            { id: "sol", label: "sol", emoji: "☀️" },
            { id: "luna", label: "luna", emoji: "🌙" },
            { id: "estrella", label: "estrella", emoji: "⭐" },
          ],
        },
      },
    ],

    /* Premios que se desbloquean con estrellas. */
    stickers: [
      { id: "pollito", stars: 5, emoji: "🐣", name: "Pollito" },
      { id: "mariposa", stars: 12, emoji: "🦋", name: "Mariposa" },
      { id: "cohete", stars: 20, emoji: "🚀", name: "Cohete" },
      { id: "arcoiris", stars: 30, emoji: "🌈", name: "Arcoíris" },
      { id: "unicornio", stars: 42, emoji: "🦄", name: "Unicornio" },
      { id: "dragon", stars: 55, emoji: "🐉", name: "Dragón" },
      { id: "castillo", stars: 70, emoji: "🏰", name: "Castillo" },
      { id: "corona", stars: 85, emoji: "👑", name: "Corona" },
      { id: "superestrella", stars: 105, emoji: "🌟", name: "Súper estrella" },
      { id: "planeta", stars: 130, emoji: "🪐", name: "Planeta" },
      { id: "trofeo", stars: 160, emoji: "🏆", name: "Trofeo" },
      { id: "medalla", stars: 180, emoji: "🎖️", name: "Medalla" },
    ],

    /* Niveles de lectura según las estrellas acumuladas. */
    levels: [
      { min: 0, name: "Semilla", emoji: "🌱" },
      { min: 5, name: "Brote", emoji: "🌿" },
      { min: 15, name: "Flor", emoji: "🌸" },
      { min: 30, name: "Árbol", emoji: "🌳" },
      { min: 50, name: "Búho", emoji: "🦉" },
      { min: 75, name: "Cohete", emoji: "🚀" },
      { min: 110, name: "Estrella", emoji: "🌟" },
      { min: 150, name: "Corona", emoji: "👑" },
      { min: 185, name: "Leyenda", emoji: "🏆" },
    ],

    /* Textos que también tienen audio propio. */
    speech: {
      titles: {
        silabas: "Sílabas mágicas",
        palabras: "Construye palabras",
        escucha: "Escucha y elige",
        leer: "Leo solito",
        vocales: "Las vocales",
        album: "Mi álbum",
        sesion: "Mi sesión de hoy",
        ruta: "Mi camino",
        repaso: "Repaso inteligente",
      },
      instructions: {
        silabas: "Toca una vocal y escucha la sílaba.",
        palabras: "Toca las sílabas en orden para formar la palabra.",
        escucha: "Escucha y toca la respuesta.",
        leer: "Lee la palabra en voz alta.",
        frases: "Lee la frase en voz alta.",
        vocales: "Toca una vocal para escucharla.",
        album: "Aquí están tus estrellas y tus premios.",
        ajustes: "Ajustes para papás y mamás.",
        sesion: "Hoy tenemos cinco pasos cortitos. Toca el paso que quieras hacer.",
        ruta: "Aquí ves lo que ya sabes y lo que sigue.",
        repaso: "Vamos a repasar los sonidos que necesitan práctica.",
        comprension: "Escucha la pregunta y elige la respuesta.",
      },
      praise: [
        "¡Muy bien!",
        "¡Genial!",
        "¡Excelente!",
        "¡Lo lograste!",
        "¡Qué bien lees!",
        "¡Tú puedes!",
        "¡Sigue así!",
      ],
      corrections: [
        "Casi, prueba otra vez.",
        "Escucha otra vez.",
        "Mira bien y prueba de nuevo.",
      ],
      misc: {
        hello: "¡Hola! Soy el Búho Sabio.",
        letsRead: "Vamos a leer juntos.",
        tapSpeaker: "Toca el altavoz para escuchar.",
        newStar: "¡Ganaste una estrella!",
        newPrize: "¡Nuevo premio!",
        goal: "¡Meta de hoy cumplida!",
        tryAgain: "Inténtalo otra vez.",
        yourTurn: "Ahora tú.",
        readWord: "Lee la palabra.",
        readPhrase: "Lee la frase.",
        buildWord: "Arma la palabra.",
        chooseAnswer: "¿Cuál será?",
        vowelsGame: "Escucha la vocal y tócala.",
        wellDone: "¡Muy bien hecho!",
        testVoice: "Hola, soy el Búho Sabio. Vamos a leer juntos.",
        readWithMe: "Leer conmigo",
        comprehension: "¿Qué entendiste?",
        sessionComplete: "¡Sesión completa!",
        review: "Vamos a repasar lo que necesita práctica.",
        backup: "Guarda una copia de tu progreso.",
      },
    },
  };

  root.APP_DATA = data;
  if (typeof module !== "undefined" && module.exports) module.exports = data;
})(typeof window !== "undefined" ? window : globalThis);
