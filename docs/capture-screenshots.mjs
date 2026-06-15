/**
 * Tar skärmdumpar för användarmanualen genom att köra igenom exempelklassen 9A.
 * Kör: node docs/capture-screenshots.mjs
 * Kräver att dev-servern körs på http://localhost:5173/Klassrumsplacering-v2/
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'images');
const BASE = 'http://localhost:5173/Klassrumsplacering-v2/';
const STORAGE_KEY = 'klassplacering_v2_data';

const STUDENTS = `Anna Andersson
Bertil Berg
Cecilia Carlsson
David Dahl
Erika Ek
Fredrik Fransson
Greta Gran
Henrik Hansson
Ingrid Isaksson
Jonas Johansson
Klara Karlsson
Lukas Larsson`;

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log('  ✓', name);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Acceptera bekräftelsedialoger automatiskt
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.goto(BASE);
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await page.waitForTimeout(800);

  // 01 – Tom start
  await shot(page, '01-start.png');

  // 02 – Skapa klass 9A
  await page.getByPlaceholder('Ny klass...').fill('9A');
  await page.waitForTimeout(300);
  await shot(page, '02-skapa-klass.png');

  await page.getByRole('button', { name: 'Skapa' }).click();
  await page.waitForTimeout(600);
  await shot(page, '03-klass-skapad.png');

  // 04 – Klistra in elevlista
  await page.getByRole('button', { name: /Klistra in lista/ }).click();
  await page.waitForTimeout(400);
  await page.locator('textarea').fill(STUDENTS);
  await page.waitForTimeout(300);
  await shot(page, '04-klistra-in-lista.png');

  await page.getByRole('button', { name: /Importera/ }).click();
  await page.waitForTimeout(700);
  await shot(page, '05-elever-lista.png');

  // 06 – Redigera elev (Anna – nära tavlan)
  await page.getByText('Anna Andersson', { exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByText('Måste sitta nära tavlan').click();
  await page.waitForTimeout(200);
  await shot(page, '06-redigera-elev.png');
  await page.getByRole('button', { name: 'Spara ändringar' }).click();
  await page.waitForTimeout(500);

  // Sätt behov på Bertil (vägg) och Cecilia (ensam)
  await page.getByText('Bertil Berg', { exact: true }).click();
  await page.getByText('Måste sitta vid vägg').click();
  await page.getByRole('button', { name: 'Spara ändringar' }).click();
  await page.waitForTimeout(400);

  await page.getByText('Cecilia Carlsson', { exact: true }).click();
  await page.getByText('Ska sitta ensam').click();
  await page.getByRole('button', { name: 'Spara ändringar' }).click();
  await page.waitForTimeout(500);
  await shot(page, '07-elever-med-behov.png');

  // 08 – Regler
  await page.getByRole('button', { name: 'Regler' }).click();
  await page.waitForTimeout(400);

  // Får ej: Anna & Bertil
  const s1 = page.locator('select').first();
  const s2 = page.locator('select').nth(1);
  await s1.selectOption({ label: 'Anna Andersson' });
  await s2.selectOption({ label: 'Bertil Berg' });
  await page.getByRole('button', { name: 'Spara regel' }).click();
  await page.waitForTimeout(500);

  // Ska sitta med: Erika & Fredrik
  await page.getByRole('button', { name: /Ska sitta bredvid/ }).click();
  await s1.selectOption({ label: 'Erika Ek' });
  await s2.selectOption({ label: 'Fredrik Fransson' });
  await page.getByRole('button', { name: 'Spara regel' }).click();
  await page.waitForTimeout(600);
  await shot(page, '08-regler.png');

  // 09 – Möblering
  await page.getByRole('button', { name: 'Placering' }).click();
  await page.waitForTimeout(600);

  // Säkerställ designläge
  const designBtn = page.getByRole('button', { name: /Ändra möblering|Klar med möblering/ });
  const designText = await designBtn.textContent();
  if (designText?.includes('Ändra')) {
    await designBtn.click();
    await page.waitForTimeout(400);
  }
  await shot(page, '09-moblering-design.png');

  // Traditionella rader
  await page.getByRole('button', { name: /Traditionella rader/ }).click();
  await page.waitForTimeout(800);
  await shot(page, '10-bankar-placerade.png');

  await page.getByRole('button', { name: /Klar med möblering/ }).click();
  await page.waitForTimeout(500);

  // 11 – Generera
  await page.getByRole('button', { name: 'Generera' }).click();
  await page.waitForTimeout(1500);
  await shot(page, '11-placering-genererad.png');

  // 12 – Spara i historik
  const planInput = page.getByPlaceholder(/T\.ex\.|v\./);
  if (await planInput.isVisible()) {
    await planInput.fill('9A – Vecka 12');
    await page.waitForTimeout(300);
    await shot(page, '12-forslag-spara.png');
    await page.getByRole('button', { name: 'Spara', exact: true }).last().click();
    await page.waitForTimeout(700);
  }

  // 13 – Historik
  await page.getByRole('button', { name: 'Historik' }).click();
  await page.waitForTimeout(600);
  await shot(page, '13-historik.png');

  // 14 – Header med filknappar
  await page.getByRole('button', { name: 'Elever' }).click();
  await page.waitForTimeout(400);
  await page.locator('header').screenshot({ path: path.join(OUT, '14-header.png') });
  console.log('  ✓ 14-header.png');

  await browser.close();
  console.log('\nKlart! Bilder sparade i docs/images/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
