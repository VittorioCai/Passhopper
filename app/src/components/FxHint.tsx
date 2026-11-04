import { useFx } from '../fx';
import { useLang } from '../lib';
import ui from './ui.module.css';

/** "≈ US$136" next to a EUR amount, when the traveller picked a home currency (F6.5). */
export function FxHint({ eur, block }: { eur: number; block?: boolean }) {
  const lang = useLang();
  const { alt } = useFx(lang);
  const text = alt(eur);
  if (!text) return null;
  return <span className={block ? `${ui.fx} ${ui.fxBlock}` : ui.fx}>{text}</span>;
}
