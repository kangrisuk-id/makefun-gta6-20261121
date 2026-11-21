[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/kangrisuk-id/makefun-gta6-20261121/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/kangrisuk-id/makefun-gta6-20261121/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Palmera Bay: Vice Run

A complete top-down open-world crime game in pure vanilla JavaScript and Canvas — no libraries,
no assets, no network. Built for the [make.fun](https://make.fun/bounty/gta6-01) bounty **gta6-01**.

Welcome to **Palmera Bay**, a sun-soaked coastal city of palm-lined avenues, neon signs, a marina
beach and six named districts — Coral Heights, Downtown Palmera, Marina Palms, Solano Yards, the
Old Market and Loma Beach.

## The story

You are **Rio Solano**, a broke courier with a fast right foot. Fixer **Marisol Vega** offers one
last chain of jobs, told through phone messages:

1. **First Light** — meet Marisol at the Loma pier.
2. **Coral Coupe** — steal a coral-red coupe and deliver it to the Solano garage.
3. **Scattered Packs** — collect four courier packages across the city… which turn out to be bait.
4. **Lose the Heat** — escape a police ambush and break their line of sight.
5. **Last Run on the Bay** — clear the warehouse crew, then make the getaway to the pier ($5,000).

After the finale the city stays open: free roam with repeatable paid delivery side jobs.

## Features

- **Open world**: a large multi-screen city — road grid with lanes, crosswalks and signs, varied
  buildings, parks, parking lots, palm trees, a beach and the ocean.
- **On foot & driving**: walk, sprint, aim with the mouse, punch or shoot; enter and carjack any
  car (drivers may flee or fight), with drift-feel driving, crashes, smoke and screen shake.
- **Living traffic & pedestrians**: AI cars follow the road network, stop for each other and honk;
  pedestrians stroll the sidewalks and flee from gunfire and fast cars.
- **Wanted system**: 1–5 stars for theft, assault, shooting, hit-and-runs and cop crimes; police
  cars chase and ram, officers pursue on foot; heat decays when you break line of sight.
  Get caught and you're **BUSTED**; lose your health and you're **WASTED** — both end at the
  Clínica del Sol for $100.
- **Combat**: pistol with magazine and reload, muzzle flash, tracers, NPC health, cash drops.
- **HUD & minimap**: cash, health, respect, wanted stars, weapon/ammo, mission objective with a
  world beacon and direction arrow, district name, speedometer — and an always-on minimap with
  roads, police blips, the target car and mission markers.
- **Sound**: fully synthesized WebAudio — engine hum, horns, gunshots, sirens, pickups and a
  bassline loop. No audio files.
- **Save game**: cash, mission progress and position persist in `localStorage` (Continue on the
  title screen).

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrows | Move / drive |
| Shift | Sprint |
| Mouse | Aim |
| Click / J | Punch (close) or shoot |
| E / F | Enter / exit car (carjack) |
| R | Reload |
| Esc / P | Pause |
| M | Mute |

## Run it

```sh
node serve.ts            # serves game/ at http://localhost:8080
node main.ts             # with MAKEFUN_OUTPUT_DIR set, packages game + screenshots + dossier
```

Everything in the city, story and art is original — no third-party names, logos, characters,
maps or assets.
