export default function NicknameEntry({value,onChange,onSubmit,busy,message}) {
  return <form className="nickname-entry" onSubmit={event=>{event.preventDefault();onSubmit(value);}} aria-busy={busy}>
    <h2>어떤 이름으로 시작할까요?</h2><p>사용할 닉네임을 정해 주세요.</p>
    <label htmlFor="account-nickname">닉네임</label>
    <input id="account-nickname" className="inp" value={value} onChange={event=>onChange(event.target.value)} disabled={busy} autoComplete="nickname" aria-describedby="nickname-help nickname-message" />
    <small id="nickname-help">2~12자 · 사용 가능 여부는 서버에서 확인해요.</small>
    <p id="nickname-message" role="alert">{message}</p>
    <button type="submit" className="pb ui-primary" disabled={busy||!value.trim()}>{busy?'등록 중…':'닉네임으로 시작하기'}</button>
  </form>;
}
