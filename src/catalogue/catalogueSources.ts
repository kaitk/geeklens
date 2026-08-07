/** Reviewed processor facts and the sources that state them.
 *
 * Publisher tiers, the hosts that block automated retrieval, and what to do with
 * a citation that has rotted are in `docs/processor-catalogue-sources.md`. Read
 * it before re-dating a `retrievedOn` or swapping a URL: the date means the page
 * was read and still stated the claim, so moving it forward without re-reading
 * removes the only check these facts have.
 */
import type { CatalogueSource } from './catalogue.types';

export const PROCESSOR_CATALOGUE_SOURCE = {
  url: 'https://browser.geekbench.com/processor-benchmarks',
  retrievedOn: '2026-08-07',
  generation: 7,
  minimumUniqueResults: 5,
} as const;

export const MAC_CATALOGUE_SOURCE = {
  urls: [
    'https://browser.geekbench.com/macs/mac-mini-2024-12c-cpu',
    'https://browser.geekbench.com/macs/macbook-pro-14-inch-2024-12c-cpu',
  ],
  retrievedOn: '2026-08-07',
  generation: 7,
} as const;

/** The former AnandTech citation 301-redirects to an unrelated Tom's Hardware
 * pre-launch news post that does not contain the claim, so it can no longer
 * support the M1 Pro LPDDR5-6400 / 256-bit exception. This page states the
 * memory type, bus width, and bandwidth together. */
export const APPLE_M1_PRO_MEMORY_SOURCE: CatalogueSource = {
  url: 'https://www.notebookcheck.net/Apple-M1-Pro-14-Core-GPU-Benchmarks-and-Specs.576651.0.html',
  retrievedOn: '2026-08-01',
  publisher: 'Notebookcheck',
};

export const APPLE_M1_ULTRA_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2022/03/apple-unveils-m1-ultra-the-worlds-most-powerful-chip-for-a-personal-computer/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

export const APPLE_M2_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2022/06/apple-unveils-m2-with-breakthrough-performance-and-capabilities/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

export const APPLE_M2_PRO_MAX_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2023/01/apple-unveils-m2-pro-and-m2-max-next-generation-chips-for-next-level-workflows/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

export const APPLE_M2_ULTRA_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2023/06/apple-introduces-m2-ultra/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

export const APPLE_M3_ULTRA_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2025/03/apple-reveals-m3-ultra-taking-apple-silicon-to-a-new-extreme/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

export const APPLE_M4_FAMILY_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2024/10/new-macbook-pro-features-m4-family-of-chips-and-apple-intelligence/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

export const APPLE_M4_PRO_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/uk/newsroom/2024/10/apples-new-mac-mini-is-more-mighty-more-mini-and-built-for-apple-intelligence/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

export const APPLE_M4_PRO_MAX_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

export const APPLE_M5_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

export const APPLE_M5_PRO_MAX_SOURCE: CatalogueSource = {
  url: 'https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/',
  retrievedOn: '2026-08-01',
  publisher: 'Apple',
};

/** Apple publishes only the headline bin of each chip in its newsroom posts, so
 * the binned configurations come from this per-generation summary, which cites
 * the primary sources. It also records the M5 rename that the October 2025 M5
 * post predates. */
export const WIKIPEDIA_APPLE_M5_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Apple_M5',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

/** Apple publishes unified-memory bandwidth only for chips it chose to headline,
 * and never publishes memory type, transfer rate, or bus width for any of them.
 * These pages carry the remaining figures. They are a weaker tier than the
 * first-party sources above, which is why the publisher is named explicitly in
 * the provenance tooltip rather than blended into an `Apple` attribution. */
export const WIKIPEDIA_APPLE_M1_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Apple_M1',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

export const WIKIPEDIA_APPLE_M2_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Apple_M2',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

export const WIKIPEDIA_APPLE_M3_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Apple_M3',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

export const WIKIPEDIA_APPLE_M4_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Apple_M4',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

/** Core-type splits for x86 hybrids come from the same weaker tier.
 *
 * AMD markets Strix Point as a flat core count and does not publish the
 * Zen 5 / Zen 5c division on its product pages. Intel ARK does list P-core and
 * E-core counts as separate fields, but serves 403 to automated retrieval, and a
 * page that cannot be retrieved must not be cited as though it had been. These
 * tables state the split for both vendors and the publisher stays visible in the
 * provenance tooltip. */
export const WIKIPEDIA_ZEN_5_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Zen_5',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

/** The Zen 4 article carries no per-SKU cache table; this section of the Ryzen
 * list is where the Raphael figures actually are. */
export const WIKIPEDIA_ZEN_4_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/List_of_AMD_Ryzen_processors#Raphael_(7000_series,_Zen_4/RDNA2_based)',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

export const WIKIPEDIA_ALDER_LAKE_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Alder_Lake',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

export const WIKIPEDIA_RAPTOR_LAKE_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Raptor_Lake',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

export const WIKIPEDIA_ARROW_LAKE_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Arrow_Lake_(microprocessor)',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

export const WIKIPEDIA_METEOR_LAKE_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Meteor_Lake',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

export const WIKIPEDIA_LUNAR_LAKE_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Lunar_Lake',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

export const WIKIPEDIA_PANTHER_LAKE_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/Panther_Lake_(microprocessor)',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

export const QUALCOMM_X2_SOURCE: CatalogueSource = {
  url: 'https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-X2-Elite-Product-Brief.pdf',
  retrievedOn: '2026-08-01',
  publisher: 'Qualcomm',
};

/** The X Series product briefs state each SKU's core count in a single `Cores`
 * column with no tier rows, which is how they record that these parts are
 * uniform Oryon designs rather than hybrids. The X2 brief above adds separate
 * `Prime Cores` and `Performance Cores` rows, which is the split this
 * generation introduced. */
export const QUALCOMM_X1_ELITE_BRIEF_SOURCE: CatalogueSource = {
  url: 'https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Product-Brief-Snapdragon-X-Elite.pdf',
  retrievedOn: '2026-08-01',
  publisher: 'Qualcomm',
};

export const QUALCOMM_X1_PLUS_BRIEF_SOURCE: CatalogueSource = {
  url: 'https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-X-Plus-Product-Brief.pdf',
  retrievedOn: '2026-08-01',
  publisher: 'Qualcomm',
};

/** Qualcomm publishes no retrievable brief for the entry-level Snapdragon X:
 * the product page 404s and the brief PDF carries its specification table as
 * unextractable artwork. This list states the core count for that one part. */
export const WIKIPEDIA_SNAPDRAGON_X_SOURCE: CatalogueSource = {
  url: 'https://en.wikipedia.org/wiki/List_of_Qualcomm_Snapdragon_systems_on_chips#Snapdragon_X_series',
  retrievedOn: '2026-08-01',
  publisher: 'Wikipedia',
};

/** Qualcomm publishes memory type and peak bandwidth for the X Series but not
 * transfer rate or bus width, so only the two stated values are recorded. */
export const QUALCOMM_X1_SOURCE: CatalogueSource = {
  url: 'https://www.qualcomm.com/products/mobile/snapdragon/pcs-and-tablets/snapdragon-x-elite',
  retrievedOn: '2026-08-01',
  publisher: 'Qualcomm',
};

/** Every Snapdragon X Series (X1) part shares Qualcomm's published
 * "LPDDR5x, up to 135 GB/s" platform memory figure. */
