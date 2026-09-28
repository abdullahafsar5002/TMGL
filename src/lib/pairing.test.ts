import { describe, it, expect } from 'vitest';
import {
  PAIRING,
  buildFlights,
  flightName,
  formatTeeTime,
  seedByHandicap,
  teeTimeFor,
  type BuildFlightsOptions,
  type SeedablePlayer,
} from './pairing';

const player = (id: string, full_name: string, handicap_index?: number | null): SeedablePlayer => ({
  id,
  full_name,
  handicap_index,
});

const field = (count: number, base = 4): SeedablePlayer[] =>
  Array.from({ length: count }, (_unused, index) => player(`p${index + 1}`, `Player ${index + 1}`, base + index));

const options = (overrides: Partial<BuildFlightsOptions> = {}): BuildFlightsOptions => ({
  flightCount: 2,
  intervalMinutes: 9,
  firstTeeTime: '08:00',
  ...overrides,
});

const sizes = (flights: ReturnType<typeof buildFlights>) => flights.map((flight) => flight.members.length);
const idsIn = (flights: ReturnType<typeof buildFlights>) => flights.flatMap((flight) => flight.members.map((m) => m.playerId));

describe('seedByHandicap', () => {
  it('orders players by ascending handicap index without mutating the input', () => {
    const players = [
      player('c', 'Cara', 18.4),
      player('a', 'Alan', 2.1),
      player('b', 'Bilal', 9.7),
    ];
    const snapshot = players.map((entry) => entry.id);

    const seeded = seedByHandicap(players);

    expect(seeded.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
    expect(players.map((entry) => entry.id)).toEqual(snapshot);
    expect(seeded[0]).toBe(players[1]);
  });

  it('is deterministic for tied handicaps by falling back to the name', () => {
    const players = [
      player('3', 'Zoya', 10),
      player('1', 'Ali', 10),
      player('2', 'Bilal', 10),
    ];

    expect(seedByHandicap(players).map((entry) => entry.full_name)).toEqual(['Ali', 'Bilal', 'Zoya']);
    expect(seedByHandicap(players.slice().reverse()).map((entry) => entry.full_name)).toEqual(['Ali', 'Bilal', 'Zoya']);
  });

  it('treats a missing handicap as the field average and an empty field average as zero', () => {
    const players = [
      player('weak', 'Weak', 20),
      player('unknown', 'Unknown', null),
      player('strong', 'Strong', 4),
      player('blank', 'Blank', undefined),
    ];

    const seeded = seedByHandicap(players);
    expect(seeded.map((entry) => entry.id)).toEqual(['strong', 'blank', 'unknown', 'weak']);
    expect(seedByHandicap([player('a', 'A', null), player('b', 'B', null)]).map((e) => e.id)).toEqual(['a', 'b']);
  });
});

describe('buildFlights flight layout', () => {
  it('produces a single flight with sequential pairings when flightCount is one', () => {
    const flights = buildFlights(field(5), options({ flightCount: 1, firstTeeTime: null }));

    expect(flights).toHaveLength(1);
    expect(flights[0].name).toBe('A');
    expect(flights[0].orderIndex).toBe(1);
    expect(flights[0].members.map((member) => member.pairingNo)).toEqual([1, 2, 3, 4, 5]);
    expect(flights[0].members.map((member) => member.playerId)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
  });

  it('spreads players evenly instead of chunking the strongest band into flight A', () => {
    const flights = buildFlights(field(12), options({ flightCount: 3, firstTeeTime: null }));

    expect(sizes(flights)).toEqual([4, 4, 4]);
    expect(flights[0].members.map((m) => m.playerId)).toEqual(['p1', 'p4', 'p7', 'p10']);
    expect(flights[1].members.map((m) => m.playerId)).toEqual(['p2', 'p5', 'p8', 'p11']);
    expect(flights[2].members.map((m) => m.playerId)).toEqual(['p3', 'p6', 'p9', 'p12']);
    expect(idsIn(flights).slice().sort()).toEqual(field(12).map((entry) => entry.id).sort());
  });

  it('orders the handicap bands A to C while keeping flight strengths within one shot', () => {
    const average = (handicaps: number[]) => handicaps.reduce((sum, value) => sum + value, 0) / handicaps.length;
    const even = buildFlights(field(12), options({ flightCount: 3, firstTeeTime: null }));
    const evenAverages = even.map((flight) => average(flight.members.map((m) => m.handicapIndex)));
    expect(evenAverages[0]).toBeLessThan(evenAverages[1]);
    expect(evenAverages[1]).toBeLessThan(evenAverages[2]);

    const remainder = buildFlights(field(10), options({ flightCount: 3, firstTeeTime: null }));
    const remainderAverages = remainder.map((flight) => average(flight.members.map((m) => m.handicapIndex)));
    expect(Math.max(...remainderAverages) - Math.min(...remainderAverages)).toBeLessThan(1.5);
    expect(remainder[0].members[0].handicapIndex).toBe(4);
  });

  it('handles odd player counts without dropping or duplicating anyone', () => {
    const players = field(7);
    const flights = buildFlights(players, options({ flightCount: 2, firstTeeTime: null }));

    expect(sizes(flights)).toEqual([4, 3]);
    expect(idsIn(flights).slice().sort()).toEqual(players.map((entry) => entry.id).sort());
  });

  it('numbers flights and pairings from one and names them A, B, C', () => {
    const flights = buildFlights(field(9), options({ flightCount: 3, firstTeeTime: null }));

    expect(flights.map((flight) => flight.name)).toEqual(['A', 'B', 'C']);
    expect(flights.map((flight) => flight.orderIndex)).toEqual([1, 2, 3]);
    expect(flights.every((flight) => flight.members.every((member, index) => member.pairingNo === index + 1))).toBe(true);
  });

  it('extends flight names past Z and never emits an empty flight', () => {
    expect(flightName(0)).toBe('A');
    expect(flightName(25)).toBe('Z');
    expect(flightName(26)).toBe('AA');
    expect(flightName(27)).toBe('AB');

    const flights = buildFlights(field(3), options({ flightCount: 8, firstTeeTime: null }));
    expect(sizes(flights)).toEqual([1, 1, 1]);
  });

  it('honours an explicit flight size and returns nothing for an empty field', () => {
    expect(sizes(buildFlights(field(10), options({ flightCount: 2, flightSize: 3 })))).toEqual([3, 3, 2, 2]);
    expect(buildFlights([], options({}))).toEqual([]);
  });

  it('ignores duplicate players so flight_players cannot violate its unique constraint', () => {
    const flights = buildFlights(
      [player('p1', 'One', 2), player('p1', 'One', 2), player('p2', 'Two', 6)],
      options({ flightCount: 1, firstTeeTime: null }),
    );

    expect(flights[0].members.map((member) => member.playerId)).toEqual(['p1', 'p2']);
  });
});

describe('buildFlights pairings and tee sheet', () => {
  it('gives the best handicaps pairing 1 and 2 and the next best 3 and 4', () => {
    const players = [
      player('p1', 'Alan', 1.2),
      player('p2', 'Bilal', 2.4),
      player('p3', 'Cara', 5.6),
      player('p4', 'Dan', 6.8),
      player('p5', 'Eve', 7.9),
      player('p6', 'Fay', 9.1),
    ];

    const [single] = buildFlights(players, options({ flightCount: 1, firstTeeTime: null }));
    expect(single.members.map((member) => [member.playerId, member.pairingNo])).toEqual([
      ['p1', 1],
      ['p2', 2],
      ['p3', 3],
      ['p4', 4],
      ['p5', 5],
      ['p6', 6],
    ]);

    const [flightA, flightB] = buildFlights(players, options({ flightCount: 2, firstTeeTime: null }));
    expect(flightA.members.map((member) => [member.playerId, member.pairingNo])).toEqual([
      ['p1', 1],
      ['p3', 2],
      ['p5', 3],
    ]);
    expect(flightB.members.map((member) => [member.playerId, member.pairingNo])).toEqual([
      ['p2', 1],
      ['p4', 2],
      ['p6', 3],
    ]);
    for (const flight of [flightA, flightB]) {
      const handicaps = flight.members.map((member) => member.handicapIndex);
      expect(handicaps).toEqual([...handicaps].sort((a, b) => a - b));
      expect(flight.members[0].handicapIndex).toBe(Math.min(...handicaps));
      expect(flight.members[1].handicapIndex).toBe([...handicaps].sort((a, b) => a - b)[1]);
    }
  });

  it('adds one interval per two pairings', () => {
    const [flight] = buildFlights(field(6), options({ flightCount: 1, firstTeeTime: '09:00', intervalMinutes: 9 }));

    expect(flight.members.map((member) => member.teeTime)).toEqual(['09:00', '09:00', '09:09', '09:09', '09:18', '09:18']);
  });

  it('wraps tee times past midnight instead of overflowing the day', () => {
    const [late] = buildFlights(field(4), options({ flightCount: 1, firstTeeTime: '23:45', intervalMinutes: 20 }));
    expect(late.members.map((member) => member.teeTime)).toEqual(['23:45', '23:45', '00:05', '00:05']);

    expect(teeTimeFor(1, '08:00', 9)).toBe('08:00');
    expect(teeTimeFor(5, '08:00', 9)).toBe('08:18');
    expect(teeTimeFor(3, '00:10', 1435)).toBe('00:05');
  });

  it('returns null tee times when the first tee time is missing or unparseable', () => {
    const withoutFirst = buildFlights(field(4), options({ flightCount: 1, firstTeeTime: null }));
    expect(withoutFirst[0].members.every((member) => member.teeTime === null)).toBe(true);

    const unparseable = buildFlights(field(4), options({ flightCount: 1, firstTeeTime: 'later' }));
    expect(unparseable[0].members.every((member) => member.teeTime === null)).toBe(true);
  });

  it('is idempotent: the same input always yields the same output', () => {
    const players = [
      player('p4', 'Dan', null),
      player('p2', 'Bilal', 8.4),
      player('p6', 'Fay', 12.1),
      player('p1', 'Alan', 8.4),
      player('p3', 'Cara', 19.7),
      player('p5', 'Eve', 1.3),
    ];
    const config = options({ flightCount: 3, firstTeeTime: '07:30' });

    const first = buildFlights(players, config);
    const second = buildFlights(players, config);

    expect(second).toEqual(first);
    expect(buildFlights(players, config)).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});

describe('formatTeeTime', () => {
  it('formats dates and normalises database time strings', () => {
    expect(formatTeeTime(new Date(2026, 0, 15, 7, 5))).toBe('07:05');
    expect(formatTeeTime(new Date(2026, 0, 15, 16, 40))).toBe('16:40');
    expect(formatTeeTime('07:05')).toBe('07:05');
    expect(formatTeeTime('07:05:00')).toBe('07:05');
  });

  it('returns null for missing or invalid values', () => {
    expect(formatTeeTime(null)).toBeNull();
    expect(formatTeeTime(undefined)).toBeNull();
    expect(formatTeeTime('')).toBeNull();
    expect(formatTeeTime('25:00')).toBeNull();
    expect(formatTeeTime(new Date('nonsense'))).toBeNull();
  });
});

describe('PAIRING', () => {
  it('exposes the pairing helpers without any Supabase dependency', () => {
    expect(Object.keys(PAIRING).sort()).toEqual(['buildFlights', 'flightName', 'formatTeeTime', 'seedByHandicap', 'teeTimeFor']);
    expect(PAIRING.seedByHandicap).toBe(seedByHandicap);
    expect(PAIRING.buildFlights).toBe(buildFlights);
    expect(PAIRING.formatTeeTime).toBe(formatTeeTime);
  });
});
