import type { ChatRelationshipState } from './chat-session.js';
import type { ChatRelationshipTimelinePoint } from './chat-relationship-history.js';

export interface ChatRelationshipMetricPresentation {
  readonly value: number;
  readonly delta: number;
  readonly summary: string;
  readonly trend: string;
  readonly gaugeAriaLabel: string;
  readonly sparklineAriaLabel: string;
}

export interface ChatRelationshipPresentation {
  readonly valence: ChatRelationshipMetricPresentation;
  readonly tension: ChatRelationshipMetricPresentation;
}

type ChatRelationshipMetricName = 'valence' | 'tension';

function getGaugeBounds(name: ChatRelationshipMetricName): { min: number; max: number } {
  if (name === 'valence') {
    return { min: -5, max: 5 };
  }

  return { min: 0, max: 10 };
}

function getMetricTitle(name: ChatRelationshipMetricName): string {
  return name === 'valence' ? 'Valence' : 'Tension';
}

function getMetricBand(name: ChatRelationshipMetricName, value: number): string {
  if (name === 'valence') {
    if (value <= -3) {
      return 'Hostile';
    }
    if (value < 0) {
      return 'Frayed';
    }
    if (value === 0) {
      return 'Neutral';
    }
    if (value < 3) {
      return 'Open';
    }
    return 'Loyal';
  }

  if (value <= 2) {
    return 'Calm';
  }
  if (value <= 6) {
    return 'Strained';
  }
  return 'Breaking';
}

function getMetricTrend(name: ChatRelationshipMetricName, delta: number): string {
  if (!Number.isFinite(delta) || delta === 0) {
    return 'steady';
  }

  if (name === 'valence') {
    return delta > 0 ? 'warming' : 'cooling';
  }

  return delta > 0 ? 'rising' : 'easing';
}

function buildMetricSummary(name: ChatRelationshipMetricName, value: number, delta: number): string {
  return `${getMetricBand(name, value)} and ${getMetricTrend(name, delta)}`;
}

function buildGaugeAriaLabel(name: ChatRelationshipMetricName, value: number, delta: number): string {
  const bounds = getGaugeBounds(name);
  return `${getMetricTitle(name)}: ${buildMetricSummary(name, value, delta)}. Current value ${value} on a scale from ${bounds.min} to ${bounds.max}.`;
}

function buildSparklineAriaLabel(
  name: ChatRelationshipMetricName,
  value: number,
  delta: number,
  pointCount: number
): string {
  return `${getMetricTitle(name)} trend: ${buildMetricSummary(name, value, delta)} across ${pointCount} recorded ${pointCount === 1 ? 'turn' : 'turns'}.`;
}

function resolveRelationshipMetric(
  relationshipTimeline: readonly ChatRelationshipTimelinePoint[],
  relationshipState: ChatRelationshipState,
  name: ChatRelationshipMetricName
): number {
  const latestSnapshot = relationshipTimeline[relationshipTimeline.length - 1]?.snapshot;
  const timelineValue = latestSnapshot?.[name];
  if (typeof timelineValue === 'number' && Number.isFinite(timelineValue)) {
    return timelineValue;
  }

  const stateValue = relationshipState[name];
  return typeof stateValue === 'number' && Number.isFinite(stateValue) ? stateValue : 0;
}

function readMetricDelta(
  relationshipTimeline: readonly ChatRelationshipTimelinePoint[],
  name: ChatRelationshipMetricName
): number {
  if (relationshipTimeline.length === 0) {
    return 0;
  }

  const currentValue = resolveRelationshipMetric(
    relationshipTimeline,
    {
      dynamic: '',
      valence: 0,
      tension: 0,
      leverage: '',
    },
    name
  );
  const previousSnapshot = relationshipTimeline[relationshipTimeline.length - 2]?.snapshot;
  const previousValue = previousSnapshot?.[name];
  const normalizedPreviousValue =
    typeof previousValue === 'number' && Number.isFinite(previousValue) ? previousValue : 0;
  return currentValue - normalizedPreviousValue;
}

function buildMetricPresentation(
  relationshipTimeline: readonly ChatRelationshipTimelinePoint[],
  relationshipState: ChatRelationshipState,
  name: ChatRelationshipMetricName
): ChatRelationshipMetricPresentation {
  const value = resolveRelationshipMetric(relationshipTimeline, relationshipState, name);
  const delta = readMetricDelta(relationshipTimeline, name);
  const pointCount = relationshipTimeline.length;

  return {
    value,
    delta,
    summary: buildMetricSummary(name, value, delta),
    trend: getMetricTrend(name, delta),
    gaugeAriaLabel: buildGaugeAriaLabel(name, value, delta),
    sparklineAriaLabel: buildSparklineAriaLabel(name, value, delta, pointCount),
  };
}

export function buildChatRelationshipPresentation(
  relationshipTimeline: readonly ChatRelationshipTimelinePoint[],
  relationshipState: ChatRelationshipState
): ChatRelationshipPresentation {
  return {
    valence: buildMetricPresentation(relationshipTimeline, relationshipState, 'valence'),
    tension: buildMetricPresentation(relationshipTimeline, relationshipState, 'tension'),
  };
}
