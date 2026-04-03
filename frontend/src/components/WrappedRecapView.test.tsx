import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WrappedRecapView } from './WrappedRecapView';
import '../i18n';

// Mock navigator.share and navigator.clipboard
const mockShare = vi.fn();
const mockClipboard = {
  writeText: vi.fn(),
};

// Store original values
const originalShare = navigator.share;
const originalClipboard = navigator.clipboard;

describe('WrappedRecapView', () => {
  const mockRecap = {
    userId: 'user-123',
    roomId: 'room-456',
    matchId: 'match-789',
    totalPoints: 250,
    finalRank: 2,
    accuracy: 75,
    longestStreak: 5,
    clutchMoments: 3,
    shareableUrl: 'https://pulseparty.app/recap/abc123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup navigator mocks
    Object.defineProperty(navigator, 'share', {
      writable: true,
      configurable: true,
      value: mockShare,
    });
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: mockClipboard,
    });
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(navigator, 'share', {
      writable: true,
      configurable: true,
      value: originalShare,
    });
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: originalClipboard,
    });
  });

  it('should render wrapped recap title', () => {
    render(<WrappedRecapView recap={mockRecap} />);
    expect(screen.getByText(/Your Wrapped Recap/i)).toBeInTheDocument();
  });

  it('should display all stat labels', () => {
    render(<WrappedRecapView recap={mockRecap} />);

    expect(screen.getByText(/Total Points/i)).toBeInTheDocument();
    expect(screen.getByText(/Final Rank/i)).toBeInTheDocument();
    expect(screen.getByText(/Accuracy/i)).toBeInTheDocument();
    expect(screen.getByText(/Longest Streak/i)).toBeInTheDocument();
    expect(screen.getByText(/Clutch Moments/i)).toBeInTheDocument();
  });

  it('should animate stats from 0 to target values', async () => {
    render(<WrappedRecapView recap={mockRecap} />);

    // Wait for animations to complete
    await waitFor(
      () => {
        const pointsElement = screen.getByText('250');
        expect(pointsElement).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should display medal emoji for top 3 ranks', async () => {
    const { rerender } = render(
      <WrappedRecapView recap={{ ...mockRecap, finalRank: 1 }} />
    );

    // Wait for animation to complete
    await waitFor(
      () => {
        expect(screen.getByText('🥇')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    rerender(<WrappedRecapView recap={{ ...mockRecap, finalRank: 2 }} />);
    await waitFor(
      () => {
        expect(screen.getByText('🥈')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    rerender(<WrappedRecapView recap={{ ...mockRecap, finalRank: 3 }} />);
    await waitFor(
      () => {
        expect(screen.getByText('🥉')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should display fire emoji for non-zero streak', async () => {
    render(<WrappedRecapView recap={mockRecap} />);

    await waitFor(
      () => {
        expect(screen.getByText('🔥')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should display lightning emoji for clutch moments', async () => {
    render(<WrappedRecapView recap={mockRecap} />);

    await waitFor(
      () => {
        expect(screen.getByText('⚡')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should render share button', async () => {
    render(<WrappedRecapView recap={mockRecap} />);

    await waitFor(
      () => {
        expect(screen.getByText(/Share Your Recap/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should call navigator.share when share button is clicked and API is available', async () => {
    mockShare.mockResolvedValue(undefined);

    render(<WrappedRecapView recap={mockRecap} />);

    await waitFor(
      () => {
        expect(screen.getByText(/Share Your Recap/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const shareButton = screen.getByText(/Share Your Recap/i);
    await userEvent.click(shareButton);

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: 'Your Wrapped Recap',
        text: expect.stringContaining('Total Points: 250'),
        url: mockRecap.shareableUrl,
      });
    });
  });

  it('should copy to clipboard when navigator.share is not available', async () => {
    // Temporarily remove navigator.share
    Object.defineProperty(navigator, 'share', {
      writable: true,
      configurable: true,
      value: undefined,
    });

    mockClipboard.writeText.mockResolvedValue(undefined);

    render(<WrappedRecapView recap={mockRecap} />);

    await waitFor(
      () => {
        expect(screen.getByText(/Share Your Recap/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const shareButton = screen.getByText(/Share Your Recap/i);
    await userEvent.click(shareButton);

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        mockRecap.shareableUrl
      );
    });
  });

  it('should show success message after sharing', async () => {
    mockShare.mockResolvedValue(undefined);

    render(<WrappedRecapView recap={mockRecap} />);

    await waitFor(
      () => {
        expect(screen.getByText(/Share Your Recap/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const shareButton = screen.getByText(/Share Your Recap/i);
    await userEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByText(/Shared!/i)).toBeInTheDocument();
    });
  });

  it('should render close button when onClose is provided', () => {
    const onClose = vi.fn();
    render(<WrappedRecapView recap={mockRecap} onClose={onClose} />);

    const closeButton = screen.getByLabelText(/close/i);
    expect(closeButton).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const onClose = vi.fn();

    render(<WrappedRecapView recap={mockRecap} onClose={onClose} />);

    const closeButton = screen.getByLabelText(/close/i);
    await userEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should render view history button when onViewHistory is provided', async () => {
    const onViewHistory = vi.fn();
    render(
      <WrappedRecapView recap={mockRecap} onViewHistory={onViewHistory} />
    );

    await waitFor(
      () => {
        expect(screen.getByText(/View History/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should call onViewHistory when view history button is clicked', async () => {
    const onViewHistory = vi.fn();

    render(
      <WrappedRecapView recap={mockRecap} onViewHistory={onViewHistory} />
    );

    await waitFor(
      () => {
        expect(screen.getByText(/View History/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const historyButton = screen.getByText(/View History/i);
    await userEvent.click(historyButton);

    expect(onViewHistory).toHaveBeenCalledTimes(1);
  });

  it('should not render view history button when onViewHistory is not provided', async () => {
    render(<WrappedRecapView recap={mockRecap} />);

    await waitFor(
      () => {
        expect(screen.getByText(/Share Your Recap/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.queryByText(/View History/i)).not.toBeInTheDocument();
  });

  it('should display accuracy progress bar', async () => {
    render(<WrappedRecapView recap={mockRecap} />);

    await waitFor(
      () => {
        const progressBars = document.querySelectorAll('.bg-gradient-to-r');
        expect(progressBars.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
  });

  it('should handle zero values gracefully', async () => {
    const zeroRecap = {
      ...mockRecap,
      totalPoints: 0,
      accuracy: 0,
      longestStreak: 0,
      clutchMoments: 0,
    };

    render(<WrappedRecapView recap={zeroRecap} />);

    await waitFor(
      () => {
        expect(screen.getByText('0%')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should apply gradient background', () => {
    const { container } = render(<WrappedRecapView recap={mockRecap} />);

    const mainDiv = container.querySelector('.wrapped-recap-view');
    expect(mainDiv).toHaveClass('bg-gradient-to-br');
  });

  it('should have proper accessibility attributes', () => {
    const onClose = vi.fn();
    render(<WrappedRecapView recap={mockRecap} onClose={onClose} />);

    const closeButton = screen.getByLabelText(/close/i);
    expect(closeButton).toHaveAttribute('aria-label');
  });
});
