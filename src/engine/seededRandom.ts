// PCG32 and Godot-compatible single-precision range sampling.
// PCG (c) 2014 M.E. O'Neill, Apache-2.0; Godot contributors, MIT.
// See licenses/PCG.txt and licenses/Godot.txt. Adapted to TypeScript BigInt.
const MASK=(1n<<64n)-1n,DEFAULT_SEQUENCE=1442695040888963407n;
export interface RandomSnapshot {state:string;increment:string}
export class SeededRandom {
  private state=0n;
  private readonly increment:bigint;
  constructor(seed:number|bigint,sequence=DEFAULT_SEQUENCE){
    this.increment=((sequence<<1n)|1n)&MASK;
    this.uint32();this.state=(this.state+BigInt(seed))&MASK;this.uint32();
  }
  uint32():number{
    const old=this.state;this.state=(old*6364136223846793005n+this.increment)&MASK;
    const bits=Number((((old>>18n)^old)>>27n)&0xffffffffn),rotation=Number(old>>59n);
    return ((bits>>>rotation)|(bits<<((-rotation)&31)))>>>0;
  }
  int(from:number,to:number):number{
    if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to))throw new RangeError('Expected integer random range');
    const lo=Math.min(from,to),hi=Math.max(from,to),bound=hi-lo+1;
    if(bound>4294967296)throw new RangeError('Random range exceeds uint32');
    if(lo===hi)return lo;
    if(bound===4294967296)return lo+this.uint32();
    const threshold=4294967296%bound;
    let value:number;do{value=this.uint32();}while(value<threshold);
    return lo+value%bound;
  }
  float(from=0,to=1):number{
    const exponent=this.uint32();
    const fraction=exponent===0?0:Math.fround(Math.fround((this.uint32()|0x80000001)>>>0)*2**(-32-Math.clz32(exponent)));
    const lo=Math.fround(from),hi=Math.fround(to);
    return Math.fround(Math.fround(fraction*Math.fround(hi-lo))+lo);
  }
  pick<T>(values:readonly T[]):T{if(!values.length)throw new RangeError('Empty random choice');return values[this.int(0,values.length-1)];}
  clone():SeededRandom{const result=new SeededRandom(0,(this.increment-1n)>>1n);result.state=this.state;return result;}
  snapshot():string{return this.state.toString();}
  saveState():RandomSnapshot{return {state:this.state.toString(),increment:this.increment.toString()};}
  static restore(value:unknown):SeededRandom{
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid random state');
    const data=value as Record<string,unknown>;
    const read=(field:string):bigint=>{
      const text=data[field];
      if(typeof text!=='string'||!/^(0|[1-9][0-9]{0,19})$/.test(text))throw new Error('Invalid random state');
      const number=BigInt(text);if(number>MASK)throw new Error('Random state exceeds uint64');return number;
    };
    const state=read('state'),increment=read('increment');
    if((increment&1n)!==1n)throw new Error('Invalid random stream');
    const result=new SeededRandom(0,(increment-1n)>>1n);result.state=state;return result;
  }
}
