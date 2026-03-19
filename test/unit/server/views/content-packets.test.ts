import fs from 'fs';
import path from 'path';
import { render as renderEjs } from 'ejs';

describe('content-packets page template', () => {
  const templatePath = path.join(__dirname, '../../../../src/server/views/pages/content-packets.ejs');

  it('renders grouped saved packet cards as context, packet, origin, and meta sections', () => {
    const template = fs.readFileSync(templatePath, 'utf8');
    const renderTemplate = renderEjs as (
      source: string,
      data: {
        title: string;
        hasSavedPackets: boolean;
        contentKindGroups: Array<{
          kind: string;
          displayLabel: string;
          cards: Array<{
            id: string;
            pinned: boolean;
            contextDetails: Array<{ key: string; label: string; value: string | readonly string[] }>;
            packetDetails: Array<{ key: string; label: string; value: string | readonly string[] }>;
            originDetails: Array<{ key: string; label: string; value: string | readonly string[] }>;
            metaDetails: Array<{ key: string; label: string; value: string | readonly string[] }>;
          }>;
        }>;
      },
      options: { filename: string }
    ) => string;

    const html = renderTemplate(
      template,
      {
        title: 'Content Packets - One More Branch',
        hasSavedPackets: true,
        contentKindGroups: [
          {
            kind: 'ENTITY',
            displayLabel: 'ENTITY',
            cards: [
              {
                id: 'saved-1',
                pinned: true,
                contextDetails: [
                  {
                    key: 'premiseSummary',
                    label: 'Premise Summary',
                    value: 'A charged premise summary',
                  },
                  {
                    key: 'situationFrame',
                    label: 'Situation Frame',
                    value: 'A volatile situation frame',
                  },
                  {
                    key: 'worldState',
                    label: 'World State',
                    value: 'A legible world state',
                  },
                ],
                packetDetails: [
                  { key: 'contentId', label: 'Content ID', value: 'pkt-01' },
                  { key: 'coreAnomaly', label: 'Core Anomaly', value: 'Test anomaly' },
                  { key: 'humanAnchor', label: 'Human Anchor', value: 'Human anchor' },
                  { key: 'socialEngine', label: 'Social Engine', value: 'Social engine' },
                  { key: 'choicePressure', label: 'Choice Pressure', value: 'Choice pressure' },
                  { key: 'signatureImage', label: 'Signature Image', value: 'Signature image' },
                  { key: 'escalationPath', label: 'Escalation Path', value: 'Escalation path' },
                  {
                    key: 'wildnessInvariant',
                    label: 'Wildness Invariant',
                    value: 'Wildness invariant',
                  },
                  { key: 'dullCollapse', label: 'Dull Collapse', value: 'Dull collapse' },
                  {
                    key: 'interactionVerbs',
                    label: 'Interaction Verbs',
                    value: ['observe', 'trade', 'rupture', 'escalate'],
                  },
                ],
                originDetails: [
                  { key: 'generationMode', label: 'Generation Mode', value: 'pipeline' },
                  {
                    key: 'sourceArtifact-1',
                    label: 'Source Artifact 1',
                    value: [
                      'Type: SPARK',
                      'Source ID: spark-01',
                      'Kind: ENTITY',
                      'Summary: Pipeline spark summary',
                    ],
                  },
                ],
                metaDetails: [{ key: 'recommendedRole', label: 'Role', value: 'PRIMARY_SEED' }],
              },
            ],
          },
        ],
      },
      { filename: templatePath }
    );

    expect(html).not.toContain('class="story-title"');
    expect(html).not.toContain('data-detail-key="contentKind"');
    expect(html).toContain('data-section-key="context"');
    expect(html).toContain('data-section-key="packet"');
    expect(html).toContain('data-section-key="origin"');
    expect(html).toContain('data-section-key="meta"');
    expect(html).toContain('Premise Summary');
    expect(html).toContain('Situation Frame');
    expect(html).toContain('World State');
    expect(html).toContain('data-detail-key="contentId"');
    expect(html).toContain('data-detail-key="coreAnomaly"');
    expect(html).toContain('data-detail-key="humanAnchor"');
    expect(html).toContain('data-detail-key="socialEngine"');
    expect(html).toContain('data-detail-key="choicePressure"');
    expect(html).toContain('data-detail-key="signatureImage"');
    expect(html).toContain('data-detail-key="escalationPath"');
    expect(html).toContain('data-detail-key="wildnessInvariant"');
    expect(html).toContain('data-detail-key="dullCollapse"');
    expect(html).toContain('data-detail-key="interactionVerbs"');
    expect(html).toContain('Generation Mode');
    expect(html).toContain('Source Artifact 1');
    expect(html).toContain('<li>Type: SPARK</li>');
    expect(html).toContain('<li>observe</li>');
    expect(html).toContain('data-detail-key="recommendedRole"');
    expect(html.indexOf('Premise Summary')).toBeLessThan(html.indexOf('Content ID'));
    expect(html.indexOf('Generation Mode')).toBeGreaterThan(html.indexOf('Interaction Verbs'));
  });
});
