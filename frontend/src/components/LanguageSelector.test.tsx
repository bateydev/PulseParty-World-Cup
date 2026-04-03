import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSelector } from './LanguageSelector';
import i18n from '../i18n';

describe('LanguageSelector', () => {
  beforeEach(async () => {
    // Reset to English before each test
    await i18n.changeLanguage('en');
  });

  it('should render language selector with all supported languages', () => {
    render(<LanguageSelector />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    // Check all language options are present
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Français')).toBeInTheDocument();
    expect(screen.getByText('Deutsch')).toBeInTheDocument();
    expect(screen.getByText('Kiswahili')).toBeInTheDocument();
  });

  it('should display current language as selected', () => {
    render(<LanguageSelector />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('en');
  });

  it('should change language when option is selected', async () => {
    render(<LanguageSelector />);

    const select = screen.getByRole('combobox');

    // Change to French
    fireEvent.change(select, { target: { value: 'fr' } });
    expect(i18n.language).toBe('fr');

    // Change to German
    fireEvent.change(select, { target: { value: 'de' } });
    expect(i18n.language).toBe('de');

    // Change to Swahili
    fireEvent.change(select, { target: { value: 'sw' } });
    expect(i18n.language).toBe('sw');
  });

  it('should display label in current language', async () => {
    const { unmount } = render(<LanguageSelector />);

    // English label
    expect(screen.getByText('Language')).toBeInTheDocument();
    unmount();

    // Change to French
    await i18n.changeLanguage('fr');
    const { unmount: unmount2 } = render(<LanguageSelector />);
    expect(screen.getByText('Langue')).toBeInTheDocument();
    unmount2();

    // Change to German
    await i18n.changeLanguage('de');
    const { unmount: unmount3 } = render(<LanguageSelector />);
    expect(screen.getByText('Sprache')).toBeInTheDocument();
    unmount3();

    // Change to Swahili
    await i18n.changeLanguage('sw');
    render(<LanguageSelector />);
    expect(screen.getByText('Lugha')).toBeInTheDocument();
  });

  it('should have accessible label for screen readers', () => {
    render(<LanguageSelector />);

    const select = screen.getByRole('combobox');
    const label = screen.getByLabelText('Language');

    expect(label).toBeInTheDocument();
    expect(select).toHaveAccessibleName('Language');
  });
});
