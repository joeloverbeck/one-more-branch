export const CONTENT_KIND_VALUES = [
  'ENTITY',
  'INSTITUTION',
  'RELATIONSHIP',
  'TRANSFORMATION',
  'WORLD_INTRUSION',
  'RITUAL',
  'POLICY',
  'JOB',
  'SUBCULTURE',
  'ECONOMY',
] as const;

export type ContentKind = (typeof CONTENT_KIND_VALUES)[number];

export const CONTENT_PACKET_ROLE_VALUES = [
  'PRIMARY_SEED',
  'SECONDARY_MUTAGEN',
  'IMAGE_ONLY',
  'REJECT',
] as const;

export type ContentPacketRole = (typeof CONTENT_PACKET_ROLE_VALUES)[number];

export const RISK_APPETITE_VALUES = ['LOW', 'MEDIUM', 'HIGH', 'MAXIMAL'] as const;

export type RiskAppetite = (typeof RISK_APPETITE_VALUES)[number];

export function isContentKind(value: unknown): value is ContentKind {
  return typeof value === 'string' && CONTENT_KIND_VALUES.includes(value as ContentKind);
}

export function isContentPacketRole(value: unknown): value is ContentPacketRole {
  return (
    typeof value === 'string' && CONTENT_PACKET_ROLE_VALUES.includes(value as ContentPacketRole)
  );
}

export function isRiskAppetite(value: unknown): value is RiskAppetite {
  return typeof value === 'string' && RISK_APPETITE_VALUES.includes(value as RiskAppetite);
}
