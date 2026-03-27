import ProfilePage from '@/app/dashboard/profile/page';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('Profile Page', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  const mockSession = {
    user: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    },
  };

  const mockProfile = {
    first_name: 'John',
    last_name: 'Doe',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    bio: 'Software developer',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });

    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders profile page with form fields', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ body: mockProfile }),
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Bio/i)).toBeInTheDocument();
    });
  });

  it('loads profile data on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ body: mockProfile }),
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/profile');
    });
  });

  it('displays profile values in form fields', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ body: mockProfile }),
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect((screen.getByLabelText(/First Name/i) as HTMLInputElement).value).toBe('John');
      expect((screen.getByLabelText(/Last Name/i) as HTMLInputElement).value).toBe('Doe');
      expect((screen.getByLabelText(/Phone Number/i) as HTMLInputElement).value).toBe(
        '+1234567890'
      );
    });
  });

  it('disables email field', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ body: mockProfile }),
    });

    render(<ProfilePage />);

    await waitFor(() => {
      const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement;
      expect(emailInput.disabled).toBe(true);
    });
  });

  it('updates field value on input change', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ body: mockProfile }),
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText(/First Name/i) as HTMLInputElement;
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Jane');

    expect(firstNameInput.value).toBe('Jane');
  });

  it('keeps only allowed phone characters', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ body: mockProfile }),
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    });

    const phoneInput = screen.getByLabelText(/Phone Number/i) as HTMLInputElement;
    await user.clear(phoneInput);
    await user.type(phoneInput, 'abc+12(34)-56#');

    expect(phoneInput.value).toBe('+12(34)-56');
  });

  it('submits null phone when phone input is cleared', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ body: mockProfile }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    });

    const phoneInput = screen.getByLabelText(/Phone Number/i) as HTMLInputElement;
    await user.clear(phoneInput);
    expect(phoneInput.value).toBe('');

    const saveButton = screen.getByText(/Save Changes/i);
    await user.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/profile',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });
  });

  it('rejects phone numbers shorter than 7 characters', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ body: mockProfile }),
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    });

    const phoneInput = screen.getByLabelText(/Phone Number/i) as HTMLInputElement;
    await user.clear(phoneInput);
    await user.type(phoneInput, '123456');

    const saveButton = screen.getByText(/Save Changes/i);
    await user.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Phone number must have at least 7 characters');
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not clear unsaved fields when session object refreshes', async () => {
    const user = userEvent.setup();
    let currentSession = {
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      },
    };

    (useSession as jest.Mock).mockImplementation(() => ({
      data: currentSession,
      status: 'authenticated',
    }));

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ body: mockProfile }),
    });

    const { rerender } = render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText(/First Name/i) as HTMLInputElement;
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Jane');
    expect(firstNameInput.value).toBe('Jane');

    currentSession = {
      user: {
        id: '1',
        name: 'John Doe Refreshed',
        email: 'john@example.com',
      },
    };

    rerender(<ProfilePage />);

    await waitFor(() => {
      expect((screen.getByLabelText(/First Name/i) as HTMLInputElement).value).toBe('Jane');
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('submits form with updated data', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ body: mockProfile }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockProfile, first_name: 'Jane' }),
      });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText(/First Name/i);
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Jane');

    const saveButton = screen.getByText(/Save Changes/i);
    await user.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/profile',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });
  });

  it('shows success toast on successful save', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ body: mockProfile }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByText(/Save Changes/i);
    await user.click(saveButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
    });
  });

  it('shows error toast on failed save', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ body: mockProfile }),
      })
      .mockResolvedValueOnce({
        ok: false,
      });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByText(/Save Changes/i);
    await user.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update profile');
    });
  });

  it('calls router.back on cancel', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ body: mockProfile }),
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByText(/Cancel/i);
    await user.click(cancelButton);

    expect(mockRouter.back).toHaveBeenCalled();
  });
});
