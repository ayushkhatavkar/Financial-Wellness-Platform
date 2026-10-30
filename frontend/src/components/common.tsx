import React from 'react';

// ---------------------------------------------------------------------------
// 1. Card Container (White opaque, fine grey border, subtle shadow, 8px radius)
// ---------------------------------------------------------------------------
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  hoverEffect = false,
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
      className={`bg-white rounded-lg border border-[#E5E7EB] shadow-[0_1px_3px_0_rgba(23,27,38,0.04)] ${
        hoverEffect ? 'hover:shadow-[0_4px_12px_0_rgba(23,27,38,0.06)] hover:border-[#D1D5DB] transition-all duration-200' : 'transition-colors'
      } ${paddingMap[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2. Page Header (Hierarchy: 26-34px page title, secondary text, actions)
// ---------------------------------------------------------------------------
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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E5E7EB]/80 mb-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#171B26]">
            {title}
          </h1>
          {badge && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FFF5EB] border border-[#F28C28]/30 text-[#F28C28]">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-[#687080] mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3. Button (Rounded-full 40px, Orange primary, Navy/Outline secondary)
// ---------------------------------------------------------------------------
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'navy' | 'outline' | 'danger' | 'ghost';
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
    // Primary: Brand orange action button
    primary:
      'bg-[#F28C28] hover:bg-[#DD7416] text-white font-medium shadow-[0_2px_6px_0_rgba(242,140,40,0.3)] border border-transparent active:scale-[0.99]',
    // Navy: High-emphasis fintech action button
    navy:
      'bg-[#17243A] hover:bg-[#233554] text-white font-medium shadow-sm border border-transparent',
    // Secondary: Soft background button
    secondary:
      'bg-[#F0F2F5] hover:bg-[#E5E7EB] text-[#171B26] font-medium border border-[#E5E7EB]',
    // Outline: Clean bordered white button
    outline:
      'bg-white hover:bg-[#F7F8FA] text-[#171B26] font-medium border border-[#E5E7EB] hover:border-[#D1D5DB] shadow-sm',
    // Danger: Soft red danger action
    danger:
      'bg-[#FDF1F1] hover:bg-[#FCE3E3] text-[#D94B4B] font-medium border border-[#F9D0D0]',
    // Ghost: Unbordered text action
    ghost:
      'bg-transparent hover:bg-[#F0F2F5] text-[#687080] hover:text-[#171B26] font-medium',
  };

  const sizeMap = {
    sm: 'px-3 py-1.5 text-xs rounded-full gap-1.5',
    md: 'px-4 py-2 text-xs sm:text-sm rounded-full gap-2',
    lg: 'px-6 py-2.5 text-sm sm:text-base rounded-full gap-2.5',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#F28C28]/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variantMap[variant]} ${sizeMap[size]} ${className}`}
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

// ---------------------------------------------------------------------------
// 4. Status Badge (Token-compliant Success, Warning, Danger, Neutral)
// ---------------------------------------------------------------------------
export interface StatusBadgeProps {
  status:
    | 'SUCCESS'
    | 'PAID'
    | 'ELIGIBLE'
    | 'COMPLETED'
    | 'SUFFICIENT'
    | 'PENDING'
    | 'UPCOMING'
    | 'DUE'
    | 'PROVISIONAL_2_MONTHS'
    | 'FAILED'
    | 'INSUFFICIENT_DATA'
    | 'REVOKED'
    | 'OVERDUE'
    | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const upper = (status || '').toUpperCase();

  let styles = 'bg-[#F0F2F5] text-[#687080] border-[#E5E7EB]';
  let label = (status || '').replace(/_/g, ' ');

  if (['SUCCESS', 'PAID', 'ELIGIBLE', 'COMPLETED', 'SUFFICIENT'].includes(upper)) {
    styles = 'bg-[#EDF8F3] text-[#16865C] border-[#BDE8D3]';
  } else if (['PENDING', 'UPCOMING', 'DUE', 'PROVISIONAL_2_MONTHS'].includes(upper)) {
    styles = 'bg-[#FEF9EC] text-[#D18A22] border-[#FCE1A2]';
  } else if (['FAILED', 'INSUFFICIENT_DATA', 'REVOKED', 'OVERDUE'].includes(upper)) {
    styles = 'bg-[#FDF1F1] text-[#D94B4B] border-[#FBCACA]';
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium font-mono-num rounded-md border ${sizeClass} ${styles}`}
    >
      {label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// 5. Form Field Input (Accessible, crisp light borders, orange focus ring)
// ---------------------------------------------------------------------------
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
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#171B26]">
          {label}
        </label>
      )}
      <div className="relative rounded-lg shadow-[0_1px_2px_0_rgba(23,27,38,0.03)]">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9299A5]">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`block w-full rounded-lg border text-xs sm:text-sm py-2 text-[#171B26] placeholder:text-[#9299A5] focus:outline-none focus:ring-2 focus:ring-[#F28C28]/20 focus:border-[#F28C28] transition-colors ${
            icon ? 'pl-9 pr-3' : 'px-3'
          } ${
            error
              ? 'border-[#D94B4B] bg-[#FDF1F1]/30 text-[#D94B4B]'
              : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[11px] text-[#D94B4B] mt-1">{error}</p>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 6. Empty State (Clean light fintech style with action)
// ---------------------------------------------------------------------------
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
    <div className="p-8 sm:p-12 text-center rounded-lg border border-[#E5E7EB] bg-white space-y-3 shadow-[0_1px_3px_0_rgba(23,27,38,0.02)]">
      {icon && (
        <div className="mx-auto w-12 h-12 rounded-full bg-[#F0F2F5] border border-[#E5E7EB] text-[#687080] flex items-center justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[#171B26]">{title}</h3>
      <p className="text-xs sm:text-sm text-[#687080] max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 7. Simulation Disclaimer (Disabled per release specifications)
// ---------------------------------------------------------------------------
export const SimulationDisclaimer: React.FC<{ text?: string; className?: string }> = () => {
  return null;
};
