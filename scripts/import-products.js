const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const productsDir = path.join(rootDir, 'public', 'products');
const outputFile = path.join(rootDir, 'src', 'data', 'products.ts');
const reportFile = path.join(rootDir, 'scripts', 'import-products-report.json');
const expectedColumns = ['ID', 'NAME', 'CATEGORY', 'VOLTAGE', 'CURRENT', 'CAPACITY', 'CHEMISTRY', 'CONNECTOR', 'STOCK', 'PRICE'];

function findProductDataFile() {
  const candidates = fs
    .readdirSync(rootDir)
    .filter((file) => /^products\.csv$/i.test(file) || /^BatteryHub,pk\.xlsx$/i.test(file));

  const csv = candidates.find((file) => file.toLowerCase() === 'products.csv');
  return csv || candidates[0] || null;
}

function parseCsv(content) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      field = '';
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push(row);

  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.trim().toUpperCase());
  return rows.slice(1).map((values) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = (values[index] || '').trim();
    });
    return record;
  });
}

function readXlsxViaPowerShell(filePath) {
const psScript = String.raw`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Xml.Linq

function Read-ZipEntryText($zip, $entryName) {
  $entry = $zip.GetEntry($entryName)
  if ($null -eq $entry) { return $null }
  $stream = $entry.Open()
  try {
    $reader = [System.IO.StreamReader]::new($stream)
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
  } finally {
    $stream.Dispose()
  }
}

function Column-Index($cellRef) {
  $letters = ([regex]::Match($cellRef, '^[A-Z]+')).Value
  $index = 0
  foreach ($char in $letters.ToCharArray()) {
    $index = ($index * 26) + ([int][char]$char - [int][char]'A' + 1)
  }
  return $index - 1
}

$xlsxPath = $env:BATTERY_HUB_XLSX_PATH
if (-not $xlsxPath) { throw 'BATTERY_HUB_XLSX_PATH was not provided.' }
$zip = [System.IO.Compression.ZipFile]::OpenRead($xlsxPath)
try {
  $shared = @()
  $sharedXmlText = Read-ZipEntryText $zip 'xl/sharedStrings.xml'
  if ($sharedXmlText) {
    $sharedDoc = [System.Xml.Linq.XDocument]::Parse($sharedXmlText)
    $ns = $sharedDoc.Root.Name.Namespace
    foreach ($si in $sharedDoc.Root.Elements($ns + 'si')) {
      $shared += (($si.Descendants($ns + 't') | ForEach-Object { $_.Value }) -join '')
    }
  }

  $sheetXmlText = Read-ZipEntryText $zip 'xl/worksheets/sheet1.xml'
  if (-not $sheetXmlText) { throw 'Could not find xl/worksheets/sheet1.xml in workbook.' }
  $sheetDoc = [System.Xml.Linq.XDocument]::Parse($sheetXmlText)
  $sheetNs = $sheetDoc.Root.Name.Namespace

  $rows = @()
  foreach ($rowNode in $sheetDoc.Descendants($sheetNs + 'row')) {
    $values = @{}
    foreach ($cell in $rowNode.Elements($sheetNs + 'c')) {
      $cellRef = $cell.Attribute('r').Value
      $colIndex = Column-Index $cellRef
      $typeAttr = $cell.Attribute('t')
      $type = if ($typeAttr) { $typeAttr.Value } else { '' }
      $valueNode = $cell.Element($sheetNs + 'v')
      $value = ''

      if ($type -eq 's' -and $valueNode) {
        $sharedIndex = [int]$valueNode.Value
        if ($sharedIndex -lt $shared.Count) { $value = $shared[$sharedIndex] }
      } elseif ($type -eq 'inlineStr') {
        $value = (($cell.Descendants($sheetNs + 't') | ForEach-Object { $_.Value }) -join '')
      } elseif ($valueNode) {
        $value = $valueNode.Value
      }

      $values[$colIndex] = $value
    }

    if ($values.Count -gt 0) {
      $max = ($values.Keys | Measure-Object -Maximum).Maximum
      $rowValues = for ($i = 0; $i -le $max; $i++) {
        if ($values.ContainsKey($i)) { [string]$values[$i] } else { '' }
      }
      $rows += ,$rowValues
    }
  }

  if ($rows.Count -eq 0) { @() | ConvertTo-Json -Compress; exit }
  $headers = $rows[0] | ForEach-Object { ([string]$_).Trim().ToUpperInvariant() }
  $records = @()
  for ($r = 1; $r -lt $rows.Count; $r++) {
    $record = [ordered]@{}
    for ($c = 0; $c -lt $headers.Count; $c++) {
      if ($headers[$c]) {
        $record[$headers[$c]] = if ($c -lt $rows[$r].Count) { ([string]$rows[$r][$c]).Trim() } else { '' }
      }
    }
    $records += [pscustomobject]$record
  }

  $records | ConvertTo-Json -Depth 5 -Compress
} finally {
  $zip.Dispose()
}
`;

  const output = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
    {
      encoding: 'utf8',
      env: { ...process.env, BATTERY_HUB_XLSX_PATH: filePath },
      maxBuffer: 1024 * 1024 * 10,
    },
  );
  const parsed = JSON.parse(output || '[]');
  return Array.isArray(parsed) ? parsed : [parsed];
}

function readRows(filePath) {
  let rows;

  if (/\.csv$/i.test(filePath)) {
    rows = parseCsv(fs.readFileSync(filePath, 'utf8'));
  } else if (/\.xlsx$/i.test(filePath)) {
    rows = readXlsxViaPowerShell(filePath);
  } else {
    throw new Error(`Unsupported product data file: ${filePath}`);
  }

  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, cleanImportedText(value)]),
    ),
  );
}

function cleanImportedText(value) {
  return String(value || '')
    .replace(/Â±/g, '±')
    .replace(/Â/g, '')
    .replace(/â€“|â€”/g, '-')
    .replace(/â€™/g, "'")
    .trim();
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function imageMatchKey(value) {
  return slugify(value)
    .replace(/-box-\d*$/g, '')
    .replace(/-box$/g, '')
    .replace(/-\d+$/g, '')
    .replace(/-adapter$/g, '')
    .replace(/-batteries/g, '-battery');
}

function publicProductPath(fileName) {
  return `/products/${encodeURIComponent(fileName)}`;
}

function imagePriority(fileName) {
  const lower = fileName.toLowerCase();
  let score = 0;

  if (!/\bbox\b/.test(lower)) score += 30;
  if (!/\([^)]*\)/.test(lower)) score += 20;
  if (/battery|charger|adapter|bms|power[-\s]?supply/.test(lower)) score += 10;

  return score;
}

function getImages() {
  if (!fs.existsSync(productsDir)) return [];
  return fs
    .readdirSync(productsDir)
    .filter((file) => /\.(jpe?g|png|webp)$/i.test(file))
    .map((file) => ({
      file,
      base: path.basename(file, path.extname(file)),
      slug: slugify(path.basename(file, path.extname(file))),
      key: imageMatchKey(path.basename(file, path.extname(file))),
      specs: extractSpecTokenGroups(path.basename(file, path.extname(file))),
    }));
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function sortImageFiles(files) {
  return unique(files).sort((a, b) => imagePriority(b) - imagePriority(a) || a.localeCompare(b));
}

const priceCorrections = {
  'CHG-TP4056-HW107': '250',
};

function normalizeCategory(rawCategory, name, id = '') {
  const haystack = `${rawCategory || ''} ${name || ''} ${id || ''}`.toLowerCase();

  if (/\bbms\b|battery management|protection board/.test(haystack)) return 'bms-boards';
  if (/charger|charging/.test(haystack)) return 'chargers';
  if (/adapter|adaptor/.test(haystack)) return 'adapters';
  if (/power\s*supply|smps|transformer|led\s*driver|\bsupply\b/.test(haystack)) return 'power-supplies';
  if (/battery|cell|li[-\s]?ion|lithium|lipo|mah/.test(haystack)) return 'batteries';

  return null;
}

function correctedPrice(row) {
  const id = String(row.ID || '').trim().toUpperCase();
  return priceCorrections[id] || row.PRICE;
}

function formatPrice(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Price on WhatsApp';
  const cleaned = raw.replace(/rs\.?|pkr|,/gi, '').trim();
  if (/^\d+(?:\.\d+)?$/.test(cleaned)) {
    return `Rs. ${Number(cleaned).toLocaleString('en-PK')}`;
  }
  return raw;
}

function specValue(value) {
  const raw = String(value || '').trim();
  return raw || 'To be updated';
}

function makeSpecs(row) {
  return [
    `Voltage: ${specValue(row.VOLTAGE)}`,
    `Current: ${specValue(row.CURRENT)}`,
    `Capacity / Power: ${specValue(row.CAPACITY)}`,
    `Chemistry / Type: ${specValue(row.CHEMISTRY)}`,
    `Connector: ${specValue(row.CONNECTOR)}`,
  ];
}

function makeDescription(product, row) {
  const listed = [
    row.VOLTAGE ? `voltage ${row.VOLTAGE}` : '',
    row.CURRENT ? `current ${row.CURRENT}` : '',
    row.CAPACITY ? `capacity/power ${row.CAPACITY}` : '',
    row.CHEMISTRY ? `chemistry/type ${row.CHEMISTRY}` : '',
    row.CONNECTOR ? `connector ${row.CONNECTOR}` : '',
  ].filter(Boolean);
  const listedText = listed.length ? ` It includes ${listed.join(', ')} as listed.` : '';

  if (product.category === 'power-supplies') {
    return `${product.name} suitable for LED strips, electronics testing, CCTV, repair, and project use.${listedText} Please confirm voltage, current rating, wiring, and load requirement before ordering.`;
  }
  if (product.category === 'adapters') {
    return `${product.name} suitable for low-power electronics and device powering.${listedText} Please confirm voltage, current rating, connector size, and polarity before ordering.`;
  }
  if (product.category === 'batteries') {
    return `${product.name} rechargeable battery product for electronics and project use.${listedText} Please confirm voltage, capacity, charger compatibility, and safety requirements before ordering.`;
  }
  if (product.category === 'chargers') {
    return `${product.name} charging product for compatible batteries and devices.${listedText} Please confirm battery voltage and chemistry before ordering.`;
  }
  if (product.category === 'bms-boards') {
    return `${product.name} BMS/protection board for lithium battery pack applications.${listedText} Please confirm cell count, current rating, and battery chemistry before ordering.`;
  }

  return `${product.name} suitable for electronics, project, repair, and power applications.${listedText} Please confirm compatibility before ordering.`;
}

function safetyNote(category) {
  const notes = {
    batteries:
      'Use compatible charger only. Do not short-circuit. Do not overcharge or over-discharge. Confirm voltage and capacity before order.',
    chargers: 'Use only with compatible battery voltage and chemistry.',
    'power-supplies': 'Confirm voltage, current rating, wiring, and load requirement before order.',
    adapters: 'Confirm voltage, current rating, connector size, and polarity before order.',
    'bms-boards': 'Confirm cell count, battery chemistry, wiring sequence, and current rating before use.',
  };
  return notes[category] || 'Confirm specs, compatibility, and wiring before order.';
}

function normalizeSpecToken(value, unit) {
  const normalized = String(value || '').replace(',', '.').replace(/\.$/, '').replace(/\./g, '-').toLowerCase();
  return `${normalized}${unit}`;
}

function collectMatches(source, regex, formatter) {
  const values = new Set();
  let match = regex.exec(source);

  while (match) {
    if (match[1]) values.add(formatter(match[1]));
    match = regex.exec(source);
  }

  return Array.from(values);
}

function expandRangeTokens(tokens, unit) {
  const expanded = new Set(tokens);

  tokens.forEach((token) => {
    const rangeMatch = token.match(new RegExp(`^(\\d+(?:-\\d+)?)-(\\d+(?:-\\d+)?)${unit}$`));
    if (rangeMatch) {
      expanded.add(`${rangeMatch[1]}${unit}`);
      expanded.add(`${rangeMatch[2]}${unit}`);
    }
  });

  return Array.from(expanded);
}

function extractSpecTokenGroups(source) {
  const voltage = collectMatches(source, /(\d+(?:[\.,]\d+)?)\s*v\b/gi, (value) =>
    normalizeSpecToken(value, 'v'),
  );
  const current = collectMatches(source, /(\d+(?:[\.,]\d+)?)\s*a\b/gi, (value) =>
    normalizeSpecToken(value, 'a'),
  );
  const capacity = expandRangeTokens(
    collectMatches(source, /(\d+(?:[\.,]\d+)?(?:\s*-\s*\d+(?:[\.,]\d+)?)?)\s*mah\b/gi, (value) =>
      normalizeSpecToken(value.replace(/\s+/g, ''), 'mah'),
    ),
    'mah',
  );
  const power = collectMatches(source, /(\d+(?:[\.,]\d+)?)\s*w\b/gi, (value) =>
    normalizeSpecToken(value, 'w'),
  );
  const cellCount = collectMatches(source, /(\d+)\s*s\b/gi, (value) => `${value.toLowerCase()}s`);

  return { voltage, current, capacity, power, cellCount };
}

function inferBatteryCapacityTokens(source) {
  return collectMatches(source, /(?:^|[-_\s])(\d{3,5})(?=$|[-_\s])/g, (value) => `${value.toLowerCase()}mah`);
}

function countExactMatches(sourceTokens, imageTokens) {
  return sourceTokens.filter((token) => imageTokens.includes(token)).length;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasDelimitedToken(imageText, token) {
  const pattern = new RegExp(`(^|[-\\s])${escapeRegex(token)}(?=$|[-\\s])`);
  return pattern.test(imageText);
}

function countTokenMatches(imageText, tokens) {
  return tokens.filter((token) => hasDelimitedToken(imageText, token)).length;
}

function categoryTokens(category) {
  const tokens = {
    batteries: ['battery', 'batteries', 'cell', 'li', 'lipo', 'nicd'],
    chargers: ['charger', 'charging'],
    'power-supplies': ['power-supply', 'supply', 'driver', 'smps'],
    adapters: ['adapter', 'adaptor', 'brick'],
    'bms-boards': ['bms'],
  };
  return tokens[category] || [];
}

function chemistryTokens(source) {
  const lower = source.toLowerCase();
  const tokens = [];

  if (/lipo|lithium\s*polymer/.test(lower)) tokens.push('lipo', 'lithium-polymer', 'li');
  if (/li[-\s]?ion|lithium\s*ion/.test(lower)) tokens.push('li-ion', 'lithium-ion', 'li');
  if (/\bli\b/.test(lower)) tokens.push('li');
  if (/ni[-\s]?cd|nicd/.test(lower)) tokens.push('ni-cd', 'nicd');
  if (/18650/.test(lower)) tokens.push('18650');
  if (/21700/.test(lower)) tokens.push('21700');

  return unique(tokens);
}

function importantWords(source) {
  const stopWords = new Set([
    'with',
    'for',
    'and',
    'the',
    'max',
    'input',
    'output',
    'power',
    'battery',
    'supply',
    'adapter',
    'charger',
    'lithium',
  ]);

  return unique(
    slugify(source)
      .split('-')
      .filter((word) => word.length > 2 && !stopWords.has(word) && !/^\d+$/.test(word)),
  );
}

function specMatchScore(row, image, category) {
  const source = `${row.ID || ''} ${row.NAME || ''} ${row.VOLTAGE || ''} ${row.CURRENT || ''} ${
    row.CAPACITY || ''
  } ${row.CHEMISTRY || ''} ${row.CATEGORY || ''}`;
  const imageText = `${image.slug} ${image.key}`;
  const sourceSpecs = extractSpecTokenGroups(source);
  if (category === 'batteries' && sourceSpecs.capacity.length === 0) {
    sourceSpecs.capacity = inferBatteryCapacityTokens(`${row.ID || ''} ${row.NAME || ''}`);
  }
  const imageSpecs = image.specs || extractSpecTokenGroups(image.base);
  const typeTokenMatches = countTokenMatches(imageText, categoryTokens(category));
  const voltageMatches = countExactMatches(sourceSpecs.voltage, imageSpecs.voltage);
  const currentMatches = countExactMatches(sourceSpecs.current, imageSpecs.current);
  const capacityMatches = countExactMatches(sourceSpecs.capacity, imageSpecs.capacity);
  const powerMatches = countExactMatches(sourceSpecs.power, imageSpecs.power);
  const sourceChemistryTokens = chemistryTokens(source);
  const imageChemistryTokens = chemistryTokens(image.base);
  const chemistryMatches = countTokenMatches(imageText, sourceChemistryTokens);
  const cellCountMatches = countExactMatches(sourceSpecs.cellCount, imageSpecs.cellCount);
  const wordMatches = countTokenMatches(imageText, importantWords(`${row.ID || ''} ${row.NAME || ''}`));

  if (category === 'batteries') {
    const voltageOk =
      sourceSpecs.voltage.length > 0 && imageSpecs.voltage.length > 0
        ? voltageMatches > 0
        : voltageMatches > 0 || chemistryMatches > 0;

    if (capacityMatches > 0 && voltageOk && typeTokenMatches > 0) {
      return capacityMatches * 12 + voltageMatches * 8 + chemistryMatches * 4 + typeTokenMatches * 2;
    }
    return 0;
  }

  if (category === 'power-supplies') {
    if (voltageMatches > 0 && (currentMatches > 0 || powerMatches > 0) && typeTokenMatches > 0) {
      return voltageMatches * 10 + currentMatches * 10 + powerMatches * 6 + typeTokenMatches * 2;
    }
    return 0;
  }

  if (category === 'adapters') {
    if (voltageMatches > 0 && currentMatches > 0 && typeTokenMatches > 0) {
      return voltageMatches * 10 + currentMatches * 10 + typeTokenMatches * 4 + wordMatches;
    }
    return 0;
  }

  if (category === 'chargers') {
    if (typeTokenMatches > 0 && (voltageMatches > 0 || currentMatches > 0 || chemistryMatches > 0 || wordMatches >= 2)) {
      return typeTokenMatches * 8 + voltageMatches * 6 + currentMatches * 6 + chemistryMatches * 3 + wordMatches;
    }
    return 0;
  }

  if (category === 'bms-boards') {
    if (typeTokenMatches > 0 && (cellCountMatches > 0 || currentMatches > 0 || chemistryMatches > 0)) {
      return typeTokenMatches * 10 + cellCountMatches * 8 + currentMatches * 6 + chemistryMatches * 3;
    }
    return 0;
  }

  return wordMatches >= 3 ? wordMatches : 0;
}

function matchImages(row, images) {
  const id = String(row.ID || '').trim();
  const name = String(row.NAME || '').trim();
  const category = normalizeCategory(row.CATEGORY, name, id);
  if (!category) return [];
  const idSlug = slugify(id);
  const nameSlug = slugify(name);
  const idKey = imageMatchKey(id);
  const nameKey = imageMatchKey(name);

  let matched = images.filter((image) => idSlug && image.slug.toLowerCase() === idSlug.toLowerCase());
  if (matched.length === 0) {
    matched = images.filter((image) => idKey && image.key.toLowerCase() === idKey.toLowerCase());
  }
  if (matched.length === 0) {
    matched = images.filter((image) => nameSlug && image.slug.toLowerCase() === nameSlug.toLowerCase());
  }
  if (matched.length === 0) {
    matched = images.filter((image) => nameKey && image.key.toLowerCase() === nameKey.toLowerCase());
  }
  if (matched.length === 0) {
    matched = images
      .map((image) => ({ image, score: specMatchScore(row, image, category) }))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score || imagePriority(b.image.file) - imagePriority(a.image.file))
      .map((candidate) => candidate.image);
  }
  if (matched.length === 0 && nameKey.length >= 10) {
    matched = images.filter(
      (image) =>
        image.key.length >= 10 &&
        (image.key.includes(nameKey) || nameKey.includes(image.key)),
    );
  }

  return sortImageFiles(matched.map((image) => image.file));
}

function validateRows(rows) {
  const rowColumns = Object.keys(rows[0] || {});
  const missing = expectedColumns.filter((column) => !rowColumns.includes(column));
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }
}

function writeProducts(products) {
  const body = `import { Product } from '@/types';

export const products: Product[] = ${JSON.stringify(products, null, 2)};

export const getProductsByCategory = (category: Product['category']) =>
  products.filter((product) => product.category === category);

export const getProductBySlugOrId = (slugOrId: string) =>
  products.find((product) => product.slug === slugOrId || product.id === slugOrId);

export const categoryLabels: Record<Product['category'], string> = {
  batteries: 'Batteries',
  chargers: 'Chargers',
  'power-supplies': 'Power Supplies',
  adapters: 'Adapters',
  'bms-boards': 'BMS Boards',
};

export const productImageCount = ${products.reduce((count, product) => count + product.images.length, 0)};
`;

  fs.writeFileSync(outputFile, body, 'utf8');
}

function tokenLabel(token) {
  return String(token || '')
    .replace(/-/g, '.')
    .replace(/mah$/i, 'mAh')
    .replace(/([avw])$/i, (match) => match.toUpperCase());
}

function outputVoltageToken(product) {
  const text = product.specs.join(' ');
  const outputMatch = text.match(/output[^|:]*?(?:dc\s*)?(\d+(?:[\.,]\d+)?)\s*v/i);
  if (outputMatch) return normalizeSpecToken(outputMatch[1], 'v');

  const voltage = extractSpecTokenGroups(text).voltage;
  return voltage[voltage.length - 1] || '';
}

function productCoreTokens(product) {
  const tokens = extractSpecTokenGroups(product.specs.join(' '));
  if (product.category === 'power-supplies') {
    tokens.voltage = outputVoltageToken(product) ? [outputVoltageToken(product)] : tokens.voltage;
  }
  return tokens;
}

function duplicateKey(product) {
  const tokens = productCoreTokens(product);
  const primaryImage = product.image === '/products/placeholder.svg' ? '' : product.image;

  if (product.category === 'power-supplies') {
    return [product.category, tokens.voltage[0] || '', tokens.power[0] || '', product.price].join('|');
  }

  if (product.category === 'batteries') {
    return [product.category, primaryImage, tokens.voltage[0] || '', tokens.capacity[0] || '', product.price].join('|');
  }

  if (primaryImage) {
    return [product.category, primaryImage, product.price].join('|');
  }

  return [product.category, product.id].join('|');
}

function mergedProductName(products) {
  const base = products[0];
  if (products.length === 1) return base.name;

  const tokens = productCoreTokens(base);
  if (base.category === 'power-supplies') {
    const voltage = tokenLabel(tokens.voltage[0]);
    const power = tokenLabel(tokens.power[0]);
    if (voltage && power) return `${voltage} ${power} Power Supply`;
  }

  if (base.category === 'batteries') {
    const voltage = tokenLabel(tokens.voltage[0]);
    const capacity = tokenLabel(tokens.capacity[0]);
    const specText = products.map((product) => product.specs.join(' ')).join(' ').toLowerCase();
    const chemistry = /lipo|polymer/.test(specText)
      ? 'LiPo'
      : /li[-\s]?ion|lithium/.test(specText)
        ? 'Li-ion'
        : /ni[-\s]?cd|nickel/.test(specText)
          ? 'Ni-Cd'
          : '';
    if (voltage && capacity) return `${voltage} ${capacity} ${chemistry} Battery`.replace(/\s+/g, ' ').trim();
  }

  return base.name;
}

function priceRange(products) {
  const prices = unique(products.map((product) => product.price));
  if (prices.length === 1) return prices[0];
  const numericPrices = prices
    .map((price) => Number(String(price).replace(/rs\.?|pkr|,/gi, '').trim()))
    .filter((price) => Number.isFinite(price));
  if (numericPrices.length === prices.length) {
    const min = Math.min(...numericPrices).toLocaleString('en-PK');
    const max = Math.max(...numericPrices).toLocaleString('en-PK');
    return `Rs. ${min} - Rs. ${max}`;
  }
  return 'Confirm on WhatsApp';
}

function mergedStockStatus(products) {
  const statuses = unique(products.map((product) => product.stockStatus));
  return statuses.length === 1 ? statuses[0] : 'Confirm on WhatsApp';
}

function mergedSpecs(products) {
  const base = products[0];
  if (products.length === 1) return base.specs;

  const tokens = productCoreTokens(base);
  const allSpecs = products.flatMap((product) => product.specs);
  const specText = allSpecs.join(' ');
  const currentTokens = unique(products.flatMap((product) => productCoreTokens(product).current));

  if (base.category === 'power-supplies') {
    return [
      `Voltage: ${tokenLabel(tokens.voltage[0]) || 'To be updated'} output`,
      `Current: ${currentTokens.map(tokenLabel).join(' / ') || 'To be updated'} max output`,
      `Capacity / Power: ${tokenLabel(tokens.power[0]) || 'To be updated'} total output power`,
      'Chemistry / Type: Switch Mode Power Supply',
      'Connector: Options vary by stock; confirm on WhatsApp',
    ];
  }

  if (base.category === 'batteries') {
    const chemistry = /lipo|polymer/i.test(specText)
      ? 'LiPo'
      : /li[-\s]?ion|lithium/i.test(specText)
        ? 'Li-ion'
        : /ni[-\s]?cd|nickel/i.test(specText)
          ? 'Ni-Cd'
          : 'To be updated';
    return [
      `Voltage: ${tokenLabel(tokens.voltage[0]) || 'To be updated'}`,
      'Current: To be confirmed based on use',
      `Capacity / Power: ${tokenLabel(tokens.capacity[0]) || 'To be updated'}`,
      `Chemistry / Type: ${chemistry}`,
      'Connector: Options vary by stock; confirm on WhatsApp',
    ];
  }

  return base.specs;
}

function mergeDuplicateProducts(products) {
  const groups = new Map();
  products.forEach((product) => {
    const key = duplicateKey(product);
    groups.set(key, [...(groups.get(key) || []), product]);
  });

  const mergedGroups = [];
  const mergedProducts = Array.from(groups.values()).map((group) => {
    if (group.length === 1) return group[0];

    const base = group[0];
    const name = mergedProductName(group);
    const ids = unique(group.map((product) => product.id));
    const images = sortImageFiles(group.flatMap((product) => product.images));
    const specs = mergedSpecs(group);
    const product = {
      ...base,
      id: ids[0],
      slug: slugify(name) || base.slug,
      name,
      image: images[0] || base.image,
      images,
      price: priceRange(group),
      stockStatus: mergedStockStatus(group),
      specs,
      description: `${name} combined listing for matching Battery HUB catalog entries. Confirm the exact connector, casing, and stock variant on WhatsApp before ordering.`,
      whatsappText: `Assalam o Alaikum, I want to order ${name}. Product ID: ${ids.join(', ')}. Please confirm price and availability.`,
    };

    mergedGroups.push({ ids, name: product.name });
    return product;
  });

  const slugCounts = new Map();
  mergedProducts.forEach((product, index) => {
    const baseSlug = product.slug || slugify(product.name) || `product-${index + 1}`;
    const count = (slugCounts.get(baseSlug) || 0) + 1;
    slugCounts.set(baseSlug, count);
    product.slug = count === 1 ? baseSlug : `${baseSlug}-${count}`;
    product.featured = index < 12;
  });

  return { products: mergedProducts, mergedGroups };
}

function buildProducts(rows, images) {
  const slugCounts = new Map();
  const skippedProducts = [];
  const priceOverrides = [];

  const rawProducts = rows
    .filter((row) => String(row.ID || row.NAME || '').trim())
    .flatMap((row, index) => {
      const id = String(row.ID || '').trim() || `PRODUCT-${index + 1}`;
      const name = String(row.NAME || '').trim() || id;
      const category = normalizeCategory(row.CATEGORY, name, id);
      if (!category) {
        skippedProducts.push({ id, name, reason: 'Could not normalize category' });
        return [];
      }

      const baseSlug = slugify(id) || slugify(name) || `product-${index + 1}`;
      const count = (slugCounts.get(baseSlug) || 0) + 1;
      slugCounts.set(baseSlug, count);
      const slug = count === 1 ? baseSlug : `${baseSlug}-${count}`;
      const matchedImages = matchImages(row, images);
      const imagePaths = matchedImages.length > 0 ? matchedImages.map(publicProductPath) : ['/products/placeholder.svg'];
      const priceSource = correctedPrice(row);
      if (String(priceSource) !== String(row.PRICE || '')) {
        priceOverrides.push({ id, name, spreadsheetPrice: row.PRICE || '', usedPrice: priceSource });
      }
      const product = {
        id,
        slug,
        name,
        category,
        image: imagePaths[0],
        images: imagePaths,
        price: formatPrice(priceSource),
        availability: 'Available in Islamabad & Rawalpindi',
        stockStatus: String(row.STOCK || '').trim() || 'Confirm on WhatsApp',
        specs: makeSpecs(row),
        description: '',
        whatsappText: `Assalam o Alaikum, I want to order ${name}. Product ID: ${id}. Please confirm price and availability.`,
        safetyNote: safetyNote(category),
        featured: index < 12,
      };
      product.description = makeDescription(product, row);
      return [product];
    });

  return {
    ...mergeDuplicateProducts(rawProducts),
    skippedProducts,
    priceOverrides,
  };
}

function main() {
  const dataFile = findProductDataFile();
  if (!dataFile) {
    throw new Error('No product data file found. Expected BatteryHub,pk.xlsx or products.csv in project root.');
  }

  const dataPath = path.join(rootDir, dataFile);
  const rows = readRows(dataPath);
  validateRows(rows);

  const images = getImages();
  const { products, mergedGroups, skippedProducts, priceOverrides } = buildProducts(rows, images);
  writeProducts(products);

  const missingImages = products
    .filter((product) => product.image === '/products/placeholder.svg')
    .map((product) => ({ id: product.id, name: product.name }));
  const missingSpecs = products
    .filter((product) => product.specs.some((spec) => spec.includes('To be updated')))
    .map((product) => ({ id: product.id, name: product.name, specs: product.specs.filter((spec) => spec.includes('To be updated')) }));
  const categoryCounts = products.reduce((counts, product) => {
    counts[product.category] = (counts[product.category] || 0) + 1;
    return counts;
  }, {});
  const matchedProductCount = products.filter((product) => product.image !== '/products/placeholder.svg').length;
  const matchedImagePaths = products.flatMap((product) =>
    product.images.filter((image) => image !== '/products/placeholder.svg'),
  );

  const report = {
    dataFile,
    rowCount: rows.length,
    importedProducts: products.length,
    imagesAvailable: images.length,
    matchedImageCount: matchedProductCount,
    matchedProductCount,
    uniqueMatchedImageCount: new Set(matchedImagePaths).size,
    matchedImageAssignmentCount: matchedImagePaths.length,
    missingImages,
    missingSpecs,
    categoryCounts,
    mergedGroups,
    skippedProducts,
    priceOverrides,
  };

  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

main();
