import { rewardPresentation, DECOR_VIEWBOX } from '../../../shared/features/rewardFeedback.js';
import HouseDecor from './HouseDecor.jsx';
import RewardGlyphDrawing from '../../../shared/art/RewardGlyphDrawing.jsx';
export default function RewardPanel({receipt}) {
  return <div className="attendance-award" role="status" aria-live="polite"><small>오늘 받은 선물</small>{rewardPresentation(receipt).map((reward,index)=><div className="attendance-award-row" key={index}><svg width="64" height="64" viewBox={reward.type==='decor'?DECOR_VIEWBOX[reward.item.slot]:'0 0 64 64'} aria-hidden="true">{reward.type==='decor'?<HouseDecor equipped={{[reward.item.slot]:reward.id}}/>:<RewardGlyphDrawing reward={reward}/>}</svg><strong>{reward.label}</strong></div>)}</div>;
}
