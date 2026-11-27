// The original HUD enlarges small text by 1.3 while retaining title hierarchy.
export function textMetrics(fontSize:number,lineHeight:number|undefined,largeText:boolean):{fontSize:number;lineHeight?:number}{
  const size=largeText&&fontSize<=17?Math.round(fontSize*1.3):fontSize;
  return {fontSize:size,...(lineHeight===undefined?{}:{lineHeight:size===fontSize?lineHeight:Math.ceil(lineHeight*size/fontSize)})};
}
export function highContrastTextColor(color:unknown):unknown{
  if(typeof color!=='string')return color;
  const match=/^#([a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i.exec(color);
  if(!match)return color;
  const hex=match[1].length===3?match[1].split('').map(c=>c+c).join(''):match[1];
  const red=parseInt(hex.slice(0,2),16),green=parseInt(hex.slice(2,4),16),blue=parseInt(hex.slice(4,6),16);
  // Preserve dark text on light labels as well as light text on the pond.
  return red*0.2126+green*0.7152+blue*0.0722<128?'#031014':'#f3fff5';
}
