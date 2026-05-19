import { ReactNode } from 'react';
import './PageContainer.css';

type PageContainerProps = {
  children: ReactNode;
  /** full = chiếm hết chiều ngang container; wide = rộng hơn (kanban, workspace grid) */
  width?: 'default' | 'wide' | 'narrow' | 'full';
  className?: string;
};

export default function PageContainer({
  children,
  width = 'default',
  className = '',
}: PageContainerProps) {
  return (
    <div className={`page-container page-container--${width} ${className}`.trim()}>
      {children}
    </div>
  );
}
