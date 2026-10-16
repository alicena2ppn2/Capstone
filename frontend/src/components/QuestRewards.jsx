import UiIcon from './UiIcon.jsx';

function XPIcon() {
  return <svg className="quest-xp-icon" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
    <path d="M14 2 L18 9 L26 11 L20 17 L21 25 L14 21 L7 25 L8 17 L2 11 L10 9Z" />
    <text x="14" y="17" textAnchor="middle">XP</text>
  </svg>;
}

export default function QuestRewards({ xp = 0, coins = 0, className = '', emptyText = '추가 보상 없음 · 완료하면 기록만 남아요' }) {
  const amountXp = Number(xp) || 0;
  const amountCoins = Number(coins) || 0;
  if (!amountXp && !amountCoins) return <span className={`quest-reward-empty ${className}`}>{emptyText}</span>;
  const label = [amountCoins > 0 && `${amountCoins} 코인`, amountXp > 0 && `${amountXp} XP`].filter(Boolean).join(', ');
  return <span className={`quest-reward-icons ${className}`} aria-label={`보상 ${label}`}>
    {amountCoins > 0 && <span className="quest-reward-token"><UiIcon kind="coin" size={17} /> +{amountCoins} 코인</span>}
    {amountXp > 0 && <span className="quest-reward-token"><XPIcon /> +{amountXp} XP</span>}
  </span>;
}
