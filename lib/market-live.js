const SOURCE = "https://elmorshdledwagn.com/";
const FEED_PAGE = "https://elmorshdledwagn.com/prices/2";

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html",
};

function section(html, start, end) {
  const from = html.indexOf(start);
  if (from < 0) return "";
  const to = end ? html.indexOf(end, from + start.length) : -1;
  return html.slice(from, to < 0 ? html.length : to);
}

function rows(html) {
  return [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((row) =>
    [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((cell) =>
      cell[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    )
  );
}

function numberValue(value) {
  const text = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const parsed = Number(text);
  return parsed > 0 ? parsed : null;
}

function median(values) {
  const sorted = values.filter((value) => value > 0).sort((left, right) => left - right);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function boardDate(token, today) {
  const match = String(token || "").match(/(\d{2})-(\d{2})/);
  if (!match) return today;
  const month = match[1];
  const day = match[2];
  let year = Number(today.slice(0, 4));
  let iso = `${year}-${month}-${day}`;
  if (iso > today) iso = `${year - 1}-${month}-${day}`;
  return iso;
}

function cardNumbers(html, title) {
  const index = html.indexOf(`card-title">${title}`);
  if (index < 0) return [];
  return [...html.slice(index, index + 900).matchAll(/<h5 class="h1[^"]*">\s*([0-9.]+)\s*<\/h5>/g)].map((match) => numberValue(match[1]));
}

export function parseBoard(html, today) {
  const quotes = [];
  const white = cardNumbers(html, "اللحم الابيض").filter(Boolean);
  if (white[0]) {
    quotes.push({
      commodity: "broiler_kg",
      price: white[0],
      buyPrice: white[1] || null,
      unit: "جنيه/كجم",
      priceDate: today,
      sourceLabel: "المرشد للدواجن · اللحم الأبيض",
    });
  }

  const chickRows = rows(section(html, ">بورصة الكتاكيت</h2>", ">بورصة الدواجن</h2>"))
    .map((cells) => ({ date: cells[1], price: numberValue(cells[2]) }))
    .filter((row) => row.price);
  const chick = median(chickRows.map((row) => row.price));
  if (chick) {
    const dates = chickRows.map((row) => boardDate(row.date, today)).sort();
    quotes.push({
      commodity: "chick",
      price: chick,
      unit: "جنيه/كتكوت",
      priceDate: dates.at(-1) || today,
      sourceLabel: "المرشد للدواجن · بورصة الكتاكيت",
    });
  }

  const materials = rows(section(html, ">اسعار الخامات</h2>", "end all price"))
    .map((cells) => ({ name: cells[0], price: numberValue(cells[1]), date: boardDate(cells[2], today) }))
    .filter((row) => row.name && row.price);
  const corn = materials.filter((row) => row.name.includes("ذرة") && !row.name.includes("امريكي"));
  const cornPrice = median(corn.map((row) => row.price));
  if (cornPrice) {
    const low = Math.min(...corn.map((row) => row.price));
    const high = Math.max(...corn.map((row) => row.price));
    quotes.push({
      commodity: "corn",
      price: cornPrice,
      buyPrice: low < high ? low : null,
      sellPrice: low < high ? high : null,
      unit: "جنيه/طن",
      priceDate: corn.map((row) => row.date).sort().at(-1) || today,
      sourceLabel: "المرشد للدواجن · ذرة",
    });
  }
  const soy46 = materials.find((row) => row.name.includes("46"));
  const soy44 = materials.find((row) => row.name.includes("44"));
  if (soy46 || soy44) {
    quotes.push({
      commodity: "soy",
      price: (soy46 || soy44).price,
      buyPrice: soy44?.price || null,
      unit: "جنيه/طن",
      priceDate: (soy46 || soy44).date,
      sourceLabel: soy46 ? "المرشد للدواجن · صويا 46%" : "المرشد للدواجن · صويا 44%",
    });
  }
  const bran = materials.find((row) => row.name.includes("ردة") || row.name.includes("نخالة"));
  if (bran) {
    quotes.push({
      commodity: "bran",
      price: bran.price,
      unit: "جنيه/طن",
      priceDate: bran.date,
      sourceLabel: "المرشد للدواجن · ردة",
    });
  }
  return quotes;
}

export function parseFeed(html, today) {
  const prices = rows(html)
    .map((cells) => numberValue(cells[1]))
    .filter((price) => price && price >= 1000);
  const price = median(prices);
  if (!price) return [];
  return [{
    commodity: "feed",
    price,
    unit: "جنيه/طن",
    priceDate: today,
    sourceLabel: "المرشد للدواجن · علف 23%",
  }];
}

async function load(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`market ${response.status}`);
  return response.text();
}

export async function fetchLiveQuotes(today) {
  const [home, feed] = await Promise.all([load(SOURCE), load(FEED_PAGE).catch(() => "")]);
  return [...parseBoard(home, today), ...parseFeed(feed, today)].map((quote) => ({ ...quote, sourceId: "elmorshd" }));
}

export function parseEgyptBoard(html, today) {
  const stamp = html.match(/آخر تحديث تلقائي:\s*(\d{4}-\d{2}-\d{2})/);
  const priceDate = stamp?.[1] || today;
  const table = rows(html);
  const cell = (name) => table.find((item) => item[0]?.includes(name));
  const quotes = [];
  const white = numberValue(cell("اللحم الابيض")?.[1]);
  if (white) {
    quotes.push({
      commodity: "broiler_kg",
      price: white,
      unit: "جنيه/كجم",
      priceDate,
      sourceId: "egypoultry",
      sourceLabel: "دواجن مصر · اللحم الأبيض",
    });
  }
  const chick = numberValue(cell("معلن شركات الكتاكيت")?.[1]);
  if (chick) {
    quotes.push({
      commodity: "chick",
      price: chick,
      unit: "جنيه/كتكوت",
      priceDate,
      sourceId: "egypoultry",
      sourceLabel: "دواجن مصر · شركات الكتاكيت",
    });
  }
  const extras = [
    ["اللحم الساسو", "sasso_kg", "جنيه/كجم", "اللحم الساسو"],
    ["قطعان", "chick_flock", "جنيه/كتكوت", "كتكوت أبيض قطعان"],
    ["بيض ابيض", "egg_white", "جنيه", "بيض أبيض"],
    ["بيض احمر", "egg_red", "جنيه", "بيض أحمر"],
    ["بيض بلدي", "egg_baladi", "جنيه", "بيض بلدي"],
  ];
  for (const [name, commodity, unit, label] of extras) {
    const price = numberValue(cell(name)?.[1]);
    if (!price) continue;
    quotes.push({
      commodity,
      price,
      unit,
      priceDate,
      sourceId: "egypoultry",
      sourceLabel: `دواجن مصر · ${label}`,
    });
  }
  return quotes;
}

export async function fetchBoard(sourceId, today) {
  if (sourceId === "elmorshd") return fetchLiveQuotes(today);
  if (sourceId === "egypoultry") return parseEgyptBoard(await load("https://egypoultry.com/market/"), today);
  return [];
}
