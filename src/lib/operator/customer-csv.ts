export type CustomerImportRow = {
  display_name: string;
  email: string;
  phone: string;
  country_code: string;
  date_of_birth: string;
  notes: string;
};

export class CustomerCsvError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

function delimiterFor(input: string) {
  let quoted = false;
  let commas = 0;
  let semicolons = 0;
  for (const char of input) {
    if (char === '"') quoted = !quoted;
    if (!quoted && (char === "\n" || char === "\r")) break;
    if (!quoted && char === ",") commas += 1;
    if (!quoted && char === ";") semicolons += 1;
  }
  return semicolons > commas ? ";" : ",";
}

function parseCells(rawInput: string) {
  const input = rawInput.replace(/^\uFEFF/, "");
  const delimiter = delimiterFor(input);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (quoted) throw new CustomerCsvError("unclosed-quote");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function headerKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

const ALIASES: Record<string, keyof CustomerImportRow> = {
  nome: "display_name",
  nominativo: "display_name",
  denominazione: "display_name",
  name: "display_name",
  customer_name: "display_name",
  email: "email",
  e_mail: "email",
  telefono: "phone",
  cellulare: "phone",
  phone: "phone",
  tel: "phone",
  paese: "country_code",
  nazione: "country_code",
  country: "country_code",
  country_code: "country_code",
  data_nascita: "date_of_birth",
  data_di_nascita: "date_of_birth",
  date_of_birth: "date_of_birth",
  birth_date: "date_of_birth",
  note: "notes",
  notes: "notes",
};

function isoDate(value: string) {
  const italian = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return italian ? `${italian[3]}-${italian[2]}-${italian[1]}` : value;
}

export function parseCustomerCsv(input: string) {
  const rows = parseCells(input);
  if (rows.length < 2) throw new CustomerCsvError("empty-file");
  const header = rows[0].map((value) => ALIASES[headerKey(value)] ?? null);
  if (!header.includes("display_name")) throw new CustomerCsvError("missing-name-column");
  if (!header.includes("email") && !header.includes("phone")) throw new CustomerCsvError("missing-contact-column");
  if (rows.length - 1 > 500) throw new CustomerCsvError("too-many-rows");

  return rows.slice(1).map((cells) => {
    const result: CustomerImportRow = {
      display_name: "",
      email: "",
      phone: "",
      country_code: "IT",
      date_of_birth: "",
      notes: "",
    };
    header.forEach((key, index) => {
      if (key) result[key] = cells[index]?.trim() ?? "";
    });
    result.email = result.email.toLowerCase();
    result.country_code = (result.country_code || "IT").toUpperCase();
    result.date_of_birth = isoDate(result.date_of_birth);
    return result;
  });
}
