import { buttonVariants } from '@/components/ui/button';

describe('buttonVariants', () => {
  it('returns default styling', () => {
    expect(buttonVariants()).toContain('bg-primary');
  });

  it('applies ghost variant styling', () => {
    expect(buttonVariants({ variant: 'ghost' })).toContain('hover:text-accent-foreground');
  });
});