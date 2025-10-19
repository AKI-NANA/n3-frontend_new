// ========================================
// supabase/functions/_shared/error-handling.ts
// Complete Error Handling & Retry System
// ========================================

// ========================================
// 1. Error Types & Classes
// ========================================

export enum ErrorCode {
  // API Errors
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_AUTHENTICATION = 'API_AUTHENTICATION',
  API_NOT_FOUND = 'API_NOT_FOUND',
  API_SERVER_ERROR = 'API_SERVER_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  API_NETWORK = 'API_NETWORK',
  
  // Business Logic Errors
  INSUFFICIENT_PROFIT = 'INSUFFICIENT_PROFIT',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  PRICE_TOO_HIGH = 'PRICE_TOO_HIGH',
  INVALID_PRODUCT = 'INVALID_PRODUCT',
  DUPLICATE_LISTING = 'DUPLICATE_LISTING',
  
  // Database Errors
  DB_CONNECTION = 'DB_CONNECTION',
  DB_QUERY = 'DB_QUERY',
  DB_CONSTRAINT = 'DB_CONSTRAINT',
  
  // Validation Errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // System Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class ApplicationError extends Error {
  code: ErrorCode;
  statusCode: number;
  retryable: boolean;
  details?: any;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode: number = 500,
    retryable: boolean = false,
    details?: any
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
  }

  toJSON() {
    return {
      error: true,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      retryable: this.retryable,
      details: this.details,
      timestamp: new Date().toISOString()
    };
  }
}

export class APIError extends ApplicationError {
  constructor(message: string, code: ErrorCode, statusCode: number, retryable: boolean = true) {
    super(message, code, statusCode, retryable);
    this.name = 'APIError';
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.VALIDATION_FAILED, 400, false, details);
    this.name = 'ValidationError';
  }
}

export class BusinessLogicError extends ApplicationError {
  constructor(message: string, code: ErrorCode, details?: any) {
    super(message, code, 422, false, details);
    this.name = 'BusinessLogicError';
  }
}

// ========================================
// 2. Retry Strategy
// ========================================

interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: ErrorCode[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    ErrorCode.API_RATE_LIMIT,
    ErrorCode.API_TIMEOUT,
    ErrorCode.API_NETWORK,
    ErrorCode.API_SERVER_ERROR,
    ErrorCode.DB_CONNECTION
  ]
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  operationName: string = 'operation'
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;
  let attempt = 0;

  while (attempt < finalConfig.maxAttempts) {
    attempt++;

    try {
      console.log(`[${operationName}] Attempt ${attempt}/${finalConfig.maxAttempts}`);
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const isRetryable = error instanceof ApplicationError
        ? error.retryable || finalConfig.retryableErrors?.includes(error.code)
        : true; // Unknown errors are retryable by default

      if (errorLogger) {
        await errorLogger.log(error as Error, {
          request: {
            url: req.url,
            method: req.method
          }
        });
      }

      if (error instanceof ApplicationError) {
        return new Response(JSON.stringify(error.toJSON()), {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Unknown error
      const unknownError = new ApplicationError(
        'Internal server error',
        ErrorCode.UNKNOWN_ERROR,
        500,
        false
      );

      return new Response(JSON.stringify(unknownError.toJSON()), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

// ========================================
// 9. Batch Operation Error Handler
// ========================================

export interface BatchResult<T> {
  success: boolean;
  data?: T;
  error?: ApplicationError;
}

export async function executeBatch<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options: {
    concurrency?: number;
    continueOnError?: boolean;
    retryConfig?: Partial<RetryConfig>;
  } = {}
): Promise<{
  results: BatchResult<R>[];
  successCount: number;
  failureCount: number;
}> {
  const {
    concurrency = 5,
    continueOnError = true,
    retryConfig = {}
  } = options;

  const results: BatchResult<R>[] = [];
  let successCount = 0;
  let failureCount = 0;

  // Process in batches with concurrency limit
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (item) => {
      try {
        const result = await withRetry(
          () => operation(item),
          retryConfig,
          `batch-operation-${i}`
        );
        successCount++;
        return { success: true, data: result } as BatchResult<R>;
      } catch (error) {
        failureCount++;
        const appError = error instanceof ApplicationError
          ? error
          : new ApplicationError(
              error instanceof Error ? error.message : 'Unknown error',
              ErrorCode.UNKNOWN_ERROR
            );

        if (!continueOnError) {
          throw appError;
        }

        return { success: false, error: appError } as BatchResult<R>;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return { results, successCount, failureCount };
}

// ========================================
// 10. Database Transaction Wrapper
// ========================================

export async function withTransaction<T>(
  supabase: any,
  operation: (client: any) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;

    try {
      // Start transaction
      const { data, error } = await supabase.rpc('begin_transaction');
      if (error) throw error;

      try {
        // Execute operation
        const result = await operation(supabase);

        // Commit transaction
        await supabase.rpc('commit_transaction');
        return result;

      } catch (opError) {
        // Rollback on error
        await supabase.rpc('rollback_transaction');
        throw opError;
      }

    } catch (error) {
      if (attempt >= maxRetries) {
        throw new ApplicationError(
          `Transaction failed after ${maxRetries} attempts`,
          ErrorCode.DB_QUERY,
          500,
          false,
          { originalError: error }
        );
      }

      console.warn(`Transaction attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new ApplicationError('Transaction failed', ErrorCode.DB_QUERY);
}

// ========================================
// 11. Health Check System
// ========================================

interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  timestamp: string;
}

export class HealthChecker {
  private checks: Map<string, () => Promise<HealthStatus>> = new Map();

  register(serviceName: string, checkFn: () => Promise<boolean>): void {
    this.checks.set(serviceName, async () => {
      const startTime = Date.now();
      try {
        const isHealthy = await withTimeout(checkFn(), 5000, `health-check-${serviceName}`);
        const latency = Date.now() - startTime;

        return {
          service: serviceName,
          status: isHealthy ? 'healthy' : 'unhealthy',
          latency,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return {
          service: serviceName,
          status: 'unhealthy',
          latency: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        };
      }
    });
  }

  async checkAll(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: HealthStatus[];
  }> {
    const results = await Promise.all(
      Array.from(this.checks.values()).map(check => check())
    );

    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
    const degradedCount = results.filter(r => r.status === 'degraded').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    return { overall, services: results };
  }
}

// ========================================
// 12. Graceful Degradation Helper
// ========================================

export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T> | T,
  options: {
    timeout?: number;
    shouldFallback?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const { timeout = 5000, shouldFallback = () => true } = options;

  try {
    if (timeout) {
      return await withTimeout(primary(), timeout, 'primary-operation');
    }
    return await primary();
  } catch (error) {
    if (shouldFallback(error as Error)) {
      console.warn('Primary operation failed, using fallback:', error);
      return await fallback();
    }
    throw error;
  }
}

// ========================================
// 13. Rate Limiter (In-Memory)
// ========================================

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get existing requests for this key
    let timestamps = this.requests.get(key) || [];

    // Remove old timestamps outside the window
    timestamps = timestamps.filter(t => t > windowStart);

    // Check if limit exceeded
    if (timestamps.length >= this.config.maxRequests) {
      return false;
    }

    // Add current timestamp
    timestamps.push(now);
    this.requests.set(key, timestamps);

    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(t => t > now - this.config.windowMs);
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }
}

// Global rate limiters
const rateLimiters = new Map<string, RateLimiter>();

export function getRateLimiter(name: string, config: RateLimitConfig): RateLimiter {
  if (!rateLimiters.has(name)) {
    rateLimiters.set(name, new RateLimiter(config));
  }
  return rateLimiters.get(name)!;
}

// ========================================
// 14. Monitoring Metrics
// ========================================

interface MetricData {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  tags?: Record<string, string>;
}

export class MetricsCollector {
  private metrics: MetricData[] = [];

  record(
    name: string,
    value: number,
    unit: string = 'count',
    tags?: Record<string, string>
  ): void {
    this.metrics.push({
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      tags
    });
  }

  recordTiming(name: string, startTime: number, tags?: Record<string, string>): void {
    const duration = Date.now() - startTime;
    this.record(name, duration, 'milliseconds', tags);
  }

  increment(name: string, tags?: Record<string, string>): void {
    this.record(name, 1, 'count', tags);
  }

  getMetrics(): MetricData[] {
    return [...this.metrics];
  }

  clear(): void {
    this.metrics = [];
  }

  async flush(endpoint?: string): Promise<void> {
    if (this.metrics.length === 0) return;

    try {
      if (endpoint) {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics: this.metrics })
        });
      }

      console.log('[Metrics]', JSON.stringify(this.metrics, null, 2));
      this.clear();
    } catch (error) {
      console.error('[Metrics] Failed to flush metrics:', error);
    }
  }
}

// ========================================
// 15. Error Recovery Strategies
// ========================================

export const RecoveryStrategies = {
  // Retry with exponential backoff
  retryWithBackoff: async <T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> => {
    return withRetry(operation, { maxAttempts });
  },

  // Use cached value if operation fails
  useCached: async <T>(
    operation: () => Promise<T>,
    cacheKey: string,
    cache: Map<string, { value: T; expiry: number }>
  ): Promise<T> => {
    try {
      const result = await operation();
      cache.set(cacheKey, {
        value: result,
        expiry: Date.now() + 300000 // 5 minutes
      });
      return result;
    } catch (error) {
      const cached = cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        console.warn('Using cached value due to error:', error);
        return cached.value;
      }
      throw error;
    }
  },

  // Circuit breaker pattern
  withCircuitBreaker: async <T>(
    operation: () => Promise<T>,
    breakerName: string
  ): Promise<T> => {
    const breaker = getCircuitBreaker(breakerName);
    return breaker.execute(operation);
  },

  // Timeout with fallback
  withTimeout: async <T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    fallbackValue: T
  ): Promise<T> => {
    try {
      return await withTimeout(operation, timeoutMs, 'operation');
    } catch (error) {
      if (error instanceof APIError && error.code === ErrorCode.API_TIMEOUT) {
        console.warn('Operation timed out, using fallback value');
        return fallbackValue;
      }
      throw error;
    }
  }
};

// ========================================
// Export all utilities
// ========================================

export {
  withRetry,
  withTimeout,
  withTransaction,
  withFallback,
  executeBatch,
  getCircuitBreaker,
  getRateLimiter,
  CircuitState
}; (!isRetryable || attempt >= finalConfig.maxAttempts) {
        console.error(`[${operationName}] Failed after ${attempt} attempts:`, error);
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.initialDelayMs * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
        finalConfig.maxDelayMs
      );

      // Add jitter (±20%)
      const jitter = delay * (0.8 + Math.random() * 0.4);
      
      console.warn(
        `[${operationName}] Attempt ${attempt} failed, retrying in ${Math.round(jitter)}ms...`,
        error instanceof ApplicationError ? error.code : 'UNKNOWN'
      );

      await new Promise(resolve => setTimeout(resolve, jitter));
    }
  }

  throw lastError!;
}

// ========================================
// 3. Circuit Breaker Pattern
// ========================================

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = Date.now();
  private config: CircuitBreakerConfig;
  private name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      successThreshold: config.successThreshold || 2,
      timeout: config.timeout || 60000 // 1 minute
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new ApplicationError(
          `Circuit breaker [${this.name}] is OPEN. Try again later.`,
          ErrorCode.API_SERVER_ERROR,
          503,
          true
        );
      }
      this.state = CircuitState.HALF_OPEN;
      console.log(`[CircuitBreaker:${this.name}] Transitioning to HALF_OPEN`);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        console.log(`[CircuitBreaker:${this.name}] Transitioning to CLOSED`);
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;
      console.warn(
        `[CircuitBreaker:${this.name}] Transitioning to OPEN until ${new Date(this.nextAttempt).toISOString()}`
      );
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Global circuit breakers
const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name, config));
  }
  return circuitBreakers.get(name)!;
}

// ========================================
// 4. Error Logger
// ========================================

interface ErrorLog {
  id?: string;
  errorCode: string;
  errorMessage: string;
  stackTrace?: string;
  context?: any;
  userId?: string;
  functionName?: string;
  timestamp: string;
}

export class ErrorLogger {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  async log(error: Error | ApplicationError, context?: any): Promise<void> {
    const errorLog: ErrorLog = {
      errorCode: error instanceof ApplicationError ? error.code : ErrorCode.UNKNOWN_ERROR,
      errorMessage: error.message,
      stackTrace: error.stack,
      context: context || {},
      timestamp: new Date().toISOString()
    };

    try {
      // Log to database
      await this.supabase
        .from('error_logs')
        .insert([errorLog]);

      // Log to console
      console.error('[ErrorLogger]', JSON.stringify(errorLog, null, 2));

      // In production, send to external monitoring service (e.g., Sentry)
      // await this.sendToMonitoring(errorLog);
    } catch (logError) {
      // Fallback: at least log to console if database insert fails
      console.error('[ErrorLogger] Failed to log error to database:', logError);
      console.error('[ErrorLogger] Original error:', errorLog);
    }
  }

  private async sendToMonitoring(errorLog: ErrorLog): Promise<void> {
    // Integration with Sentry, Datadog, etc.
    // Example: Sentry.captureException(error, { extra: errorLog.context });
  }
}

// ========================================
// 5. Timeout Wrapper
// ========================================

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string = 'operation'
): Promise<T> {
  let timeoutHandle: number;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new APIError(
          `${operationName} timed out after ${timeoutMs}ms`,
          ErrorCode.API_TIMEOUT,
          408,
          true
        )
      );
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}

// ========================================
// 6. API Error Parser
// ========================================

export function parseAPIError(response: Response, responseBody: any): ApplicationError {
  const statusCode = response.status;

  // Rate limiting
  if (statusCode === 429) {
    const retryAfter = response.headers.get('Retry-After');
    return new APIError(
      `Rate limit exceeded. Retry after ${retryAfter || 'unknown'} seconds`,
      ErrorCode.API_RATE_LIMIT,
      429,
      true
    );
  }

  // Authentication errors
  if (statusCode === 401 || statusCode === 403) {
    return new APIError(
      responseBody?.message || 'Authentication failed',
      ErrorCode.API_AUTHENTICATION,
      statusCode,
      false
    );
  }

  // Not found
  if (statusCode === 404) {
    return new APIError(
      responseBody?.message || 'Resource not found',
      ErrorCode.API_NOT_FOUND,
      404,
      false
    );
  }

  // Server errors (retryable)
  if (statusCode >= 500) {
    return new APIError(
      responseBody?.message || 'Server error',
      ErrorCode.API_SERVER_ERROR,
      statusCode,
      true
    );
  }

  // Client errors (not retryable)
  return new APIError(
    responseBody?.message || 'API request failed',
    ErrorCode.UNKNOWN_ERROR,
    statusCode,
    false
  );
}

// ========================================
// 7. Validation Helper
// ========================================

export function validate<T>(
  data: any,
  schema: Record<string, (value: any) => boolean>,
  fieldNames?: Record<string, string>
): T {
  const errors: Record<string, string> = {};

  for (const [field, validator] of Object.entries(schema)) {
    if (!validator(data[field])) {
      const fieldName = fieldNames?.[field] || field;
      errors[field] = `Invalid value for ${fieldName}`;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return data as T;
}

// Common validators
export const validators = {
  required: (value: any) => value !== undefined && value !== null && value !== '',
  isNumber: (value: any) => typeof value === 'number' && !isNaN(value),
  isPositive: (value: any) => typeof value === 'number' && value > 0,
  isString: (value: any) => typeof value === 'string' && value.length > 0,
  isEmail: (value: any) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  isUrl: (value: any) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  minLength: (min: number) => (value: any) => 
    typeof value === 'string' && value.length >= min,
  maxLength: (max: number) => (value: any) => 
    typeof value === 'string' && value.length <= max,
  inRange: (min: number, max: number) => (value: any) =>
    typeof value === 'number' && value >= min && value <= max,
  isOneOf: (options: any[]) => (value: any) => options.includes(value)
};

// ========================================
// 8. Safe Async Handler for Edge Functions
// ========================================

export function safeHandler(
  handler: (req: Request) => Promise<Response>,
  errorLogger?: ErrorLogger
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req);
    } catch (error) {
      console.error('Unhandled error in handler:', error);

      if