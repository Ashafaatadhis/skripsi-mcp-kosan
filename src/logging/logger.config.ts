import type { Params } from "nestjs-pino";

const isDevelopment = process.env.NODE_ENV !== "production";

// Pretty transport for development (simpler config that can be serialized)
const devTransport = {
  target: "pino-pretty",
  options: {
    colorize: true,
    translateTime: "SYS:HH:MM:ss",
    ignore: "pid,hostname,app,env",
    singleLine: false,
  },
};

export const loggerConfig: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? "info",
    timestamp: true,
    base: {
      app: "kosan-mcp",
      env: process.env.NODE_ENV ?? "development",
    },
    redact: ["req.headers.authorization", "authorization"],
    customProps(req) {
      return {
        requestId: req.id,
      };
    },
    // Use pretty transport in development
    ...(isDevelopment && { transport: devTransport }),
    // Custom serializers to reduce noise
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  },
};

// ============================================
// Event Icons - untuk digunakan di service logs
// ============================================

export const EVENT_ICONS = {
  // Server events
  SERVER_START: "🚀",
  SERVER_STOP: "🛑",

  // Tool events
  TOOL_CALL: "🔧",
  TOOL_SUCCESS: "✅",
  TOOL_ERROR: "❌",

  // Database events
  DB_QUERY: "🗄️",
  DB_ERROR: "❌",

  // Room events
  ROOM_CREATE: "🏠",
  ROOM_UPDATE: "✏️",
  ROOM_STATUS: "🔄",
  ROOM_SEARCH: "🔍",

  // Booking events
  BOOKING_CREATE: "📝",
  BOOKING_CONFIRM: "✅",
  BOOKING_REJECT: "❌",
  BOOKING_CANCEL: "🚫",

  // Payment events
  PAYMENT_CREATE: "💳",
  PAYMENT_SUCCESS: "💰",
  PAYMENT_FAIL: "❌",
  PAYMENT_WEBHOOK: "🔔",

  // Complaint events
  COMPLAINT_SUBMIT: "📢",
  COMPLAINT_RESOLVE: "✅",

  // Notification events
  NOTIF_SEND: "📤",
  NOTIF_FAIL: "❌",

  // User events
  USER_REGISTER: "👤",
} as const;

// Helper untuk format log message dengan icon
export function logMsg(icon: keyof typeof EVENT_ICONS, message: string): string {
  return `${EVENT_ICONS[icon]} ${message}`;
}
