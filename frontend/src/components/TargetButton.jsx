export default function TargetButton({ game, kind, item, onTarget }) {
  const key = `${kind}:${item.id}`;
  return <button type="button" className="pb ui-secondary target-button" aria-pressed={game.targetItem === key} title={game.targetItem === key ? '다시 누르면 목표를 해제해요' : undefined} onClick={() => onTarget(game.targetItem === key ? null : key)}>{game.targetItem === key ? '목표로 선택됨' : '목표로 선택'}</button>;
}
