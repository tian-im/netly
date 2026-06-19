import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, ...props }, ref) => {
    const isFile = props.type === 'file';
    const ringClass = error ? 'focus:ring-error/20' : 'focus:ring-primary/20';
    const inputClass = isFile
      ? `file-input file-input-bordered w-full rounded-lg focus:ring-2 ${ringClass} ${error ? 'file-input-error' : 'focus:border-primary'} ${className}`
      : `input input-bordered w-full rounded-lg focus:ring-2 ${ringClass} ${error ? 'input-error' : 'focus:border-primary'} ${className}`;

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
            <span className={`label-text-alt text-xs ${error ? 'text-error font-medium' : 'text-base-content/50'}`}>
              {error || helperText}
            </span>
          </label>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

