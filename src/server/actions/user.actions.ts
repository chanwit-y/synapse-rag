"use server";

import type {
  CreateUserFormValues,
  UpdateUserFormValues,
  UserRecord,
} from "@/components/container/users/types";
import { userService } from "@/server/services";
import { actionFailure, actionSuccess, type ActionResult } from "./types";

export async function listUsersAction(): Promise<ActionResult<UserRecord[]>> {
  try {
    return actionSuccess(await userService.list());
  } catch (error) {
    return actionFailure(error);
  }
}

export async function createUserAction(
  values: CreateUserFormValues,
): Promise<ActionResult<UserRecord>> {
  try {
    return actionSuccess(await userService.create(values));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function updateUserAction(
  id: string,
  values: UpdateUserFormValues,
): Promise<ActionResult<UserRecord>> {
  try {
    return actionSuccess(await userService.update(id, values));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function resetUserPasswordAction(
  id: string,
  newPassword: string,
): Promise<ActionResult<void>> {
  try {
    await userService.resetPassword(id, newPassword);
    return actionSuccess(undefined);
  } catch (error) {
    return actionFailure(error);
  }
}

export async function deleteUserAction(id: string): Promise<ActionResult<void>> {
  try {
    await userService.remove(id);
    return actionSuccess(undefined);
  } catch (error) {
    return actionFailure(error);
  }
}
