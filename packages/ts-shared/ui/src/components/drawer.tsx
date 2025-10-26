'use client';

import { ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';
import { Drawer as VaulDrawer } from 'vaul';
import { cn } from '../lib/utils';

interface DrawerProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Drawer = ({ trigger, children, className }: DrawerProps) => {
  return (
    <VaulDrawer.Root>
      <VaulDrawer.Trigger asChild>{trigger}</VaulDrawer.Trigger>

      <VaulDrawer.Portal>
        <VaulDrawer.Overlay className="fixed z-[35] inset-0 bg-black/40" />
        <VaulDrawer.Content
          className={cn(
            'bg-gray-100 flex flex-col rounded-t-[10px] max-h-[85vh] mt-24 lg:h-fit fixed bottom-0 left-0 right-0 z-[35]',
            className
          )}
          style={
            {
              '--initial-transform': '100%',
              userSelect: 'text',
            } as React.CSSProperties
          }
        >
          <div className="p-4 bg-white rounded-t-[10px] overflow-y-auto">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-8" />
            <div data-vaul-no-drag className="max-w-4xl mx-auto">
              {children}
            </div>
          </div>
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  );
};

interface DrawerTriggerProps {
  children?: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  variant?: 'default' | 'minimal';
  warningIcon?: ReactNode;
  warningText?: string;
}

export const DrawerTrigger = ({
  children,
  title,
  subtitle,
  icon,
  className,
  variant = 'default',
  warningIcon,
  warningText,
}: DrawerTriggerProps) => {
  if (variant === 'minimal') {
    return <VaulDrawer.Trigger asChild>{children}</VaulDrawer.Trigger>;
  }

  return (
    <VaulDrawer.Trigger asChild>
      <div
        className={`bg-white rounded-2xl border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-all duration-200 ${className || ''}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {title && <h3 className="text-xl font-semibold text-gray-900">{title}</h3>}
                {warningIcon && (
                  <div className="relative group">
                    {warningIcon}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      {warningText || 'Action required'}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
              {children && <div className="mt-2">{children}</div>}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-2" />
        </div>
      </div>
    </VaulDrawer.Trigger>
  );
};

interface DrawerContentProps {
  children: ReactNode;
}

export const DrawerContent = ({ children }: DrawerContentProps) => {
  return (
    <VaulDrawer.Portal>
      <VaulDrawer.Overlay className="fixed z-[35] inset-0 bg-black/40" />
      <VaulDrawer.Content
        className="bg-gray-100 flex flex-col rounded-t-[10px] max-h-[85vh] mt-24 lg:h-fit fixed bottom-0 left-0 right-0 z-[35]"
        style={
          {
            '--initial-transform': '100%',
            userSelect: 'text',
          } as React.CSSProperties
        }
      >
        <div className="p-4 bg-white rounded-t-[10px] overflow-y-auto">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-8" />
          <div data-vaul-no-drag className="max-w-4xl mx-auto">
            {children}
          </div>
        </div>
      </VaulDrawer.Content>
    </VaulDrawer.Portal>
  );
};

interface NestedDrawerProps {
  firstDrawerTrigger: ReactNode;
  firstDrawerContent: ReactNode;
  nestedDrawerContent: ReactNode;
}

export const NestedDrawer = ({
  firstDrawerTrigger,
  firstDrawerContent,
  nestedDrawerContent,
}: NestedDrawerProps) => {
  return (
    <VaulDrawer.Root>
      {firstDrawerTrigger}
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay className="fixed z-[35] inset-0 bg-black/40" />
        <VaulDrawer.Content
          className="bg-gray-100 flex flex-col rounded-t-[10px] max-h-[85vh] mt-24 lg:h-fit fixed bottom-0 left-0 right-0 z-[35]"
          style={
            {
              '--initial-transform': '100%',
              userSelect: 'text',
            } as React.CSSProperties
          }
        >
          <div className="p-4 bg-white rounded-t-[10px] overflow-y-auto">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-8" />
            <div data-vaul-no-drag className="max-w-4xl mx-auto">
              {firstDrawerContent}
            </div>
            <div data-vaul-no-drag className="max-w-4xl mx-auto">
              {nestedDrawerContent}
            </div>
          </div>
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  );
};
