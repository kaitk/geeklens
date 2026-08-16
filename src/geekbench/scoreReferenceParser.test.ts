import { parseHTML } from 'linkedom';
import { describe, expect, test } from 'bun:test';
import { parseScoreReferenceDocument } from './scoreReferenceParser';

function documentFor(body: string): Document {
  return parseHTML(`<!doctype html><html><body><p>Geekbench 7</p>${body}</body></html>`)
    .document as unknown as Document;
}

function table(id: string, rows: string): string {
  return `<table id="${id}"><tbody>${rows}</tbody></table>`;
}

function row(path: string, score: string): string {
  return `<tr><td class="name"><a href="${path}">CPU</a></td><td class="score">${score}</td></tr>`;
}

describe('score reference parser', () => {
  test('joins scores only through one canonical processor path', () => {
    const path = '/processors/amd-ryzen-9-9950x';
    const document = documentFor(
      table('single-core', row(path, '3,400')) + table('multi-core', row(path, '22,500')),
    );
    expect(parseScoreReferenceDocument(document, 'processor')).toEqual([
      { path, singleCore: 3400, multiCore: 22500 },
    ]);
  });

  test.each([
    ['wrong generation', '<p>Geekbench 6</p>'],
    ['missing table', table('single-core', row('/processors/a', '100'))],
    [
      'different paths',
      table('single-core', row('/processors/a', '100')) +
        table('multi-core', row('/processors/b', '200')),
    ],
    [
      'malformed score',
      table('single-core', row('/processors/a', 'none')) +
        table('multi-core', row('/processors/a', '200')),
    ],
    [
      'duplicate path',
      table('single-core', row('/processors/a', '100') + row('/processors/a', '101')) +
        table('multi-core', row('/processors/a', '200') + row('/processors/b', '201')),
    ],
  ])('rejects %s', (_, markup) => {
    const document =
      markup === '<p>Geekbench 6</p>'
        ? (parseHTML(`<!doctype html><html><body>${markup}</body></html>`)
            .document as unknown as Document)
        : documentFor(markup);
    expect(parseScoreReferenceDocument(document, 'processor')).toBeNull();
  });

  test('requires the Mac Geekbench 7 calibration marker', () => {
    const path = '/macs/mac-mini';
    const markup =
      '<p>Geekbench 7 CPU scores are calibrated</p>' +
      table('family-64-single', row(path, '3000')) +
      table('family-64-multi', row(path, '12000'));
    expect(
      parseScoreReferenceDocument(
        parseHTML(`<!doctype html><html><body>${markup}</body></html>`)
          .document as unknown as Document,
        'mac-family',
      ),
    ).toEqual([{ path, singleCore: 3000, multiCore: 12000 }]);
  });
});
