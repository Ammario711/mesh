import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enableLogs: true,
    integrations: [
      Sentry.replayIntegration({
        blockAllMedia: true,
        maskAllInputs: true,
        maskAllText: true,
      }),
      Sentry.feedbackIntegration({
        colorScheme: "system",
      }),
    ],
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.05,
    sendDefaultPii: false,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
