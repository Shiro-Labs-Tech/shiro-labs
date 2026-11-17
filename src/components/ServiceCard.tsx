import { Link } from 'react-router';
import { useLang, useT, servicePath } from '../i18n';
import type { Service } from '../content';

export default function ServiceCard({ sv }: { sv: Service }) {
  const t = useT(), lang = useLang();
  return (
    <article>
      <p className="mono cap-no">{sv.no}</p>
      <h3><Link to={servicePath(lang, sv.slug)}>{sv.name}</Link></h3>
      <p>{sv.card}</p>
      <ul className="mono">{sv.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
      <span className="mono cap-more" aria-hidden="true">{t('View service')}</span>
    </article>
  );
}
