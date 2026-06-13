export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function actionFailure(error: unknown): ActionResult<never> {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  return { success: false, error: message };
}
