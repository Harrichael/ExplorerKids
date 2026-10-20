// The gas in a space over a container's contents: room air, carbon dioxide and water vapour, each in
// millimoles. It presses by the ideal gas law, P = nRT/V. It trades with the liquid under it: water
// evaporates toward its vapour pressure or condenses back, carrying its latent heat, and CO₂
// dissolves toward Henry's law, more under pressure and in cold water. Through an open mouth or a
// nozzle it gets out as fast as the pressure difference pushes it (orifice flow), and drafts swap it
// for room air. Plain data in and out, like chem.js: the desk says how big the space is and how big
// its way out, and moves the bodies.
//
// Pressures are in kPa, volumes in game millilitres, temperatures in °C, areas in m².

import * as chem from './chem.js';
import { UNITS_PER_M3 } from './stuff.js';

export const R = 8.314, P0 = 101.325, K0 = 273.15;
// mmol of water in a millilitre, and what boiling one mmol of it takes (J)
export const WATER = 55.5, LATENT = 40.7;
const MASS = {air:28.96, co2:44.01, vap:18.02}, CD = .62, EVAP = 3, DISSOLVE = .3, DRAFT = .02;
// A world unit holds UNITS_PER_M3 game millilitres, so the desk is drawn about twice real size; a
// mouth's real area is its drawn one shrunk to match the millilitres it holds.
const LEN = Math.cbrt(UNITS_PER_M3/1e6);
export const area = r => Math.PI*(r*LEN)**2;

// water's vapour pressure by the Antoine equation, and the boiling point at a pressure
export const psat = t => .133322*10**(8.07131 - 1730.63/(233.426 + t));
export const tsat = p => 1730.63/(8.07131 - Math.log10(p/.133322)) - 233.426;
// Henry's law for CO₂: mmol per mL of water per kPa, 0.034 mol/L/atm at 25 °C, about half that at 50 °C
export const henry = t => .034/P0*Math.exp(2400*(1/(t + K0) - 1/298.15));

export const moles = g => g.air + g.co2 + g.vap;
export const pressure = (g, V, t) => moles(g)*R*(t + K0)/V;
// the room's own air, as damp as the room's water lets it be, filling V at t
export function room(V, t){ const k = V/(R*(t + K0)), w = psat(chem.ROOM); return {air:(P0 - w)*k, co2:0, vap:w*k}; }
// how fast n mmol a second of gas at t leaves through a hole of area A
export const speed = (n, t, A) => n*R*(t + K0)/P0*1e-6/(CD*A);

// One tick of what the liquid and the gas over it swap. `made` is CO₂ just made in the liquid: it
// tops the liquid up to what it can hold and bubbles out past that. Returns the CO₂ that came out of
// the liquid as bubbles.
export function trade(g, c, V, dt, made = 0, stir = 0){
  const wv = chem.waterVol(c), t = chem.temp(c), T = t + K0;
  if (!wv) { g.co2 += made; return made; }
  const sat = psat(t)*V/(R*T), d = (sat - g.vap)*(1 - Math.exp(-EVAP*dt)), n = Math.min(d, (c.l.water || 0)*WATER);
  if (Math.abs(n) > 1e-6) { g.vap += n; chem.add(c, 'water', -n/WATER); chem.heat(c, -n*LATENT); }
  const hold = henry(t)*wv*g.co2*R*T/V, have = (c.l.co2 || 0) + made, k = 1 - Math.exp(-DISSOLVE*(1 + Math.max(0, t - chem.ROOM)/30)*(1 + 4*stir)*dt);
  let out = 0;
  if (have > hold) { const now = Math.min(made, have - hold); out = now + (have - hold - now)*k; }
  else out = (have - hold)*k;
  c.l.co2 = have - out; g.co2 += out;
  if (c.l.co2 < 1e-4) delete c.l.co2;
  return Math.max(0, out);
}

// Gas through a hole of area A between the space and the room: Q = Cd·A·√(2ΔP/ρ), solved over the
// tick so it settles at the room's pressure instead of overshooting it. What leaves is the mix inside;
// what comes back in, when the inside falls below the room, is room air. Returns what left, in mmol,
// and how fast it went.
export function vent(g, V, t, A, dt){
  const T = t + K0, n = moles(g), eq = P0*V/(R*T), ex = n - eq, out = {air:0, co2:0, vap:0, u:0};
  if (!A || Math.abs(ex) < 1e-7) return out;
  const mix = ex > 0 ? g : room(V, t), nm = moles(mix);
  const rho = p => p*(mix.air*MASS.air + mix.co2*MASS.co2 + mix.vap*MASS.vap)/nm/(R*T);
  // mmol a second through the hole with m mmol inside
  const flow = m => { const p = m*R*T/V, up = Math.max(p, P0), dp = Math.abs(p - P0);
    return Math.min(CD*A*Math.sqrt(2e3*dp/rho(up)), CD*A*400)*1e6*up/(R*T); };
  let lo = 0, hi = Math.abs(ex), s = Math.sign(ex);
  for (let i = 0; i < 24; i++) { const x = (lo + hi)/2; if (x < flow(n - s*x)*dt) lo = x; else hi = x; }
  const x = lo, f = x/nm;
  for (const k of ['air', 'co2', 'vap']) { const m = mix[k]*f; g[k] -= s*m; if (s > 0) out[k] = m; }
  if (s > 0) out.u = Math.min(400, x/dt*R*T/P0*1e-6/(CD*A));
  return out;
}
// Even with no pressure behind it, gas in an open mouth drifts out and room air drifts in, faster
// through a wider mouth into a smaller space.
export function draft(g, V, t, A, dt){
  const f = 1 - Math.exp(-DRAFT*A/(V*1e-6)*dt), r = room(V, t), k = moles(g)/moles(r);
  for (const key of ['air', 'co2', 'vap']) g[key] += (r[key]*k - g[key])*f;
}

// A balloon's rubber pressing on the gas in it (kPa over the gas outside): the Gent model for a thin
// sphere of rubber stretched λ times round, with V0 the gas it holds unstretched. It's hard at first,
// past λ ≈ 1.4 easier and easier, and stiff again as the rubber's chains pull straight near √(Jm/2).
// Below V0 it's slack and holds gas without pressing on it.
export function rubber(V, V0, Pk = 8, Jm = 145){
  if (V <= V0) return 0;
  const l = Math.cbrt(V/V0), I = 2*l*l + l**-4 - 3;
  return Pk*(1/l - l**-7)*Jm/Math.max(1, Jm - I);
}
