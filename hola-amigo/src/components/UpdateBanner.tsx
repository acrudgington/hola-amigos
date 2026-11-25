// "A new version is ready" banner. The app never reloads itself mid-lesson;
// the family chooses when to refresh.
import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Icon } from "./Icon.tsx";

export function UpdateBanner() {
  const { needRefresh: [needRefresh, setNeedRefresh], offlineReady: [offlineReady, setOfflineReady], updateServiceWorker } = useRegisterSW({
    onRegisterError: err => console.warn("Service worker registration failed", err),
  });
  // "Ready offline" is just good news: show it briefly, then get out of the way.
  useEffect(() => {
    if (!offlineReady || needRefresh) return;
    const t = setTimeout(() => setOfflineReady(false), 4000);
    return () => clearTimeout(t);
  }, [offlineReady, needRefresh, setOfflineReady]);
  if (!needRefresh && !offlineReady) return null;
  return <div className="update-banner" role="status">
    <Icon name={needRefresh ? "sparkles" : "check"} size={18} />
    <span className="grow">{needRefresh ? "A new version of ¡Hola, Amigo! is ready." : "Ready to use offline!"}</span>
    {needRefresh && <button type="button" className="btn btn--sun btn--sm" onClick={() => void updateServiceWorker(true)}>Update</button>}
    <button type="button" className="icon-btn" style={{ width: 34, height: 34 }} aria-label="Dismiss" onClick={() => { setNeedRefresh(false); setOfflineReady(false); }}><Icon name="x" size={16} /></button>
  </div>;
}
