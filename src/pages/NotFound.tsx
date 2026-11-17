import { Link } from 'react-router';
import { useLang, useT, homePath } from '../i18n';
import Footer from '../components/Footer';

export default function NotFound() {
  const t = useT(), lang = useLang();
  return (
    <>
      <main id="main">
        <section className="svc-hero" aria-labelledby="svc-title">
          <h1 className="svc-title" id="svc-title">{t('Page not found')}</h1>
          <p className="svc-lede">{t('This page does not exist.')}</p>
          <p className="cta"><Link className="pill pill-solid" to={homePath(lang)} data-magnet data-scramble>{t('Back to home')}</Link></p>
        </section>
      </main>
      <Footer variant="service" />
    </>
  );
}
