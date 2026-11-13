// Entry point: boots the engine and wires up the start screen.
import './style.css';
import { Game } from './core/Game.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('start-screen').classList.add('hidden');
  game.start();
});

// Handy for debugging / testing from the browser console:
//   game.popups.spawnRandom(), game.player.knockDown(), game.economy.add(100)
window.game = game;
