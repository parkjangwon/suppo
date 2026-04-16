export interface EmailSendInput {
  to: string;
  subject: string;
  html: string;
  from: string;
  headers?: Record<string, string>;
}

export interface EmailProvider {
  send: (input: EmailSendInput) => Promise<void>;
}
