import UiIcon from './UiIcon.jsx';
export default function BottomNav({screen,onNavigate}) {
  return <nav className="game-bottom-nav" aria-label="주요 화면">{[['quest','퀘스트','routine'],['home','홈','home'],['shop','상점','shop']].map(([id,label,icon])=><button type="button" key={id} className={`bottom-nav-item${id==='home'?' bottom-nav-home':''}`} aria-current={screen===id?'page':undefined} onClick={()=>onNavigate(id)}><UiIcon kind={icon} size={id==='home'?26:22}/><span>{label}</span></button>)}</nav>;
}
