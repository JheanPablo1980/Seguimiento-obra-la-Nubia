export const formatExecutionTime = (startDate?: string, endDate?: string): string => {
  if (!startDate) return 'N/A';
  
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : Date.now();
  
  const diffMs = end - start;
  if (diffMs < 0) return '0 min';

  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} d ${hours % 24} h`;
  if (hours > 0) return `${hours} h ${mins % 60} m`;
  return `${mins} min`;
};
