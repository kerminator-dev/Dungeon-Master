<div align="center">

# DUNGEON MASTER

**A retro 3D maze crawler that runs in your browser.**
Find the key, open the gate, reach the exit, and keep your torch burning.

![three.js](https://img.shields.io/badge/three.js-r128-000000?logo=three.js&logoColor=white)
![No build step](https://img.shields.io/badge/build-none-e8c890)
![Plain JavaScript](https://img.shields.io/badge/JavaScript-vanilla-f7df1e?logo=javascript&logoColor=black)
![Procedural](https://img.shields.io/badge/levels-procedural-6a4024)

<img src="docs/screenshots/summer-ruins.png" alt="Summer ruins at sunset with the castle above the maze walls" width="100%">

</div>

## Two worlds

<table>
<tr>
<td width="50%"><img src="docs/screenshots/winter-aurora.png" alt="Winter ruins under the northern lights"></td>
<td width="50%"><img src="docs/screenshots/storm.png" alt="Summer ruins in a thunderstorm"></td>
</tr>
<tr>
<td colspan="2" align="center"><b>Outdoors.</b> Castle ruins in summer or winter. The season and the weather (clear, fog, storm, dust, snowfall, blizzard, northern lights) change every level.</td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/dungeon.png" alt="Torch-lit dungeon corridor"></td>
<td width="50%"><img src="docs/screenshots/catacombs-altar.png" alt="Catacombs altar between two braziers"></td>
</tr>
<tr>
<td colspan="2" align="center"><b>Underground.</b> Red-brick dungeons and limestone catacombs. Dark, cramped and full of treasure.</td>
</tr>
</table>

## What's down there

<table>
<tr>
<td width="50%"><img src="docs/screenshots/burial-alcove.png" alt="Mummy lying in a burial alcove"><br><sub>Burial alcoves carved into the walls hold mummies and skeletons.</sub></td>
<td width="50%"><img src="docs/screenshots/crystals.png" alt="Glowing crystals next to a chest"><br><sub>Glowing crystals and mushrooms light the darkest corners.</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/chest.png" alt="Chest on a stone plinth by a brazier"><br><sub>Chests in dead ends hold the key, the map, gold and gems.</sub></td>
<td width="50%"><img src="docs/screenshots/lockpicking.png" alt="Lockpicking screen"><br><sub>Locked chests need a lockpick and a steady hand.</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/map.png" alt="Burnt parchment map of the maze"><br><sub>Find the old parchment map, if the fire left enough of it.</sub></td>
<td width="50%"><img src="docs/screenshots/menu.png" alt="Main menu: choose your path"><br><sub>Pick a world and a maze size, and every level is new.</sub></td>
</tr>
</table>

## Features

- **Every level is generated from scratch.** The maze, the walls, the props and the skyline are all new each time, and each exit takes you one level deeper into a bigger maze.
- **Voxel brickwork.** Walls are built from 25 cm voxels with real bricks: chipped corners, holes, niches, stepped vaults and crumbling tops.
- **A living skyline.** Outdoor mazes are ringed by a castle with towers, gatehouses, keeps and halls, with temples, aqueducts and churches on the hills beyond.
- **Torch and shadows.** Your torch burns down over time, and you relight it at any fire. Shadows patrol the corridors and send you back to the start.
- **Loot.** You can find gold, lockpicks and 17 kinds of gems and soul gems in chests, burial urns and purses. Pray at an altar to make your torch last longer.
- **Behind the grates.** Barred windows look out into more of the underworld: corridors, caves, catacombs, sewers or old mines.
- **Synthesised sound.** Footsteps, fire, dripping water, thunder and a Nordic choir are all generated live with WebAudio, without a single audio file.

## Play

There's no build step and nothing to install. Clone the repository and open `index.html` in a browser:

```sh
git clone https://github.com/kerminator-dev/Labyrinth.git
cd Labyrinth
open index.html        # or just double-click it
```

| Key | Action |
| --- | --- |
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> | move |
| <kbd>Shift</kbd> | run |
| mouse | look |
| <kbd>E</kbd> | open, search, pick a lock |
| <kbd>M</kbd> | map (once you've found it) |
| <kbd>R</kbd> | new maze |
| <kbd>Esc</kbd> | menu |

When lockpicking, move the mouse to position the pick, then hold <kbd>W</kbd>, <kbd>E</kbd>, <kbd>Space</kbd> or the mouse button to turn the lock. Press <kbd>Q</kbd> to back off.

## Performance

The game is built to stay fast on modest hardware:

- the low-resolution pixel look is the main saving: the scene renders at a fraction of screen resolution
- **Auto quality** lowers the resolution further whenever the frame rate drops
- bricks, props and decor are drawn with instancing
- all flames and halos are drawn in two batches
- a cheap grid ray test skips parts of the maze hidden behind walls

**Settings** has draw distance, pixel size, FOV, an FPS limit and a toggle for post effects.

## Under the hood

Plain JavaScript and [three.js](https://threejs.org/). There's no bundler, every file is a plain `<script>`, and they load in order:

| File | What it does |
| --- | --- |
| `js/00-util.js` | random numbers, Perlin noise, settings |
| `js/01-textures.js` | procedural canvas textures |
| `js/02-themes.js` | themes and weather |
| `js/03-maze.js` | maze generation, collision grid |
| `js/04-walls.js` | voxel walls, vaults, niches, burial alcoves |
| `js/05-world.js` | floors, sky, terrain, lights, portals |
| `js/05b-props.js` | props, remains, glowing crystals and mushrooms |
| `js/05c-audio.js` | synthesised sound and music |
| `js/05d-gameplay.js` | chests, key and gate, lockpicking, torch, shadows |
| `js/05e-creatures.js` | pixel-art monster sprites |
| `js/05f-ambience.js` | banners, roots, light shafts, ground fog, rubble |
| `js/05g-hud.js` | inventory panel |
| `js/05h-skyline.js` | castles, towers, temples and villages on the horizon |
| `js/05i-beyond.js` | the world behind the grates |
| `js/06-game.js` | renderer, movement, culling, menu, main loop |
| `js/07-post.js` | bloom, colour grading, vignette |

## Tests

The tests drive the real game in headless Chromium through Playwright:

```sh
npm install
npm test              # walk-through, game mechanics, stress test over all themes, memory leaks
npm run shot dungeon  # screenshots of a level
```
