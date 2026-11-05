export type AuthDiagnosticCode =
  | 'AUTH001' | 'AUTH002' | 'AUTH003' | 'AUTH004' | 'AUTH005'
  | 'AUTH006' | 'AUTH007' | 'AUTH008' | 'AUTH009';

export class AuthDiagnostic extends Error {
  constructor(
    public code: AuthDiagnosticCode,
    message: string,
    public hint?: string,
    public severity: 'error' | 'warning' = 'error'
  ) {
    super(`[${code}] ${message}${hint ? `\n  Hint: ${hint}` : ''}`);
    this.name = 'AuthDiagnostic';
  }
}
