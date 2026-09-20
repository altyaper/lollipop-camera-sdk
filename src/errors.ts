export class LollipopApiError extends Error {
  readonly status: number;
  readonly parseCode: number | undefined;

  constructor(status: number, parseCode?: number) {
    const codeSuffix = parseCode === undefined ? '' : ` (Parse code ${parseCode})`;
    super(`Lollipop API request failed with HTTP ${status}${codeSuffix}.`);
    this.name = 'LollipopApiError';
    this.status = status;
    this.parseCode = parseCode;
  }
}
