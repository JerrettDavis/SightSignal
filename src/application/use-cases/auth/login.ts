import type { AdminCredentials } from "@/domain/auth/admin-user";
import type {
  AdminAuthRepository,
  JwtService,
  PasswordService,
} from "@/ports/auth";
import { err, ok, type Result, type DomainError } from "@/shared/result";

type LoginResult = Result<{ token: string; username: string }, DomainError>;

export type Login = (credentials: AdminCredentials) => Promise<LoginResult>;

type Dependencies = {
  repository: AdminAuthRepository;
  jwtService: JwtService;
  passwordService: PasswordService;
};

export const buildLogin = ({
  repository,
  jwtService,
  passwordService,
}: Dependencies): Login => {
  return async (credentials) => {
    const user = await repository.findByUsername(credentials.username);

    if (!user) {
      return err({
        code: "auth.invalid_credentials",
        message: "Invalid username or password.",
      });
    }

    const isValid = await passwordService.verify(
      credentials.password,
      user.passwordHash
    );

    if (!isValid) {
      return err({
        code: "auth.invalid_credentials",
        message: "Invalid username or password.",
      });
    }

    const token = await jwtService.sign({
      userId: user.id,
      username: user.username,
    });

    return ok({ token, username: user.username });
  };
};
