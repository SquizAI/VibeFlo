import { createHash, randomBytes, createCipheriv, createDecipheriv, createHmac } from 'crypto';
import { Message, MessageType, CommandMessage, EventMessage, getErrorMessage } from './BaseAgent';
import { MessageBus } from './MessageBus';

/**
 * Security level for operations and resources
 */
export enum SecurityLevel {
  PUBLIC = 0,    // Accessible to anyone
  LOW = 1,       // Minimal security requirements
  MEDIUM = 2,    // Standard security requirements
  HIGH = 3,      // Elevated security requirements
  CRITICAL = 4   // Maximum security, restricted access
}

/**
 * Authentication method types
 */
export enum AuthMethod {
  NONE = 'NONE',
  API_KEY = 'API_KEY',
  JWT = 'JWT',
  PASSWORD = 'PASSWORD',
  CERTIFICATE = 'CERTIFICATE',
  OAUTH = 'OAUTH'
}

/**
 * User or agent credentials
 */
export interface Credentials {
  id: string;
  authMethod: AuthMethod;
  authData: any;
  securityLevel: SecurityLevel;
  roles: string[];
  metadata?: Record<string, any>;
}

/**
 * Authentication result
 */
export interface AuthResult {
  authenticated: boolean;
  credentials?: Credentials;
  token?: string;
  error?: string;
}

/**
 * Authorization result
 */
export interface AuthzResult {
  authorized: boolean;
  reason?: string;
}

/**
 * Security error codes
 */
export enum SecurityErrorCode {
  AUTHENTICATION_FAILED = 'AUTH_FAILED',
  AUTHORIZATION_FAILED = 'AUTHZ_FAILED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS'
}

/**
 * Role-based access control rule
 */
export interface AccessRule {
  roles: string[];           // Roles that can access this resource
  commands?: string[];       // Allowed commands
  events?: string[];         // Allowed events
  resources?: string[];      // Allowed resources
  minSecurityLevel?: SecurityLevel; // Minimum security level required
}

/**
 * Token payload
 */
interface TokenPayload {
  sub: string;              // Subject (user/agent ID)
  iat: number;              // Issued at timestamp
  exp: number;              // Expiration timestamp
  roles: string[];          // User/agent roles
  securityLevel: number;    // Security level
  metadata?: any;           // Additional metadata
}

/**
 * Security module configuration
 */
export interface SecurityModuleConfig {
  secretKey: string;         // Secret key for signing tokens
  tokenExpiration: number;   // Token expiration time in seconds
  accessRules: AccessRule[]; // Access control rules
  encryptMessages?: boolean; // Whether to encrypt sensitive messages
  verifySignatures?: boolean; // Whether to verify message signatures
}

/**
 * Message with security features
 */
export interface SecureMessage extends Message {
  security: {
    encrypted?: boolean;     // Whether the payload is encrypted
    signature?: string;      // Message signature
    signedBy?: string;       // ID of the signer
    authToken?: string;      // Authentication token
  };
}

/**
 * Helper for extracting security parts from a message
 */
export function isSecureMessage(message: Message): message is SecureMessage {
  return (message as SecureMessage).security !== undefined;
}

/**
 * Security module for TRON agents
 */
export class SecurityModule {
  private static instance: SecurityModule;
  private config: SecurityModuleConfig;
  private credentialsStore: Map<string, Credentials> = new Map();
  private tokens: Map<string, TokenPayload> = new Map();
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor(config: SecurityModuleConfig) {
    this.config = {
      ...config,
      encryptMessages: config.encryptMessages ?? false,
      verifySignatures: config.verifySignatures ?? true
    };
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(config?: SecurityModuleConfig): SecurityModule {
    if (!SecurityModule.instance && config) {
      SecurityModule.instance = new SecurityModule(config);
    }
    
    if (!SecurityModule.instance) {
      throw new Error('SecurityModule not initialized. Call getInstance with config first.');
    }
    
    return SecurityModule.instance;
  }
  
  /**
   * Register credentials for a user or agent
   */
  public registerCredentials(credentials: Credentials): void {
    this.credentialsStore.set(credentials.id, credentials);
  }
  
  /**
   * Get credentials by ID
   */
  public getCredentials(id: string): Credentials | undefined {
    return this.credentialsStore.get(id);
  }
  
  /**
   * Authenticate using credentials
   */
  public async authenticate(id: string, authData: any): Promise<AuthResult> {
    try {
      const credentials = this.credentialsStore.get(id);
      
      if (!credentials) {
        return {
          authenticated: false,
          error: `Credentials not found for ID: ${id}`
        };
      }
      
      let authenticated = false;
      
      switch (credentials.authMethod) {
        case AuthMethod.NONE:
          authenticated = true;
          break;
        
        case AuthMethod.API_KEY:
          authenticated = authData === credentials.authData;
          break;
        
        case AuthMethod.PASSWORD:
          // Hash the password with the same algorithm used for storage
          const hashedPassword = this.hashPassword(authData);
          authenticated = hashedPassword === credentials.authData;
          break;
        
        // Other auth methods would have their implementation here
        
        default:
          return {
            authenticated: false,
            error: `Authentication method not supported: ${credentials.authMethod}`
          };
      }
      
      if (!authenticated) {
        return {
          authenticated: false,
          error: 'Authentication failed'
        };
      }
      
      // Generate authentication token
      const token = this.generateToken(credentials);
      
      return {
        authenticated: true,
        credentials,
        token
      };
    } catch (error: unknown) {
      return {
        authenticated: false,
        error: `Authentication error: ${getErrorMessage(error)}`
      };
    }
  }
  
  /**
   * Verify a token
   */
  public verifyToken(token: string): AuthResult {
    try {
      // Extract payload and signature
      const [payloadBase64, signature] = token.split('.');
      
      if (!payloadBase64 || !signature) {
        return {
          authenticated: false,
          error: 'Invalid token format'
        };
      }
      
      // Verify signature
      const expectedSignature = this.createSignature(payloadBase64);
      if (signature !== expectedSignature) {
        return {
          authenticated: false,
          error: 'Invalid token signature'
        };
      }
      
      // Decode payload
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson) as TokenPayload;
      
      // Check expiration
      if (payload.exp < Date.now() / 1000) {
        return {
          authenticated: false,
          error: 'Token expired'
        };
      }
      
      // Look up credentials
      const credentials = this.credentialsStore.get(payload.sub);
      
      if (!credentials) {
        return {
          authenticated: false,
          error: 'Credentials not found'
        };
      }
      
      return {
        authenticated: true,
        credentials,
        token
      };
    } catch (error: unknown) {
      return {
        authenticated: false,
        error: `Token verification error: ${getErrorMessage(error)}`
      };
    }
  }
  
  /**
   * Authorize an action based on credentials and access rules
   */
  public authorize(credentials: Credentials, resourceOrCommand: string, type: 'command' | 'event' | 'resource'): AuthzResult {
    try {
      // Check if there are any applicable rules
      const applicableRules = this.config.accessRules.filter(rule => {
        // Check if the role matches
        const roleMatch = rule.roles.some(role => credentials.roles.includes(role));
        if (!roleMatch) return false;
        
        // Check if the resource/command matches
        switch (type) {
          case 'command':
            return !rule.commands || rule.commands.includes(resourceOrCommand);
          case 'event':
            return !rule.events || rule.events.includes(resourceOrCommand);
          case 'resource':
            return !rule.resources || rule.resources.includes(resourceOrCommand);
        }
      });
      
      if (applicableRules.length === 0) {
        return {
          authorized: false,
          reason: `No matching access rules for ${type} ${resourceOrCommand}`
        };
      }
      
      // Check security level requirements
      for (const rule of applicableRules) {
        if (rule.minSecurityLevel !== undefined && credentials.securityLevel < rule.minSecurityLevel) {
          return {
            authorized: false,
            reason: `Insufficient security level. Required: ${rule.minSecurityLevel}, Provided: ${credentials.securityLevel}`
          };
        }
      }
      
      // If we got here, the action is authorized
      return {
        authorized: true
      };
    } catch (error: unknown) {
      return {
        authorized: false,
        reason: `Authorization error: ${getErrorMessage(error)}`
      };
    }
  }
  
  /**
   * Add security features to a message (signature, encryption)
   */
  public secureMessage(message: Message, credentials: Credentials): SecureMessage {
    const secureMessage: SecureMessage = {
      ...message,
      security: {}
    };
    
    try {
      // Sign the message
      const signature = this.signMessage(message);
      secureMessage.security.signature = signature;
      secureMessage.security.signedBy = credentials.id;
      
      // Add auth token
      const token = this.generateToken(credentials);
      secureMessage.security.authToken = token;
      
      // Encrypt the payload if configured and the message is sensitive
      if (this.config.encryptMessages && this.isMessageSensitive(message)) {
        const encryptedPayload = this.encryptData(JSON.stringify(message.payload));
        secureMessage.payload = encryptedPayload;
        secureMessage.security.encrypted = true;
      }
      
      return secureMessage;
    } catch (error: unknown) {
      console.error(`Error securing message: ${getErrorMessage(error)}`);
      return secureMessage;
    }
  }
  
  /**
   * Verify and process a secure message
   */
  public verifyAndProcessMessage(message: SecureMessage): { verified: boolean; message: Message; error?: string } {
    try {
      // Verify signature if present
      if (this.config.verifySignatures && message.security?.signature) {
        const messageCopy: Message = {
          ...message,
          security: undefined as any
        };
        
        const expectedSignature = this.signMessage(messageCopy);
        
        if (message.security.signature !== expectedSignature) {
          return {
            verified: false,
            message,
            error: 'Invalid message signature'
          };
        }
      }
      
      // Verify token if present
      if (message.security?.authToken) {
        const authResult = this.verifyToken(message.security.authToken);
        
        if (!authResult.authenticated) {
          return {
            verified: false,
            message,
            error: authResult.error || 'Token verification failed'
          };
        }
      }
      
      // Decrypt payload if encrypted
      let processedMessage = { ...message };
      
      if (message.security?.encrypted) {
        const decryptedPayloadJson = this.decryptData(message.payload);
        processedMessage.payload = JSON.parse(decryptedPayloadJson);
        processedMessage.security = {
          ...message.security,
          encrypted: false
        };
      }
      
      return {
        verified: true,
        message: processedMessage
      };
    } catch (error: unknown) {
      return {
        verified: false,
        message,
        error: `Message verification error: ${getErrorMessage(error)}`
      };
    }
  }
  
  /**
   * Check if a message contains sensitive information
   */
  private isMessageSensitive(message: Message): boolean {
    // This is a simplified check - in a real implementation, you would
    // have more sophisticated logic to determine sensitivity
    
    if (message.type === MessageType.COMMAND) {
      const cmdMsg = message as CommandMessage;
      
      // Consider authentication commands sensitive
      if (cmdMsg.command.includes('auth') || 
          cmdMsg.command.includes('login') || 
          cmdMsg.command.includes('password')) {
        return true;
      }
      
      // Check for sensitive parameters
      if (cmdMsg.payload.parameters.password || 
          cmdMsg.payload.parameters.secret || 
          cmdMsg.payload.parameters.token) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Generate an authentication token
   */
  private generateToken(credentials: Credentials): string {
    // Create token payload
    const payload: TokenPayload = {
      sub: credentials.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.config.tokenExpiration,
      roles: [...credentials.roles],
      securityLevel: credentials.securityLevel,
      metadata: credentials.metadata
    };
    
    // Encode payload
    const payloadJson = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadJson).toString('base64');
    
    // Create signature
    const signature = this.createSignature(payloadBase64);
    
    // Store token payload for potential later use
    this.tokens.set(`${credentials.id}:${payload.iat}`, payload);
    
    // Return token (payload + signature)
    return `${payloadBase64}.${signature}`;
  }
  
  /**
   * Create a signature for a token payload
   */
  private createSignature(payload: string): string {
    const hmac = createHmac('sha256', this.config.secretKey);
    hmac.update(payload);
    return hmac.digest('base64');
  }
  
  /**
   * Sign a message
   */
  private signMessage(message: Message): string {
    // Create a copy without the security field (to avoid circular references)
    const messageCopy = { ...message };
    delete (messageCopy as any).security;
    
    // Create a string representation of the message
    const messageString = JSON.stringify(messageCopy);
    
    // Create and return signature
    const hmac = createHmac('sha256', this.config.secretKey);
    hmac.update(messageString);
    return hmac.digest('base64');
  }
  
  /**
   * Hash a password
   */
  private hashPassword(password: string): string {
    const hash = createHash('sha256');
    hash.update(password);
    return hash.digest('base64');
  }
  
  /**
   * Encrypt data
   */
  private encryptData(data: string): string {
    // Generate random initialization vector
    const iv = randomBytes(16);
    
    // Create cipher with the secret key and IV
    const cipher = createCipheriv('aes-256-cbc', Buffer.from(this.config.secretKey.slice(0, 32).padEnd(32, '0')), iv);
    
    // Encrypt the data
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Return encrypted data with IV prepended (base64 encoded)
    return `${iv.toString('base64')}:${encrypted}`;
  }
  
  /**
   * Decrypt data
   */
  private decryptData(data: string): string {
    // Split IV and encrypted data
    const [ivBase64, encryptedData] = data.split(':');
    
    if (!ivBase64 || !encryptedData) {
      throw new Error('Invalid encrypted data format');
    }
    
    // Decode IV
    const iv = Buffer.from(ivBase64, 'base64');
    
    // Create decipher
    const decipher = createDecipheriv('aes-256-cbc', Buffer.from(this.config.secretKey.slice(0, 32).padEnd(32, '0')), iv);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * Middleware for securing messages sent via the message bus
   */
  public installMessageBusMiddleware(): void {
    const messageBus = MessageBus.getInstance();
    const originalPublish = messageBus.publish.bind(messageBus);
    
    // Override the publish method to add security features
    (messageBus as any).publish = async (message: Message): Promise<void> => {
      // Only process messages that don't already have security features
      if (!isSecureMessage(message)) {
        // If the sender has registered credentials, secure the message
        const credentials = this.getCredentials(message.sender);
        
        if (credentials) {
          const securedMessage = this.secureMessage(message, credentials);
          return await originalPublish(securedMessage);
        }
      }
      
      // If not secured, just publish the original message
      return await originalPublish(message);
    };
    
    // Listen for all messages to verify security
    messageBus.subscribe('security-module', {}, async (message: Message) => {
      if (isSecureMessage(message)) {
        const { verified, message: processedMessage, error } = this.verifyAndProcessMessage(message);
        
        if (!verified) {
          console.warn(`Security verification failed for message ${message.id}: ${error}`);
          
          // Optionally, you could publish a security event here
          const securityEvent: EventMessage = {
            id: `security-event-${Date.now()}`,
            type: MessageType.EVENT,
            event: 'security.violation',
            sender: 'security-module',
            timestamp: Date.now(),
            payload: {
              data: {
                messageId: message.id,
                sender: message.sender,
                error
              }
            }
          };
          
          await originalPublish(securityEvent);
        }
      }
    });
  }
  
  /**
   * Revoke a token
   */
  public revokeToken(token: string): boolean {
    try {
      // Extract and decode payload
      const [payloadBase64] = token.split('.');
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson) as TokenPayload;
      
      // Remove token from the store
      return this.tokens.delete(`${payload.sub}:${payload.iat}`);
    } catch (error) {
      console.error(`Error revoking token: ${error}`);
      return false;
    }
  }
  
  /**
   * Check if a token has been revoked
   */
  public isTokenRevoked(token: string): boolean {
    try {
      // Extract and decode payload
      const [payloadBase64] = token.split('.');
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson) as TokenPayload;
      
      // Check if token exists in the store
      return !this.tokens.has(`${payload.sub}:${payload.iat}`);
    } catch (error) {
      console.error(`Error checking token revocation: ${error}`);
      return true; // Consider invalid tokens as revoked
    }
  }
} 