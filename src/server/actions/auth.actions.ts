"use server";

import type { UserRecord } from "@/components/container/users/types";
import { authService } from "@/server/services";
import { actionFailure, actionSuccess, type ActionResult } from "./types";

export async function loginAction(
  email: string,
  password: string,
): Promise<ActionResult<UserRecord>> {
  try {
    return actionSuccess(await authService.login(email, password));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function logoutAction(): Promise<ActionResult<void>> {
  try {
    await authService.logout();
    return actionSuccess(undefined);
  } catch (error) {
    return actionFailure(error);
  }
}

export async function getCurrentUserAction(): Promise<
  ActionResult<UserRecord | null>
> {
  try {
    return actionSuccess(await authService.getCurrentUser());
  } catch (error) {
    return actionFailure(error);
  }
}

export async function changeOwnPasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<ActionResult<void>> {
  try {
    await authService.changeOwnPassword(currentPassword, newPassword);
    return actionSuccess(undefined);
  } catch (error) {
    return actionFailure(error);
  }
}

export async function updateOwnNameAction(
  name: string,
): Promise<ActionResult<UserRecord>> {
  try {
    return actionSuccess(await authService.updateOwnName(name));
  } catch (error) {
    return actionFailure(error);
  }
}
