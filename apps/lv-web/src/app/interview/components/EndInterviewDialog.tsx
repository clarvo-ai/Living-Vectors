import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/alert-dialog';

interface EndInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function EndInterviewDialog({
  open,
  onOpenChange,
  onConfirm,
}: EndInterviewDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End Interview</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to end the interview?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            style={{
              backgroundColor: 'var(--red-bg-light)',
              color: 'var(--red-700)',
              borderColor: 'var(--red-border-light)',
              borderWidth: '1px',
              borderStyle: 'solid',
              fontWeight: 'bold',
              transition: 'all 0.2s ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--red-bg-medium)';
              e.currentTarget.style.borderColor = 'var(--red-border-medium)';
              e.currentTarget.style.color = 'var(--red-800)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--red-bg-light)';
              e.currentTarget.style.borderColor = 'var(--red-border-light)';
              e.currentTarget.style.color = 'var(--red-700)';
            }}
          >
            End Interview
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
