import React from 'react';
import { createRoot } from 'react-dom/client';
import Mochi from '../src/components/Mochi.jsx';
import { CHARACTER_EXPANSION } from '../../shared/data/characterExpansion.js';
import './proposal-characters.css';

// Match the warm, softly outlined character SVGs already used in MY MOCHI.
const ink = '#AE9480';
const line = { stroke: ink, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' };

function Eyes({ x1 = 83, x2 = 117, y = 107, size = 1, iris = '#67523F', shape = 'round' }) {
  const rx = shape === 'wide' ? 10.5 : shape === 'small' ? 8.4 : 9.5;
  const ry = shape === 'wide' ? 10.4 : shape === 'small' ? 10.2 : 12;
  return <g>
    {[x1, x2].map((x, index) => <g key={index}>
      <ellipse cx={x} cy={y} rx={rx * size} ry={ry * size} fill={iris} />
      <ellipse cx={x} cy={y + 4.1 * size} rx={rx * .72 * size} ry={4.6 * size} fill="#B89C7B" opacity=".94" />
      <ellipse cx={x - 2.4 * size} cy={y - 4.6 * size} rx={3.4 * size} ry={4.1 * size} fill="#FFFDFA" />
      <circle cx={x + 3.5 * size} cy={y + .2 * size} r={1.9 * size} fill="#FFFFFF" />
      <circle cx={x - 1.2 * size} cy={y + 7.2 * size} r={1.1 * size} fill="#FFF4EE" />
    </g>)}
  </g>;
}

function Face({ eyes, mouth = 'M96 119 Q100 122 104 119', cheeks = true }) {
  return <g><Eyes {...eyes} /><path d={mouth} fill="none" {...line} strokeWidth="1.8" />
    {cheeks && <g fill="#EFAFBA" opacity=".36"><ellipse cx="69" cy="116" rx="8" ry="5"/><ellipse cx="131" cy="116" rx="8" ry="5"/></g>}</g>;
}

function Bori() {
  return <g {...line}>
    <ellipse cx="100" cy="199" rx="49" ry="5" fill="#AE806A" opacity=".15" stroke="none"/>
    <path d="M132 160 Q153 150 158 133 Q165 117 154 116 Q145 116 145 129 Q143 141 129 142Z" fill="#DDA98F"/>
    <path d="M146 125 Q153 119 159 123 M141 136 Q150 131 157 136 M134 145 Q143 141 150 147" fill="none" stroke="#A87560" strokeWidth="2.2"/>
    <path d="M76 128 Q100 119 124 128 Q139 145 134 174 Q130 188 100 189 Q70 188 66 174 Q61 145 76 128Z" fill="#DDA98F"/>
    <ellipse cx="100" cy="159" rx="20" ry="20" fill="#FFF4E5" stroke="none"/>
    <ellipse cx="80" cy="187" rx="17" ry="9" fill="#EAC0A9"/><ellipse cx="120" cy="187" rx="17" ry="9" fill="#EAC0A9"/>
    <path d="M70 139 Q56 135 56 150 Q57 163 69 162 M130 139 Q144 135 144 150 Q143 163 131 162" fill="#DDA98F"/>
    <path d="M61 57 Q47 36 61 28 Q76 23 84 51 M116 51 Q124 24 139 29 Q153 37 137 60" fill="#DDA98F"/>
    <path d="M62 49 Q57 37 64 34 Q72 36 76 52 M126 51 Q133 35 140 37 Q145 43 137 53" fill="#F6D9C9" stroke="none"/>
    <path d="M100 34 C68 27 43 47 42 79 Q34 109 57 130 Q77 145 100 139 Q123 145 143 130 Q166 109 158 79 C157 47 132 27 100 34Z" fill="#DDA98F"/>
    <path d="M50 91 Q63 77 80 84 Q93 89 91 106 Q88 121 70 122 Q55 121 49 108Z M150 91 Q137 77 120 84 Q107 89 109 106 Q112 121 130 122 Q145 121 151 108Z" fill="#FFF4E5" stroke="none"/>
    <Face eyes={{ x1: 78, x2: 122, y: 91, size: .98, iris: '#704C3E', shape: 'round' }} mouth="M96 113 Q100 116 104 113" />
    <ellipse cx="100" cy="107" rx="3.5" ry="2.5" fill="#A87560" stroke="none"/><path d="M100 110 V114 M95 116 Q100 120 105 116" fill="none" stroke="#916E62" strokeWidth="1.8"/>
  </g>;
}

function Bibi() {
  return <g {...line}>
    <ellipse cx="100" cy="199" rx="49" ry="5" fill="#8BAFA5" opacity=".15" stroke="none"/>
    <path d="M124 153 Q145 148 154 158 Q160 167 151 173 Q138 171 127 164Z" fill="#C6DAD4"/>
    <path d="M74 131 Q100 121 126 131 Q140 147 134 175 Q131 188 100 189 Q69 188 66 175 Q60 147 74 131Z" fill="#C6DAD4"/>
    <ellipse cx="81" cy="187" rx="16" ry="8" fill="#B3CDC5"/><ellipse cx="119" cy="187" rx="16" ry="8" fill="#B3CDC5"/>
    <path d="M72 143 Q58 140 58 153 Q60 165 72 162 M128 143 Q142 140 142 153 Q140 165 128 162" fill="#C6DAD4"/>
    <path d="M72 70 Q65 52 76 48 Q88 45 92 68 M108 68 Q112 45 124 48 Q135 52 128 70" fill="#C6DAD4"/>
    <path d="M64 76 Q44 71 42 89 Q40 106 62 111 M136 76 Q156 71 158 89 Q160 106 138 111" fill="#B3CDC5"/>
    <path d="M100 34 C72 29 51 47 49 76 Q44 101 62 120 Q78 136 100 132 Q122 136 138 120 Q156 101 151 76 C149 47 128 29 100 34Z" fill="#C6DAD4"/>
    <path d="M82 124 Q100 132 118 124 L117 143 Q100 150 83 143Z" fill="#F3D3BB"/>
    <path d="M94 40 Q100 34 106 40" fill="none" stroke="#8BAFA5" strokeWidth="2.2"/>
    <Face eyes={{ x1: 81, x2: 119, y: 91, size: .95, iris: '#536D68', shape: 'wide' }} mouth="M95 111 Q100 116 105 111" />
    <ellipse cx="98" cy="104" rx="2.2" ry="1.6" fill="#8B7468" stroke="none"/><circle cx="106" cy="105" r="1.3" fill="#8B7468" stroke="none"/>
    <path d="M122 124 Q132 132 145 128 Q151 132 146 137 Q133 143 122 136" fill="#C6DAD4"/>
  </g>;
}

function Coco() {
  return <g {...line}>
    <ellipse cx="100" cy="199" rx="49" ry="5" fill="#A97858" opacity=".15" stroke="none"/>
    <path d="M130 158 Q147 148 153 128 Q158 110 169 106 Q180 101 180 114 Q179 132 164 143 Q157 154 148 167 Q139 176 129 168Z" fill="#C98F68"/>
    <path d="M166 111 Q172 115 175 119 M161 128 Q168 132 172 136 M151 147 Q158 151 162 155" fill="none" stroke="#F3D2AE" strokeWidth="2.5"/>
    <path d="M77 130 Q100 121 123 130 Q137 147 132 174 Q128 188 100 189 Q72 188 68 174 Q63 147 77 130Z" fill="#D9B08D"/>
    <ellipse cx="81" cy="187" rx="16" ry="8" fill="#C98F68"/><ellipse cx="119" cy="187" rx="16" ry="8" fill="#C98F68"/>
    <path d="M71 143 Q57 140 58 153 Q61 165 72 162 M129 143 Q143 140 142 153 Q139 165 128 162" fill="#D9B08D"/>
    <path d="M65 62 Q57 43 70 39 Q83 37 87 63 M113 63 Q117 37 130 39 Q143 43 135 65" fill="#D9B08D"/>
    <path d="M100 34 C69 29 47 48 46 79 Q40 105 60 124 Q78 139 100 135 Q122 139 140 124 Q160 105 154 79 C153 48 131 29 100 34Z" fill="#D9B08D"/>
    <path d="M54 100 Q68 87 87 94 Q95 101 90 115 Q82 125 66 122 Q55 118 54 100Z M146 100 Q132 87 113 94 Q105 101 110 115 Q118 125 134 122 Q145 118 146 100Z" fill="#FFF0DC" stroke="none"/>
    <Face eyes={{ x1: 83, x2: 117, y: 91, size: .82, iris: '#6A503E', shape: 'small' }} mouth="M96 111 Q100 115 104 111" />
    <ellipse cx="100" cy="105" rx="3" ry="2.2" fill="#9E7358" stroke="none"/><path d="M96 115 Q100 119 104 115" fill="none" stroke="#916E62" strokeWidth="1.7"/>
  </g>;
}

function Rose() {
  return <g {...line}>
    <ellipse cx="100" cy="199" rx="47" ry="5" fill="#A9889C" opacity=".14" stroke="none"/>
    <path d="M78 130 Q100 122 122 130 Q136 148 131 176 Q128 188 100 189 Q72 188 69 176 Q64 148 78 130Z" fill="#E5D0DB"/>
    <path d="M82 181 Q77 189 82 194 Q89 196 93 190 L94 177 M118 181 Q123 189 118 194 Q111 196 107 190 L106 177" fill="#E5D0DB"/>
    <path d="M73 143 Q60 140 61 153 Q64 165 75 162 M127 143 Q140 140 139 153 Q136 165 125 162" fill="#E5D0DB"/>
    <path d="M75 65 Q66 45 78 39 Q89 37 94 63 M106 63 Q111 37 123 39 Q135 45 125 65" fill="#E5D0DB"/>
    <path d="M100 34 C73 30 54 49 53 78 Q49 103 67 122 Q82 137 100 134 Q118 137 133 122 Q151 103 147 78 C146 49 127 30 100 34Z" fill="#E5D0DB"/>
    <path d="M57 78 Q62 51 88 48 Q112 43 136 63 Q120 59 108 72 Q95 62 80 75 Q69 80 57 78Z" fill="#C69AB1"/>
    <path d="M75 51 Q81 43 87 51 M116 51 Q123 42 130 52" fill="#F4E4EB"/>
    <path d="M91 60 Q100 51 109 60 Q100 69 91 60Z" fill="#F4C96A"/><circle cx="101" cy="59" r="2" fill="#FFF7D8" stroke="none"/>
    <Face eyes={{ x1: 82, x2: 118, y: 91, size: .92, iris: '#65506E', shape: 'wide' }} mouth="M95 113 Q100 118 105 113" />
    <ellipse cx="100" cy="106" rx="3" ry="2" fill="#A77F92" stroke="none"/><path d="M97 118 Q100 121 103 118" fill="none" stroke="#8D7180" strokeWidth="1.7"/>
  </g>;
}

function Tomi() {
  return <g {...line}>
    <ellipse cx="100" cy="199" rx="51" ry="5" fill="#929BB3" opacity=".15" stroke="none"/>
    <path d="M75 132 Q100 122 125 132 Q140 148 134 175 Q130 189 100 189 Q70 189 66 175 Q60 148 75 132Z" fill="#D5D9E8"/>
    <ellipse cx="80" cy="187" rx="18" ry="9" fill="#B9C2D8"/><ellipse cx="120" cy="187" rx="18" ry="9" fill="#B9C2D8"/>
    <path d="M67 143 Q52 139 53 154 Q57 167 70 162 M133 143 Q148 139 147 154 Q143 167 130 162" fill="#D5D9E8"/>
    <path d="M63 70 Q44 57 35 77 Q27 99 43 121 Q52 133 69 126Z M137 70 Q156 57 165 77 Q173 99 157 121 Q148 133 131 126Z" fill="#BCC4D9"/>
    <path d="M48 80 Q39 93 51 115 Q58 123 65 117 Q70 103 61 82Z M152 80 Q161 93 149 115 Q142 123 135 117 Q130 103 139 82Z" fill="#E9EAF2" stroke="none"/>
    <path d="M100 34 C72 30 51 49 50 79 Q45 106 64 126 Q79 140 100 136 Q121 140 136 126 Q155 106 150 79 C149 49 128 30 100 34Z" fill="#D5D9E8"/>
    <Face eyes={{ x1: 81, x2: 119, y: 89, size: .88, iris: '#5D6177', shape: 'round' }} mouth="M96 108 Q100 112 104 108" />
    <path d="M98 103 Q92 116 94 130 Q96 139 103 137 Q112 134 108 126 Q106 120 105 114Z" fill="#D5D9E8"/>
    <path d="M95 132 Q101 137 107 132" fill="none" stroke="#ABB4CB" strokeWidth="2"/>
  </g>;
}

const drawingById = {
  'draft-red-panda': Bori,
  'draft-dragon': Bibi,
  'draft-squirrel': Coco,
  'draft-pony': Rose,
  'draft-elephant': Tomi,
};
const selectedIds = new Set(Object.keys(drawingById));
const friends = CHARACTER_EXPANSION.filter(friend => selectedIds.has(friend.id))
  .map(friend => ({ ...friend, Draw: drawingById[friend.id] }));

function FriendCard({ friend }) {
  const { Draw } = friend;
  return <article className="proposal-card">
    <div className="proposal-art" style={{ '--friend-color': friend.color }}>
      <svg viewBox="0 0 200 210" role="img" aria-label={`${friend.name} 정면 디자인 시안`}><Draw /></svg>
    </div>
    <div className="proposal-copy">
      <div className="proposal-tags"><span>{friend.material}</span><span>디자인 시안</span></div>
      <h2>{friend.name}</h2>
      <p>{friend.personality}</p>
      <small>{friend.feature}</small>
      <small className="proposal-extra">좋아하는 것: {friend.likes} · 습관: {friend.habit}</small>
      <div className="proposal-swatches" aria-label="캐릭터 색상"><i style={{ background: friend.color }}/><i style={{ background: '#FFF4E5' }}/><i style={{ background: '#C9B9D9' }}/></div>
    </div>
  </article>;
}

function ProposalCharacters() {
  return <main className="proposal-page">
    <header className="proposal-header">
      <span className="proposal-kicker">MY MOCHI · 개발 미리보기</span>
      <h1>새로운 친구들</h1>
      <p>다섯 친구의 기본 정면 디자인 시안이에요. 현재는 미리보기 전용이며 상점에 등록되거나 게임에 지급되지 않아요.</p>
      <span className="proposal-note">기획 초안 · 구매·해금·의상·모션 미적용</span>
    </header>
    <aside className="proposal-reference">
      <Mochi variant="proto-pebble" full width={88} height={92} label="기존 그림체 기준 곰댕이" />
      <p><strong>그림체 기준</strong><span>기존 모찌 친구의 따뜻한 외곽선, 반짝이는 눈, 둥근 비율과 은은한 볼터치를 참고했어요.</span></p>
    </aside>
    <section className="proposal-grid" aria-label="신규 캐릭터 디자인 시안">
      {friends.map(friend => <FriendCard key={friend.id} friend={friend} />)}
    </section>
  </main>;
}

createRoot(document.getElementById('proposal-friends-root')).render(<ProposalCharacters />);
