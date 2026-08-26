import React from 'react';
import { WorkerSupportPage } from './WorkerSupportPage';

interface SupportPageProps {
  onOpenModal: (type: string) => void;
  onOpenRespondModal?: (ticket: any) => void;
  onOpenEditModal?: (ticket: any) => void;
  onOpenCommentModal?: (ticket: any) => void;
  refreshTrigger?: number;
  subTabFilter?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const SupportPage: React.FC<SupportPageProps> = ({
  onOpenModal,
  refreshTrigger = 0,
  subTabFilter = 'ALL',
  dateFrom,
  dateTo
}) => {
  return (
    <WorkerSupportPage
      onOpenModal={onOpenModal}
      refreshTrigger={refreshTrigger}
      subTabFilter={subTabFilter}
      dateFrom={dateFrom}
      dateTo={dateTo}
    />
  );
};

