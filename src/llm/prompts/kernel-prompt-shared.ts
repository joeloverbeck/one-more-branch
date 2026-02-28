import { CONFLICT_AXES } from '../../models/conflict-taxonomy.js';
import { DRAMATIC_STANCE_VALUES } from '../../models/story-kernel.js';

const CONFLICT_AXIS_LABELS: Record<string, string> = {
  INDIVIDUAL_VS_SYSTEM: 'Personal agency against institutions.',
  TRUTH_VS_STABILITY: 'Revealing truth versus preserving order.',
  DUTY_VS_DESIRE: 'Obligation clashing with personal longing.',
  FREEDOM_VS_SAFETY: 'Autonomy versus protective constraints.',
  KNOWLEDGE_VS_INNOCENCE: 'Understanding versus protective ignorance.',
  POWER_VS_MORALITY: 'Capability gain versus ethical limits.',
  LOYALTY_VS_SURVIVAL: 'Commitments versus self-preservation.',
  IDENTITY_VS_BELONGING: 'Self-definition versus group acceptance.',
  JUSTICE_VS_MERCY: 'Righteous fairness versus compassionate forgiveness.',
  PROGRESS_VS_TRADITION: 'Innovation and change versus preservation and heritage.',
};

const DRAMATIC_STANCE_LABELS: Record<string, string> = {
  COMIC:
    'Renewal, community triumph, social integration. Human bonds affirmed or restored.',
  ROMANTIC:
    'Heroic transcendence, individual will triumphs over adversity.',
  TRAGIC:
    'Cost of hubris or desire, inevitable loss. The price of greatness.',
  IRONIC:
    'Subversive, deconstructive, anti-heroic. Questions conventional assumptions. NOTE: distinct from directionOfChange IRONIC (outcome trajectory); dramaticStance IRONIC describes the story\'s philosophical worldview.',
};

export const CONFLICT_AXIS_GUIDANCE = `CONFLICT AXIS TAXONOMY:
${CONFLICT_AXES.map((axis) => `- ${axis}: ${CONFLICT_AXIS_LABELS[axis]}`).join('\n')}`;

export const DRAMATIC_STANCE_GUIDANCE = `DRAMATIC STANCE TAXONOMY:
${DRAMATIC_STANCE_VALUES.map((stance) => `- ${stance}: ${DRAMATIC_STANCE_LABELS[stance]}`).join('\n')}`;

export function buildConflictAxisEnumList(): string {
  return CONFLICT_AXES.map((value) => `- ${value}`).join('\n');
}

export function buildDramaticStanceEnumList(): string {
  return DRAMATIC_STANCE_VALUES.map((value) => `- ${value}`).join('\n');
}
