import ScreenHeader from './ScreenHeader.jsx';


export default function SubScreen({ title, children, onHome }) {
  return <section className="sub-screen">
    <div className="sub-screen-content">
      <ScreenHeader title={title} onBack={onHome} decorated={title === '오늘의 도전'} />
      {children}
    </div>
  </section>;
}