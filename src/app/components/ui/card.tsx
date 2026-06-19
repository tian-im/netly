import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  border?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  bg?: string;
}

const CardComponent = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', border = true, shadow = 'xl', bg = 'bg-base-100', children, ...props }, ref) => {
    const shadowClass = shadow !== 'none' ? `shadow-${shadow}` : '';
    const borderClass = border ? 'border border-base-200' : '';
    const classes = `card ${bg} ${shadowClass} ${borderClass} ${className}`.trim();
    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);
CardComponent.displayName = 'Card';

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}
const CardBody = ({ className = '', ...props }: CardBodyProps) => {
  return <div className={`card-body ${className}`.trim()} {...props} />;
};
CardBody.displayName = 'Card.Body';

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  icon?: React.ReactNode;
  color?: 'primary' | 'error' | 'success' | 'warning' | 'base' | 'default';
}
const CardTitle = ({ className = '', icon, color = 'default', children, ...props }: CardTitleProps) => {
  const colorClass = {
    primary: 'text-primary',
    error: 'text-error',
    success: 'text-success',
    warning: 'text-warning',
    base: 'text-base-content',
    default: 'text-primary',
  }[color];

  return (
    <h2 className={`card-title text-xl font-bold ${colorClass} flex items-center gap-2 ${className}`.trim()} {...props}>
      {icon}
      {children}
    </h2>
  );
};
CardTitle.displayName = 'Card.Title';

export interface CardActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: 'start' | 'end' | 'center' | 'between';
}
const CardActions = ({ className = '', justify = 'end', ...props }: CardActionsProps) => {
  const justifyClass = {
    start: 'justify-start',
    end: 'justify-end',
    center: 'justify-center',
    between: 'justify-between',
  }[justify];
  return <div className={`card-actions ${justifyClass} ${className}`.trim()} {...props} />;
};
CardActions.displayName = 'Card.Actions';

export const Card = Object.assign(CardComponent, {
  Body: CardBody,
  Title: CardTitle,
  Actions: CardActions,
});
