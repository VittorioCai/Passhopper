import { PiggyBankIcon, type Icon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/EmptyState';
import ui from '../components/ui.module.css';

function Placeholder({
  titleKey,
  bodyKey,
  icon: I,
}: {
  titleKey: string;
  bodyKey: string;
  icon: Icon;
}) {
  const { t } = useTranslation();
  return (
    <>
      <h1 className={ui.pageTitle}>{t(titleKey)}</h1>
      <EmptyState icon={<I size={24} weight="duotone" />} body={t(bodyKey)} />
    </>
  );
}

export const SavingsPage = () => (
  <Placeholder titleKey="savings.title" bodyKey="savings.empty" icon={PiggyBankIcon} />
);
