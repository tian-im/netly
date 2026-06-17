import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RenderDelta } from './render-delta';

// Cleanup the DOM after each test to avoid stale elements from rendering side-by-side
afterEach(() => {
  cleanup();
});

describe('RenderDelta', () => {
  it('should return null when showDelta is false', () => {
    const { container } = render(<RenderDelta current={100} prior={50} showDelta={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('should return null when delta is less than 0.005', () => {
    const { container } = render(<RenderDelta current={100.001} prior={100} showDelta={true} />);
    expect(container.innerHTML).toBe('');
  });

  it('should return null when delta is 0', () => {
    const { container } = render(<RenderDelta current={100} prior={100} showDelta={true} />);
    expect(container.innerHTML).toBe('');
  });

  it('should show positive delta and percentage for increase', () => {
    render(<RenderDelta current={200} prior={100} showDelta={true} />);
    expect(screen.getByText('+100.00 (+100%)')).toBeTruthy();
  });

  it('should show negative delta and percentage for decrease', () => {
    render(<RenderDelta current={50} prior={100} showDelta={true} />);
    expect(screen.getByText('-50.00 (-50%)')).toBeTruthy();
  });

  it('should apply reverseImpact: decrease shows as positive for liabilities/expenses', () => {
    const { container } = render(<RenderDelta current={50} prior={100} showDelta={true} reverseImpact={true} />);
    // With reverseImpact, a decrease of 50 shows as positive (success color)
    const span = container.querySelector('span.text-success');
    expect(span).toBeTruthy();
    expect(span?.textContent).toContain('-50.00');
  });

  it('should apply reverseImpact: increase shows as negative for liabilities/expenses', () => {
    const { container } = render(<RenderDelta current={100} prior={50} showDelta={true} reverseImpact={true} />);
    // With reverseImpact, an increase of 50 shows as negative (error color)
    const span = container.querySelector('span.text-error');
    expect(span).toBeTruthy();
    expect(span?.textContent).toContain('+50.00');
  });

  it('should show delta amount without percentage when prior is zero', () => {
    const { container } = render(<RenderDelta current={5000} prior={0} showDelta={true} />);
    expect(container.textContent).toContain('+5,000.00');
    // The percentage text should NOT be present
    expect(container.textContent).not.toContain('%');
  });

  it('should show delta amount without percentage when prior is zero and reverseImpact', () => {
    const { container } = render(<RenderDelta current={5000} prior={0} showDelta={true} reverseImpact={true} />);
    expect(container.textContent).toContain('+5,000.00');
    expect(container.textContent).not.toContain('%');
  });

  it('should use locale for number formatting when provided', () => {
    // de-DE locale uses . as thousand separator and , as decimal separator
    const { container } = render(<RenderDelta current={2500} prior={1000} showDelta={true} locale="de-DE" />);
    expect(container.textContent).toContain('1.500,00');
  });
});
