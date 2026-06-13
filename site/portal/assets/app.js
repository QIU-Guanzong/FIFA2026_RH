;(function () {
const {
  useState,
  useEffect
} = React;
const {
  Nav,
  Hero,
  ChampionBoard,
  Pipeline,
  Backtest,
  Boundaries,
  Footer,
  MatchPredictor,
  ValueBets,
  Bracket,
  Fixtures,
  LiveReport,
  MarketScan,
  RedHorseBanner
} = window;
function useReveal(dep) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal'));
    els.forEach(el => {
      el.classList.remove('in');
      el.style.transitionDelay = '';
    });
    const check = () => {
      const vh = window.innerHeight;
      let batch = 0;
      els.forEach(el => {
        if (el.classList.contains('in')) return;
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) {
          el.style.transitionDelay = batch * 70 + 'ms';
          batch++;
          el.classList.add('in');
        }
      });
    };
    let raf1, raf2;
    if (document.body.classList.contains('js-reveal')) {
      // timeline already confirmed running — reveal in-view content immediately
      check();
    } else {
      // first run: only enable hide+reveal once rAF confirms the timeline is live
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          document.body.classList.add('js-reveal');
          check();
        });
      });
    }
    let sraf;
    const onScroll = () => {
      cancelAnimationFrame(sraf);
      sraf = requestAnimationFrame(check);
    };
    window.addEventListener('scroll', onScroll, {
      passive: true
    });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      cancelAnimationFrame(sraf);
    };
  }, [dep]);
}
function App() {
  const [tab, setTab] = useState('overview');
  useReveal(tab);
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });
  }, [tab]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Nav, {
    tab: tab,
    setTab: setTab
  }), /*#__PURE__*/React.createElement("main", null, tab === 'overview' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Hero, {
    setTab: setTab
  }), /*#__PURE__*/React.createElement(ChampionBoard, null), /*#__PURE__*/React.createElement(RedHorseBanner, null)), tab === 'report' && /*#__PURE__*/React.createElement(LiveReport, null), tab === 'schedule' && /*#__PURE__*/React.createElement(Fixtures, null), tab === 'match' && /*#__PURE__*/React.createElement(MatchPredictor, null), tab === 'tree' && /*#__PURE__*/React.createElement(Bracket, null), tab === 'bets' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RedHorseBanner, null), /*#__PURE__*/React.createElement(MarketScan, null), /*#__PURE__*/React.createElement(ValueBets, null)), tab === 'method' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Pipeline, null), /*#__PURE__*/React.createElement(Backtest, null), /*#__PURE__*/React.createElement(Boundaries, null))), /*#__PURE__*/React.createElement(Footer, null));
}
const root = ReactDOM.createRoot(document.getElementById('root'));
(window.RF_hydrate ? window.RF_hydrate() : Promise.resolve()).then(s => {
  if (s && s.mode === 'live') console.info('[RedFootball] 已接入实时数据');
  root.render(/*#__PURE__*/React.createElement(App, null));
});
})();
