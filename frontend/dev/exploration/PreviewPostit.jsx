import React from 'react';

export default function PreviewPostit({ note, reaction, onReact, children }) {
  return <article className={`postit paper-${note.color}`}>
    <span className="postit-tape" aria-hidden="true" />
    {note.sticker && <span className="postit-personal-sticker" aria-label={`선택한 스티커 ${note.sticker}`}>{note.sticker}</span>}
    <p className="postit-copy">{note.text}</p>
    <footer className="postit-meta"><span>{note.author}</span><time>{note.date}</time></footer>
    {children}
    <div className="postit-reactions">
      <button className={`postit-heart${reaction === 'heart' ? ' chosen' : ''}`} type="button" aria-label={reaction === 'heart' ? '하트 반응 취소' : '하트 반응 남기기'} aria-pressed={reaction === 'heart'} onClick={() => onReact('heart')}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
      </button>
    </div>
  </article>;
}
