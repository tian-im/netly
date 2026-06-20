import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { Card } from './card';

afterEach(() => {
  cleanup();
});

describe('Card Component', () => {
  it('renders a card container with body, title, and actions', () => {
    render(
      <Card data-testid="card">
        <Card.Body data-testid="card-body">
          <Card.Title data-testid="card-title">Card Title</Card.Title>
          <p>Card content</p>
          <Card.Actions data-testid="card-actions">
            <button>Action</button>
          </Card.Actions>
        </Card.Body>
      </Card>
    );

    const card = screen.getByTestId('card');
    const body = screen.getByTestId('card-body');
    const title = screen.getByTestId('card-title');
    const actions = screen.getByTestId('card-actions');

    expect(card).toBeInTheDocument();
    expect(card.className).toContain('card');
    expect(card.className).toContain('bg-base-100');
    expect(card.className).toContain('shadow-xl');
    expect(card.className).toContain('border');

    expect(body).toBeInTheDocument();
    expect(body.className).toContain('card-body');

    expect(title).toBeInTheDocument();
    expect(title.className).toContain('card-title');
    expect(title.className).toContain('text-primary');

    expect(actions).toBeInTheDocument();
    expect(actions.className).toContain('card-actions');
    expect(actions.className).toContain('justify-end');
  });

  it('allows disabling borders and custom shadows', () => {
    render(<Card border={false} shadow="none" data-testid="card" />);
    const card = screen.getByTestId('card');
    expect(card.className).not.toContain('border');
    expect(card.className).not.toContain('shadow-xl');
  });

  it('renders title with icon', () => {
    const TestIcon = () => <span data-testid="test-icon">icon</span>;
    render(
      <Card.Title icon={<TestIcon />} data-testid="card-title">
        Title Text
      </Card.Title>
    );
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('Title Text')).toBeInTheDocument();
  });

  it('applies custom bg class and custom shadows', () => {
    render(<Card bg="bg-primary" shadow="md" data-testid="card" />);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('bg-primary');
    expect(card.className).toContain('shadow-md');
  });

  it('applies custom justify style in Card.Actions', () => {
    render(<Card.Actions justify="start" data-testid="card-actions" />);
    expect(screen.getByTestId('card-actions').className).toContain('justify-start');
  });

  it('passes custom className to Card and Card.Body', () => {
    render(
      <Card className="custom-card" data-testid="card">
        <Card.Body className="custom-body" data-testid="card-body" />
      </Card>
    );
    expect(screen.getByTestId('card').className).toContain('custom-card');
    expect(screen.getByTestId('card-body').className).toContain('custom-body');
  });

  it('applies Card.Title colors correctly', () => {
    const { rerender } = render(<Card.Title color="primary" data-testid="card-title" />);
    expect(screen.getByTestId('card-title').className).toContain('text-primary');

    rerender(<Card.Title color="error" data-testid="card-title" />);
    expect(screen.getByTestId('card-title').className).toContain('text-error');

    rerender(<Card.Title color="success" data-testid="card-title" />);
    expect(screen.getByTestId('card-title').className).toContain('text-success');

    rerender(<Card.Title color="warning" data-testid="card-title" />);
    expect(screen.getByTestId('card-title').className).toContain('text-warning');

    rerender(<Card.Title color="base" data-testid="card-title" />);
    expect(screen.getByTestId('card-title').className).toContain('text-base-content');

    rerender(<Card.Title color="accent" data-testid="card-title" />);
    expect(screen.getByTestId('card-title').className).toContain('text-accent');
  });
});
