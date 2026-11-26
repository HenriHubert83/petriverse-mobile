// Original discovery scripts from the pinned creature_films.json. See CREDITS.md.
import entries from './creatureFilms.json';
import type {EncounterSimulation} from '../engine/encounterSimulation';
export interface CreatureFilm {kind:string;name:string;narration:string;scene:string;form:string}
export const creatureFilms:Readonly<Record<string,CreatureFilm>>=entries;
export function creatureFilm(id:string):CreatureFilm|undefined{return Object.hasOwn(creatureFilms,id)?creatureFilms[id]:undefined;}
/** Source offers only organisms that have visibly arrived, not future roster entries. */
export function visibleFilmSpecies(run:EncounterSimulation):string[]{
  const ids=run.enemies.filter(body=>body.health>0&&body.age>=1.4).map(body=>body.form||body.kind);
  if(run.phages.clusters.some(body=>body.age>=1.4))ids.push('phage');
  return [...new Set(ids)].filter(id=>Boolean(creatureFilm(id)));
}
export function newFilmOffers(run:EncounterSimulation,introduced:readonly string[],offered:readonly string[]):string[]{
  if(run.state!=='active'||run.selection.active||run.nudge.targetId>=0)return [];
  const known=new Set([...introduced,...offered]);return visibleFilmSpecies(run).filter(id=>!known.has(id));
}
