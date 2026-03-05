import fs from 'fs';
import path from 'path';
import { render as renderEjs } from 'ejs';

describe('concepts page template', () => {
  const conceptsPath = path.join(__dirname, '../../../../src/server/views/pages/concepts.ejs');

  it('wraps the API key password input in the develop form', () => {
    expect(fs.existsSync(conceptsPath)).toBe(true);

    const template = fs.readFileSync(conceptsPath, 'utf8');

    expect(template).toContain('<form id="concept-develop-form">');
    expect(template).toContain('<input');
    expect(template).toContain('type="password"');
    expect(template).toContain('id="conceptApiKey"');
    expect(template).toMatch(
      /<form id="concept-develop-form">[\s\S]*<input[\s\S]*type="password"[\s\S]*id="conceptApiKey"/
    );
  });

  it('includes seed selector and disabled develop button by default', () => {
    const template = fs.readFileSync(conceptsPath, 'utf8');

    expect(template).toContain('id="seed-selector"');
    expect(template).toContain('id="selected-seed-summary"');
    expect(template).toContain('id="develop-concept-btn"');
    expect(template).toMatch(/id="develop-concept-btn"[^>]*disabled/);
  });

  it('does not cap concept edit display name length in the template', () => {
    const template = fs.readFileSync(conceptsPath, 'utf8');
    expect(template).toContain('id="edit-name"');
    expect(template).not.toMatch(/id="edit-name"[^>]*maxlength=/);
  });

  it('renders genre groups collapsed by default (no open attribute)', () => {
    const template = fs.readFileSync(conceptsPath, 'utf8');
    const renderTemplate = renderEjs as (
      source: string,
      data: {
        title: string;
        concepts: unknown[];
        genreFrames: string[];
        seeds: unknown[];
        seedGenreGroups: { genre: string; displayLabel: string; seeds: unknown[] }[];
        genreGroups: { genre: string; displayLabel: string; concepts: unknown[]; conventions: string[]; obligations: string[] }[];
      },
      options: { filename: string }
    ) => string;

    const html = renderTemplate(
      template,
      {
        title: 'Concepts',
        concepts: [{ id: '1', evaluatedConcept: { concept: { genreFrame: 'ADVENTURE', conflictAxis: 'SURVIVAL', conflictType: 'PERSON_VS_NATURE', settingScale: 'LOCAL' } } }],
        genreFrames: ['ADVENTURE'],
        seeds: [],
        seedGenreGroups: [],
        genreGroups: [
          { genre: 'ADVENTURE', displayLabel: 'Adventure', concepts: [{ id: '1', evaluatedConcept: { concept: { genreFrame: 'ADVENTURE', conflictAxis: 'SURVIVAL', conflictType: 'PERSON_VS_NATURE', settingScale: 'LOCAL' } } }], conventions: [], obligations: [] },
        ],
      },
      { filename: conceptsPath }
    );

    expect(html).toContain('class="genre-group"');
    expect(html).not.toMatch(/<details[^>]*class="genre-group"[^>]*open/);
    expect(html).not.toMatch(/<details[^>]*open[^>]*class="genre-group"/);
  });

  it('renders safely when genreGroups is omitted', () => {
    const template = fs.readFileSync(conceptsPath, 'utf8');
    const renderTemplate = renderEjs as (
      source: string,
      data: { title: string; concepts: unknown[]; genreFrames: string[]; seeds: unknown[]; seedGenreGroups: unknown[] },
      options: { filename: string }
    ) => string;

    expect(() =>
      renderTemplate(
        template,
        {
          title: 'Concepts - One More Branch',
          concepts: [],
          genreFrames: ['ADVENTURE', 'HORROR', 'SCI_FI', 'ROMANCE', 'MYSTERY', 'THRILLER'],
          seeds: [],
          seedGenreGroups: [],
        },
        { filename: conceptsPath }
      )
    ).not.toThrow();
  });
});
