import { Type, plainToInstance } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min, validateSync } from 'class-validator';

/**
 * Single source of truth for reading/validating environment variables.
 * Registered once via ConfigModule.forRoot({ validate }) in app.module.ts —
 * nothing else in the app should read process.env directly.
 *
 * Numeric fields use an explicit @Type(() => Number) rather than relying on
 * plainToInstance's implicit conversion: env vars always arrive as strings,
 * and implicit conversion needs reflected design:type metadata that isn't
 * reliably present on a plain property-with-initializer in every TS config —
 * explicit @Type is what actually converts "3000" -> 3000 here.
 */
class EnvironmentVariables {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_HOST: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  DATABASE_PORT = 5432;

  @IsString()
  @IsNotEmpty()
  DATABASE_USER: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_NAME: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  JWT_EXPIRES_IN = 3600;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config);
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors.map((e) => e.toString()).join('\n')}`,
    );
  }

  return validatedConfig;
}
