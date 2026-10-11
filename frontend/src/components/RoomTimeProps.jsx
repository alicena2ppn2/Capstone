export default function RoomTimeProps({ time }) {
  return <g>
    <g transform="translate(18 126)">
      <rect y="3" width="64" height="74" rx="9" fill="#C9A982" opacity=".18" />
      <rect width="64" height="74" rx="9" fill="#FFFEFA" stroke="#AD927B" strokeWidth="1.8" />
      <path d="M9 0 H55 Q64 0 64 9 V22 H0 V9 Q0 0 9 0" fill="#F2B69D" />
      <path d="M17 -3 V7 M47 -3 V7" stroke="#AD927B" strokeWidth="3" strokeLinecap="round" />
      <text x="32" y="16" textAnchor="middle" fontSize="12" fontWeight="500" fill="#354744">{time.month}월</text>
      <text x="32" y="48" textAnchor="middle" fontSize="27" fontWeight="600" fill="#354744">{time.day}</text>
      <text x="32" y="66" textAnchor="middle" fontSize="12" fill="#354744">{time.weekday}요일</text>
    </g>
    <g transform="translate(314 158)">
      <circle cy="3" r="34" fill="#C9A982" opacity=".18" />
      <circle r="34" fill="#E4F1EE" stroke="#AD927B" strokeWidth="2" />
      <circle r="29" fill="#FFFEFA" />
      {Array.from({length:12},(_,i)=><line key={i} x1="0" y1="-24" x2="0" y2={i%3===0?-19:-21} stroke="#65736F" strokeWidth={i%3===0?2:1.3} transform={`rotate(${i*30})`} />)}
      <line x1="0" y1="3" x2="0" y2="-15" stroke="#354744" strokeWidth="3.4" strokeLinecap="round" transform={`rotate(${time.hourAngle})`} />
      <line x1="0" y1="4" x2="0" y2="-23" stroke="#397D78" strokeWidth="2.2" strokeLinecap="round" transform={`rotate(${time.minuteAngle})`} />
      <circle r="3" fill="#354744" />
    </g>
  </g>;
}
