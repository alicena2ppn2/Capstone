import { CLOTHES } from './clothes.js';
import { DECOR } from './decor.js';
// Presentation reads the existing paid receipt; it never calculates or awards rewards.
export function newAttendanceReward(previous, next, date) {
  return !previous.attendance?.[date] && next.attendance?.[date] ? next.attendance[date] : null;
}
export const DECOR_VIEWBOX = {lamp:'15 225 85 155',carpet:'12 425 344 110',frame:'278 245 80 78',doll:'289 297 54 80',scenery:'124 160 120 170'};
export function rewardPresentation(receipt) {
  return (Array.isArray(receipt)?receipt:[receipt]).filter(Boolean).flatMap(reward=>{
    if(['coins','xp'].includes(reward.type)&&Number.isFinite(reward.amount))return [{...reward,label:`+${reward.amount} ${reward.type==='coins'?'코인':'XP'}`}];
    const item=(reward.type==='outfit'?CLOTHES:reward.type==='decor'?DECOR:[]).find(item=>item.id===reward.id);
    return item?[{...reward,item,label:item.name}]:[];
  });
}
