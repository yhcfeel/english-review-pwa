/** Pack complete senses using their rendered heights; never truncate an example. */
export function packSenses(heights, heading, available, navigation = 42) {
 if(!heights.length)return [[]];
 if(heading+heights.reduce((a,b)=>a+b,0)<=available)return [heights.map((_,i)=>i)];
 const capacity=Math.max(0,available-navigation-heading);
 const pages=[];let page=[],used=0;
 heights.forEach((height,i)=>{
  if(page.length&&used+height>capacity){pages.push(page);page=[];used=0;}
  page.push(i);used+=height;
 });
 if(page.length)pages.push(page);
 return pages;
}
