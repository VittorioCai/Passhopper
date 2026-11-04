import { MapTrifoldIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/EmptyState';

export function NewTrip() {
  const { t } = useTranslation();
  return (
    <EmptyState icon={<MapTrifoldIcon size={24} weight="duotone" />} body={t('newTrip.body')} />
  );
}
