import React from 'react';

// Card container
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  ...props
}) => {
  const paddingMap = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)] transition-all ${paddingMap[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Page Header
export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {badge && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200/80 text-teal-800">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="text-xs sm:text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
};

// Button
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const variantMap = {
    primary: 'bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] border border-transparent',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium border border-slate-200/60',
    outline: 'bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-300 hover:border-slate-400',
    danger: 'bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium border border-rose-200',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-medium',
  };

  const sizeMap = {
    sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-3.5 py-2 text-xs sm:text-sm rounded-lg gap-2',
    lg: 'px-4 py-2.5 text-sm rounded-lg gap-2',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${variantMap[variant]} ${sizeMap[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      <span>{children}</span>
    </button>
  );
};

// Status Badge
export interface StatusBadgeProps {
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'PAID' | 'UPCOMING' | 'ELIGIBLE' | 'IN_PROGRESS' | 'COMPLETED' | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const upper = status.toUpperCase();
  
  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status.replace(/_/g, ' ');

  if (['SUCCESS', 'PAID', 'ELIGIBLE', 'COMPLETED', 'SUFFICIENT'].includes(upper)) {
    styles = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (['PENDING', 'UPCOMING', 'PROVISIONAL_2_MONTHS'].includes(upper)) {
    styles = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (['FAILED', 'INSUFFICIENT_DATA', 'REVOKED'].includes(upper)) {
    styles = 'bg-rose-50 text-rose-800 border-rose-200';
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded-md border ${sizeClass} ${styles}`}>
      {label}
    </span>
  );
};

// Form Field Input
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}
      <div className="relative rounded-lg shadow-[0_1px_2px_0_rgba(15,23,42,0.03)]">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`block w-full rounded-lg border text-xs sm:text-sm py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 transition-colors ${
            icon ? 'pl-9 pr-3' : 'px-3'
          } ${error ? 'border-rose-300 bg-rose-50/20' : 'border-slate-300/80 bg-white hover:border-slate-400'} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
    </div>
  );
};

// Empty State
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="p-8 sm:p-12 text-center rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3">
      {icon && <div className="mx-auto w-10 h-10 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center">{icon}</div>}
      <h3 className="text-sm sm:text-base font-semibold text-slate-900">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};

// Simulated Disclaimer Box (Disabled per release specifications)
export const SimulationDisclaimer: React.FC<{ text?: string; className?: string }> = () => {
  return null;
};
