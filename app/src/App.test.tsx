import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import i18n from './i18n';

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe('App', () => {
  it('shows the home page with a New trip button', async () => {
    await i18n.changeLanguage('en');
    at('/');
    expect(
      screen.getByRole('heading', { name: 'Where are you hopping next?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /New trip/ })).toHaveAttribute('href', '/new');
  });

  it('shows the four trip tabs on a trip page', async () => {
    await i18n.changeLanguage('en');
    at('/trip/demo/days');
    const tabs = screen.getByRole('navigation', { name: 'Trip pages' });
    for (const name of ['Route', 'Days', 'Seats', 'Savings']) {
      expect(tabs).toHaveTextContent(name);
    }
    expect(screen.getByRole('heading', { name: 'Travel days' })).toBeInTheDocument();
  });

  it('renders in Chinese', async () => {
    await i18n.changeLanguage('zh-CN');
    at('/');
    expect(screen.getByRole('heading', { name: '下一站去哪？' })).toBeInTheDocument();
  });
});
