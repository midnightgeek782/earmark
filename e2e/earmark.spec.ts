import { expect, test, type Page } from '@playwright/test';
import searchFixture from '../src/mb/fixtures/search-in-rainbows.json' with { type: 'json' };
import releasesFixture from '../src/mb/fixtures/releases-in-rainbows.json' with { type: 'json' };

// A 1x1 PNG so covers "load" without the network.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

async function stubNetwork(page: Page) {
  await page.route('https://musicbrainz.org/ws/2/release-group**', (r) => r.fulfill({ json: searchFixture }));
  await page.route('https://musicbrainz.org/ws/2/release?**', (r) => r.fulfill({ json: releasesFixture }));
  await page.route('https://coverartarchive.org/**', (r) =>
    r.fulfill({ body: PNG, contentType: 'image/png' }),
  );
  await page.route(/labs\.api\.listenbrainz\.org/, (r) =>
    r.fulfill({
      json: [{ artist_mbid: '8f6bd1e4-fbe1-4f50-aa9b-94c450ec0f11', name: 'Portishead', score: 100 }],
    }),
  );
  await page.route(/api\.listenbrainz\.org\/1\/popularity/, (r) =>
    r.fulfill({
      json: [
        {
          release_group_mbid: '48140466-cff6-3222-bd55-63c27e43190d',
          total_listen_count: 1000,
          release_group: { name: 'Dummy', type: 'Album', date: '1994-08-22' },
          artist: { artists: [{ name: 'Portishead', join_phrase: '' }] },
        },
      ],
    }),
  );
  await page.route(/wikidata\.org|wikipedia\.org/, (r) => r.fulfill({ json: {} }));
}

test.beforeEach(async ({ page }) => {
  await stubNetwork(page);
  await page.goto('./');
});

test('first open shows sample albums and explains them', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'For you', exact: true })).toBeVisible();
  await expect(page.getByText('These are samples')).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(6);
  await expect(page.getByRole('link', { name: /Priya/ }).first()).toBeVisible();
});

test('search, add, note who told you, and the samples step aside', async ({ page }) => {
  await page.getByLabel('Search albums').fill('in rainbows');
  await page
    .getByRole('button', { name: /In Rainbows\s+Radiohead/ })
    .first()
    .click();

  const sheet = page.getByRole('dialog', { name: 'Who told you about it?' });
  await expect(sheet).toBeVisible();
  await sheet.getByLabel('Who told you about it?').fill('Priya');
  await sheet.getByLabel(/What did they say/).fill('Track 3 is the one');
  await sheet.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.locator('.card').first()).toContainText('from Priya');
  await expect(page.getByText('These are samples')).toHaveCount(0);

  // Background lookup fills in length from the earliest complete official release.
  await page.locator('.card-link').first().click();
  await expect(page.getByText('42 min').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('“Track 3 is the one”')).toBeVisible();
  await expect(page.locator('.tracks li')).toHaveCount(2);
  await expect(page.locator('.tracks')).toContainText('Bodysnatchers');
});

test('adding the same album twice says it is already there', async ({ page }) => {
  for (let i = 0; i < 2; i++) {
    await page.getByLabel('Search albums').fill('in rainbows');
    await page
      .getByRole('button', { name: /In Rainbows\s+Radiohead/ })
      .first()
      .click();
    if (i === 0) await page.getByRole('button', { name: 'Skip' }).click();
  }
  await expect(page.getByText('In Rainbows is already on your list')).toBeVisible();
});

test('add by hand, mark listened with a verdict, and see it on People and Insights', async ({ page }) => {
  await page.getByLabel('Search albums').fill('zz');
  await page.route('https://musicbrainz.org/ws/2/release-group**', (r) =>
    r.fulfill({ json: { 'release-groups': [] } }),
  );
  await page.getByLabel('Search albums').fill('Homegrown tape');
  await page.getByRole('button', { name: 'Add by hand' }).click();
  await page.getByLabel('Artist').fill('Local Band');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('textbox', { name: 'Who told you about it?' }).fill('Dad');
  await page.getByRole('button', { name: 'Save' }).click();

  await page.locator('.card-link').first().click();
  await page.getByRole('button', { name: 'Mark as listened' }).click();
  await page.getByRole('button', { name: 'Loved it' }).click();
  await expect(page.getByRole('button', { name: 'Loved it' })).toHaveClass(/chip-on/);

  await page.getByRole('link', { name: 'People' }).first().click();
  await expect(page.locator('.person-card')).toContainText('Dad');
  await expect(page.locator('.person-card')).toContainText('1 loved');

  await page.getByRole('link', { name: 'Insights' }).click();
  await expect(page.locator('.stat').first()).toContainText('1');
});

test('Pick for me respects a time limit', async ({ page }) => {
  await page.getByRole('button', { name: 'Pick for me' }).click();
  const dialog = page.getByRole('dialog', { name: 'Pick for me' });
  await dialog.getByLabel(/minutes/).fill('40');
  await dialog.getByRole('button', { name: 'Pick', exact: true }).click();
  // Of the samples only Blue (36 min) fits in 40 minutes.
  await expect(dialog.locator('.pick-title')).toHaveText('Blue');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('remove shows Undo, and Undo brings the album back', async ({ page }) => {
  await page.getByRole('link', { name: /^To listen/ }).click();
  const first = page.locator('.card').first();
  const title = await first.locator('.card-title').innerText();
  await first.hover();
  await first.getByRole('button', { name: `Remove ${title}` }).click();
  await expect(page.locator('.card')).toHaveCount(5);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('.card')).toHaveCount(6);
});

test('export then import round-trips the list', async ({ page }) => {
  await page.getByLabel('Search albums').fill('in rainbows');
  await page
    .getByRole('button', { name: /In Rainbows\s+Radiohead/ })
    .first()
    .click();
  await page.getByRole('textbox', { name: 'Who told you about it?' }).fill('Priya');
  await page.getByRole('button', { name: 'Save' }).click();

  await page.getByRole('link', { name: 'Settings' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const file = await (await download).path();

  // Wipe and import into a clean list.
  await page.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.deleteDatabase('earmark');
        r.onsuccess = r.onerror = r.onblocked = () => res(null);
      }),
  );
  await page.reload();
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.locator('input[type=file]').setInputFiles(file!);
  await expect(page.getByText(/1 new/)).toBeVisible();
  await page.getByRole('button', { name: 'Import', exact: true }).last().click();
  await page.getByRole('link', { name: 'Albums' }).click();
  await expect(page.getByText('from Priya')).toBeVisible();
});

test('a bad import file explains what is wrong and imports nothing', async ({ page }) => {
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'earmark',
        formatVersion: 1,
        albums: [{ title: 'X', artist: 'Y', year: 1850 }],
      }),
    ),
  });
  await expect(page.getByText('Nothing was imported.')).toBeVisible();
  await expect(page.getByText(/year 1850 is outside/)).toBeVisible();
});

test('home shows a daily pick and shelves; starring adds to Listen soon', async ({ page }) => {
  await expect(page.locator('.tonight')).toBeVisible();
  const upNext = page.getByRole('region', { name: 'Listen soon' });
  await expect(upNext.locator('.shelf-card')).toHaveCount(1); // Kind of Blue sample is starred
  const discovery = page.locator('.card', { hasText: 'Discovery' });
  await discovery.hover();
  await discovery.getByRole('button', { name: 'Add Discovery to Listen soon' }).click();
  await expect(upNext.locator('.shelf-card')).toHaveCount(2);
});

test('tags: add on the album page, then filter the list by tag', async ({ page }) => {
  await page.locator('.card-link', { hasText: 'Blue' }).first().click();
  await page.getByLabel('Add a tag').fill('Rainy Day');
  await page.getByLabel('Add a tag').press('Enter');
  await expect(page.locator('.tag-editor')).toContainText('#rainy day');
  await page.goto('./#/list');
  await page
    .locator('.tag-filters')
    .getByRole('link', { name: /rainy day/ })
    .click();
  await expect(page.locator('.grid .card')).toHaveCount(1);
  await expect(page).toHaveURL(/tag=rainy/);
});

test('list view is remembered and Settings preferences apply', async ({ page }) => {
  await page.getByRole('link', { name: /^To listen/ }).click();
  await page.getByRole('radio', { name: 'List view' }).click();
  await expect(page.locator('.rows .row-item')).toHaveCount(6);
  await page.reload();
  await expect(page.locator('.rows .row-item')).toHaveCount(6);

  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByText('Shelves on the home page').click();
  await expect(page.getByRole('switch', { name: /Shelves on the home page/ })).not.toBeChecked();
  await page.goto('./#/');
  await expect(page.locator('.shelves')).toHaveCount(0);
});

test('delete everything needs the word DELETE', async ({ page }) => {
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Delete everything…' }).click();
  const confirm = page.getByRole('button', { name: 'Delete everything', exact: true });
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Type DELETE to confirm').fill('DELETE');
  await confirm.click();
  await page.getByRole('link', { name: 'Albums' }).click();
  await expect(page.getByText('Your list is clear')).toBeVisible();
});

test('Suggest an album shows albums like yours and adds one', async ({ page }) => {
  await page.getByRole('button', { name: 'Suggest an album' }).click();
  const sheet = page.getByRole('dialog', { name: 'Suggested albums' });
  await expect(sheet.locator('.suggestion')).toHaveCount(1);
  await expect(sheet).toContainText('Dummy');
  await expect(sheet).toContainText('Because');
  await sheet.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(sheet.getByRole('button', { name: 'Added' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: /^To listen/ }).click();
  await expect(page.locator('.grid .card', { hasText: 'Dummy' })).toBeVisible();
});

test('For you, To listen and Listened tabs switch sections', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'For you', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /^To listen/ }).click();
  await expect(page).toHaveURL(/#\/list/);
  await expect(page.getByRole('heading', { name: 'To listen' })).toBeVisible();
  await page.getByRole('link', { name: /^Listened/ }).click();
  await expect(page.getByText('Nothing heard yet')).toBeVisible();
});

test('the landing page links to the app and to GitHub', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Every album');
  await expect(page.getByRole('link', { name: /View on GitHub/ })).toHaveAttribute(
    'href',
    'https://github.com/midnightgeek782/earmark',
  );
  await page.getByRole('link', { name: /Open Earmark, it/ }).click();
  await expect(page).toHaveURL(/\/app\/$/);
  await expect(page.getByRole('heading', { name: 'For you', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'About Earmark' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Every album');
});
