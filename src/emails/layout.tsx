import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export const BRAND_PRIMARY = "#1B4F72";
export const BRAND_PRIMARY_DARK = "#154360";
export const BRAND_ACCENT = "#AED6F1";
export const BRAND_BG = "#F4F6F7";
export const BRAND_BORDER = "#E1E7EB";
export const BRAND_TEXT = "#1F2937";
export const BRAND_MUTED = "#6B7280";

export interface EmailLayoutProps {
  preview: string;
  title: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, title, children }: EmailLayoutProps) {
  return (
    <Html lang="es">
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: BRAND_BG,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          margin: 0,
          padding: 0,
          color: BRAND_TEXT,
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            padding: "24px 16px",
          }}
        >
          <Section
            style={{
              backgroundColor: BRAND_PRIMARY,
              borderRadius: "12px 12px 0 0",
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "-0.02em",
              }}
            >
              SalaQX
            </Text>
            <Text
              style={{
                margin: "4px 0 0 0",
                fontSize: "13px",
                color: BRAND_ACCENT,
                fontWeight: 500,
              }}
            >
              Sistema de Quirófano
            </Text>
          </Section>

          <Section
            style={{
              backgroundColor: "#FFFFFF",
              padding: "32px 28px",
              borderLeft: `1px solid ${BRAND_BORDER}`,
              borderRight: `1px solid ${BRAND_BORDER}`,
            }}
          >
            <Heading
              as="h2"
              style={{
                margin: "0 0 20px 0",
                fontSize: "20px",
                fontWeight: 600,
                color: BRAND_PRIMARY_DARK,
                lineHeight: "1.3",
              }}
            >
              {title}
            </Heading>
            {children}
          </Section>

          <Section
            style={{
              backgroundColor: BRAND_PRIMARY,
              borderRadius: "0 0 12px 12px",
              padding: "18px 24px",
              textAlign: "center",
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: "12px",
                color: BRAND_ACCENT,
                lineHeight: "1.5",
              }}
            >
              SalaQX · Gestión de quirófanos
              <br />
              Este es un email automático, no responder.
            </Text>
          </Section>

          <Text
            style={{
              textAlign: "center",
              fontSize: "11px",
              color: BRAND_MUTED,
              margin: "16px 0 0 0",
            }}
          >
            © {new Date().getFullYear()} SalaQX. Todos los derechos reservados.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function Greeting({ name }: { name: string }) {
  return (
    <Text style={{ margin: "0 0 16px 0", fontSize: "15px", lineHeight: "1.5" }}>
      Hola <strong>{name}</strong>,
    </Text>
  );
}

export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 10px 0",
        fontSize: "14px",
        lineHeight: "1.5",
        color: BRAND_TEXT,
      }}
    >
      <span style={{ color: BRAND_MUTED, display: "inline-block", minWidth: "120px" }}>
        {label}:
      </span>{" "}
      <strong style={{ color: BRAND_PRIMARY_DARK }}>{value}</strong>
    </Text>
  );
}

export function DetailCard({ children }: { children: React.ReactNode }) {
  return (
    <Section
      style={{
        backgroundColor: BRAND_BG,
        borderLeft: `3px solid ${BRAND_PRIMARY}`,
        borderRadius: "6px",
        padding: "16px 20px",
        margin: "20px 0",
      }}
    >
      {children}
    </Section>
  );
}

export function CtaButton({ href, label }: { href: string; label: string }) {
  return (
    <Section style={{ textAlign: "center", margin: "28px 0 8px 0" }}>
      <Link
        href={href}
        style={{
          backgroundColor: BRAND_PRIMARY,
          color: "#FFFFFF",
          padding: "12px 28px",
          borderRadius: "8px",
          textDecoration: "none",
          fontSize: "14px",
          fontWeight: 600,
          display: "inline-block",
        }}
      >
        {label}
      </Link>
    </Section>
  );
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ margin: "0 0 16px 0", fontSize: "14px", lineHeight: "1.6" }}>
      {children}
    </Text>
  );
}

export function Divider() {
  return <Hr style={{ borderColor: BRAND_BORDER, margin: "20px 0" }} />;
}
