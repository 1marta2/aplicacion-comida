import { NextResponse } from "next/server";

type Recipe = {
  id: string;
  name: string;
  category: string;
  time: string;
  difficulty: string;
  emoji: string;
  ingredients: string[];
  steps: string[];
};

function cleanText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function getCategory(text: string) {
  const lower = text.toLowerCase();

  if (
    lower.includes("pollo") ||
    lower.includes("carne") ||
    lower.includes("ternera") ||
    lower.includes("cerdo") ||
    lower.includes("pavo")
  ) {
    return "Carne";
  }

  if (
    lower.includes("salmón") ||
    lower.includes("salmon") ||
    lower.includes("merluza") ||
    lower.includes("pescado") ||
    lower.includes("atún") ||
    lower.includes("atun") ||
    lower.includes("bacalao") ||
    lower.includes("gambas") ||
    lower.includes("langostino")
  ) {
    return "Pescado";
  }

  if (
    lower.includes("lentejas") ||
    lower.includes("garbanzos") ||
    lower.includes("judías") ||
    lower.includes("judias") ||
    lower.includes("alubias")
  ) {
    return "Legumbres";
  }

  if (
    lower.includes("ensalada") ||
    lower.includes("tomate") ||
    lower.includes("pepino")
  ) {
    return "Ensaladas";
  }

  if (
    lower.includes("tortilla") ||
    lower.includes("huevo") ||
    lower.includes("huevos")
  ) {
    return "Huevos";
  }

  if (
    lower.includes("arroz") ||
    lower.includes("risotto") ||
    lower.includes("paella")
  ) {
    return "Arroces";
  }

  if (
    lower.includes("pasta") ||
    lower.includes("espagueti") ||
    lower.includes("espaguetis") ||
    lower.includes("macarrones") ||
    lower.includes("lasaña") ||
    lower.includes("lasaña")
  ) {
    return "Pasta";
  }

  return "Pasta";
}

function getEmoji(category: string) {
  const emojis: Record<string, string> = {
    Carne: "🍗",
    Pescado: "🐟",
    Legumbres: "🥣",
    Ensaladas: "🥗",
    Huevos: "🥚",
    Arroces: "🍚",
    Pasta: "🍝",
  };

  return emojis[category] || "🍴";
}

function getTime(text: string) {
  const match = text.match(
    /(?:en|unos?|aprox\.?|aproximadamente)?\s*(\d{1,3})\s*(?:minutos|min|mins)\b/i
  );

  if (match) {
    return `${match[1]} min`;
  }

  const hourMatch = text.match(
    /(\d{1,2})\s*(?:horas?|h)\b/i
  );

  if (hourMatch) {
    return `${hourMatch[1]} h`;
  }

  return "30 min";
}

function getDifficulty(text: string) {
  const lower = text.toLowerCase();

  if (
    lower.includes("fácil") ||
    lower.includes("facil") ||
    lower.includes("sencillo") ||
    lower.includes("sencilla") ||
    lower.includes("fácil y rápido") ||
    lower.includes("facil y rapido")
  ) {
    return "Fácil";
  }

  if (
    lower.includes("difícil") ||
    lower.includes("dificil") ||
    lower.includes("complicado") ||
    lower.includes("complicada")
  ) {
    return "Difícil";
  }

  return "Media";
}

function extractRecipeName(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines.slice(0, 10)) {
    const cleaned = line
      .replace(
        /[🥰😍🤩❤️💚🍴🍝🍗🐟🍚🥗🥣🥚🔥✨😋👏🏻👏🏼👏🏽👏🏾👏🏿]/gu,
        ""
      )
      .replace(/\([^)]*\)/g, "")
      .replace(/[*_#]/g, "")
      .trim();

    const lower = cleaned.toLowerCase();

    if (
      cleaned.length >= 4 &&
      cleaned.length <= 70 &&
      !lower.includes("ingrediente") &&
      !lower.includes("elaboración") &&
      !lower.includes("elaboracion") &&
      !lower.includes("preparación") &&
      !lower.includes("preparacion") &&
      !lower.startsWith("http")
    ) {
      return cleaned;
    }
  }

  return "Receta importada";
}

function extractIngredients(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const ingredients: string[] = [];

  let readingIngredients = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (
      lower.includes("ingredientes") ||
      lower === "ingredientes" ||
      lower.includes("ingredientes / elaboración") ||
      lower.includes("ingredientes/elaboración")
    ) {
      readingIngredients = true;
      continue;
    }

    if (
      readingIngredients &&
      (
        lower.includes("elaboración") ||
        lower.includes("elaboracion") ||
        lower.includes("preparación") ||
        lower.includes("preparacion") ||
        /^\d+[\.\)]\s/.test(line)
      )
    ) {
      break;
    }

    if (readingIngredients) {
      let cleaned = line
        .replace(/^[-•●▪️◦]\s*/u, "")
        .replace(/^[🔴🟢🟡🟠🟣⚪⚫]\s*/u, "")
        .trim();

      cleaned = cleaned.replace(/^[-–—]\s*/, "").trim();

      if (
        cleaned.length > 1 &&
        cleaned.length < 150 &&
        !cleaned.includes("👇") &&
        !cleaned.includes("⬇")
      ) {
        ingredients.push(cleaned);
      }
    }
  }

  // Segundo intento: detectar listas aunque no haya
  // un encabezado claro de "Ingredientes".
  if (ingredients.length < 2) {
    for (const line of lines) {
      const looksLikeIngredient =
        /^[-•●▪️◦]\s*/u.test(line) ||
        /^[🔴🟢🟡🟠🟣⚪⚫]\s*/u.test(line) ||
        /^\d+(?:\s*(?:g|gr|kg|ml|cl|l|ud|uds|cda|cdas|cdta|cdtas))\b/i.test(
          line
        );

      if (looksLikeIngredient) {
        const cleaned = line
          .replace(/^[-•●▪️◦]\s*/u, "")
          .replace(/^[🔴🟢🟡🟠🟣⚪⚫]\s*/u, "")
          .trim();

        if (cleaned.length > 1 && cleaned.length < 150) {
          ingredients.push(cleaned);
        }
      }
    }
  }

  return [...new Set(ingredients)];
}

function extractSteps(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const steps: string[] = [];

  let readingSteps = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (
      lower.includes("elaboración") ||
      lower.includes("elaboracion") ||
      lower.includes("preparación") ||
      lower.includes("preparacion")
    ) {
      readingSteps = true;
      continue;
    }

    if (/^\d+[\.\)]\s+/.test(line)) {
      const cleaned = line
        .replace(/^\d+[\.\)]\s+/, "")
        .trim();

      if (cleaned.length > 5) {
        steps.push(cleaned);
      }

      readingSteps = true;
      continue;
    }

    if (readingSteps && /^\d+\s+/.test(line)) {
      const cleaned = line
        .replace(/^\d+\s+/, "")
        .trim();

      if (cleaned.length > 5) {
        steps.push(cleaned);
      }
    }
  }

  return steps;
}

function buildRecipe(text: string): Recipe {
  const clean = cleanText(text);

  const name = extractRecipeName(clean);
  const category = getCategory(clean);
  const ingredients = extractIngredients(clean);
  const steps = extractSteps(clean);

  const id =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now();

  return {
    id,
    name,
    category,
    time: getTime(clean),
    difficulty: getDifficulty(clean),
    emoji: getEmoji(category),
    ingredients,
    steps,
  };
}

function isInstagramUrl(url: string) {
  try {
    const parsed = new URL(url);

    return (
      parsed.hostname === "instagram.com" ||
      parsed.hostname === "www.instagram.com" ||
      parsed.hostname === "m.instagram.com"
    );
  } catch {
    return false;
  }
}

async function tryReadInstagram(url: string) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/139.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) {
      return "";
    }

    const html = await response.text();

    const candidates: string[] = [];

    const ogDescription = html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
    );

    if (ogDescription?.[1]) {
      candidates.push(ogDescription[1]);
    }

    const metaDescription = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    );

    if (metaDescription?.[1]) {
      candidates.push(metaDescription[1]);
    }

    const captionMatches = html.matchAll(
      /"caption"\s*:\s*(?:\{[^}]*?"text"\s*:\s*)?"((?:\\.|[^"\\])*)"/gi
    );

    for (const match of captionMatches) {
      if (match[1]) {
        candidates.push(
          match[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, "\n")
        );
      }
    }

    return candidates
      .map(cleanText)
      .sort((a, b) => b.length - a.length)[0] || "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const url = String(body.url || "").trim();
    const userHelp = String(body.userHelp || "").trim();

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          error: "Pega un enlace de Instagram.",
        },
        { status: 400 }
      );
    }

    if (!isInstagramUrl(url)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El enlace debe ser un enlace válido de Instagram.",
        },
        { status: 400 }
      );
    }

    /*
     * Primero intentamos leer Instagram.
     *
     * Si Instagram no nos deja acceder al caption,
     * usamos directamente el texto que haya pegado
     * la usuaria.
     */
    const instagramText = await tryReadInstagram(url);

    const textToUse = userHelp || instagramText;

    if (!textToUse || textToUse.length < 20) {
      return NextResponse.json({
        success: true,
        needsHelp: true,
        message:
          "Pega aquí el texto del pie de la receta de Instagram.",
      });
    }

    const recipe = buildRecipe(textToUse);

    /*
     * Si tenemos un texto largo pero no hemos detectado
     * suficientes ingredientes/pasos, igualmente devolvemos
     * la receta si el usuario ha pegado texto.
     *
     * Así evitamos pedirle que vuelva a escribir la receta.
     */
    if (userHelp) {
      return NextResponse.json({
        success: true,
        needsHelp: false,
        recipe: {
          ...recipe,
          source: url,
        },
        foundText: textToUse,
      });
    }

    if (
      recipe.ingredients.length >= 2 &&
      recipe.steps.length >= 1
    ) {
      return NextResponse.json({
        success: true,
        needsHelp: false,
        recipe: {
          ...recipe,
          source: url,
        },
        foundText: instagramText,
      });
    }

    return NextResponse.json({
      success: true,
      needsHelp: true,
      message:
        "No he podido sacar suficiente información del Reel. Pega el texto de la receta y la convertiré automáticamente.",
    });
  } catch (error) {
    console.error("Error importando receta:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Ha ocurrido un problema al importar la receta.",
      },
      { status: 500 }
    );
  }
}