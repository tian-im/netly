import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../messages/en.json';
import Sidebar from './sidebar';
import { buildKoFiUrl, buildGitHubIssuesUrl } from '@/lib/links';

// Make React Testing Library aware
// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;

let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname() {
    return mockPathname;
  },
}));

function renderSidebar() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
      <Sidebar />
    </NextIntlClientProvider>
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockPathname = '/';
  });

  it('renders the brand and subtitle', () => {
    renderSidebar();
    expect(screen.getByText('NETLY LEDGER')).toBeDefined();
    expect(screen.getByText('Personal Financial Engine')).toBeDefined();
  });

  it('renders all navigation items', () => {
    renderSidebar();
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Accounts')).toBeDefined();
    expect(screen.getByText('Categories')).toBeDefined();
    expect(screen.getByText('Transaction Ledger')).toBeDefined();
    expect(screen.getByText('Bank CSV Import')).toBeDefined();
    expect(screen.getByText('Financial Statements')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
    expect(screen.getByText('User Manual')).toBeDefined();
  });

  it('highlights the active navigation item', () => {
    mockPathname = '/accounts';
    renderSidebar();
    const activeLink = screen.getByRole('link', { name: /Accounts/i });
    expect(activeLink.getAttribute('aria-current')).toBe('page');
  });

  it('renders external support and feedback links', () => {
    renderSidebar();
    const supportLink = screen.getByRole('link', { name: /Support/i });
    expect(supportLink.getAttribute('href')).toBe(buildKoFiUrl());
    expect(supportLink.getAttribute('target')).toBe('_blank');
    expect(supportLink.getAttribute('rel')).toBe('noopener noreferrer');

    const feedbackLink = screen.getByRole('link', { name: /Report Issue/i });
    expect(feedbackLink.getAttribute('href')).toBe(buildGitHubIssuesUrl());
    expect(feedbackLink.getAttribute('target')).toBe('_blank');
    expect(feedbackLink.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders running locally status and database path', () => {
    renderSidebar();
    expect(screen.getByText('Running Locally')).toBeDefined();
    expect(screen.getByText('SQLite database: prisma/dev.db')).toBeDefined();
  });

  it('attempts to close the navigation drawer when a menu item is clicked', () => {
    // Mock the DOM checkbox drawer element
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'nav-drawer';
    checkbox.checked = true;
    document.body.appendChild(checkbox);

    renderSidebar();
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    fireEvent.click(dashboardLink);

    expect(checkbox.checked).toBe(false);
    document.body.removeChild(checkbox);
  });

  it('does not throw an error if the navigation drawer checkbox is not in the DOM when a menu item is clicked', () => {
    renderSidebar();
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(() => fireEvent.click(dashboardLink)).not.toThrow();
  });
});
