// Exact alpha threshold and 192px two-pass chamfer field from amoeba_outline.gd.
export const AMOEBA_OUTLINE_RESOLUTION=192;
export function amoebaOutline(pixels:ArrayLike<number>,width:number,height:number,resolution=AMOEBA_OUTLINE_RESOLUTION):Float32Array{
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||pixels.length<width*height*4||!Number.isInteger(resolution)||resolution<2)throw RangeError('Invalid amoeba artwork');
  const count=resolution*resolution,inside=new Uint8Array(count),distance=new Float32Array(count),diagonal=Math.SQRT2;
  for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
    const sourceX=Math.floor((x+.5)*width/resolution),sourceY=Math.floor((y+.5)*height/resolution);
    inside[y*resolution+x]=pixels[(sourceY*width+sourceX)*4+3]/255>.45?1:0;
  }
  for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
    const index=y*resolution+x,value=inside[index];
    const boundary=(x>0&&inside[index-1]!==value)||(x<resolution-1&&inside[index+1]!==value)||(y>0&&inside[index-resolution]!==value)||(y<resolution-1&&inside[index+resolution]!==value);
    distance[index]=boundary?.5:1000;
  }
  for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
    const i=y*resolution+x;if(x>0)distance[i]=Math.min(distance[i],distance[i-1]+1);
    if(y>0){distance[i]=Math.min(distance[i],distance[i-resolution]+1);if(x>0)distance[i]=Math.min(distance[i],distance[i-resolution-1]+diagonal);if(x<resolution-1)distance[i]=Math.min(distance[i],distance[i-resolution+1]+diagonal);}
  }
  for(let y=resolution-1;y>=0;y--)for(let x=resolution-1;x>=0;x--){
    const i=y*resolution+x;if(x<resolution-1)distance[i]=Math.min(distance[i],distance[i+1]+1);
    if(y<resolution-1){distance[i]=Math.min(distance[i],distance[i+resolution]+1);if(x>0)distance[i]=Math.min(distance[i],distance[i+resolution-1]+diagonal);if(x<resolution-1)distance[i]=Math.min(distance[i],distance[i+resolution+1]+diagonal);}
  }
  const encoded=new Float32Array(count*4);
  for(let i=0;i<count;i++){
    const signed=distance[i]*(inside[i]?-1:1)/resolution,value=Math.max(0,Math.min(1,.5+signed*.5));
    encoded[i*4]=value;encoded[i*4+1]=value;encoded[i*4+2]=value;encoded[i*4+3]=1;
  }
  return encoded;
}
