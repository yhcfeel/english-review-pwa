import {useLayoutEffect,useRef,useState} from 'react';
export const RATING_COOLDOWN_MS=800;
export function useRatingCooldown(presentation:string|null){
 const [ready,setReady]=useState(false),available=useRef(false);
 useLayoutEffect(()=>{
  available.current=false;setReady(false);
  let firstFrame=0,secondFrame=0,timer=0;
  if(presentation!==null)firstFrame=requestAnimationFrame(()=>{
   secondFrame=requestAnimationFrame(()=>{timer=window.setTimeout(()=>{available.current=true;setReady(true);},RATING_COOLDOWN_MS);});
  });
  return()=>{cancelAnimationFrame(firstFrame);cancelAnimationFrame(secondFrame);clearTimeout(timer);};
 },[presentation]);
 const claim=()=>{if(!available.current)return false;available.current=false;setReady(false);return true;};
 return {ready,claim};
}
