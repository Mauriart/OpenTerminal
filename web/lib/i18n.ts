/**
 * UI copy for OpenTerminal.
 *
 * Spanish (neutral Latin American) is the default. Set `locale` to `"en"`
 * to restore the original English interface. Financial figures stay on the
 * en-US formatter in `lib/api.ts` so decimals and magnitudes stay readable
 * and input parsing is unchanged. Dates use `dateLocale`.
 */

export type Locale = "es" | "en";

export const locale: Locale = "es";

export const dateLocale = locale === "es" ? "es-419" : "en-US";

const en = {
  meta: {
    description: "Bloomberg-style financial terminal on free data sources",
  },
  common: {
    error: "Error: {message}",
    retry: "Retry",
    close: "Close",
    remove: "Remove",
    loading: "Loading…",
  },
  error: {
    widgetFailed: "{name} failed to render: {message}",
    terminal: "Terminal error: {message}",
  },
  api: {
    allDown: "All data providers are temporarily unavailable. Try again shortly.",
    aiUnavailable: "AI assistant unavailable: set ANTHROPIC_API_KEY on the server.",
    rateLimit: "Rate limit exceeded, try again shortly.",
    unsupportedCrypto: "Unsupported crypto symbol.",
    messagesRequired: "A messages array is required.",
    portfolioExists: "A portfolio with that name already exists.",
    portfolioNotFound: "Portfolio not found.",
    symbolsRequired: "Symbols are required.",
    missingApiKey: "Missing or invalid X-Api-Key header.",
    http: "HTTP {status}",
  },
  topbar: {
    nyseOpen: "NYSE OPEN",
    nyseClosed: "NYSE CLOSED",
    search: "{symbol} — search symbol…",
    feeds: "feeds:",
    connecting: "connecting…",
  },
  nav: {
    add: "Add widget",
    reset: "RESET LAYOUT",
    chart: "CHART",
    quote: "QUOTE",
    news: "NEWS",
    screener: "SCREENER",
    heatmap: "HEATMAP",
    crypto: "CRYPTO",
    options: "OPTIONS",
    portfolio: "PORTFOLIO",
    ai: "AI ASSIST",
    watchlist: "WATCHLIST",
    macro: "MACRO",
    calendar: "CALENDAR",
    insider: "INSIDER",
    tv: "LIVE TV",
    recap: "MARKET RECAP",
  },
  widget: {
    quote: "Quote",
    chart: "Chart",
    watchlist: "Watchlist",
    news: "News",
    heatmap: "Heatmap",
    screener: "Screener",
    crypto: "Crypto",
    macro: "Macro / Indexes",
    options: "Option Chain",
    portfolio: "Portfolio",
    ai: "AI Assistant",
    calendar: "Calendar",
    insider: "Insider Transactions",
    tv: "Live TV",
    recap: "Market Recap",
  },
  workspace: {
    setTicker: "Click to set this widget's ticker",
    linked: "Linked to active symbol (click to unlink)",
    unlinked: "Unlinked (click to link)",
  },
  command: {
    placeholder: "Ticker, company, ETF, crypto, index…  (Enter = load · Shift+Enter = load + watchlist)",
    empty: "No results for “{query}”",
  },
  instrument: {
    stock: "stock",
    fund: "fund",
    etf: "ETF",
    dr: "DR",
    index: "index",
    crypto: "crypto",
    future: "future",
    currency: "currency",
  },
  quote: {
    loading: "Loading {symbol}…",
    open: "Open",
    high: "High",
    low: "Low",
    prevClose: "Prev Close",
    bid: "Bid",
    ask: "Ask",
    volume: "Volume",
    avgVolume: "Avg Vol 3M",
    shortVol: "Short Vol %",
    marketCap: "Mkt Cap",
    pe: "P/E (ttm)",
    eps: "EPS (ttm)",
    divYield: "Div Yield",
    high52: "52W High",
    low52: "52W Low",
    beta: "Beta",
    shares: "Shares Out",
    bidHint: "Bid price",
    askHint: "Ask price",
    shortHint: "Short volume as a share of total volume (Reg SHO)",
    peHint: "Price-to-earnings ratio, trailing twelve months",
    epsHint: "Earnings per share, trailing twelve months",
    betaHint: "Sensitivity versus the market",
  },
  chart: {
    vol: "Vol",
    candles: "CANDLES",
    bars: "BARS",
    line: "LINE",
    area: "AREA",
    range: {
      "1D": "1 day",
      "5D": "5 days",
      "1M": "1 month",
      "6M": "6 months",
      YTD: "Year to date",
      "1Y": "1 year",
      "5Y": "5 years",
      MAX: "All available history",
    },
    indicator: {
      SMA20: "Simple moving average, 20 periods",
      SMA50: "Simple moving average, 50 periods",
      SMA200: "Simple moving average, 200 periods",
      EMA20: "Exponential moving average, 20 periods",
      VWAP: "Volume-weighted average price",
      BOLL: "Bollinger Bands",
      RSI: "Relative Strength Index",
      MACD: "Moving average convergence/divergence",
    },
  },
  watchlist: {
    placeholder: "Add ticker…",
    invalid: "Not a valid ticker symbol",
    sym: "Sym",
    last: "Last",
    chg: "Chg%",
    vol: "Vol",
  },
  news: {
    global: "GLOBAL",
    loading: "Loading news…",
  },
  market: {
    us: "US",
    eu: "EU",
  },
  heatmap: {
    loading: "Loading heatmap…",
  },
  screener: {
    allSectors: "All sectors",
    changeMin: "Chg% min",
    changeMinHint: "Minimum daily percent change",
    mcapMin: "MCap min ($B)",
    mcapMinHint: "Minimum market cap, in billions of dollars",
    volMin: "Vol min (M)",
    volMinHint: "Minimum volume, in millions of shares",
    resultOne: "{count} result",
    resultOther: "{count} results",
    sym: "Sym",
    name: "Name",
    sector: "Sector",
    last: "Last",
    chg: "Chg%",
    vol: "Vol",
    mcap: "MCap",
  },
  crypto: {
    totalMcap: "Total MCap",
    asset: "Asset",
    price: "Price",
    change: "24h%",
    mcap: "MCap",
    vol: "Vol 24h",
    week: "7d",
  },
  macro: {
    loading: "Loading macro data…",
    usCurve: "US Treasury Yield Curve",
    euCurve: "Euro Area AAA Yield Curve",
    ecbDepo: "ECB depo",
    hicp: "HICP",
    hicpHint: "Harmonised Index of Consumer Prices",
    index: "Index / Commodity",
    last: "Last",
    chg: "Chg%",
  },
  index: {
    gold: "Gold (GLD)",
    wti: "WTI Crude (USO)",
    treasury: "20Y+ Treasury (TLT)",
    dollar: "Dollar Index (UUP)",
    germany: "Germany (EWG)",
    uk: "UK (EWU)",
    france: "France (EWQ)",
    italy: "Italy (EWI)",
  },
  options: {
    unavailable: "Option chain unavailable for {symbol}",
    loading: "Loading option chain…",
    underlying: "Underlying",
    expiry: "Expiry",
    calls: "CALLS",
    puts: "PUTS",
    strike: "STRIKE",
    callsHint: "Call options",
    putsHint: "Put options",
    strikeHint: "Strike price",
    last: "Last",
    bid: "Bid",
    ask: "Ask",
    vol: "Vol",
    oiIv: "OI · IV",
    oiIvHint: "Open interest and implied volatility",
  },
  portfolio: {
    transactions: "TRANSACTIONS",
    marketValue: "MV",
    unrealized: "Unrl",
    realized: "Rlzd",
    ticker: "Ticker",
    qty: "Qty",
    price: "Price",
    add: "ADD",
    buy: "BUY",
    sell: "SELL",
    defaultName: "Main",
    sym: "Sym",
    avgCost: "Avg Cost",
    last: "Last",
    mktVal: "Mkt Val",
    unrealizedPnl: "Unrl PnL",
    realizedPnl: "Rlzd PnL",
    date: "Date",
    side: "Side",
    delete: "Delete",
  },
  ai: {
    empty: "Ask about {symbol}, the market, an indicator, or a headline. The current quote is shared as context.",
    you: "YOU",
    assistant: "AI",
    thinking: "thinking…",
    placeholder: "Ask about {symbol}…",
    send: "SEND",
  },
  calendar: {
    economic: "ECONOMIC",
    earnings: "EARNINGS",
    highMed: "HIGH+MED",
    all: "ALL",
    date: "Date",
    currency: "Ccy",
    event: "Event",
    forecast: "Forecast",
    previous: "Previous",
    actual: "Actual",
    emptyEvents: "No events in this window.",
    loading: "Loading calendar…",
    loadingEarnings: "Loading earnings…",
    loadingHistory: "Loading history for {symbol}…",
    emptyHistory: "No earnings history for {symbol}.",
    quarter: "Quarter",
    reported: "Reported",
    surprise: "Surprise",
    dayAfter: "Day After",
    historyHint: "Click for earnings history",
    sym: "Sym",
    lastEarnings: "Last Earnings",
    nextEarnings: "Next Earnings",
    epsEst: "EPS Est.",
    epsEstHint: "Earnings-per-share estimate",
    emptyEarnings: "No upcoming earnings data for your watchlist.",
    tz: {
      local: "Local",
      utc: "UTC",
      newYork: "New York",
      chicago: "Chicago",
      london: "London",
      frankfurt: "Frankfurt",
      tokyo: "Tokyo",
      sydney: "Sydney",
    },
  },
  insider: {
    loading: "Loading insider transactions for {symbol}…",
    empty: "No recent open-market insider transactions for {symbol}.",
    date: "Date",
    insider: "Insider",
    title: "Title",
    type: "Type",
    shares: "Shares",
    price: "Price",
    value: "Value",
    ownedAfter: "Owned After",
    director: "Director",
    tenPercent: "10%+ Owner",
    code: {
      P: "Open market buy",
      S: "Open market sale",
      A: "Grant/award",
      M: "Option exercise",
      G: "Gift",
      F: "Tax withholding",
      C: "Conversion",
      D: "Disposition to issuer",
    },
  },
  tv: {
    streamDown: "Stream unavailable right now ({details}). Try another channel.",
    noHls: "Your browser doesn't support HLS playback.",
  },
  recap: {
    loading: "Loading market recap…",
    updated: "Updated {time}",
    index: "Index",
    last: "Last",
    chg: "Chg%",
    gainers: "Top gainers",
    losers: "Top losers",
    sectors: "Sector performance",
    headlines: "Headlines",
  },
} as const;

type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

const es = {
  meta: {
    description: "Terminal financiero al estilo Bloomberg con fuentes de datos gratuitas",
  },
  common: {
    error: "Error: {message}",
    retry: "Reintentar",
    close: "Cerrar",
    remove: "Quitar",
    loading: "Cargando…",
  },
  error: {
    widgetFailed: "{name} no se pudo mostrar: {message}",
    terminal: "Error del terminal: {message}",
  },
  api: {
    allDown: "Ningún proveedor de datos está disponible por ahora. Inténtalo de nuevo en unos momentos.",
    aiUnavailable: "Asistente de IA no disponible: configura ANTHROPIC_API_KEY en el servidor.",
    rateLimit: "Superaste el límite de solicitudes. Inténtalo de nuevo en unos momentos.",
    unsupportedCrypto: "Símbolo de cripto no admitido.",
    messagesRequired: "Se requiere una lista de mensajes.",
    portfolioExists: "Ya existe un portafolio con ese nombre.",
    portfolioNotFound: "Portafolio no encontrado.",
    symbolsRequired: "Se requieren símbolos.",
    missingApiKey: "Falta el encabezado X-Api-Key o no es válido.",
    http: "HTTP {status}",
  },
  topbar: {
    nyseOpen: "NYSE ABIERTO",
    nyseClosed: "NYSE CERRADO",
    search: "{symbol} — buscar símbolo…",
    feeds: "fuentes:",
    connecting: "conectando…",
  },
  nav: {
    add: "Paneles",
    reset: "RESTABLECER",
    chart: "GRÁFICO",
    quote: "COTIZACIÓN",
    news: "NOTICIAS",
    screener: "FILTRO",
    heatmap: "MAPA",
    crypto: "CRIPTO",
    options: "OPCIONES",
    portfolio: "PORTAFOLIO",
    ai: "ASISTENTE",
    watchlist: "LISTA",
    macro: "MACRO",
    calendar: "CALENDARIO",
    insider: "INSIDERS",
    tv: "TV EN VIVO",
    recap: "RESUMEN",
  },
  widget: {
    quote: "Cotización",
    chart: "Gráfico",
    watchlist: "Lista de seguimiento",
    news: "Noticias",
    heatmap: "Mapa de calor",
    screener: "Filtro de mercado",
    crypto: "Cripto",
    macro: "Macro e índices",
    options: "Cadena de opciones",
    portfolio: "Portafolio",
    ai: "Asistente de IA",
    calendar: "Calendario",
    insider: "Transacciones de insiders",
    tv: "TV en vivo",
    recap: "Resumen de mercado",
  },
  workspace: {
    setTicker: "Clic para fijar el ticker de este panel",
    linked: "Vinculado al símbolo activo (clic para desvincular)",
    unlinked: "Independiente (clic para vincular)",
  },
  command: {
    placeholder:
      "Ticker, empresa, ETF, cripto, índice…  (Enter = cargar · Mayús+Enter = cargar y seguir)",
    empty: "Sin resultados para “{query}”",
  },
  instrument: {
    stock: "acción",
    fund: "fondo",
    etf: "ETF",
    dr: "ADR",
    index: "índice",
    crypto: "cripto",
    future: "futuro",
    currency: "divisa",
  },
  quote: {
    loading: "Cargando {symbol}…",
    open: "Apertura",
    high: "Máximo",
    low: "Mínimo",
    prevClose: "Cierre ant.",
    bid: "Bid",
    ask: "Ask",
    volume: "Volumen",
    avgVolume: "Vol. prom. 3M",
    shortVol: "% en corto",
    marketCap: "Cap. bursátil",
    pe: "P/E (ttm)",
    eps: "EPS (ttm)",
    divYield: "Rend. div.",
    high52: "Máx. 52 sem.",
    low52: "Mín. 52 sem.",
    beta: "Beta",
    shares: "Acciones",
    bidHint: "Precio de compra",
    askHint: "Precio de venta",
    shortHint: "Volumen en corto como porcentaje del volumen total (Reg SHO)",
    peHint: "Relación precio/beneficio, últimos 12 meses",
    epsHint: "Beneficio por acción, últimos 12 meses",
    betaHint: "Sensibilidad respecto al mercado",
  },
  chart: {
    vol: "Vol",
    candles: "VELAS",
    bars: "BARRAS",
    line: "LÍNEA",
    area: "ÁREA",
    range: {
      "1D": "1 día",
      "5D": "5 días",
      "1M": "1 mes",
      "6M": "6 meses",
      YTD: "Año en curso",
      "1Y": "1 año",
      "5Y": "5 años",
      MAX: "Historial disponible",
    },
    indicator: {
      SMA20: "Media móvil simple de 20 periodos",
      SMA50: "Media móvil simple de 50 periodos",
      SMA200: "Media móvil simple de 200 periodos",
      EMA20: "Media móvil exponencial de 20 periodos",
      VWAP: "Precio promedio ponderado por volumen",
      BOLL: "Bandas de Bollinger",
      RSI: "Índice de fuerza relativa",
      MACD: "Convergencia y divergencia de medias móviles",
    },
  },
  watchlist: {
    placeholder: "Agregar ticker…",
    invalid: "No es un ticker válido",
    sym: "Sím",
    last: "Último",
    chg: "Var%",
    vol: "Vol",
  },
  news: {
    global: "GENERAL",
    loading: "Cargando noticias…",
  },
  market: {
    us: "EE. UU.",
    eu: "UE",
  },
  heatmap: {
    loading: "Cargando mapa de calor…",
  },
  screener: {
    allSectors: "Todos los sectores",
    changeMin: "Var% mín",
    changeMinHint: "Variación diaria mínima, en porcentaje",
    mcapMin: "Cap. mín ($B)",
    mcapMinHint: "Capitalización mínima, en miles de millones de dólares",
    volMin: "Vol mín (M)",
    volMinHint: "Volumen mínimo, en millones",
    resultOne: "{count} resultado",
    resultOther: "{count} resultados",
    sym: "Sím",
    name: "Nombre",
    sector: "Sector",
    last: "Último",
    chg: "Var%",
    vol: "Vol",
    mcap: "Cap.",
  },
  crypto: {
    totalMcap: "Cap. total",
    asset: "Activo",
    price: "Precio",
    change: "24h%",
    mcap: "Cap.",
    vol: "Vol 24h",
    week: "7d",
  },
  macro: {
    loading: "Cargando datos macro…",
    usCurve: "Curva de rendimientos del Tesoro de EE. UU.",
    euCurve: "Curva AAA de la zona euro",
    ecbDepo: "Depósito BCE",
    hicp: "IAPC",
    hicpHint: "Índice armonizado de precios al consumo",
    index: "Índice / materia prima",
    last: "Último",
    chg: "Var%",
  },
  index: {
    gold: "Oro (GLD)",
    wti: "Crudo WTI (USO)",
    treasury: "Tesoro 20+ años (TLT)",
    dollar: "Índice del dólar (UUP)",
    germany: "Alemania (EWG)",
    uk: "Reino Unido (EWU)",
    france: "Francia (EWQ)",
    italy: "Italia (EWI)",
  },
  options: {
    unavailable: "Cadena de opciones no disponible para {symbol}",
    loading: "Cargando cadena de opciones…",
    underlying: "Subyacente",
    expiry: "Vencimiento",
    calls: "CALLS",
    puts: "PUTS",
    strike: "STRIKE",
    callsHint: "Opciones de compra (calls)",
    putsHint: "Opciones de venta (puts)",
    strikeHint: "Precio de ejercicio",
    last: "Últ.",
    bid: "Bid",
    ask: "Ask",
    vol: "Vol",
    oiIv: "OI · IV",
    oiIvHint: "Interés abierto y volatilidad implícita",
  },
  portfolio: {
    transactions: "OPERACIONES",
    marketValue: "Valor",
    unrealized: "No real.",
    realized: "Real.",
    ticker: "Ticker",
    qty: "Cant.",
    price: "Precio",
    add: "AGREGAR",
    buy: "COMPRA",
    sell: "VENTA",
    defaultName: "Principal",
    sym: "Sím",
    avgCost: "Costo prom.",
    last: "Último",
    mktVal: "Valor merc.",
    unrealizedPnl: "P&L no real.",
    realizedPnl: "P&L real.",
    date: "Fecha",
    side: "Lado",
    delete: "Eliminar",
  },
  ai: {
    empty:
      "Pregunta sobre {symbol}, el mercado, un indicador o un titular. La cotización actual se comparte como contexto.",
    you: "TÚ",
    assistant: "IA",
    thinking: "pensando…",
    placeholder: "Preguntar sobre {symbol}…",
    send: "ENVIAR",
  },
  calendar: {
    economic: "ECONÓMICO",
    earnings: "RESULTADOS",
    highMed: "ALTO+MED",
    all: "TODOS",
    date: "Fecha",
    currency: "Divisa",
    event: "Evento",
    forecast: "Pronóstico",
    previous: "Anterior",
    actual: "Real",
    emptyEvents: "No hay eventos en esta ventana.",
    loading: "Cargando calendario…",
    loadingEarnings: "Cargando resultados…",
    loadingHistory: "Cargando historial de {symbol}…",
    emptyHistory: "No hay historial de resultados para {symbol}.",
    quarter: "Trimestre",
    reported: "Reportado",
    surprise: "Sorpresa",
    dayAfter: "Día sig.",
    historyHint: "Clic para ver el historial de resultados",
    sym: "Sím",
    lastEarnings: "Últimos resultados",
    nextEarnings: "Próximos resultados",
    epsEst: "EPS est.",
    epsEstHint: "Estimación de beneficio por acción",
    emptyEarnings: "No hay próximos resultados para tu lista de seguimiento.",
    tz: {
      local: "Local",
      utc: "UTC",
      newYork: "Nueva York",
      chicago: "Chicago",
      london: "Londres",
      frankfurt: "Fráncfort",
      tokyo: "Tokio",
      sydney: "Sídney",
    },
  },
  insider: {
    loading: "Cargando transacciones de insiders de {symbol}…",
    empty: "No hay transacciones recientes de insiders en mercado abierto para {symbol}.",
    date: "Fecha",
    insider: "Insider",
    title: "Cargo",
    type: "Tipo",
    shares: "Acciones",
    price: "Precio",
    value: "Valor",
    ownedAfter: "Tenencia post.",
    director: "Director",
    tenPercent: "Accionista ≥10%",
    code: {
      P: "Compra en mercado",
      S: "Venta en mercado",
      A: "Concesión o premio",
      M: "Ejercicio de opción",
      G: "Donación",
      F: "Retención fiscal",
      C: "Conversión",
      D: "Venta al emisor",
    },
  },
  tv: {
    streamDown: "Transmisión no disponible ahora ({details}). Prueba otro canal.",
    noHls: "Tu navegador no admite reproducción HLS.",
  },
  recap: {
    loading: "Cargando resumen de mercado…",
    updated: "Actualizado {time}",
    index: "Índice",
    last: "Último",
    chg: "Var%",
    gainers: "Mayores alzas",
    losers: "Mayores bajas",
    sectors: "Desempeño por sector",
    headlines: "Titulares",
  },
} satisfies DeepString<typeof en>;

type MessageTree = { [key: string]: string | MessageTree };

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends Record<string, unknown>
      ? `${K}.${Paths<T[K]>}`
      : never;
}[keyof T & string];

export type MessageKey = Paths<typeof en>;

const dictionaries: Record<Locale, MessageTree> = {
  en: en as unknown as MessageTree,
  es: es as unknown as MessageTree,
};

function resolve(dict: MessageTree, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
  return typeof value === "string" ? value : undefined;
}

/** Look up a UI string. `{name}` placeholders are filled from `vars`. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  let text = resolve(dictionaries[locale], key) ?? resolve(dictionaries.en, key) ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function widgetTitle(type: string): string {
  return t(`widget.${type}` as MessageKey);
}

export function navLabel(type: string): string {
  return t(`nav.${type}` as MessageKey);
}

const INSTRUMENT_TYPES: Record<string, MessageKey> = {
  stock: "instrument.stock",
  equity: "instrument.stock",
  fund: "instrument.fund",
  etf: "instrument.etf",
  dr: "instrument.dr",
  index: "instrument.index",
  crypto: "instrument.crypto",
  cryptocurrency: "instrument.crypto",
  future: "instrument.future",
  futures: "instrument.future",
  currency: "instrument.currency",
};

/** Display label for a search result type. Unknown types pass through. */
export function instrumentType(type: string): string {
  const key = INSTRUMENT_TYPES[type.toLowerCase()];
  return key ? t(key) : type;
}

const INDEX_LABELS: Record<string, MessageKey> = {
  "Gold (GLD)": "index.gold",
  "WTI Crude (USO)": "index.wti",
  "20Y+ Treasury (TLT)": "index.treasury",
  "Dollar Index (UUP)": "index.dollar",
  "Germany (EWG)": "index.germany",
  "UK (EWU)": "index.uk",
  "France (EWQ)": "index.france",
  "Italy (EWI)": "index.italy",
};

/** Translate known index/commodity proxy labels. Names from the feed stay as-is. */
export function indexLabel(label: string): string {
  const key = INDEX_LABELS[label];
  return key ? t(key) : label;
}

export function tradeSide(side: string): string {
  if (side === "BUY") return t("portfolio.buy");
  if (side === "SELL") return t("portfolio.sell");
  return side;
}

/** The seeded portfolio is stored as "Main"; show it in the active language. */
export function portfolioName(name: string): string {
  return name === "Main" ? t("portfolio.defaultName") : name;
}

const API_ERRORS: Record<string, MessageKey> = {
  "All data providers are temporarily unavailable. Try again shortly.": "api.allDown",
  "AI assistant unavailable: set ANTHROPIC_API_KEY on the server.": "api.aiUnavailable",
  "rate limit exceeded, try again shortly": "api.rateLimit",
  "unsupported crypto symbol": "api.unsupportedCrypto",
  "messages array required": "api.messagesRequired",
  "portfolio name already exists": "api.portfolioExists",
  "portfolio not found": "api.portfolioNotFound",
  "symbols required": "api.symbolsRequired",
  "missing or invalid X-Api-Key header": "api.missingApiKey",
};

/** Map stable API error strings to the active locale. Unknown messages pass through. */
export function translateApiError(message: string): string {
  const key = API_ERRORS[message];
  if (key) return t(key);
  const http = /^HTTP (\d+)$/.exec(message);
  if (http) return t("api.http", { status: http[1] });
  return message;
}

export function formatDateTime(input: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  const date = input instanceof Date ? input : new Date(input);
  return date.toLocaleString(dateLocale, options);
}

export function formatDate(input: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  const date = input instanceof Date ? input : new Date(input);
  return date.toLocaleDateString(dateLocale, options);
}

export function formatTime(input: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  const date = input instanceof Date ? input : new Date(input);
  return date.toLocaleTimeString(dateLocale, { hour12: false, ...options });
}

export function marketLabel(market: "us" | "eu"): string {
  return t(market === "us" ? "market.us" : "market.eu");
}
