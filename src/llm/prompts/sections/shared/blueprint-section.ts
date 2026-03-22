import type { SceneBlueprintResult } from '../../../scene-blueprint-types.js';

export function formatBlueprintSection(blueprint: SceneBlueprintResult): string {
  const unitLines = blueprint.units.map((unit, i) => {
    const speakerLine =
      unit.speakingCharacters && unit.speakingCharacters.length > 0
        ? `\nCharacters speaking: ${unit.speakingCharacters.join(', ')}`
        : '';
    return `UNIT ${i + 1} [${unit.sceneFunction} / ${unit.mruType}] (${unit.paragraphWeight} paragraph(s))
Action: ${unit.action}
Register: ${unit.emotionalRegister}
Sensory: ${unit.sensoryAnchor}${speakerLine}`;
  });

  const mappingLines =
    blueprint.mandateMapping.length > 0
      ? `\nMandate Traceability:\n${blueprint.mandateMapping.map((m) => `- "${m.mandate}" \u2192 Unit ${m.unitIndex + 1}`).join('\n')}`
      : '';

  return `=== SCENE BLUEPRINT ===
Emotional Arc: ${blueprint.emotionalArc}
Follow this paragraph-level structure. Each unit becomes ~N paragraphs.

${unitLines.join('\n\n')}
${mappingLines}

`;
}
