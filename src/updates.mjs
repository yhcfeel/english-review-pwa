import {isCardList} from './cards.mjs';

function bounded(promise, milliseconds=12000){
 let timer;
 return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),milliseconds);})]).finally(()=>clearTimeout(timer));
}
export async function checkAppUpdate(container,base){
 if(!container)return;
 const registration=await bounded(container.getRegistration(base));
 if(!registration)throw Error('registration');
 await bounded(registration.update());
 const worker=registration.installing||registration.waiting;
 if(!worker)return;
 await new Promise((resolve,reject)=>{
  const finish=(error)=>{clearTimeout(timer);worker.removeEventListener('statechange',change);error?reject(error):resolve();};
  const change=()=>{if(worker.state==='activated')finish();else if(worker.state==='redundant')finish(Error('install'));};
  const timer=setTimeout(()=>finish(Error('timeout')),12000);
  worker.addEventListener('statechange',change);change();
 });
}
export async function fetchLatestCards(base){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
 try{
  // Explicit refresh must fail offline, rather than reporting a cached copy as new.
  const response=await fetch(`${base}data/cards.json?refresh=${Date.now()}`,{cache:'no-store',signal:controller.signal});
  if(!response.ok)throw Error('network');
  const data=await response.json();if(!isCardList(data))throw Error('format');return data;
 }finally{clearTimeout(timer);}
}
