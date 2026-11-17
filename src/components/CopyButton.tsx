import { useLang, useT } from '../i18n';
import { EMAIL } from '../content';
import { useToast } from './Toast';

export default function CopyButton() {
  const t = useT(), lang = useLang(), toast = useToast();
  const copy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(EMAIL).then(() => toast((lang === 'id' ? 'Tersalin ' : 'Copied ') + EMAIL), () => toast(EMAIL));
    } else toast(EMAIL);
  };
  return <button className="pill copy" id="copy-mail" type="button" data-magnet data-email={EMAIL} onClick={copy}>{t('Copy email')}</button>;
}
