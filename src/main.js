// Entry point: creates the Game.

import './style.css';
import { config } from './config.js';
import { Game } from './core/Game.js';

const game = new Game(config);
game.init(document.getElementById('app'));

// Handy for poking at systems from the browser console during development.
if (import.meta.env.DEV) window.game = game;
