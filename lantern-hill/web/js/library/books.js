// The books on the Library Nook shelf. Each book's pages are images in books/<id>/p001.jpg …,
// rendered from the source PDF. The first two and last two pages are printed on the covers (outside and
// inside of each), so a book has an even number of pages.

import { load } from '../save.js';

export const BOOKS = [
  { id: 'simple-machines', title: 'Simple Machines', sub: 'Core Knowledge Science · Grade 1', pages: 50, dir: 'books/simple-machines/', aspect: .8,
    credit: 'Core Knowledge Science, Grade 1 Unit 4: Simple Machines (Student Reader). © Core Knowledge Foundation, CC BY-NC-SA 4.0.' },
  // the source PDF's first page is the cover spread (back, spine, front), cut into the front and back covers
  // here; its last page, another book's cover, is left out
  { id: 'alexander-graham-bell', title: 'Alexander Graham Bell', sub: 'Core Knowledge Voices in History', pages: 68, dir: 'books/alexander-graham-bell/', aspect: 723/1100,
    credit: 'Alexander Graham Bell: Voice of the Future, by Katy S. Duffield, illustrated by Christopher Thornock. © 2025 Core Knowledge Foundation, CC BY-NC-SA 4.0.' },
];

// how far along they are, for a label beside the book
export function progress(b){
  const st = (load('books') || {})[b.id] || {}, pct = Math.round(100*(st.seen || []).length/b.pages);
  return st.read ? 'Finished ⭐' : pct ? pct + '% read' : 'Not started yet';
}
