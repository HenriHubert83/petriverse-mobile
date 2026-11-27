// Godot String::hash() uses DJB2 over UTF-32 code points (core/string/ustring.cpp).
// See licenses/Godot.txt. Used only for stable resident appearance and companionship.
export function godotStringHash(value:string):number{
  let hash=5381;
  for(const character of value){const code=character.codePointAt(0)!;if(code===0)break;hash=(Math.imul(hash,33)+code)>>>0;}
  return hash;
}
