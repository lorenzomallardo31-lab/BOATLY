import assert from "node:assert/strict";
import test from "node:test";

import { CustomerCsvError, parseCustomerCsv } from "../../src/lib/operator/customer-csv.ts";

test("parses Italian semicolon CSV, quotes and normalized fields", () => {
  const rows = parseCustomerCsv(
    '\uFEFFnome;email;telefono;paese;data_nascita;note\n"Rossi, Mario";MARIO@EXAMPLE.IT;+39 333 123 4567;it;20/06/1985;"Cliente; ricorrente"\n',
  );
  assert.deepEqual(rows, [{
    display_name: "Rossi, Mario",
    email: "mario@example.it",
    phone: "+39 333 123 4567",
    country_code: "IT",
    date_of_birth: "1985-06-20",
    notes: "Cliente; ricorrente",
  }]);
});

test("accepts common English headers and preserves embedded newlines", () => {
  const rows = parseCustomerCsv('name,email,phone,notes\nAnna,anna@example.it,,"prima riga\nseconda riga"\n');
  assert.equal(rows[0].display_name, "Anna");
  assert.equal(rows[0].notes, "prima riga\nseconda riga");
  assert.equal(rows[0].country_code, "IT");
});

test("rejects missing mandatory header groups", () => {
  assert.throws(() => parseCustomerCsv("email,telefono\na@b.it,3333333333\n"), (error) => error instanceof CustomerCsvError && error.code === "missing-name-column");
  assert.throws(() => parseCustomerCsv("nome,note\nMario,test\n"), (error) => error instanceof CustomerCsvError && error.code === "missing-contact-column");
});

test("rejects an unclosed quoted field", () => {
  assert.throws(() => parseCustomerCsv('nome,email\n"Mario,mario@example.it\n'), (error) => error instanceof CustomerCsvError && error.code === "unclosed-quote");
});
