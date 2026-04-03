import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Leaderboard } from './Leaderboard';
import { useAppStore } from '../store';
import '../i18n'; // Initialize i18n for tests

// Mock the store
vi.mock('../store', () => ({
  useAppStore: vi.fn(),
}));

describe('Leaderboard Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should render empty state when no leaderboard data', () => {
    // Mock store with empty leaderboard
    vi.mocked(useAppStore).mockReturnValue({
      leaderboard: [],
      user: null,
    } as ReturnType<typeof useAppStore>);

    render(<Leaderboard />);

    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Waiting for players...')).toBeInTheDocument();
  });

  it('should render leaderboard with user data', () => {
    // Mock store with leaderboard data
    vi.mocked(useAppStore).mockReturnValue({
      leaderboard: [
        {
          userId: 'user-1',
          displayName: 'Alice',
          totalPoints: 150,
          streak: 3,
          rank: 1,
        },
        {
          userId: 'user-2',
          displayName: 'Bob',
          totalPoints: 120,
          streak: 2,
          rank: 2,
        },
        {
          userId: 'user-3',
          displayName: 'Charlie',
          totalPoints: 90,
          streak: 0,
          rank: 3,
        },
      ],
      user: null,
    } as ReturnType<typeof useAppStore>);

    render(<Leaderboard />);

    // Check that all users are rendered
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();

    // Check that points are displayed
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
  });

  it('should display table headers correctly', () => {
    vi.mocked(useAppStore).mockReturnValue({
      leaderboard: [
        {
          userId: 'user-1',
          displayName: 'Alice',
          totalPoints: 150,
          streak: 3,
          rank: 1,
        },
      ],
      user: null,
    } as ReturnType<typeof useAppStore>);

    render(<Leaderboard />);

    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByText('Points')).toBeInTheDocument();
    expect(screen.getByText('Streak')).toBeInTheDocument();
  });

  it('should highlight current user row', () => {
    vi.mocked(useAppStore).mockReturnValue({
      leaderboard: [
        {
          userId: 'user-1',
          displayName: 'Alice',
          totalPoints: 150,
          streak: 3,
          rank: 1,
        },
        {
          userId: 'user-2',
          displayName: 'Bob',
          totalPoints: 120,
          streak: 2,
          rank: 2,
        },
      ],
      user: { userId: 'user-2', displayName: 'Bob', isGuest: false },
    } as ReturnType<typeof useAppStore>);

    const { container } = render(<Leaderboard />);

    // Check that "You" badge is displayed for current user
    expect(screen.getByText('You')).toBeInTheDocument();

    // Check that current user row has highlight class
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[1]).toHaveClass('bg-yellow-50');
  });

  it('should display medals for top 3 ranks', () => {
    vi.mocked(useAppStore).mockReturnValue({
      leaderboard: [
        {
          userId: 'user-1',
          displayName: 'First',
          totalPoints: 150,
          streak: 3,
          rank: 1,
        },
        {
          userId: 'user-2',
          displayName: 'Second',
          totalPoints: 120,
          streak: 2,
          rank: 2,
        },
        {
          userId: 'user-3',
          displayName: 'Third',
          totalPoints: 90,
          streak: 1,
          rank: 3,
        },
        {
          userId: 'user-4',
          displayName: 'Fourth',
          totalPoints: 60,
          streak: 0,
          rank: 4,
        },
      ],
      user: null,
    } as ReturnType<typeof useAppStore>);

    const { container } = render(<Leaderboard />);

    // Check that medals are displayed
    expect(container.textContent).toContain('🥇');
    expect(container.textContent).toContain('🥈');
    expect(container.textContent).toContain('🥉');
    expect(container.textContent).toContain('4');
  });

  it('should display streak with fire emoji', () => {
    vi.mocked(useAppStore).mockReturnValue({
      leaderboard: [
        {
          userId: 'user-1',
          displayName: 'Alice',
          totalPoints: 150,
          streak: 5,
          rank: 1,
        },
        {
          userId: 'user-2',
          displayName: 'Bob',
          totalPoints: 120,
          streak: 0,
          rank: 2,
        },
      ],
      user: null,
    } as ReturnType<typeof useAppStore>);

    const { container } = render(<Leaderboard />);

    // Check that streak with fire emoji is displayed
    expect(container.textContent).toContain('5 🔥');
    // Check that zero streak shows dash
    expect(container.textContent).toContain('-');
  });

  it('should render leaderboard in correct rank order', () => {
    vi.mocked(useAppStore).mockReturnValue({
      leaderboard: [
        {
          userId: 'user-1',
          displayName: 'First',
          totalPoints: 150,
          streak: 3,
          rank: 1,
        },
        {
          userId: 'user-2',
          displayName: 'Second',
          totalPoints: 120,
          streak: 2,
          rank: 2,
        },
        {
          userId: 'user-3',
          displayName: 'Third',
          totalPoints: 90,
          streak: 1,
          rank: 3,
        },
      ],
      user: null,
    } as ReturnType<typeof useAppStore>);

    const { container } = render(<Leaderboard />);

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);

    // Verify order
    expect(rows[0].textContent).toContain('First');
    expect(rows[1].textContent).toContain('Second');
    expect(rows[2].textContent).toContain('Third');
  });

  it('should display points correctly for all users', () => {
    vi.mocked(useAppStore).mockReturnValue({
      leaderboard: [
        {
          userId: 'user-1',
          displayName: 'Alice',
          totalPoints: 250,
          streak: 5,
          rank: 1,
        },
        {
          userId: 'user-2',
          displayName: 'Bob',
          totalPoints: 0,
          streak: 0,
          rank: 2,
        },
      ],
      user: null,
    } as ReturnType<typeof useAppStore>);

    render(<Leaderboard />);

    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should handle large leaderboards', () => {
    const largeLeaderboard = Array.from({ length: 20 }, (_, i) => ({
      userId: `user-${i}`,
      displayName: `Player ${i + 1}`,
      totalPoints: 200 - i * 10,
      streak: i % 5,
      rank: i + 1,
    }));

    vi.mocked(useAppStore).mockReturnValue({
      leaderboard: largeLeaderboard,
      user: null,
    } as ReturnType<typeof useAppStore>);

    const { container } = render(<Leaderboard />);

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(20);
  });

  it('should apply hover effect to non-current user rows', () => {
    vi.mocked(useAppStore).mockReturnValue({
      leaderboard: [
        {
          userId: 'user-1',
          displayName: 'Alice',
          totalPoints: 150,
          streak: 3,
          rank: 1,
        },
        {
          userId: 'user-2',
          displayName: 'Bob',
          totalPoints: 120,
          streak: 2,
          rank: 2,
        },
      ],
      user: { userId: 'user-1', displayName: 'Alice', isGuest: false },
    } as ReturnType<typeof useAppStore>);

    const { container } = render(<Leaderboard />);

    const rows = container.querySelectorAll('tbody tr');
    // First row is current user, should have yellow background
    expect(rows[0]).toHaveClass('bg-yellow-50');
    // Second row is not current user, should have hover class
    expect(rows[1]).toHaveClass('hover:bg-gray-50');
  });

  it('should display transition classes for smooth animations', () => {
    vi.mocked(useAppStore).mockReturnValue({
      leaderboard: [
        {
          userId: 'user-1',
          displayName: 'Alice',
          totalPoints: 150,
          streak: 3,
          rank: 1,
        },
      ],
      user: null,
    } as ReturnType<typeof useAppStore>);

    const { container } = render(<Leaderboard />);

    const row = container.querySelector('tbody tr');
    expect(row).toHaveClass('transition-all', 'duration-300', 'ease-in-out');
  });
});
