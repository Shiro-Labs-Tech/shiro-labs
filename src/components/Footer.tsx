import { Link } from 'react-router';
import { useLang, useT, homePath } from '../i18n';
import Clock from './Clock';

export default function Footer({ variant }: { variant: 'home' | 'service' }) {
  const t = useT(), lang = useLang();
  return (
    <footer className="foot mono">
      <span>&copy; 2026 Shiro Labs</span>
      <span>{t('Jakarta time')} <Clock id="foot-time" /></span>
      {variant === 'service' && <Link to={{ pathname: homePath(lang), hash: '#services' }}>{t('All services')}</Link>}
      <a href="#top">{t('Back to top')}</a>
    </footer>
  );
}
