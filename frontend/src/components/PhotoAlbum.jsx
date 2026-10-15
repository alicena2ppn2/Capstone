import { useEffect, useState } from 'react';
import { albumPhotos } from '../../../shared/features/missionPhotos.js';
import { readWebPhoto } from '../utils/photoStorage.js';
function Photo({ item }) {
  const [url, setUrl] = useState(''), [error, setError] = useState('');
  useEffect(() => { let active = true, source;
    readWebPhoto(item.id).then(blob => { if (!active) return; if (!blob) throw new Error(); source = URL.createObjectURL(blob); setUrl(source); }).catch(() => { if (active) setError('이 기기에서 사진 파일을 찾지 못했어요.'); });
    return () => { active = false; if (source) URL.revokeObjectURL(source); };
  }, [item.id]);
  return <article className="photo-album-card">{url?<a href={url} target="_blank" rel="noreferrer" aria-label={`${item.title} 사진 크게 보기`}><img src={url} alt={item.title}/></a>:<p>{error||'사진 불러오는 중…'}</p>}<small>{item.date}</small><strong>{item.title}</strong><span>미션 완료 ✓</span></article>;
}
export default function PhotoAlbum({ game }) {
  const photos = albumPhotos(game);
  return <section className="photo-album"><h2>사진으로 남긴 도전</h2><p className="photo-local-note">이 기기에 저장한 미션 사진이에요.</p>{photos.length?<div className="photo-album-grid">{photos.map(item=><Photo key={item.id} item={item}/>)}</div>:<p>사진 미션을 완료하면 이곳에 사진과 도전이 함께 남아요.</p>}</section>;
}
