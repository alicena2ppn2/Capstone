import UiIcon from './UiIcon.jsx';
export default function ScreenHeader({ title, onBack, backLabel = '홈 화면으로 돌아가기', titleId, children, decorated = false }) {
  return <header className="ui-screen-header">
    <button type="button" className="pb ui-secondary ui-back" onClick={onBack} aria-label={backLabel}>
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    <h1 id={titleId}>{title}{title === '방명록' && <UiIcon kind="envelope" />}</h1>
    {children}
  </header>;
}
