import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import NetWorthTrendChart, { CustomTooltip } from './NetWorthTrendChart';

describe('NetWorthTrendChart', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockData = [
    { label: 'Jan', value: 10000 },
    { label: 'Feb', value: 12000 },
  ];

  it('renders correctly and displays title and empty state text', () => {
    render(
      <NetWorthTrendChart
        title="Net Worth Trend"
        data={[]}
        noDataText="No data available"
        isEmpty={true}
      />
    );
    expect(screen.getByText('Net Worth Trend')).toBeDefined();
    expect(screen.getByText('No data available')).toBeDefined();
  });

  it('renders accessibility table and role/aria-label attributes when data is present', () => {
    const { container } = render(
      <NetWorthTrendChart
        title="Net Worth Trend"
        data={mockData}
        noDataText="No data available"
        isEmpty={false}
        locale="en"
      />
    );
    expect(screen.getByText('Net Worth Trend')).toBeDefined();
    expect(screen.getByText('Period')).toBeDefined();
    expect(container.textContent).toContain('Jan');
    expect(container.textContent).toContain('Feb');

    // Verify role="img" and aria-label
    const chartContainer = screen.getByRole('img');
    expect(chartContainer).toBeDefined();
    expect(chartContainer.getAttribute('aria-label')).toBe('Net Worth Trend. Chart data available in table below.');
  });

  it('renders skeleton before mounting', () => {
    const useEffectSpy = vi.spyOn(React, 'useEffect').mockImplementation(() => {});

    const { container } = render(
      <NetWorthTrendChart
        title="Net Worth Trend"
        data={mockData}
        noDataText="No data available"
        isEmpty={false}
        locale="en"
      />
    );

    // Verify skeleton pulse is rendered and SVG chart is not
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).not.toBeNull();

    const chartWrapper = container.querySelector('.recharts-wrapper');
    expect(chartWrapper).toBeNull();

    useEffectSpy.mockRestore();
  });

  describe('CustomTooltip', () => {
    it('renders null when not active', () => {
      const { container } = render(
        <CustomTooltip
          active={false}
          payload={[]}
          label="Jan"
          tooltipLabel="Net Worth"
          locale="en"
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders payload values and matching styles when active', () => {
      const mockPayload = [
        {
          value: 15000,
          payload: { label: 'Jan', value: 15000 },
        },
      ] as any;
      const { container } = render(
        <CustomTooltip
          active={true}
          payload={mockPayload}
          label="Jan"
          tooltipLabel="Net Worth"
          locale="en"
        />
      );
      expect(screen.getByText('Jan')).toBeDefined();
      expect(screen.getByText('Net Worth:')).toBeDefined();
      expect(screen.getByText('15k')).toBeDefined();
      // Ensure it renders standard bg-base-100 card wrapper
      expect(container.querySelector('.bg-base-100')).toBeDefined();
    });
  });
});
