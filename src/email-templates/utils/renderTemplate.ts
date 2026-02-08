import { render } from '@react-email/render';
import React from 'react';

/**
 * Render options for email templates
 */
export interface RenderTemplateOptions {
  plainText?: boolean;
  pretty?: boolean;
}

/**
 * Render result containing HTML and plain text versions
 */
export interface RenderResult {
  html: string;
  text?: string;
}

/**
 * Render a React email template to HTML string
 *
 * @param template - The React component to render
 * @param options - Rendering options
 * @returns RenderResult containing HTML and optionally plain text
 *
 * @example
 * ```typescript
 * import { OrderConfirmationTemplate } from '../templates/order-confirmation';
 *
 * const result = await renderTemplate(
 *   <OrderConfirmationTemplate
 *     recipientName="John Doe"
 *     orderId="ORD-123"
 *   />,
 *   { plainText: true }
 * );
 *
 * console.log(result.html); // HTML string
 * console.log(result.text); // Plain text string
 * ```
 */
export async function renderTemplate(
  template: React.ReactElement,
  options: RenderTemplateOptions = {},
): Promise<RenderResult> {
  const { plainText = false, pretty = false } = options;

  // Render the template to HTML
  const html = await render(template, {
    pretty,
  });

  // If plain text is requested, generate it
  let text: string | undefined;
  if (plainText) {
    text = await render(template, {
      plainText: true,
    });
  }

  return {
    html,
    text,
  };
}

/**
 * Render a template to HTML only
 *
 * @param template - The React component to render
 * @param pretty - Whether to pretty-print the HTML
 * @returns HTML string
 *
 * @example
 * ```typescript
 * const html = await renderToHtml(
 *   <OrderConfirmationTemplate recipientName="John" />,
 *   true
 * );
 * ```
 */
export async function renderToHtml(
  template: React.ReactElement,
  pretty: boolean = false,
): Promise<string> {
  return await render(template, { pretty });
}

/**
 * Render a template to plain text only
 *
 * @param template - The React component to render
 * @returns Plain text string
 *
 * @example
 * ```typescript
 * const text = await renderToPlainText(
 *   <OrderConfirmationTemplate recipientName="John" />
 * );
 * ```
 */
export async function renderToPlainText(
  template: React.ReactElement,
): Promise<string> {
  return await render(template, { plainText: true });
}

/**
 * Validate a template by attempting to render it
 *
 * @param template - The React component to validate
 * @returns Promise that resolves if valid, rejects with error if invalid
 *
 * @example
 * ```typescript
 * try {
 *   await validateTemplate(<OrderConfirmationTemplate />);
 *   console.log('Template is valid');
 * } catch (error) {
 *   console.error('Template is invalid:', error);
 * }
 * ```
 */
export async function validateTemplate(
  template: React.ReactElement,
): Promise<void> {
  try {
    await render(template);
  } catch (error) {
    throw new Error(`Template validation failed: ${error}`);
  }
}
