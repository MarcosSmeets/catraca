"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              "!bg-surface-lowest !border !border-outline-variant !rounded-sm !font-body !text-sm !text-on-surface",
            title: "!font-semibold",
            success: "!text-on-surface",
            error: "!text-error",
            info: "!text-on-surface",
          },
        }}
      />
    </QueryClientProvider>
  );
}
