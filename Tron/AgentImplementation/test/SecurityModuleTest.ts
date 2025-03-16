import { 
  SecurityModule, 
  SecurityLevel, 
  AuthMethod,
  AccessRule, 
  Credentials
} from '../SecurityModule';
import { MessageBus } from '../MessageBus';
import { Message, MessageType } from '../BaseAgent';

/**
 * Test the SecurityModule functionality
 */
async function testSecurityModule() {
  console.log('Starting SecurityModule test...');
  
  // Initialize the security module
  await testInitialization();
  
  // Test authentication
  await testAuthentication();
  
  // Test authorization
  await testAuthorization();
  
  // Test secure messaging
  await testSecureMessaging();
  
  // Test token management
  await testTokenManagement();
  
  console.log('SecurityModule test completed');
}

/**
 * Test initialization of the security module
 */
async function testInitialization() {
  console.log('\nTesting SecurityModule initialization...');
  
  // Create access rules
  const accessRules: AccessRule[] = [
    {
      roles: ['admin'],
      commands: ['*'],
      events: ['*'],
      resources: ['*'],
      minSecurityLevel: SecurityLevel.MEDIUM
    },
    {
      roles: ['user'],
      commands: ['user.*', 'data.read'],
      events: ['user.*'],
      resources: ['user_data'],
      minSecurityLevel: SecurityLevel.LOW
    }
  ];
  
  // Initialize the security module
  const securityModule = SecurityModule.getInstance({
    secretKey: 'test-secret-key-for-security-module-testing',
    tokenExpiration: 3600, // 1 hour
    accessRules,
    encryptMessages: true,
    verifySignatures: true
  });
  
  console.log('SecurityModule initialized successfully');
  
  // Register some test credentials
  const adminCredentials: Credentials = {
    id: 'admin-1',
    authMethod: AuthMethod.PASSWORD,
    authData: securityModule['hashPassword']('admin-password'),
    securityLevel: SecurityLevel.HIGH,
    roles: ['admin']
  };
  
  const userCredentials: Credentials = {
    id: 'user-1',
    authMethod: AuthMethod.API_KEY,
    authData: 'api-key-123',
    securityLevel: SecurityLevel.LOW,
    roles: ['user']
  };
  
  const guestCredentials: Credentials = {
    id: 'guest-1',
    authMethod: AuthMethod.NONE,
    authData: null,
    securityLevel: SecurityLevel.PUBLIC,
    roles: ['guest']
  };
  
  // Register the credentials
  securityModule.registerCredentials(adminCredentials);
  securityModule.registerCredentials(userCredentials);
  securityModule.registerCredentials(guestCredentials);
  
  console.log('Test credentials registered');
}

/**
 * Test authentication functionality
 */
async function testAuthentication() {
  console.log('\nTesting authentication...');
  
  const securityModule = SecurityModule.getInstance();
  
  // Test admin authentication
  console.log('Testing admin authentication...');
  
  // Successful authentication
  const adminAuthResult = await securityModule.authenticate('admin-1', 'admin-password');
  console.log(`Admin authentication successful: ${adminAuthResult.authenticated}`);
  console.log(`Admin token: ${adminAuthResult.token}`);
  
  if (!adminAuthResult.authenticated || !adminAuthResult.token) {
    console.error('ERROR: Admin authentication failed');
  }
  
  // Failed authentication
  const adminAuthFailedResult = await securityModule.authenticate('admin-1', 'wrong-password');
  console.log(`Admin authentication with wrong password failed: ${!adminAuthFailedResult.authenticated}`);
  
  // Test user authentication with API key
  console.log('\nTesting user authentication with API key...');
  
  // Successful authentication
  const userAuthResult = await securityModule.authenticate('user-1', 'api-key-123');
  console.log(`User authentication successful: ${userAuthResult.authenticated}`);
  
  if (!userAuthResult.authenticated || !userAuthResult.token) {
    console.error('ERROR: User authentication failed');
  }
  
  // Test guest authentication
  console.log('\nTesting guest authentication...');
  
  // Guest should authenticate with any value
  const guestAuthResult = await securityModule.authenticate('guest-1', null);
  console.log(`Guest authentication successful: ${guestAuthResult.authenticated}`);
  
  if (!guestAuthResult.authenticated || !guestAuthResult.token) {
    console.error('ERROR: Guest authentication failed');
  }
  
  // Test non-existent user
  console.log('\nTesting non-existent user...');
  const nonExistentResult = await securityModule.authenticate('non-existent', 'password');
  console.log(`Non-existent user authentication failed: ${!nonExistentResult.authenticated}`);
  
  if (nonExistentResult.authenticated) {
    console.error('ERROR: Non-existent user authentication should have failed');
  }
}

/**
 * Test authorization functionality
 */
async function testAuthorization() {
  console.log('\nTesting authorization...');
  
  const securityModule = SecurityModule.getInstance();
  
  // Get credentials
  const adminCredentials = securityModule.getCredentials('admin-1');
  const userCredentials = securityModule.getCredentials('user-1');
  const guestCredentials = securityModule.getCredentials('guest-1');
  
  if (!adminCredentials || !userCredentials || !guestCredentials) {
    console.error('ERROR: Could not retrieve test credentials');
    return;
  }
  
  // Test admin authorization
  console.log('Testing admin authorization...');
  
  // Admin should be able to access everything
  const adminUserDataAuthz = securityModule.authorize(adminCredentials, 'user_data', 'resource');
  console.log(`Admin can access user_data: ${adminUserDataAuthz.authorized}`);
  
  const adminSystemCommandAuthz = securityModule.authorize(adminCredentials, 'system.reboot', 'command');
  console.log(`Admin can run system.reboot: ${adminSystemCommandAuthz.authorized}`);
  
  // Test user authorization
  console.log('\nTesting user authorization...');
  
  // User should be able to access user_data and user commands
  const userUserDataAuthz = securityModule.authorize(userCredentials, 'user_data', 'resource');
  console.log(`User can access user_data: ${userUserDataAuthz.authorized}`);
  
  const userCommandAuthz = securityModule.authorize(userCredentials, 'user.update', 'command');
  console.log(`User can run user.update: ${userCommandAuthz.authorized}`);
  
  // User should not be able to access system commands
  const userSystemCommandAuthz = securityModule.authorize(userCredentials, 'system.reboot', 'command');
  console.log(`User cannot run system.reboot: ${!userSystemCommandAuthz.authorized}`);
  
  // Test guest authorization
  console.log('\nTesting guest authorization...');
  
  // Guest should not be able to access most resources
  const guestUserDataAuthz = securityModule.authorize(guestCredentials, 'user_data', 'resource');
  console.log(`Guest cannot access user_data: ${!guestUserDataAuthz.authorized}`);
  
  const guestSystemCommandAuthz = securityModule.authorize(guestCredentials, 'system.reboot', 'command');
  console.log(`Guest cannot run system.reboot: ${!guestSystemCommandAuthz.authorized}`);
}

/**
 * Test secure messaging functionality
 */
async function testSecureMessaging() {
  console.log('\nTesting secure messaging...');
  
  const securityModule = SecurityModule.getInstance();
  
  // Get admin credentials
  const adminCredentials = securityModule.getCredentials('admin-1');
  
  if (!adminCredentials) {
    console.error('ERROR: Could not retrieve admin credentials');
    return;
  }
  
  // Create a test message
  const testMessage: Message = {
    id: 'msg-1',
    type: MessageType.COMMAND,
    sender: 'admin-1',
    timestamp: Date.now(),
    payload: {
      parameters: {
        password: 'secret-password',
        command: 'test-command'
      }
    }
  };
  
  // Secure the message
  console.log('Securing a message...');
  const secureMessage = securityModule.secureMessage(testMessage, adminCredentials);
  
  console.log(`Message secured. Has signature: ${!!secureMessage.security?.signature}`);
  console.log(`Message encrypted: ${!!secureMessage.security?.encrypted}`);
  
  // Verify and process the message
  console.log('Verifying and processing the secure message...');
  const { verified, message: processedMessage, error } = securityModule.verifyAndProcessMessage(secureMessage);
  
  console.log(`Message verified: ${verified}`);
  
  if (!verified) {
    console.error(`ERROR: Message verification failed: ${error}`);
  } else {
    console.log('Processed message payload:', processedMessage.payload);
  }
  
  // Test with message bus middleware
  console.log('\nTesting message bus integration...');
  
  // Clear any existing message bus instance
  (MessageBus as any).instance = undefined;
  
  // Get a fresh message bus instance
  const messageBus = MessageBus.getInstance();
  
  // Install security middleware
  securityModule.installMessageBusMiddleware();
  
  // Set up a test subscription
  const receivedMessages: Message[] = [];
  
  messageBus.subscribe('test-security-subscriber', {}, async (message: Message) => {
    console.log(`Received message: ${message.id}`);
    receivedMessages.push(message);
  });
  
  // Publish a message - this should get automatically secured
  console.log('Publishing a message through the secure message bus...');
  await messageBus.publish({
    id: 'msg-2',
    type: MessageType.COMMAND,
    sender: 'admin-1',
    timestamp: Date.now(),
    payload: {
      parameters: {
        sensitive: 'sensitive-data',
        normal: 'normal-data'
      }
    }
  });
  
  // Wait a bit for processing
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log(`Received ${receivedMessages.length} messages`);
  
  // Clean up
  messageBus.clear();
}

/**
 * Test token management functionality
 */
async function testTokenManagement() {
  console.log('\nTesting token management...');
  
  const securityModule = SecurityModule.getInstance();
  
  // Get admin credentials
  const adminCredentials = securityModule.getCredentials('admin-1');
  
  if (!adminCredentials) {
    console.error('ERROR: Could not retrieve admin credentials');
    return;
  }
  
  // Authenticate to get a token
  const authResult = await securityModule.authenticate('admin-1', 'admin-password');
  
  if (!authResult.authenticated || !authResult.token) {
    console.error('ERROR: Authentication failed');
    return;
  }
  
  const token = authResult.token;
  console.log(`Generated token: ${token}`);
  
  // Verify the token
  console.log('Verifying token...');
  const verifyResult = securityModule.verifyToken(token);
  console.log(`Token verified: ${verifyResult.authenticated}`);
  
  if (!verifyResult.authenticated) {
    console.error(`ERROR: Token verification failed: ${verifyResult.error}`);
  }
  
  // Revoke the token
  console.log('Revoking token...');
  const revoked = securityModule.revokeToken(token);
  console.log(`Token revoked: ${revoked}`);
  
  // Check if token is revoked
  console.log('Checking if token is revoked...');
  const isRevoked = securityModule.isTokenRevoked(token);
  console.log(`Token is revoked: ${isRevoked}`);
  
  // Try to verify a revoked token
  console.log('Verifying revoked token...');
  const verifyRevokedResult = securityModule.verifyToken(token);
  console.log(`Revoked token verification failed: ${!verifyRevokedResult.authenticated}`);
  
  if (verifyRevokedResult.authenticated) {
    console.error('ERROR: Revoked token should not verify');
  }
  
  // Try to verify an invalid token
  console.log('Verifying invalid token...');
  const verifyInvalidResult = securityModule.verifyToken('invalid.token');
  console.log(`Invalid token verification failed: ${!verifyInvalidResult.authenticated}`);
  
  if (verifyInvalidResult.authenticated) {
    console.error('ERROR: Invalid token should not verify');
  }
}

// Run the test
testSecurityModule().catch(error => {
  console.error('Error running SecurityModule test:', error);
}); 