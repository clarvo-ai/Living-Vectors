'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/alert-dialog';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  submitText?: string;
  className?: string;
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
  itemType?: string;
  itemTitle?: string;
}

const defaultClassName = 'sm:max-w-[400px]  lg:max-w-[600px] max-w-[90vw] max-h-[100vh]';

export const Modal = ({
  className,
  isOpen,
  onClose,
  title,
  description,
  children,
  onSubmit,
  isSubmitting = false,
  submitText = 'Save Changes',
  onDelete,
  isDeleting = false,
  itemType,
  itemTitle,
}: ModalProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className={`${defaultClassName} ${className}`}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="grid gap-4 py-4">{children}</div>

          <div className="flex flex-col space-y-2 sm:space-y-0 pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              {onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting || isSubmitting}
                >
                  {isDeleting ? 'Deleting...' : `Delete ${itemType}`}
                </Button>
              )}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting || isDeleting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={onSubmit}
                  disabled={isSubmitting || isDeleting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? 'Saving...' : submitText}
                </Button>
              </div>
            </div>
          </div>

          <AlertDialog open={showDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Confirmation</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {itemType} &quot;{itemTitle}&quot;? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <Button
                  type="submit"
                  onClick={async () => {
                    if (onDelete) {
                      setShowDeleteConfirm(false);
                      await onDelete();
                    }
                  }}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>
    </>
  );
};
