// The plate tectonics field trip: why mountains grow taller and the ground sometimes shakes.

import { buildBoundaries } from './boundaries.js';
import { buildConveyor } from './conveyor.js';
import { buildPuzzle } from './puzzle.js';
import { buildQuiz } from './quiz.js';
import { buildSlice } from './slice.js';

export const tectonics = {
  id: 'tectonics',
  intro: [['sparks', "All aboard the Wonder Bus, {name}! Today's big question: why do mountains grow taller, and why does the ground sometimes shake?"],
          ['juniper', "I've got my notebook and my raincoat. Ready!"],
          ['pip', "Buckle up, everybody. Where are we going?"],
          ['sparks', "Up into the sky, and then straight into the Earth itself! Hold on to your hats!"]],
  stages: [
    {title:'A Slice of the Earth', build:buildSlice},
    {title:'The Mantle Conveyor Belt', build:buildConveyor},
    {title:'The Continent Puzzle', build:buildPuzzle},
    {title:'Where Plates Meet', build:buildBoundaries},
    {title:'The Explorer Check', build:buildQuiz}
  ],
  outro: [['sparks', "Home sweet Lantern Hill! So, {name}: mountains grow and the ground shakes because Earth's crust is cracked into plates that are always on the move."],
          ['pip', "Can we go on another field trip tomorrow?"],
          ['sparks', "Absolutely. Next stop... who knows? That's the fun of it!"]],
  badge: {title:'Plate Tectonics Explorer', draw:drawBadge,
    text: name => `You explored Earth's layers, rode the mantle conveyor belt, solved the continent puzzle, and made plates pull apart, push together and slide past. Splendid work, ${name}!`}
};

function drawBadge(c){
  const g = c.getContext('2d'), s = c.width/360; g.setTransform(s, 0, 0, s, 0, 0); g.clearRect(0, 0, 360, 360); g.translate(180, 170);
  g.lineJoin = 'round';
  g.fillStyle = '#b5552f'; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx*34, 70); g.lineTo(sx*70, 180); g.lineTo(sx*46, 160); g.lineTo(sx*24, 182); g.closePath(); g.fill(); g.strokeStyle = '#1a1320'; g.lineWidth = 5; g.stroke(); }
  g.fillStyle = '#d9a441'; g.beginPath(); g.arc(0, 0, 128, 0, 7); g.fill(); g.strokeStyle = '#1a1320'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#2f5552'; g.beginPath(); g.arc(0, 0, 100, 0, 7); g.fill();
  g.save(); g.beginPath(); g.arc(0, 0, 100, 0, 7); g.clip();
  g.fillStyle = '#f2963a'; g.fillRect(-100, 36, 200, 70);
  g.fillStyle = '#6b5a52'; g.beginPath(); g.moveTo(-100, 38); g.lineTo(-46, -34); g.lineTo(-12, 6); g.lineTo(22, -58); g.lineTo(68, 12); g.lineTo(100, -12); g.lineTo(100, 38); g.closePath(); g.fill();
  g.fillStyle = '#f6ecd6'; g.beginPath(); g.moveTo(22, -58); g.lineTo(8, -34); g.lineTo(36, -34); g.closePath(); g.fill();
  g.strokeStyle = '#1a1320'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 38); g.lineTo(-9, 58); g.lineTo(7, 74); g.lineTo(-5, 104); g.stroke();
  g.restore();
  for (let i = 0; i < 3; i++) { g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 6 : 14, a = k*Math.PI/5 - Math.PI/2; g.lineTo(-50 + i*50 + Math.cos(a)*r, -74 + Math.sin(a)*r); } g.closePath(); g.fillStyle = '#ffd36b'; g.fill(); g.strokeStyle = '#1a1320'; g.lineWidth = 2.5; g.stroke(); }
}
