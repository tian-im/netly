import React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
  /** WHY: Consistent with Select/Button/Checkbox/Radio which all expose a size prop.
   *  Defaults to 'md' so existing usages without explicit size behave identically to before. */
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, size = 'md', ...props }, ref) => {
    const isFile = props.type === 'file';
    const ringClass = error ? 'focus:ring-error/20' : 'focus:ring-primary/20';
    // WHY: size maps to DaisyUI input-xs/sm/md/lg (or file-input-* for file inputs),
    // matching the same pattern used by Select, Button, Checkbox, and Radio.
    const sizeClass = isFile
      ? { xs: 'file-input-xs', sm: 'file-input-sm', md: 'file-input-md', lg: 'file-input-lg' }[size]
      : { xs: 'input-xs', sm: 'input-sm', md: 'input-md', lg: 'input-lg' }[size];
    const inputClass = isFile
      ? `file-input file-input-bordered w-full rounded-lg focus:ring-2 ${ringClass} ${sizeClass} ${error ? 'file-input-error' : 'focus:border-primary'} ${className}`
      : `input input-bordered w-full rounded-lg focus:ring-2 ${ringClass} ${sizeClass} ${error ? 'input-error' : 'focus:border-primary'} ${className}`;

    return (
      <div className="form-control w-full">
        {label && (
          <label className="label py-1">
            {/* WHY: We use 'font-bold' for labels to keep form headings clear, legible, and visually structured. */}
            <span className="label-text font-bold text-base-content/85 text-xs">{label}</span>
          </label>
        )}
        <input
          ref={ref}
          className={inputClass}
          {...props}
        />
        {/* WHY: If both an error and a helperText are present, we display the error to immediately
            draw the user's attention to the validation issue, prioritizing it over the generic helper text. */}
        {(error || helperText) && (
          <label className="label py-0.5">
            <span className={`label-text-alt text-xs whitespace-normal break-words w-full ${error ? 'text-error font-medium' : 'text-base-content/50'}`}>
              {error || helperText}
            </span>
          </label>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

