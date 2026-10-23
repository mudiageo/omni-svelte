/**
 * Parses a human-readable duration string into milliseconds.
 * Supports: ms (milliseconds), s (seconds), m (minutes), h (hours), d (days).
 * If the input is a number, it is assumed to be milliseconds.
 */
export function parseDuration(duration: string | number): number {
  if (typeof duration === 'number') return duration;

  const match = duration.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'ms': return value;
    case 's': return value * 1000;
    case 'm': return value * 60000;
    case 'h': return value * 3600000;
    case 'd': return value * 86400000;
    default: throw new Error(`Invalid duration format: ${duration}`);
  }
}


