export const EASE={enter:'power3.out',hero:'expo.out',transition:'power2.inOut',node:'back.out(1.4)',scroll:'none'};
export const DURATION={hero:.9,text:.6,control:.2,enter:.4,leave:.3,reader:.3,panel:.35,focus:.25,path:.6,jump:.5,highlight:1.2};
export const STAGGER={rows:.04,path:.08};
export const SCROLL={lerp:.1,story:.8,path:.6,desktop:1024,pinDistance:220};
export const conditions={desktop:'(min-width:1024px)',mobile:'(max-width:1023px)',reduce:'(prefers-reduced-motion:reduce)'};
export const markers=Boolean(import.meta.env.DEV&&new URLSearchParams(location.search).has('motion-debug'));
