// The Men in Black, armed (Session 13; DESIGN.md "Men in Black"): the
// cutscenes' Man in Black (render/familyLooks.js, config.people.mib) as
// he is (Aaron: don't change him), with a weapon in his right hand. Most
// carry a pistol; some an SMG, some a scoped sniper rifle (Aaron).
//
// Each weapon is built on the right wrist in the rest pose (arms hanging),
// pointing ahead (+z), its grip in the fist, in the figure kit's built space
// (1.7 m; the kit scales it with the man). Its frame is the wrist's: when
// the renderer turns the wrist, the gun turns with it.

import { familySpec } from './familyLooks.js';
import { HUMAN_JOINTS } from './figureKit.js';

const W = HUMAN_JOINTS.find(([name]) => name === 'wristR').slice(2); // the right wrist, rest pose

// How each weapon is held and where it fires from, in its own frame (the
// wrist's: x to the man's left, y up, z along the barrel), metres built:
//  - sight: how far above the wrist its sight line runs (the eye goes there);
//  - reach: how far ahead of the eye the wrist sits, aiming (a pistol at
//    arm's length; a long gun's butt in the shoulder);
//  - support: where the left hand's wrist goes (a pistol: cupping the
//    right fist; a long gun: under the fore-end);
//  - muzzle: where its shots and flash come from;
//  - rifle: shouldered, under the right eye (a pistol: centred, both eyes).
export const WEAPONS = {
  pistol: { sight: 0.01, reach: 0.47, support: [0.034, -0.03, -0.012], muzzle: [0, -0.012, 0.175], rifle: false },
  smg: { sight: 0.046, reach: 0.22, support: [0.004, -0.034, 0.2], muzzle: [0, 0.006, 0.345], rifle: true },
  sniper: { sight: 0.066, reach: 0.3, support: [0.004, -0.04, 0.31], muzzle: [0, 0.012, 0.77], rifle: true },
};

export const WEAPON_IDS = Object.keys(WEAPONS);

// The weapon's parts: { masses, tubes } on the right wrist.
function weaponParts(id) {
  const [x, y, z] = W;
  const m = (dx, dy, dz, rx, ry, rz, key, turn) => ['wristR', null, x + dx, y + dy, z + dz, rx, ry, rz, key, turn];
  const t = (ax, ay, az, bx, by, bz, r0, r1, key) => ['wristR', x + ax, y + ay, z + az, x + bx, y + by, z + bz, r0, r1, key];
  switch (id) {
    case 'smg':
      // A compact SMG: a receiver with a short barrel, a curved magazine,
      // a fore-end, a pistol grip in the fist, a collapsible wire stock.
      return {
        masses: [
          m(0, 0, 0.1, 0.02, 0.03, 0.16, 'gun'),
          m(0, -0.022, 0.2, 0.024, 0.024, 0.065, 'gunGrip'),
          m(0, -0.085, 0.13, 0.011, 0.065, 0.02, 'gun', [-0.3, 0, 0]),
          m(0, -0.055, 0.0, 0.012, 0.04, 0.017, 'gunGrip', [-0.3, 0, 0]),
          m(0, -0.018, -0.28, 0.016, 0.05, 0.012, 'gunGrip'), // the butt pad
          m(0, 0.04, -0.02, 0.008, 0.012, 0.012, 'gun'), // the rear sight
          m(0, 0.038, 0.24, 0.004, 0.014, 0.008, 'gun'), // the front sight
        ],
        tubes: [
          t(0, 0.006, 0.25, 0, 0.006, 0.345, 0.011, 0.01, 'gun'),
          t(0.012, 0, -0.06, 0.012, -0.012, -0.28, 0.005, 0.005, 'gun'),
          t(-0.012, 0, -0.06, -0.012, -0.012, -0.28, 0.005, 0.005, 'gun'),
        ],
      };
    case 'sniper':
      // A bolt-action sniper rifle: a long dark stock, a heavy barrel, a
      // big scope on mounts, the bolt's handle on the right, a folded bipod.
      return {
        masses: [
          m(0, -0.008, 0.0, 0.022, 0.032, 0.34, 'gunGrip'),
          m(0, -0.04, -0.34, 0.02, 0.065, 0.06, 'gunGrip'), // the butt
          m(0, -0.05, 0.0, 0.015, 0.04, 0.025, 'gunGrip', [-0.4, 0, 0]), // the stock's wrist, in the fist
          m(0, 0.015, 0.02, 0.016, 0.018, 0.11, 'gun'), // the action
          m(-0.03, 0.012, -0.04, 0.02, 0.006, 0.006, 'gun'), // the bolt's handle
          m(0, 0.04, -0.03, 0.008, 0.025, 0.01, 'gun'), // the mounts
          m(0, 0.04, 0.1, 0.008, 0.025, 0.01, 'gun'),
          m(0, 0.066, 0.2, 0.027, 0.027, 0.03, 'scope'), // the objective's bell
          m(0, 0.066, -0.1, 0.022, 0.022, 0.025, 'scope'), // the eyepiece
          m(0, 0.066, 0.232, 0.02, 0.02, 0.004, 'lens'),
        ],
        tubes: [
          t(0, 0.012, 0.2, 0, 0.012, 0.77, 0.012, 0.009, 'gun'),
          t(0, 0.066, -0.1, 0, 0.066, 0.2, 0.018, 0.018, 'scope'),
          t(0.012, -0.03, 0.3, 0.012, -0.035, 0.12, 0.004, 0.004, 'gun'),
          t(-0.012, -0.03, 0.3, -0.012, -0.035, 0.12, 0.004, 0.004, 'gun'),
        ],
      };
    default:
      // A service pistol: slide, frame, grip in the fist.
      return {
        masses: [
          m(0, -0.012, 0.075, 0.013, 0.016, 0.095, 'gun'),
          m(0, -0.03, 0.06, 0.012, 0.01, 0.075, 'gun'),
          m(0, -0.058, 0.0, 0.012, 0.042, 0.017, 'gunGrip', [-0.25, 0, 0]),
        ],
        tubes: [],
      };
  }
}

// The figure-kit spec: the Man in Black with his weapon. person:
// config.people.mib; gun: config.mibAgents.colours (the weapons').
export function mibAgentSpec(person, weapon, gun) {
  const spec = familySpec('mib', person);
  const parts = weaponParts(weapon);
  return {
    ...spec,
    masses: [...spec.masses, ...parts.masses],
    tubes: [...(spec.tubes ?? []), ...parts.tubes],
    colours: { ...person.colours, ...gun },
  };
}
