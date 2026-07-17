import {
  people,
  animals,
  objects,
  places,
  states,
  verbs,
  materials,
} from './words.js';

import { pick } from './randomPicker.js';

const nouns = [...people, ...animals, ...objects, ...places];

export const templates: Array<() => string> = [
  //noun + state
  () => `${pick(nouns)}${pick(states)}`,

  //nouns + materials
  () => `${pick(nouns)}${pick(materials)}`,

  //verbs + places
  () => `${pick(verbs)}En${pick(places)}`,

  //nouns + objects
  () => `${pick(nouns)}Sin${pick(objects)}`,

  //objects + places
  () => `${pick(objects)}Del${pick(places)}`,

  //people + verbs
  () => `${pick(people)}Que${pick(verbs)}`,

  //animals + places
  () => `${pick(animals)}En${pick(places)}`,

  //objects + states
  () => `${pick(objects)}${pick(states)}`,

  //animals + places
  () => `${pick(animals)}${pick(places)}`,

  //objects + materials
  () => `${pick(objects)}De${pick(materials)}`,
];
