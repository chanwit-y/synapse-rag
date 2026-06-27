export type UserStatus = "active" | "inactive";

/** Client-facing user view model — never carries the password hash. */
export type UserRecord = {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

/** Values for creating a user (email + password required). */
export type CreateUserFormValues = {
  email: string;
  name: string;
  password: string;
  active: boolean;
};

/** Values for editing a user's profile (email is immutable once created). */
export type UpdateUserFormValues = {
  name: string;
  active: boolean;
};
