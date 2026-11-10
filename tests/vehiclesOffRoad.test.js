// Session 25 (Aaron: at the outpost the witch got snagged on a truck on the
// road and he killed her with the shovel): no vehicle, and no set piece's
// collider, stands on the road or the road north, on any seed.
import { describe, it, expect } from 'vitest';
import { roadDistance, roadProps } from '../src/world/road.js';
import { placeVehicles } from '../src/world/vehiclePlacement.js';
import { stationLayout } from '../src/base/stationLayout.js';
import { Campsite } from '../src/encounters/Campsite.js';
import { GasStation } from '../src/encounters/GasStation.js';
import { Outpost } from '../src/encounters/Outpost.js';
import { Rng } from '../src/core/Rng.js';
import data from '../src/data/vehicles.json';
import { makeMap, makeGround, config } from './mapFixture.js';

const rc = config.map.road;
const SEEDS = [1, 7, 1234, 4242];
// Half the asphalt, and a little: what the witch and the dead run along.
const KEEP = rc.width / 2 + 0.3;

function place(seed) {
  const map = makeMap(seed);
  const ground = makeGround(seed);
  const layout = stationLayout(map.clearings[map.homeIndex], ground, config.station.layout);
  const avoid = [{ x: layout.centre.x, z: layout.centre.z, r: layout.radius + config.vehicles.placement.avoidRadius }];
  const off = config.landmarks.offset;
  const props = roadProps(map.road, rc);
  const signs = [...map.clearings.map((c) => ({ x: c.x + off, z: c.z - off })), ...props.poles, props.sign];
  const fixed = { campsite: [Campsite.carSpot(map)].filter(Boolean), gasStation: GasStation.carSpots(map), trail: Campsite.trailWreckSpots(map), outpost: Outpost.truckSpots(map) };
  return { map, list: placeVehicles(map, ground, data, config.vehicles, new Rng(seed).fork('vehicles').fork('placement'), avoid, signs, fixed) };
}

// The four corners of a vehicle's footprint.
function corners(v) {
  const [length, width] = data.types[v.type].size;
  const s = Math.sin(v.yaw);
  const c = Math.cos(v.yaw);
  const out = [];
  for (const [x, z] of [[-width / 2, -length / 2], [width / 2, -length / 2], [-width / 2, length / 2], [width / 2, length / 2], [0, 0]]) out.push({ x: v.x + c * x + s * z, z: v.z - s * x + c * z });
  return out;
}

function onRoad(map, p, keep = KEEP) {
  const roads = [map.road, map.road.north].filter(Boolean);
  return roads.some((r) => {
    const d = roadDistance(r, p.x, p.z);
    return d.distance < keep && d.along > 0.5 && d.along < r.length - 0.5;
  });
}

describe('nothing parked on the roads', () => {
  for (const seed of SEEDS) {
    it(`no vehicle's footprint is on the asphalt (seed ${seed})`, () => {
      const { map, list } = place(seed);
      const bad = list.filter((v) => corners(v).some((p) => onRoad(map, p)));
      expect(bad.map((v) => `${v.type} ${v.place} ${v.x.toFixed(1)},${v.z.toFixed(1)}`)).toEqual([]);
    });
  }
});

// A collider's points to test: a circle's edge toward the road is its centre less r;
// a segment's, points along it less its thickness.
function colliderOnRoad(map, c) {
  if (c.seg) {
    for (let k = 0; k <= 20; k++) {
      const p = { x: c.ax + ((c.bx - c.ax) * k) / 20, z: c.az + ((c.bz - c.az) * k) / 20 };
      if (onRoad(map, p, KEEP + c.t)) return true;
    }
    return false;
  }
  return onRoad(map, c, KEEP + c.r);
}

describe('no set piece stands on the roads', () => {
  const map = makeMap(1234);
  const ground = makeGround(1234);
  const collect = (Kind) => {
    const e = new Kind(config, null);
    e.frame = Kind.frame(map);
    e.ground = ground;
    e.floorY = 0;
    const list = [];
    e.buildColliders({ insert: (c) => list.push(c) });
    return list;
  };
  for (const [name, Kind] of [['the outpost', Outpost], ['the gas station', GasStation]]) {
    it(`${name}: nothing solid on the asphalt`, () => {
      const bad = collect(Kind).filter((c) => colliderOnRoad(map, c));
      expect(bad.map((c) => `${c.x.toFixed(1)},${c.z.toFixed(1)} r ${c.r.toFixed(1)}`)).toEqual([]);
    });
  }
});
