// Everyone who can speak: who they are, how they sound, and how to build them.
// Where they stand and what they say belongs to the world that places them.

import { C } from '../core/kit.js';
import { human, makeCat, makeOwl } from './build.js';

const librarian_O = {skin:0xb87a55, shirt:C.cream, sleeve:C.plum, coat:C.plum, coatLen:.62, coatFlare:.36, lapel:0x5a2e4e, pants:0x3a3550, skirt:0x34406b, hair:0x2a1c16, hairStyle:'bun', glasses:C.gold, chain:true, scarf:C.gold, buttons:3, buttonColor:C.gold, cuff:C.gold, shoe:0x4a2e22, hold:'book', scale:1.1, eye:0x3a2418};
const teacher_O = {skin:0xe6b894, shirt:0x6d3b5e, coat:0xece4d4, lapel:0xd8cdb8, coatLen:.78, coatFlare:.36, sleeve:0xece4d4, cuff:0x2f8f8a, pants:0x34406b, slimLegs:true, dress:0x6d3b5e, dressFlare:.37, flow:true, dressTrim:0xd9a441, collar:0xe9d9b8, hair:0xf07a26, brow:0xc8571a, hairStyle:'buns', build:'girl', freckles:true, tie:0x2f8f8a, goggles:true, earrings:0x6fd6c4, shoe:C.rust, hold:'clipboard', pens:true, scale:.98, browTilt:-.18, eye:0x2a4a3a, lashes:true, mouth:0xb8475a};
const pip_O = {skin:0xd9a07a, shirt:0x8c3b3b, coat:0x55804a, coatLen:.55, coatFlare:.34, pockets:true, sleeve:0x8c3b3b, shortSleeve:true, pants:0x6b5a3a, shorts:true, socks:C.cream, hair:0x2a1c16, hairStyle:'cap', capColor:C.navy, shoe:0x6b4430, binoculars:true, satchel:true, scale:.82};
const theo_O = {build:'boy', skin:0xf0c4a0, shirt:C.cream, sleeve:C.cream, shortSleeve:true, vest:0x3e6b45, vestTrim:0x2f5537, pants:0x6b5a3a, hair:0xa0602e, hairStyle:'curly', glasses:C.gold, freckles:true, bowtie:0x8c3b3b, shoe:0x4a2e22, backpack:C.navy, backpackFlap:C.gold, scale:.8, browTilt:.25};
const mo_O = {build:'girl', skin:0x5e3a26, shirt:0xd36a8f, sleeve:0xd36a8f, hood:0xd36a8f, strings:true, cuff:0xa84f70, patches:C.gold, pants:0x34406b, slimLegs:true, hair:0x1e1612, hairStyle:'braids', bow:C.gold, shoe:C.gold, strap:C.ink, lashes:true, browTilt:.18, mouth:0xb8475a, backpack:C.rust, backpackFlap:C.gold, scale:.8, eye:0x2a1810};
const juniper_O = {skin:0x8a5638, shirt:0xe7b84c, coat:0xe7b84c, closed:true, coatLen:.8, coatFlare:.4, buttons:4, buttonColor:C.ink, collar:0xd9a441, hood:0xe7b84c, pants:0x34406b, boots:C.rust, shoe:C.rust, hair:0x1e1612, hairStyle:'puffs', tie:0x2f8f8a, hold:'notebook', freckles:true, scale:.8, eye:0x2a1810};

export const PERSONA = {
  hoot: {id:'hoot', name:'Professor Hoot', role:'Wise owl', dot:'#c08a55', kind:'owl', labelY:1.55,
    voice:{type:'sine', base:262, scale:[0,3,5,7], len:.15, vol:.22, glide:1.22, vib:[9,6]},
    make: () => { const m = makeOwl(); m.root.scale.setScalar(.82); return m; }},
  pembrook: {id:'pembrook', name:'Ms. Pembrook', role:'Librarian', dot:'#9a5a86', kind:'human', labelY:2.45,
    voice:{type:'triangle', base:392, scale:[0,2,4,5,7], len:.09, vol:.18, glide:1.05, cut:2400},
    make: () => human(librarian_O)},
  sparks: {id:'sparks', name:'Dr. Vega Sparks', role:'Field trip scientist', dot:'#2f8f8a', kind:'human', labelY:2.45,
    voice:{type:'square', base:466, scale:[0,4,7,9,12], len:.065, vol:.08, glide:1.1, cut:2200, layer:true},
    make: () => human(teacher_O)},
  biscuit: {id:'biscuit', name:'Biscuit', role:'Hearth cat', dot:'#d68a45', kind:'cat', labelY:.8,
    voice:{type:'triangle', base:620, scale:[0,5,7], len:.12, vol:.08, glide:.8, cut:1800},
    make: () => makeCat()},
  pip: {id:'pip', name:'Pip', role:'Treehouse explorer', dot:'#4a5a8a', kind:'human', labelY:2.05,
    voice:{type:'square', base:587, scale:[0,2,4,7], len:.055, vol:.07, glide:1.12, cut:2800},
    make: () => human(pip_O)},
  juniper: {id:'juniper', name:'Juniper', role:'Treehouse explorer', dot:'#e7b84c', kind:'human', labelY:2.0,
    voice:{type:'triangle', base:740, scale:[0,3,5,7,10], len:.07, vol:.12, glide:1.08, cut:3000},
    make: () => human(juniper_O)},
  theo: {id:'theo', name:'Theo', role:'Careful classmate', dot:'#3e6b45', kind:'human', labelY:2.0,
    voice:{type:'triangle', base:523, scale:[0,1,3,5], len:.08, vol:.11, glide:.94, cut:2600},
    make: () => human(theo_O)},
  mo: {id:'mo', name:'Mo', role:'Snack-packing classmate', dot:'#d36a8f', kind:'human', labelY:2.0,
    voice:{type:'square', base:659, scale:[0,4,7,9,12], len:.05, vol:.06, glide:1.2, cut:3200},
    make: () => human(mo_O)}
};
