// The opening cluster's road (M9.1): the same every run, past the gas
// station's forecourt and through the outpost to the checkpoint, open
// ground all the way, with its fixed wrecks.
import { describe, it, expect } from 'vitest';
import { roadFrame, roadDistance, roadProps } from '../src/world/road.js';
import { placeVehicles } from '../src/world/vehiclePlacement.js';
import { stationLayout } from '../src/base/stationLayout.js';
import { Rng } from '../src/core/Rng.js';
import data from '../src/data/vehicles.json';
import { makeMap, makeGround, config, MAP_DATA } from './mapFixture.js';

const rc = config.map.road;
const SEEDS = [1, 7, 1234];
const maps = SEEDS.map((s) => makeMap(s));
const byKey = (map, key) => map.clearings.find((c) => c.key === key);

function place(seed) {
  const map = makeMap(seed);
  const ground = makeGround(seed);
  const layout = stationLayout(map.clearings[map.homeIndex], ground, config.station.layout);
  const avoid = [{ x: layout.centre.x, z: layout.centre.z, r: layout.radius + config.vehicles.placement.avoidRadius }];
  const off = config.landmarks.offset;
  const props = roadProps(map.road, rc);
  const signs = [...map.clearings.map((c) => ({ x: c.x + off, z: c.z - off })), ...props.poles, props.sign];
  return placeVehicles(map, ground, data, config.vehicles, new Rng(seed).fork('vehicles').fork('placement'), avoid, signs);
}

describe('the road', () => {
  it('is the same on every seed', () => {
    for (const map of maps) expect(map.road).toEqual(maps[0].road);
  });

  it('comes in from beyond the west edge of the walkable area and ends just past the cordon', () => {
    for (const map of maps) {
      const first = map.road.points[0];
      const last = map.road.points[map.road.points.length - 1];
      expect(first.x).toBeLessThan(map.geometry.walk.xMin);
      expect(last.z).toBeGreaterThan(map.cluster.cordonZ);
      expect(last.z).toBeLessThan(map.cluster.cordonZ + config.map.cluster.frontierGap);
    }
  });

  it("passes the gas station's forecourt and runs through the outpost and the checkpoint", () => {
    for (const map of maps) {
      const gas = byKey(map, 'gasStation');
      const d = roadDistance(map.road, gas.x, gas.z).distance;
      expect(d).toBeGreaterThan(rc.width);
      expect(d).toBeLessThan(gas.radius);
      const outpost = byKey(map, 'outpost');
      expect(roadDistance(map.road, outpost.x, outpost.z).distance).toBeLessThan(2);
      expect(roadDistance(map.road, map.cluster.checkpoint.x, map.cluster.checkpoint.z).distance).toBeLessThan(0.5);
    }
  });

  it('keeps clear of every other clearing', () => {
    for (const map of maps) {
      for (const c of map.clearings) {
        if (c.key === 'gasStation' || c.key === 'outpost') continue;
        expect(roadDistance(map.road, c.x, c.z).distance).toBeGreaterThan(c.radius + rc.width);
      }
    }
  });

  it("is the gas station's pathway to the outpost", () => {
    const map = maps[0];
    const path = map.paths.find((p) => p.road);
    expect([map.clearings[path.a].key, map.clearings[path.b].key]).toEqual(['gasStation', 'outpost']);
    for (const p of path.points.slice(1, -1)) expect(roadDistance(map.road, p.x, p.z).distance).toBeLessThan(0.01);
  });

  it('is open ground (no trees or undergrowth) its whole length, shoulders included', () => {
    const ground = makeGround(SEEDS[0]);
    const road = maps[0].road;
    for (let d = 0; d < road.length; d += 5) {
      const f = roadFrame(road, d);
      if (f.x < ground.geo.walk.xMin) continue;
      for (const side of [-1, 0, 1]) {
        const off = side * (rc.width / 2 + rc.shoulder * 0.5);
        expect(ground.openAt(f.x + f.rx * off, f.z + f.rz * off)).toBeGreaterThan(0.9);
      }
    }
  });

  it('has its poles on open ground beside it, and the sign before the outpost', () => {
    const ground = makeGround(SEEDS[0]);
    const map = maps[0];
    const { poles, sign } = roadProps(map.road, rc);
    expect(poles.length).toBeGreaterThan(8);
    for (const p of poles) {
      expect(roadDistance(map.road, p.x, p.z).distance).toBeCloseTo(rc.poles.offset, 0);
      if (p.x > ground.geo.walk.xMin) expect(ground.openAt(p.x, p.z)).toBeGreaterThan(0.5);
    }
    const outpost = byKey(map, 'outpost');
    expect(Math.hypot(sign.x - outpost.x, sign.z - outpost.z)).toBeGreaterThan(outpost.radius);
    expect(roadDistance(map.road, sign.x, sign.z).along).toBeLessThan(roadDistance(map.road, outpost.x, outpost.z).along);
  });
});

describe('cars in the cluster', () => {
  const lists = SEEDS.map(place);
  const inCluster = (list, map) => list.filter((v) => v.z < map.cluster.cordonZ).map((v) => ({ type: v.type, x: v.x, z: v.z, yaw: v.yaw }));

  it('puts every one of the road\'s wrecks on it, on every seed', () => {
    const wrecks = MAP_DATA.cluster.road.wrecks;
    lists.forEach((list) => {
      const onRoad = list.filter((v) => v.place === 'road');
      expect(onRoad.map((v) => v.type)).toEqual(wrecks.map((w) => w.type));
    });
  });

  it('stands the same cars in the same places on every seed (only their batteries vary)', () => {
    const first = inCluster(lists[0], maps[0]);
    expect(first.length).toBeGreaterThan(5);
    lists.forEach((list, i) => expect(inCluster(list, maps[i])).toEqual(first));
  });
});
