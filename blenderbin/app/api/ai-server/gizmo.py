"""
Gizmo - AI-powered Blender Python code generation

Enhanced with SSL/HTTPS security features:
- Automatic SSL certificate verification
- Custom SSL context creation with secure cipher suites
- TLS 1.2+ enforcement with modern encryption
- HTTP to HTTPS upgrade for external domains
- Secure session management with retry logic
- Configurable SSL settings for different environments
- Development mode for self-signed certificates
- Production mode with maximum security
- Comprehensive SSL connectivity testing
- Proper error handling for SSL/connection issues

All HTTP requests now use SSL/HTTPS by default with custom SSL contexts
for enhanced security and cipher suite control.
"""

import bpy
import json
import requests
import threading
import time
import traceback
import zlib
import base64
import math
import webbrowser
import uuid
import os
import datetime
import sys
import ssl
import urllib3
from bpy.props import StringProperty, BoolProperty, IntProperty, BoolVectorProperty, FloatVectorProperty, EnumProperty
from bpy.types import Operator, Panel
from urllib.parse import urlparse

# Disable SSL warnings for self-signed certificates (optional - remove if using valid certs)
# urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def create_ssl_context(verify_mode=ssl.CERT_REQUIRED, check_hostname=True, protocol=ssl.PROTOCOL_TLS_CLIENT):
    """Create a custom SSL context with security settings"""
    try:
        # Create SSL context with the specified protocol
        context = ssl.create_default_context()
        
        # Configure SSL context settings
        context.check_hostname = check_hostname
        context.verify_mode = verify_mode
        
        # Set secure protocol versions (disable old/insecure protocols)
        context.minimum_version = ssl.TLSVersion.TLSv1_2  # Minimum TLS 1.2
        context.maximum_version = ssl.TLSVersion.TLSv1_3  # Maximum TLS 1.3
        
        # Set secure cipher suites (exclude weak ciphers)
        context.set_ciphers('ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS')
        
        # Additional security options
        context.options |= ssl.OP_NO_SSLv2
        context.options |= ssl.OP_NO_SSLv3
        context.options |= ssl.OP_NO_TLSv1
        context.options |= ssl.OP_NO_TLSv1_1
        context.options |= ssl.OP_SINGLE_DH_USE
        context.options |= ssl.OP_SINGLE_ECDH_USE
        
        print("✓ Custom SSL context created with secure settings")
        print(f"  - Protocol: {context.protocol}")
        print(f"  - Minimum TLS version: {context.minimum_version}")
        print(f"  - Maximum TLS version: {context.maximum_version}")
        print(f"  - Hostname verification: {context.check_hostname}")
        print(f"  - Certificate verification: {context.verify_mode}")
        
        return context
        
    except Exception as e:
        print(f"Error creating SSL context: {e}")
        print("Falling back to default SSL context")
        return ssl.create_default_context()

def create_dev_ssl_context():
    """Create an SSL context for development (less strict)"""
    try:
        context = ssl.create_default_context()
        
        # Less strict settings for development
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        
        # Still maintain minimum security
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        
        print("⚠ Development SSL context created (less secure)")
        print("  - Hostname verification: DISABLED")
        print("  - Certificate verification: DISABLED")
        print("  - Use only for development with self-signed certificates")
        
        return context
        
    except Exception as e:
        print(f"Error creating development SSL context: {e}")
        return ssl.create_default_context()

# SSL Configuration Options
SSL_CONFIG = {
    "verify_ssl": True,  # Set to False only if using self-signed certificates in development
    "ssl_timeout": (10, 30),  # (connection_timeout, read_timeout) in seconds
    "max_retries": 3,  # Number of retries for failed requests
    "force_https": False,  # Don't force HTTPS since API_URL is already HTTPS
    "use_custom_ssl_context": False,  # Use standard SSL context for better compatibility
    "development_mode": False,  # Use less strict SSL settings for development
}

# Usage Examples for SSL Configuration:
# For development with self-signed certificates:
#   ai_client.configure_ssl(verify_ssl=False)
#   ai_client.enable_development_mode()
# For slower connections:
#   ai_client.configure_ssl(timeout=(30, 60))
# To disable automatic HTTPS upgrade:
#   ai_client.configure_ssl(force_https=False)
# To disable custom SSL context (use requests default):
#   ai_client.configure_ssl(use_custom_ssl_context=False)
# For production with maximum security:
#   ai_client.enable_production_mode()
# Test SSL connectivity:
#   ai_client.test_ssl_connectivity()

# Firebase configuration
FIREBASE_CONFIG = {
  "apiKey": "AIzaSyDIuu33lWChgE_oTteuAuywPrJwBFiRavM",
  "authDomain": "marv-studio-points-plugin.firebaseapp.com",
  "databaseURL": "https://marv-studio-points-plugin-default-rtdb.firebaseio.com",
  "projectId": "marv-studio-points-plugin",
  "storageBucket": "marv-studio-points-plugin.firebasestorage.app",
  "messagingSenderId": "441089628814",
  "appId": "1:441089628814:web:4b4bc410399ae288bd47df"
}

bl_info = {
    "name": "Gizmo",
    "author": "BlenderBin.com",
    "version": (1, 0, 0),
    "blender": (2, 80, 0),
    "location": "3D View > Sidebar > Gizmo",
    "description": "AI-powered Blender Python code generation",
    "warning": "",
    "doc_url": "https://blenderbin.com/docs",
    "category": "Interface",
}

# Configuration
# API_URL = "http://localhost:3000/api/ai-server"  # Local development server
API_URL = "https://blenderbin.com/api/ai-server"  # Production server
# AUTH_URL = "http://localhost:3000/signup"  # Authentication endpoint
AUTH_URL = "https://blenderbin.com/signup"  # Authentication endpoint
CHAT_HISTORY = []  # Store chat history for context

# Authentication and limits
AUTH_TOKEN_PATH = os.path.join(bpy.utils.user_resource('CONFIG', path='BlenderBin'), 'auth_token.json')
USAGE_TRACKING_PATH = os.path.join(bpy.utils.user_resource('CONFIG', path='BlenderBin'), 'usage_data.json')
FREE_TIER_LIMITS = {
    "daily_queries": 20,
    "cooldown_minutes": 0,
    "max_history": 5
}
PRO_TIER_LIMITS = {
    "daily_queries": 200,
    "cooldown_minutes": 0,
    "max_history": 50
}
BUSINESS_TIER_LIMITS = {
    "daily_queries": 999999,  # Effectively unlimited
    "cooldown_minutes": 0,
    "max_history": 100
}

# Ensure the config directory exists
os.makedirs(os.path.dirname(AUTH_TOKEN_PATH), exist_ok=True)

class GizmoAIClient:
    def __init__(self, api_url=API_URL):
        self.api_url = api_url
        self.fallback_urls = [
            "https://blenderbin.com/api/ai-server",
            "https://www.blenderbin.com/api/ai-server", 
            "https://api.blenderbin.com/ai-server"
        ]
        self.chat_history = []
        self.last_executed_code = ""  # Track the last code we executed to prevent duplicates
        self.is_executing = False     # Flag to prevent multiple simultaneous executions
        self.auth_data = None         # Authentication data (token, user info)
        self.session_id = str(uuid.uuid4())[:8]  # Unique session ID for auth flow
        self.is_checking_auth = False  # Flag to prevent multiple auth checks
        self.auth_check_in_progress = False # Flag to track if auth check is in progress
        self.last_auth_check_time = None  # Track when we last checked auth
        self.check_attempts = 0  # Counter for auth check attempts
        self.usage_data = {           # Track API usage
            "queries_today": 0,
            "last_query_time": None,
            "last_date": None
        }
        
        # Try to load existing auth data
        self.load_auth_data()
        
        # Load usage data for freemium users
        self.load_usage_data()
    
    def _create_secure_session(self):
        """Create a requests session with proper SSL configuration"""
        session = requests.Session()
        
        # Configure SSL settings
        session.verify = SSL_CONFIG["verify_ssl"]
        
        # Create and configure custom SSL context if enabled
        if SSL_CONFIG["use_custom_ssl_context"]:
            try:
                if SSL_CONFIG["development_mode"]:
                    ssl_context = create_dev_ssl_context()
                    # For development, also disable session verification
                    session.verify = False
                else:
                    ssl_context = create_ssl_context(
                        verify_mode=ssl.CERT_REQUIRED if SSL_CONFIG["verify_ssl"] else ssl.CERT_NONE,
                        check_hostname=SSL_CONFIG["verify_ssl"]
                    )
                
                # Create custom HTTPSAdapter with SSL context
                class SSLContextAdapter(requests.adapters.HTTPAdapter):
                    def init_poolmanager(self, *args, **kwargs):
                        kwargs['ssl_context'] = ssl_context
                        return super().init_poolmanager(*args, **kwargs)
                
                # Configure retry strategy for SSL and connection issues
                retry_strategy = Retry(
                    total=SSL_CONFIG["max_retries"],
                    status_forcelist=[429, 500, 502, 503, 504],  # Don't retry 401 auth errors
                    allowed_methods=["HEAD", "GET", "POST"],  # Updated from deprecated method_whitelist
                    backoff_factor=1
                )
                
                # Mount the custom SSL adapter
                ssl_adapter = SSLContextAdapter(max_retries=retry_strategy)
                session.mount('https://', ssl_adapter)
                
                print("✓ Custom SSL context adapter mounted")
                
            except Exception as e:
                print(f"Warning: Could not create custom SSL context: {e}")
                print("Falling back to default SSL configuration")
        
        # Set up standard adapter for HTTP and fallback HTTPS
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry
        
        # Configure retry strategy for SSL and connection issues
        retry_strategy = Retry(
            total=SSL_CONFIG["max_retries"],
            status_forcelist=[429, 500, 502, 503, 504],
            method_whitelist=["HEAD", "GET", "POST"],
            backoff_factor=1
        )
        
        # Create adapter with retry strategy
        adapter = HTTPAdapter(max_retries=retry_strategy)
        
        # Mount the adapter for HTTP
        session.mount("http://", adapter)
        
        # If not using custom SSL context, mount standard HTTPS adapter
        if not SSL_CONFIG["use_custom_ssl_context"]:
            session.mount("https://", adapter)
        
        # Set common headers
        session.headers.update({
            'User-Agent': f'BlenderBin-Gizmo/{".".join(map(str, bl_info["version"]))} (Blender {".".join(map(str, bpy.app.version))})',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive'
        })
        
        # Set timeouts
        session.timeout = SSL_CONFIG["ssl_timeout"]
        
        ssl_status = "enabled with custom context" if SSL_CONFIG["use_custom_ssl_context"] else "enabled with default context"
        dev_status = " (development mode)" if SSL_CONFIG["development_mode"] else ""
        print(f"Secure HTTPS session created - SSL verification {ssl_status}{dev_status}")
        return session
    
    def _make_secure_request(self, method, url, **kwargs):
        """Make a secure HTTPS request with proper error handling"""
        try:
            # Ensure we're using HTTPS for external requests
            if SSL_CONFIG["force_https"] and not 'localhost' in url and not '127.0.0.1' in url:
                url = url.replace('http://', 'https://')
                print(f"Upgraded HTTP to HTTPS: {url}")
            
            # Set default timeout if not provided
            if 'timeout' not in kwargs:
                kwargs['timeout'] = SSL_CONFIG["ssl_timeout"]
            
            # Make the request
            if method.upper() == 'GET':
                response = self.session.get(url, **kwargs)
            elif method.upper() == 'POST':
                response = self.session.post(url, **kwargs)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            return response
            
        except requests.exceptions.SSLError as e:
            print(f"SSL Error: {e}")
            raise Exception(f"SSL connection failed: {str(e)}")
        except requests.exceptions.ConnectionError as e:
            print(f"Connection Error: {e}")
            raise Exception(f"Connection failed: {str(e)}")
        except requests.exceptions.Timeout as e:
            print(f"Timeout Error: {e}")
            raise Exception(f"Request timed out: {str(e)}")
        except requests.exceptions.RequestException as e:
            print(f"Request Error: {e}")
            raise Exception(f"Request failed: {str(e)}")
    
    def configure_ssl(self, verify_ssl=None, force_https=None, timeout=None, max_retries=None, 
                     use_custom_ssl_context=None, development_mode=None):
        """Configure SSL settings for different environments"""
        config_changed = False
        
        if verify_ssl is not None:
            SSL_CONFIG["verify_ssl"] = verify_ssl
            self.session.verify = verify_ssl
            config_changed = True
            print(f"SSL verification {'enabled' if verify_ssl else 'disabled'}")
        
        if force_https is not None:
            SSL_CONFIG["force_https"] = force_https
            print(f"Force HTTPS {'enabled' if force_https else 'disabled'}")
        
        if timeout is not None:
            SSL_CONFIG["ssl_timeout"] = timeout
            self.session.timeout = timeout
            print(f"SSL timeout set to {timeout}")
        
        if max_retries is not None:
            SSL_CONFIG["max_retries"] = max_retries
            config_changed = True
            print(f"Max retries set to {max_retries}")
        
        if use_custom_ssl_context is not None:
            SSL_CONFIG["use_custom_ssl_context"] = use_custom_ssl_context
            config_changed = True
            print(f"Custom SSL context {'enabled' if use_custom_ssl_context else 'disabled'}")
        
        if development_mode is not None:
            SSL_CONFIG["development_mode"] = development_mode
            config_changed = True
            if development_mode:
                print("⚠ Development mode enabled - SSL security reduced")
                print("  This should only be used for development with self-signed certificates")
            else:
                print("✓ Production mode enabled - Full SSL security")
        
        # Recreate session if SSL configuration changed
        if config_changed:
            print("Recreating session with new SSL configuration...")
            self.session = self._create_secure_session()
    
    def enable_development_mode(self):
        """Enable development mode with relaxed SSL settings"""
        self.configure_ssl(
            verify_ssl=False,
            use_custom_ssl_context=True,
            development_mode=True
        )
        print("🔧 Development mode enabled - suitable for self-signed certificates")
    
    def enable_production_mode(self):
        """Enable production mode with full SSL security"""
        self.configure_ssl(
            verify_ssl=True,
            use_custom_ssl_context=True,
            development_mode=False
        )
        print("🔒 Production mode enabled - full SSL security active")
    
    def test_ssl_connectivity(self):
        """Test SSL connectivity to the API server"""
        try:
            print("Testing SSL connectivity...")
            response = self._make_secure_request('GET', self.api_url.replace('/api/ai-server', '/health'), timeout=10)
            
            if response.status_code == 200:
                print("✓ SSL connectivity test successful")
                print(f"✓ Server response: {response.status_code}")
                print(f"✓ SSL verification: {'enabled' if SSL_CONFIG['verify_ssl'] else 'disabled'}")
                print(f"✓ Using HTTPS: {self.api_url.startswith('https://')}")
                return True
            else:
                print(f"⚠ SSL connectivity test failed with status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"✗ SSL connectivity test failed: {str(e)}")
            if "SSL" in str(e).upper():
                print("  This appears to be an SSL-related issue.")
                print("  For development with self-signed certificates, try:")
                print("    ai_client.configure_ssl(verify_ssl=False)")
            return False
    
    def load_auth_data(self):
        """Load authentication data from file"""
        try:
            if os.path.exists(AUTH_TOKEN_PATH):
                with open(AUTH_TOKEN_PATH, 'r') as f:
                    self.auth_data = json.load(f)
                    print(f"Loaded auth data for user: {self.auth_data.get('email', 'Unknown')}")
                    
                    # Check if token is expired (tokens are valid for 1 hour)
                    if 'expires_at' in self.auth_data:
                        expires_at = datetime.datetime.fromisoformat(self.auth_data['expires_at'])
                        if datetime.datetime.now() > expires_at:
                            print("Auth token expired, clearing data")
                            self.auth_data = None
        except Exception as e:
            print(f"Error loading auth data: {e}")
            self.auth_data = None
    
    def save_auth_data(self):
        """Save authentication data to file"""
        try:
            if self.auth_data:
                with open(AUTH_TOKEN_PATH, 'w') as f:
                    json.dump(self.auth_data, f)
                    print(f"Saved auth data for user: {self.auth_data.get('email', 'Unknown')}")
        except Exception as e:
            print(f"Error saving auth data: {e}")
    
    def load_usage_data(self):
        """Load usage data from local file for freemium users"""
        try:
            if os.path.exists(USAGE_TRACKING_PATH):
                with open(USAGE_TRACKING_PATH, 'r') as f:
                    saved_usage = json.load(f)
                    
                    # Check if it's a new day
                    today = datetime.date.today().isoformat()
                    if saved_usage.get("last_date") != today:
                        # Reset for a new day
                        self.usage_data = {
                            "queries_today": 0,
                            "last_query_time": None,
                            "last_date": today
                        }
                        print("New day - reset usage data")
                    else:
                        self.usage_data = saved_usage
                        print(f"Loaded usage data: {self.usage_data['queries_today']} queries today")
        except Exception as e:
            print(f"Error loading usage data: {e}")
            
            # Initialize usage data for today
            today = datetime.date.today().isoformat()
            self.usage_data = {
                "queries_today": 0, 
                "last_query_time": None,
                "last_date": today
            }
    
    def save_usage_data(self):
        """Save usage data to local file for freemium users"""
        try:
            with open(USAGE_TRACKING_PATH, 'w') as f:
                json.dump(self.usage_data, f)
                print(f"Saved usage data: {self.usage_data['queries_today']} queries today")
        except Exception as e:
            print(f"Error saving usage data: {e}")
    
    def clear_auth_data(self):
        """Clear authentication data"""
        self.auth_data = None
        if os.path.exists(AUTH_TOKEN_PATH):
            try:
                os.remove(AUTH_TOKEN_PATH)
                print("Auth data cleared")
            except Exception as e:
                print(f"Error removing auth file: {e}")
    
    def is_authenticated(self):
        """Check if the user is authenticated"""
        return self.auth_data is not None and 'token' in self.auth_data
    
    def get_current_limits(self):
        """Get the current usage limits based on authentication status and subscription tier"""
        if not self.is_authenticated():
            return FREE_TIER_LIMITS
        
        # For authenticated users, try to use server-provided limits first
        if hasattr(self, 'last_server_usage') and self.last_server_usage:
            # Convert server response to our format
            server_limits = {
                "daily_queries": self.last_server_usage.get('dailyLimit', 20),
                "cooldown_minutes": 0,  # Server doesn't typically use cooldowns
                "max_history": 50  # Default for authenticated users
            }
            
            # Handle "unlimited" case
            if server_limits["daily_queries"] == "unlimited":
                server_limits["daily_queries"] = 999999
                server_limits["max_history"] = 100
            
            return server_limits
        
        # Fallback: use stored subscription tier from auth data
        subscription_tier = self.auth_data.get('subscription_tier', 'free')
        
        if subscription_tier == 'business' or subscription_tier == 'developer':
            return BUSINESS_TIER_LIMITS
        elif subscription_tier == 'pro':
            return PRO_TIER_LIMITS
        else:
            # Authenticated user with free tier
            return FREE_TIER_LIMITS
    
    def can_make_request(self):
        """Check if the user can make a request based on their limits"""
        # For authenticated users, we should rely on server-provided limits
        # The server will check database-backed usage and subscription tiers
        if self.is_authenticated():
            # For authenticated users, the server handles all limit checking
            # We only do basic token expiration check here
            if 'expires_at' in self.auth_data:
                try:
                    expires_at = datetime.datetime.fromisoformat(self.auth_data['expires_at'])
                    if datetime.datetime.now() > expires_at:
                        return False, "Authentication token expired. Please sign in again."
                except Exception as e:
                    print(f"Error checking token expiration: {e}")
            
            # Let server handle the actual limit checking
            return True, "Server will validate limits"
        
        # For non-authenticated users, use local freemium tracking
        limits = FREE_TIER_LIMITS
        
        # Reset daily counter if it's a new day
        today = datetime.date.today().isoformat()
        if self.usage_data["last_date"] != today:
            self.usage_data["queries_today"] = 0
            self.usage_data["last_date"] = today
            self.save_usage_data()
        
        # Check daily limit for freemium users
        if self.usage_data["queries_today"] >= limits["daily_queries"]:
            return False, f"Daily limit of {limits['daily_queries']} queries reached. Please sign in to access higher limits."
        
        # Check cooldown period
        if limits["cooldown_minutes"] > 0 and self.usage_data["last_query_time"]:
            try:
                last_time = datetime.datetime.fromisoformat(self.usage_data["last_query_time"])
                elapsed_minutes = (datetime.datetime.now() - last_time).total_seconds() / 60
                if elapsed_minutes < limits["cooldown_minutes"]:
                    remaining = limits["cooldown_minutes"] - elapsed_minutes
                    return False, f"Please wait {remaining:.1f} minutes between queries."
            except Exception as e:
                print(f"Error checking cooldown: {e}")
        
        return True, f"Query {self.usage_data['queries_today'] + 1}/{limits['daily_queries']} for today"
    
    def update_usage_data(self):
        """Update usage data after making a request"""
        # Only update local usage data for non-authenticated (freemium) users
        # Authenticated users' usage is tracked on the server
        if not self.is_authenticated():
            today = datetime.date.today().isoformat()
            if self.usage_data["last_date"] != today:
                self.usage_data["queries_today"] = 0
                self.usage_data["last_date"] = today
            
            self.usage_data["queries_today"] += 1
            self.usage_data["last_query_time"] = datetime.datetime.now().isoformat()
            
            # Save usage data to local file for freemium users
            self.save_usage_data()
        else:
            # For authenticated users, server tracks usage
            # We just update the timestamp for UI display purposes
            self.usage_data["last_query_time"] = datetime.datetime.now().isoformat()
    
    def get_auth_url(self):
        """Get the authentication URL with session ID"""
        return f"{AUTH_URL}?session_id={self.session_id}"
    
    def get_auth_callback_url(self):
        """Get the authentication callback URL based on the current AUTH_URL domain"""
        # Extract the domain and protocol from AUTH_URL
        if "localhost" in AUTH_URL or "127.0.0.1" in AUTH_URL:
            return f"http://localhost:3000/api/auth/callback?session_id={self.session_id}"
        else:
            # Extract domain from AUTH_URL
            parsed_url = urlparse(AUTH_URL)
            # Ensure we use HTTPS for external domains
            scheme = "https" if parsed_url.scheme == "http" and not any(host in parsed_url.netloc for host in ["localhost", "127.0.0.1"]) else parsed_url.scheme
            domain = f"{scheme}://{parsed_url.netloc}"
            return f"{domain}/api/auth/callback?session_id={self.session_id}"
    
    def set_auth_token(self, token, user_info):
        """Set the authentication token and user info"""
        # Calculate expiration time (1 hour from now)
        expires_at = (datetime.datetime.now() + datetime.timedelta(hours=1)).isoformat()
        
        # Determine subscription tier
        subscription_tier = user_info.get("subscription_tier", "pro")
        
        # Get usage-based pricing setting
        usage_based_pricing_enabled = user_info.get("usage_based_pricing_enabled", False)
        
        self.auth_data = {
            "token": token,
            "email": user_info.get("email", "Unknown"),
            "user_id": user_info.get("uid", ""),
            "subscription_tier": subscription_tier,
            "usage_based_pricing_enabled": usage_based_pricing_enabled,
            "expires_at": expires_at,
            "authenticated_at": datetime.datetime.now().isoformat(),
            "session_id": self.session_id
        }
        self.save_auth_data()
        
        # Force refresh UI after authentication
        try:
            for window in bpy.context.window_manager.windows:
                for area in window.screen.areas:
                    area.tag_redraw()
        except Exception as e:
            print(f"Error refreshing UI after authentication: {e}")
        
    def _try_api_request_with_fallbacks(self, payload, compressed_payload):
        """Try API request with fallback URLs in case of redirect issues"""
        
        headers = {
            "Content-Type": "application/json",
            "X-Compressed": "zlib",
            'User-Agent': f'BlenderBin-Gizmo/{".".join(map(str, bl_info["version"]))} (Blender {".".join(map(str, bpy.app.version))})',
            'Accept': 'application/json',
            'Accept-Encoding': 'identity'  # Disable automatic decompression
        }
        
        encoded_data = json.dumps(compressed_payload).encode('utf-8')
        
        # Try the primary URL first, then fallbacks
        urls_to_try = [self.api_url] + [url for url in self.fallback_urls if url != self.api_url]
        
        for attempt, url in enumerate(urls_to_try):
            try:
                print(f"Attempt {attempt + 1}: Trying URL {url}")
                
                import urllib.request
                import urllib.error
                
                req = urllib.request.Request(
                    url,
                    data=encoded_data,
                    headers=headers,
                    method='POST'
                )
                
                with urllib.request.urlopen(req, timeout=90) as response:
                    # Check if we were redirected
                    final_url = response.geturl()
                    if final_url != url:
                        print(f"Request was redirected from {url} to {final_url}")
                        # Update our API URL to the working one for future requests
                        self.api_url = final_url
                    
                    response_data = response.read().decode('utf-8')
                    data = json.loads(response_data)
                    
                    # Check if response is compressed
                    if response.headers.get('X-Compressed') == 'zlib':
                        data = self._decompress_payload(data)
                    
                    print(f"Success with URL: {url}")
                    return data
                    
            except urllib.error.HTTPError as e:
                if e.code == 308:
                    print(f"308 redirect error with {url}: {e}")
                    # Try to get the redirect location from headers
                    try:
                        redirect_location = e.headers.get('Location', 'Unknown')
                        print(f"Server wants to redirect to: {redirect_location}")
                        
                        # If we get a redirect location, try that URL
                        if redirect_location != 'Unknown' and redirect_location.startswith('http'):
                            print(f"Trying redirect location: {redirect_location}")
                            try:
                                req = urllib.request.Request(
                                    redirect_location,
                                    data=encoded_data,
                                    headers=headers,
                                    method='POST'
                                )
                                
                                with urllib.request.urlopen(req, timeout=90) as response:
                                    response_data = response.read().decode('utf-8')
                                    data = json.loads(response_data)
                                    
                                    # Check if response is compressed
                                    if response.headers.get('X-Compressed') == 'zlib':
                                        data = self._decompress_payload(data)
                                    
                                    print(f"Success with redirect URL: {redirect_location}")
                                    # Update our API URL to the working one
                                    self.api_url = redirect_location
                                    return data
                                    
                            except Exception as redirect_error:
                                print(f"Redirect attempt failed: {redirect_error}")
                                
                    except Exception as header_error:
                        print(f"Error reading redirect headers: {header_error}")
                        
                    # Continue to next fallback URL
                    continue
                else:
                    print(f"HTTP error {e.code} with {url}: {e}")
                    # For other HTTP errors, continue to next fallback
                    continue
                    
            except urllib.error.HTTPRedirectError as e:
                print(f"Redirect error with {url}: {e}")
                print(f"Redirect URL: {e.url}")
                # Continue to next fallback URL
                continue
                
            except Exception as e:
                print(f"Error with {url}: {e}")
                # Continue to next fallback URL
                continue
        
        # If all URLs failed, return an error
        raise Exception(f"All API URLs failed. Tried: {urls_to_try}")
    
    def send_prompt(self, prompt, callback=None):
        """Send a prompt to the AI server and get a response"""
        # Always run in background thread
        thread = threading.Thread(target=self._send_prompt_thread, args=(prompt, callback))
        thread.daemon = True
        thread.start()
        return {"content": "Processing request...", "type": "pending"}
    
    def _send_prompt_thread(self, prompt, callback=None):
        """Send a prompt to the AI server in a separate thread"""
        try:
            # Check if user can make a request based on their tier limits
            can_request, message = self.can_make_request()
            if not can_request:
                result = {
                    "content": f"⚠️ {message} Please sign in to access premium features.",
                    "type": "error"
                }
                if callback:
                    bpy.app.timers.register(lambda: callback(result), first_interval=0.1)
                return result
            
            # Check if we're using usage-based pricing
            using_usage_based_pricing = (
                self.is_authenticated() and 
                self.auth_data.get('usage_based_pricing_enabled', False) and 
                self.usage_data["queries_today"] >= self.get_current_limits()["daily_queries"]
            )
            
            # Add user prompt to history
            self.chat_history.append({"role": "user", "content": prompt})
            
            # Get detailed scene information
            scene_info = self.get_scene_info()
            
            # Get the selected model from Blender's scene
            selected_model = "claude-3-5-sonnet-20240620"  # Default model
            try:
                if hasattr(bpy.context.scene, "gizmo_selected_model"):
                    selected_model = bpy.context.scene.gizmo_selected_model
            except Exception as e:
                print(f"Error getting selected model: {e}")
            
            # Prepare the request
            payload = {
                "prompt": prompt,
                "history": self.chat_history[-10:] if len(self.chat_history) > 1 else [],
                "scene_info": scene_info,
                "model": selected_model
            }
            
            # Add authentication token if authenticated
            if self.is_authenticated():
                # Add additional analytics data for authenticated users
                payload["auth"] = {
                    "token": self.auth_data["token"],
                    "user_id": self.auth_data["user_id"],
                    "analytics": {
                        "client_version": bl_info["version"],
                        "blender_version": ".".join(map(str, bpy.app.version)),
                        "platform": getattr(bpy.app, "platform", sys.platform),
                        "queries_today": self.usage_data["queries_today"],
                        "session_id": self.session_id,
                        "timestamp": datetime.datetime.now().isoformat()
                    }
                }

                # Add usage-based pricing info if relevant
                if using_usage_based_pricing:
                    payload["auth"]["usage_based_pricing"] = {
                        "enabled": True,
                        "beyond_plan_limits": True,
                        "plan_limit": self.get_current_limits()["daily_queries"]
                    }

                    # Enhanced metrics about user's scene complexity
                    if scene_info and "total_objects" in scene_info:
                        payload["auth"]["analytics"]["scene_complexity"] = {
                            "object_count": scene_info.get("total_objects", 0),
                            "collection_count": len(scene_info.get("collections", [])),
                            "material_count": len(scene_info.get("materials", [])),
                            "has_active_object": scene_info.get("active_object_details") is not None
                        }
            
            # Compress the payload
            compressed_payload = self._compress_payload(payload)
            
            print(f"Sending request to {self.api_url}")
            print(f"Payload size: original={len(json.dumps(payload))} bytes, compressed={len(compressed_payload['data'])} bytes")
            
            # Try the API request with fallbacks
            try:
                data = self._try_api_request_with_fallbacks(payload, compressed_payload)
                
                # Add AI response to history
                if "content" in data:
                    self.chat_history.append({"role": "assistant", "content": data["content"]})
                
                # Store server-provided subscription/usage information for UI display
                if "subscription" in data:
                    self.last_server_usage = data["subscription"]
                elif "freemium" in data:
                    # For unauthenticated users, store freemium info
                    self.last_server_usage = data["freemium"]
                
                # If using usage-based pricing, check for token usage
                if using_usage_based_pricing and self.is_authenticated():
                    try:
                        # Get the token count from the response
                        token_count = data.get("token_usage", {}).get("total_tokens", 0)
                        
                        # If token count is present, report it for usage-based pricing
                        if token_count > 0:
                            # Report token usage (async in a separate thread)
                            self._report_token_usage(selected_model, token_count)
                    except Exception as e:
                        print(f"Error processing token usage data: {e}")
                
                # Execute code if the response type is 'code'
                if data.get("type") == "code":
                    # IMPORTANT: Don't execute code in a thread - Blender's Python API isn't fully thread-safe
                    # Instead, schedule execution on the main thread using timers
                    code_content = data.get("content", "")
                    
                    # Create a one-time execution function that won't repeat
                    def execute_once():
                        self.execute_code(code_content)
                        return None  # Returning None or False prevents the timer from repeating
                    
                    # Register as a one-shot timer - check if timers are available
                    if hasattr(bpy, "app") and hasattr(bpy.app, "timers") and hasattr(bpy.app.timers, "register"):
                        bpy.app.timers.register(execute_once, first_interval=0.1)
                    else:
                        # Fall back to direct execution if timers aren't available
                        try:
                            self.execute_code(code_content)
                        except Exception as exec_error:
                            print(f"Error executing code directly: {exec_error}")
                            traceback.print_exc()
                
                # Update usage tracking
                self.update_usage_data()
                
                # Handle authentication token refresh if provided
                if "auth" in data and "token" in data["auth"]:
                    self.set_auth_token(data["auth"]["token"], data["auth"].get("user", {}))
                
                result = data
                
            except Exception as api_error:
                error_message = f"Error sending prompt: {str(api_error)}"
                print(error_message)
                traceback.print_exc()
                
                # Provide a more user-friendly error message for common errors
                user_message = error_message
                if "All API URLs failed" in str(api_error):
                    user_message = "Error: Could not connect to any API endpoints. Please check your internet connection or contact support."
                elif "308" in str(api_error) or "redirect" in str(api_error).lower():
                    user_message = "Error: Server redirect issue. The API endpoints may have changed. Please contact support."
                elif "platform" in str(api_error) or "attribute" in str(api_error):
                    user_message = "Error: Unable to access required Blender attributes. This might be due to compatibility issues with your Blender version."
                elif "connection" in str(api_error).lower():
                    user_message = "Error: Unable to connect to the AI server. Please check your internet connection."
                elif "timeout" in str(api_error).lower():
                    user_message = "Error: The request timed out. The server might be busy or experiencing issues."
                
                result = {"content": user_message, "type": "error"}
                
        except Exception as e:
            error_message = f"Error in prompt processing: {str(e)}"
            print(error_message)
            traceback.print_exc()
            result = {"content": error_message, "type": "error"}
        
        # Call the callback with the result if provided
        if callback:
            try:
                # Use bpy.app.timers to run callback in the main thread
                # First check if timers are available in this Blender version
                if hasattr(bpy, "app") and hasattr(bpy.app, "timers") and hasattr(bpy.app.timers, "register"):
                    bpy.app.timers.register(lambda: callback(result), first_interval=0.1)
                else:
                    # Fall back to direct callback if timers aren't available
                    callback(result)
            except Exception as e:
                print(f"Error calling callback: {str(e)}")
        
        return result
    
    def execute_code(self, code):
        """Execute the generated Python code in Blender"""
        # Prevent duplicate execution
        if code.strip() == self.last_executed_code.strip():
            print("Skipping duplicate code execution")
            return True
            
        # Prevent executing while another execution is in progress
        if self.is_executing:
            print("Execution already in progress, skipping")
            return False
            
        self.is_executing = True
        self.last_executed_code = code.strip()
        
        try:
            # Get the current state before execution
            scene_before = self.get_scene_info()
            
            # Execute the code
            print("Executing code:")
            print(code)
            
            # Split code into individual lines for better execution control
            lines = code.split('\n')
            
            # Add a global variable for the execution context
            globals_dict = globals().copy()
            globals_dict['__file__'] = 'gizmo_ai_script'
            
            # Add safety checks for common issues
            safety_prelude = """
# Safety checks for common Blender API issues
def safe_get_active_object():
    try:
        if hasattr(bpy, 'context') and hasattr(bpy.context, 'active_object') and bpy.context.active_object:
            return bpy.context.active_object
        else:
            print("Warning: No active object found")
            return None
    except Exception as e:
        print(f"Error accessing active object: {e}")
        return None

# Ensure we're in object mode for safety
if hasattr(bpy, 'ops'):
    try:
        if bpy.context.object and bpy.context.object.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')
    except Exception as e:
        print(f"Warning: Could not set object mode: {e}")
"""

            # For safety, wrap the code in a try-except block with safety prelude
            wrapped_code = (
                safety_prelude +
                "\ntry:\n" +
                "\n".join(f"    {line}" for line in lines) +
                "\nexcept Exception as e:\n" +
                "    import traceback\n" +
                "    traceback.print_exc()\n" +
                "    print(f'Error executing code: {e}')\n"
            )
            
            # Execute the wrapped code
            exec(wrapped_code, globals_dict)
            
            # Get the state after execution
            scene_after = self.get_scene_info()
            
            # Detect changes
            changes = self.detect_changes(scene_before, scene_after)
            
            # Send feedback about execution
            self.send_execution_result(code, changes, scene_after)
            
            # Reset execution flag
            self.is_executing = False
            return True
        except Exception as e:
            error_message = f"Error executing code: {str(e)}"
            print(error_message)
            traceback.print_exc()
            
            # Send error information back to the server
            self.send_execution_error(code, str(e))
            
            # Reset execution flag even on error
            self.is_executing = False
            return False
    
    def get_scene_info(self):
        """Get comprehensive information about the current scene"""
        try:
            # Safely check if context and scene are available
            if not hasattr(bpy, "context") or not hasattr(bpy.context, "scene"):
                return {
                    "error": "Blender context or scene not available",
                    "blender_version": ".".join(map(str, bpy.app.version))
                }
                
            scene = bpy.context.scene
            scene_objects = getattr(scene, "objects", [])
            
            scene_info = {
                "scene_name": scene.name,
                "total_objects": len(scene_objects),
                "object_types": {},
                "active_object_details": None,
                "collections": self._get_collections_data(),
                "objects": [],
                "materials": self._get_materials_data(),
                "render_settings": self._get_render_settings(),
                "blender_version": ".".join(map(str, bpy.app.version))
            }
            
            # Count object types
            for obj in scene_objects:
                try:
                    if obj.type in scene_info["object_types"]:
                        scene_info["object_types"][obj.type] += 1
                    else:
                        scene_info["object_types"][obj.type] = 1
                except Exception as e:
                    print(f"Error processing object type: {e}")
                    
            # Get detailed data for all objects
            for obj in scene_objects:
                try:
                    obj_data = self._get_object_data(obj)
                    scene_info["objects"].append(obj_data)
                except Exception as e:
                    print(f"Error getting data for object {obj.name if hasattr(obj, 'name') else 'unknown'}: {e}")
                    scene_info["objects"].append({"name": obj.name if hasattr(obj, 'name') else "unknown", "error": str(e)})
        except Exception as e:
            print(f"Error collecting scene info: {e}")
            return {
                "error": f"Failed to collect scene info: {str(e)}",
                "blender_version": ".".join(map(str, bpy.app.version)) if hasattr(bpy, "app") and hasattr(bpy.app, "version") else "Unknown",
                "platform": getattr(bpy.app, "platform", sys.platform) if hasattr(bpy, "app") else sys.platform
            }
        
        # Get active object details - with safe access
        try:
            # Check if context is available and has an active object
            if hasattr(bpy, "context") and hasattr(bpy.context, "active_object") and bpy.context.active_object:
                active = bpy.context.active_object
                scene_info["active_object_details"] = {
                    "name": active.name,
                    "type": active.type,
                    "location": [round(v, 4) for v in active.location],
                    "rotation": [round(v, 4) for v in active.rotation_euler],
                    "scale": [round(v, 4) for v in active.scale],
                    "dimensions": [round(v, 4) for v in active.dimensions],
                    "selected": active.select_get(),
                    "parent": active.parent.name if active.parent else None,
                    "visible": active.visible_get()
                }
                
                # Get selected vertices for mesh objects
                if active.type == 'MESH' and active.mode == 'EDIT':
                    scene_info["active_object_details"]["selected_elements"] = self._get_selected_elements(active)
            else:
                scene_info["active_object_details"] = None
        except Exception as e:
            print(f"Error getting active object details: {e}")
            scene_info["active_object_details"] = None
            scene_info["active_object_error"] = str(e)
        
        return scene_info
        
    def _get_object_data(self, obj):
        """Get detailed data for a single object"""
        obj_data = {
            "name": obj.name,
            "type": obj.type,
            "location": [round(v, 4) for v in obj.location],
            "rotation": [round(v, 4) for v in obj.rotation_euler],
            "scale": [round(v, 4) for v in obj.scale],
            "dimensions": [round(v, 4) for v in obj.dimensions],
            "parent": obj.parent.name if obj.parent else None,
            "collections": [coll.name for coll in obj.users_collection],
            "visible": obj.visible_get(),
            "selected": obj.select_get(),
            "modifiers": self._get_modifiers_data(obj),
            "constraints": self._get_constraints_data(obj),
            "materials": self._get_object_materials(obj)
        }
        
        # Add type-specific data
        if obj.type == 'MESH':
            obj_data["mesh"] = {
                "vertices": len(obj.data.vertices),
                "edges": len(obj.data.edges),
                "polygons": len(obj.data.polygons),
                "has_custom_normals": obj.data.has_custom_normals,
                "has_uv_layers": len(obj.data.uv_layers) > 0,
                "uv_layers": [uv.name for uv in obj.data.uv_layers]
            }
        elif obj.type == 'CURVE':
            obj_data["curve"] = {
                "splines": len(obj.data.splines),
                "dimensions": obj.data.dimensions,
                "resolution_u": obj.data.resolution_u
            }
        elif obj.type == 'LIGHT':
            obj_data["light"] = {
                "type": obj.data.type,
                "color": [round(v, 4) for v in obj.data.color],
                "energy": obj.data.energy
            }
        elif obj.type == 'CAMERA':
            obj_data["camera"] = {
                "lens": obj.data.lens,
                "sensor_width": obj.data.sensor_width,
                "is_perspective": not obj.data.type == 'ORTHO'
            }
        elif obj.type == 'ARMATURE':
            obj_data["armature"] = {
                "bones": len(obj.data.bones),
                "bone_names": [bone.name for bone in obj.data.bones]
            }
            
        return obj_data
        
    def _get_collections_data(self):
        """Get data about all collections in the scene"""
        try:
            if not hasattr(bpy, "data") or not hasattr(bpy.data, "collections"):
                return [{"error": "Collections data not available"}]
                
            collections = []
            
            for coll in bpy.data.collections:
                try:
                    coll_data = {
                        "name": coll.name,
                        "objects": [obj.name for obj in coll.objects],
                        "children": [child.name for child in coll.children],
                        "hide_viewport": coll.hide_viewport,
                        "hide_render": coll.hide_render
                    }
                    collections.append(coll_data)
                except Exception as e:
                    print(f"Error processing collection {coll.name if hasattr(coll, 'name') else 'unknown'}: {e}")
                    collections.append({
                        "name": coll.name if hasattr(coll, 'name') else "unknown",
                        "error": str(e)
                    })
                
            return collections
        except Exception as e:
            print(f"Error getting collections data: {e}")
            return [{"error": str(e)}]
        
    def _get_modifiers_data(self, obj):
        """Get data about object modifiers"""
        modifiers = []
        
        for mod in obj.modifiers:
            mod_data = {
                "name": mod.name,
                "type": mod.type,
                "show_viewport": mod.show_viewport,
                "show_render": mod.show_render
            }
            
            # Add type-specific attributes
            if mod.type == 'SUBSURF':
                mod_data["levels"] = mod.levels
                mod_data["render_levels"] = mod.render_levels
            elif mod.type == 'ARRAY':
                mod_data["count"] = mod.count
                mod_data["use_relative_offset"] = mod.use_relative_offset
            elif mod.type == 'MIRROR':
                mod_data["use_axis"] = [mod.use_axis[0], mod.use_axis[1], mod.use_axis[2]]
                
            modifiers.append(mod_data)
            
        return modifiers
        
    def _get_constraints_data(self, obj):
        """Get data about object constraints"""
        constraints = []
        
        for con in obj.constraints:
            con_data = {
                "name": con.name,
                "type": con.type,
                "influence": con.influence,
                "mute": con.mute
            }
            
            # Add type-specific attributes
            if con.type == 'COPY_LOCATION':
                con_data["target"] = con.target.name if con.target else None
            elif con.type == 'TRACK_TO':
                con_data["target"] = con.target.name if con.target else None
                
            constraints.append(con_data)
            
        return constraints
        
    def _get_materials_data(self):
        """Get data about all materials in the scene"""
        try:
            if not hasattr(bpy, "data") or not hasattr(bpy.data, "materials"):
                return [{"error": "Materials data not available"}]
                
            materials = []
            
            for mat in bpy.data.materials:
                try:
                    mat_data = {
                        "name": mat.name,
                        "use_nodes": mat.use_nodes,
                        "users": mat.users,
                        "is_grease_pencil": mat.is_grease_pencil
                    }
                    
                    # Basic shader info
                    if mat.use_nodes and not mat.is_grease_pencil:
                        if hasattr(mat, "node_tree") and hasattr(mat.node_tree, "nodes") and 'Principled BSDF' in mat.node_tree.nodes:
                            try:
                                bsdf = mat.node_tree.nodes['Principled BSDF']
                                mat_data["base_color"] = [round(v, 4) for v in bsdf.inputs["Base Color"].default_value]
                                mat_data["metallic"] = round(bsdf.inputs["Metallic"].default_value, 4)
                                mat_data["roughness"] = round(bsdf.inputs["Roughness"].default_value, 4)
                            except Exception as e:
                                print(f"Error getting BSDF properties for material {mat.name}: {e}")
                                mat_data["shader_error"] = str(e)
                        
                    materials.append(mat_data)
                except Exception as e:
                    print(f"Error processing material {mat.name if hasattr(mat, 'name') else 'unknown'}: {e}")
                    materials.append({
                        "name": mat.name if hasattr(mat, 'name') else "unknown",
                        "error": str(e)
                    })
                
            return materials
        except Exception as e:
            print(f"Error getting materials data: {e}")
            return [{"error": str(e)}]
        
    def _get_object_materials(self, obj):
        """Get materials assigned to an object"""
        materials = []
        
        for slot in obj.material_slots:
            if slot.material:
                materials.append(slot.material.name)
                
        return materials
        
    def _get_render_settings(self):
        """Get current render settings"""
        try:
            if not hasattr(bpy, "context") or not hasattr(bpy.context, "scene") or not hasattr(bpy.context.scene, "render"):
                return {"error": "Render settings not available"}
                
            render = bpy.context.scene.render
            return {
                "engine": render.engine,
                "resolution_x": render.resolution_x,
                "resolution_y": render.resolution_y,
                "resolution_percentage": render.resolution_percentage,
                "fps": round(render.fps / render.fps_base, 2),
                "film_transparent": render.film_transparent
            }
        except Exception as e:
            print(f"Error getting render settings: {e}")
            return {"error": str(e)}
        
    def _get_selected_elements(self, obj):
        """Get information about selected vertices/edges/faces in edit mode"""
        try:
            # This requires bmesh which is safe to import in Blender
            import bmesh
            
            selected = {
                "vertices": 0,
                "edges": 0,
                "faces": 0
            }
            
            if obj.mode == 'EDIT' and obj.type == 'MESH':
                bm = bmesh.from_edit_mesh(obj.data)
                selected["vertices"] = sum(1 for v in bm.verts if v.select)
                selected["edges"] = sum(1 for e in bm.edges if e.select)
                selected["faces"] = sum(1 for f in bm.faces if f.select)
                
            return selected
        except Exception as e:
            print(f"Error getting selected elements: {e}")
            return {"error": str(e)}
    
    def detect_changes(self, before, after):
        """Detect changes in the scene after code execution"""
        try:
            if not hasattr(bpy, "context") or not hasattr(bpy.context, "scene"):
                return {
                    "error": "Could not detect changes: Scene not available",
                    "added_objects": [],
                    "removed_objects": [],
                    "modified_objects": []
                }
            
            # Get current object names
            try:
                current_objects = set(obj.name for obj in bpy.context.scene.objects)
            except Exception as e:
                print(f"Error accessing scene objects: {e}")
                current_objects = set()
            
            # Use the passed before/after data for comparison if available
            before_objects = set()
            after_objects = set()
            
            # Extract object names from before data
            if isinstance(before, dict) and "objects" in before:
                before_objects = set(obj.get("name", "") for obj in before["objects"] if isinstance(obj, dict) and "name" in obj)
            else:
                before_objects = current_objects
                
            # Extract object names from after data
            if isinstance(after, dict) and "objects" in after:
                after_objects = set(obj.get("name", "") for obj in after["objects"] if isinstance(obj, dict) and "name" in obj)
            else:
                after_objects = current_objects
            
            # Calculate differences
            added_objects = list(after_objects - before_objects)
            removed_objects = list(before_objects - after_objects)
            
            # Check for modified objects (simple heuristic)
            modified_objects = []
            for obj_name in before_objects.intersection(after_objects):
                # You could add more sophisticated change detection here
                pass
            
            changes = {
                "added_objects": added_objects,
                "removed_objects": removed_objects,
                "modified_objects": modified_objects,
                "summary": f"Added {len(added_objects)} objects, removed {len(removed_objects)} objects"
            }
            
            return changes
        except Exception as e:
            print(f"Error detecting changes: {e}")
            return {
                "error": f"Error detecting changes: {str(e)}",
                "added_objects": [],
                "removed_objects": [],
                "modified_objects": []
            }
    
    def send_execution_result(self, code, changes, scene_info):
        """Send execution result feedback to the server"""
        try:
            payload = {
                "type": "execution_result",
                "content": {
                    "code": code,
                    "changes": changes,
                    "scene_info": scene_info
                }
            }
            
            # Send the request asynchronously in a new thread
            thread = threading.Thread(target=self._send_feedback, args=(payload,))
            thread.daemon = True
            thread.start()
            
        except Exception as e:
            print(f"Error sending execution result: {e}")
    
    def send_execution_error(self, code, error):
        """Send execution error feedback to the server"""
        try:
            payload = {
                "type": "execution_error",
                "content": {
                    "code": code,
                    "error": error,
                    "chat_history": self.chat_history[-5:] if len(self.chat_history) >= 5 else self.chat_history,
                    "current_scene_info": self.get_scene_info()
                }
            }
            
            # Send the request asynchronously in a new thread
            thread = threading.Thread(target=self._send_feedback, args=(payload,))
            thread.daemon = True
            thread.start()
            
        except Exception as e:
            print(f"Error sending execution error: {e}")
    
    def send_user_feedback(self, code, success, feedback):
        """Send user feedback about executed code"""
        try:
            payload = {
                "type": "user_feedback",
                "content": {
                    "code": code,
                    "success": success,
                    "feedback": feedback,
                    "chat_history": self.chat_history[-5:] if len(self.chat_history) >= 5 else self.chat_history,
                    "current_scene_info": self.get_scene_info()
                }
            }
            
            # Send the request asynchronously in a new thread
            thread = threading.Thread(target=self._send_feedback, args=(payload,))
            thread.daemon = True
            thread.start()
            
        except Exception as e:
            print(f"Error sending user feedback: {e}")
    
    def _send_feedback(self, payload):
        """Send feedback to the server in a separate thread"""
        try:
            # Compress the payload
            compressed_payload = self._compress_payload(payload)
            
            # Include current scene info with feedback
            if isinstance(payload, dict) and "content" in payload and isinstance(payload["content"], dict):
                # Add scene info to the payload content
                payload["content"]["scene_info"] = self.get_scene_info()
                # Compress again with the scene info
                compressed_payload = self._compress_payload(payload)
            
            # Send the compressed payload
            response = self._make_secure_request(
                'POST',
                self.api_url, 
                json=compressed_payload, 
                timeout=30,
                headers={"Content-Type": "application/json", "X-Compressed": "zlib"}
            )
            
            orig_size = len(json.dumps(payload)) if isinstance(payload, dict) else len(str(payload))
            comp_size = len(compressed_payload["data"]) if "data" in compressed_payload else 0
            
            print(f"Feedback sent, response: {response.status_code}")
            print(f"Feedback size: original={orig_size} bytes, compressed={comp_size} bytes")
            
            if response.status_code != 200:
                print(f"Error sending feedback: Server returned status code {response.status_code}")
                
        except Exception as e:
            print(f"Error sending feedback: {e}")
    
    def clear_memory(self):
        """Clear the chat history"""
        self.chat_history = []
        
        # Tell the server to clear its memory in a background thread
        thread = threading.Thread(target=self._clear_memory_thread)
        thread.daemon = True
        thread.start()
        
    def _clear_memory_thread(self):
        """Clear server memory in a separate thread"""
        try:
            payload = {"type": "clear_memory"}
            response = self._make_secure_request('POST', self.api_url, json=payload, timeout=10)
            print(f"Memory cleared, response: {response.status_code}")
        except Exception as e:
            print(f"Error clearing memory: {e}")
    
    def _compress_payload(self, payload):
        """Compress the payload using zlib compression"""
        try:
            # Convert payload to JSON string
            json_data = json.dumps(payload)
            
            # Compress the JSON string
            compressed_data = zlib.compress(json_data.encode('utf-8'))
            
            # Convert to base64 string for safe transmission
            b64_data = base64.b64encode(compressed_data).decode('ascii')
            
            # Return compressed payload
            return {
                "compressed": True,
                "format": "zlib+base64",
                "data": b64_data
            }
        except Exception as e:
            print(f"Error compressing payload: {e}")
            # Return original payload if compression fails
            return payload
    
    def _decompress_payload(self, compressed_payload):
        """Decompress a zlib compressed payload"""
        try:
            if not isinstance(compressed_payload, dict):
                return compressed_payload
                
            if not compressed_payload.get("compressed"):
                return compressed_payload
                
            # Get the compressed data
            b64_data = compressed_payload.get("data", "")
            
            # Decode base64
            compressed_data = base64.b64decode(b64_data)
            
            # Decompress the data
            json_data = zlib.decompress(compressed_data).decode('utf-8')
            
            # Parse the JSON data
            return json.loads(json_data)
        except Exception as e:
            print(f"Error decompressing payload: {e}")
            # Return original payload if decompression fails
            return compressed_payload

    def _report_token_usage(self, model: str, token_count: int):
        """Report token usage for usage-based pricing"""
        if not self.is_authenticated() or not self.auth_data.get('usage_based_pricing_enabled', False):
            return
            
        try:
            # Create a thread to report token usage
            def report_thread():
                try:
                    # Create the payload
                    payload = {
                        "model": "token-based-claude" if "claude" in model.lower() else model,
                        "tokenCount": token_count,
                        "requestCount": 0  # This is a token-based request, not request-based
                    }
                    
                    # Add auth header
                    headers = {
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.auth_data['token']}"
                    }
                    
                    # Send the request
                    response = self._make_secure_request(
                        'POST',
                        "https://blenderbin.com/api/usage-tracking",
                        json=payload,
                        headers=headers,
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        print(f"Token usage reported successfully: {token_count} tokens")
                        
                        # If we were charged, show a message to the user
                        if data.get("charged", False):
                            charged_amount = data.get("chargeAmount", 0)
                            print(f"⚠️ You were charged ${charged_amount:.2f} for usage-based pricing")
                    else:
                        print(f"Error reporting token usage: Status {response.status_code}")
                except Exception as e:
                    print(f"Error in report_token_usage thread: {e}")
            
            # Start the thread
            thread = threading.Thread(target=report_thread)
            thread.daemon = True
            thread.start()
        except Exception as e:
            print(f"Error starting report_token_usage thread: {e}")

    def check_auth_status(self):
        """Poll the server to check if authentication was completed"""
        try:
            # Get the correct callback URL based on whether we're in dev or prod
            callback_url = self.get_auth_callback_url()
            
            print(f"Checking auth status at: {callback_url}")
            
            # Use simple urllib.request like working NextJS client
            import urllib.request
            import urllib.error
            
            req = urllib.request.Request(callback_url, headers={
                'User-Agent': f'BlenderBin-Gizmo/{".".join(map(str, bl_info["version"]))} (Blender {".".join(map(str, bpy.app.version))})',
                'Accept': 'application/json'
            })
            
            try:
                with urllib.request.urlopen(req, timeout=10) as response:
                    # Check if we were redirected
                    final_url = response.geturl()
                    if final_url != callback_url:
                        print(f"Auth callback was redirected from {callback_url} to {final_url}")
                    
                    response_data = response.read().decode('utf-8')
                    data = json.loads(response_data)
                    print(f"Auth status response: {data}")
                    
                    if data.get("authenticated"):
                        # User has authenticated, save the token
                        self.set_auth_token(
                            data.get("token", ""),
                            data.get("user", {})
                        )
                        
                        print(f"User authenticated: {data.get('user', {}).get('email', 'Unknown')}")
                        
                        # Force UI redraw in ALL areas to ensure panel is refreshed
                        for window in bpy.context.window_manager.windows:
                            for area in window.screen.areas:
                                area.tag_redraw()
                        
                        # Show a notification to the user
                        def show_login_success():
                            # Show a message in Blender's info area
                            message = f"Successfully signed in as {data.get('user', {}).get('email', 'Unknown')}"
                            print(message)
                            
                            # Force UI refresh
                            for window in bpy.context.window_manager.windows:
                                for area in window.screen.areas:
                                    area.tag_redraw()
                        
                            return None
                        
                        # Safely register timer
                        if hasattr(bpy, "app") and hasattr(bpy.app, "timers") and hasattr(bpy.app.timers, "register"):
                            bpy.app.timers.register(show_login_success, first_interval=0.1)
                        else:
                            # Fall back to direct call if timers aren't available
                            show_login_success()
                        
                        # Reset auth check state
                        self.auth_check_in_progress = False
                        self.check_attempts = 0
                        
                        # Don't check anymore
                        return None
                    else:
                        # Authentication was not successful
                        print(f"Authentication failed. Response: {data}")
                        
                        # If we've been checking for a while, show a specific message
                        if self.check_attempts > 15:  # After about 30 seconds
                            def show_auth_failed():
                                message = "Authentication failed. Please try again or check your account status."
                                print(message)
                                
                                # Force UI refresh
                                for window in bpy.context.window_manager.windows:
                                    for area in window.screen.areas:
                                        area.tag_redraw()
                            
                                return None
                            
                            # Safely register timer
                            if hasattr(bpy, "app") and hasattr(bpy.app, "timers") and hasattr(bpy.app.timers, "register"):
                                bpy.app.timers.register(show_auth_failed, first_interval=0.1)
                            else:
                                # Fall back to direct call if timers aren't available
                                show_auth_failed()
                            
                            # Reset auth check state
                            self.auth_check_in_progress = False
                            self.check_attempts = 0
                            
                            return None
                            
            except urllib.error.HTTPRedirectError as e:
                print(f"Auth callback redirect error: {e}")
                print(f"Redirect URL: {e.url}")
                
                def show_auth_redirect_error():
                    message = f"Authentication redirect error. Server redirected to: {e.url}"
                    print(message)
                    
                    # Force UI refresh
                    for window in bpy.context.window_manager.windows:
                        for area in window.screen.areas:
                            area.tag_redraw()
                    
                    return None
                
                # Safely register timer
                if hasattr(bpy, "app") and hasattr(bpy.app, "timers") and hasattr(bpy.app.timers, "register"):
                    bpy.app.timers.register(show_auth_redirect_error, first_interval=0.1)
                else:
                    # Fall back to direct call if timers aren't available
                    show_auth_redirect_error()
                
                # Reset auth check state
                self.auth_check_in_progress = False
                self.check_attempts = 0
                
                return None
                        
        except urllib.error.HTTPError as e:
            if e.code in (401, 403):
                # Authentication error
                print(f"Authentication error: Server returned {e.code}")
                
                def show_auth_error():
                    message = "Server authentication error. Please try again later."
                    print(message)
                    
                    # Force UI refresh
                    for window in bpy.context.window_manager.windows:
                        for area in window.screen.areas:
                            area.tag_redraw()
                    
                    return None
                
                # Safely register timer
                if hasattr(bpy, "app") and hasattr(bpy.app, "timers") and hasattr(bpy.app.timers, "register"):
                    bpy.app.timers.register(show_auth_error, first_interval=0.1)
                else:
                    # Fall back to direct call if timers aren't available
                    show_auth_error()
                
                # Reset auth check state
                self.auth_check_in_progress = False
                self.check_attempts = 0
                
                return None
            elif e.code == 308:
                print(f"Auth callback got 308 redirect error: {e}")
                
                def show_redirect_error():
                    message = "Authentication endpoint redirected (308). Please contact support."
                    print(message)
                    
                    # Force UI refresh
                    for window in bpy.context.window_manager.windows:
                        for area in window.screen.areas:
                            area.tag_redraw()
                    
                    return None
                
                # Safely register timer
                if hasattr(bpy, "app") and hasattr(bpy.app, "timers") and hasattr(bpy.app.timers, "register"):
                    bpy.app.timers.register(show_redirect_error, first_interval=0.1)
                else:
                    # Fall back to direct call if timers aren't available
                    show_redirect_error()
                
                # Reset auth check state
                self.auth_check_in_progress = False
                self.check_attempts = 0
                
                return None
        except Exception as e:
            print(f"Error checking auth status: {e}")
        
        # Keep checking every 2 seconds for 60 seconds (30 iterations)
        self.check_attempts += 1
        if self.check_attempts >= 30:
            print("Authentication timeout, stopping checks")
            # Show error message to user
            def show_timeout_message():
                # Show a message in Blender's info area
                message = "Authentication timed out. Please try again."
                print(message)
                
                # Force UI refresh
                for window in bpy.context.window_manager.windows:
                    for area in window.screen.areas:
                        area.tag_redraw()
                
                return None
            
            # Safely register timer
            if hasattr(bpy, "app") and hasattr(bpy.app, "timers") and hasattr(bpy.app.timers, "register"):
                bpy.app.timers.register(show_timeout_message, first_interval=0.1)
            else:
                # Fall back to direct call if timers aren't available
                show_timeout_message()
            
            # Reset auth check state
            self.auth_check_in_progress = False
            self.check_attempts = 0
            
            return None
        
        return 2.0  # Check again in 2 seconds


# Global client instance
ai_client = GizmoAIClient()

# Process input from the text field
class GIZMO_OT_process_input(Operator):
    bl_idname = "gizmo.process_input"
    bl_label = "Process Input"
    bl_description = "Process the input and send to AI"
    
    def execute(self, context):
        prompt = context.scene.gizmo_input
        if not prompt.strip():
            self.report({'ERROR'}, "Please enter a prompt")
            return {'CANCELLED'}
        
        # Display processing message
        context.scene.gizmo_ai_result = "Processing request..."
        context.scene.gizmo_ai_type = "pending"
        
        # Save prompt to chat history
        CHAT_HISTORY.append({"prompt": prompt, "response": ""})
        
        # Clear the input field
        context.scene.gizmo_input = ""
        
        # Send the prompt to the AI with a callback to update UI
        global ai_client
        ai_client.send_prompt(prompt, callback=self.update_ui_callback)
        
        return {'FINISHED'}
    
    def update_ui_callback(self, response):
        """Callback to update the UI when the response is received"""
        try:
            # Update scene properties
            bpy.context.scene.gizmo_ai_result = response.get("content", "")
            bpy.context.scene.gizmo_ai_type = response.get("type", "text")
            
            # Update the last chat history entry with the response
            if CHAT_HISTORY and "response" in CHAT_HISTORY[-1]:
                CHAT_HISTORY[-1]["response"] = response.get("content", "")
            
            # Force a UI redraw
            for area in bpy.context.screen.areas:
                if area.type == 'VIEW_3D':
                    area.tag_redraw()
            
            return None  # Required for timer callbacks
        except Exception as e:
            print(f"Error updating UI: {str(e)}")
            traceback.print_exc()
            return None


# Panel for displaying the AI interface
class GIZMO_PT_ai_panel(Panel):
    bl_label = "Gizmo"
    bl_idname = "GIZMO_PT_ai_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Gizmo'
    
    def draw(self, context):
        layout = self.layout
        scene = context.scene
        global ai_client
        
        # Refresh the authentication status before drawing the panel
        # This ensures we always have the latest state
        if not ai_client.auth_check_in_progress:
            # Only try to reload auth data if we're not in the middle of checking auth
            if ai_client.auth_data and not ai_client.is_authenticated():
                # Force reload auth data from file
                ai_client.load_auth_data()
            
            # Check if token is expired and clear it if necessary
            if ai_client.is_authenticated() and 'expires_at' in ai_client.auth_data:
                try:
                    expires_at = datetime.datetime.fromisoformat(ai_client.auth_data['expires_at'])
                    if datetime.datetime.now() > expires_at:
                        print("Auth token expired, clearing data")
                        ai_client.clear_auth_data()
                except Exception as e:
                    print(f"Error checking token expiration: {e}")
        
        # Authentication status
        box = layout.box()
        
        if ai_client.is_authenticated():
            # Show logged-in user info
            row = box.row()
            subscription_tier = ai_client.auth_data.get('subscription_tier', 'free')
            
            # Choose appropriate icon based on tier
            if subscription_tier == 'business' or subscription_tier == 'developer':
                tier_icon = 'FUND'
                tier_display = subscription_tier.capitalize()
            elif subscription_tier == 'pro':
                tier_icon = 'COLLECTION_COLOR_04'
                tier_display = 'Pro'
            else:
                tier_icon = 'SOLO_OFF'
                tier_display = 'Free'
            
            row.label(text=f"{tier_display}: {ai_client.auth_data.get('email', 'Unknown')}", icon=tier_icon)
            row.operator("gizmo.logout", text="", icon='KEYFRAME_HLT')
            
            # Show usage info with button to check details
            limits = ai_client.get_current_limits()
            usage = ai_client.usage_data
            
            # For authenticated users, try to get server-provided usage info if available
            server_usage = getattr(ai_client, 'last_server_usage', None)
            if server_usage and ai_client.is_authenticated():
                # Use server-provided data for authenticated users
                current_queries = server_usage.get('queryCount', 0)
                daily_limit = server_usage.get('dailyLimit', limits['daily_queries'])
                if daily_limit == "unlimited":
                    usage_text = f"Queries today: {current_queries} (Unlimited)"
                else:
                    usage_text = f"Queries: {current_queries}/{daily_limit}"
            elif ai_client.is_authenticated():
                # Authenticated user but no server data yet - show that we're syncing
                usage_text = f"Syncing usage data..."
            else:
                # Non-authenticated user - use local tracking
                remaining = max(0, limits["daily_queries"] - usage.get("queries_today", 0))
                usage_text = f"Queries: {usage.get('queries_today', 0)}/{limits['daily_queries']}"
            
            usage_row = box.row()
            usage_row.label(text=usage_text)
            usage_row.operator("gizmo.check_usage", text="", icon='INFO')
            
            # Show usage-based pricing status if enabled (only for authenticated users)
            if ai_client.is_authenticated() and ai_client.auth_data.get('usage_based_pricing_enabled', False):
                usage_pricing_row = box.row()
                
                # Check if we're over the limit (only if we have server data)
                if server_usage:
                    current_usage = server_usage.get('queryCount', 0)
                    limit = server_usage.get('dailyLimit', 20)
                    
                    if isinstance(limit, int) and current_usage >= limit:
                        usage_pricing_row.label(text="Using usage-based pricing", icon='FUND')
                    else:
                        usage_pricing_row.label(text="Usage-based pricing enabled", icon='CHECKMARK')
                else:
                    usage_pricing_row.label(text="Usage-based pricing enabled", icon='CHECKMARK')
            
            # Debug info 
            if scene.get("gizmo_show_debug", False):
                debug_box = box.box()
                debug_box.label(text="Debug Info:")
                debug_box.label(text=f"Session ID: {ai_client.session_id}")
                debug_box.label(text=f"Tier: {subscription_tier}")
                if hasattr(ai_client, 'last_server_usage') and ai_client.last_server_usage:
                    debug_box.label(text=f"Server data: {ai_client.last_server_usage}")
                if 'authenticated_at' in ai_client.auth_data:
                    auth_time = datetime.datetime.fromisoformat(ai_client.auth_data['authenticated_at'])
                    debug_box.label(text=f"Auth time: {auth_time.strftime('%H:%M:%S')}")
                if 'expires_at' in ai_client.auth_data:
                    exp_time = datetime.datetime.fromisoformat(ai_client.auth_data['expires_at'])
                    debug_box.label(text=f"Expires: {exp_time.strftime('%H:%M:%S')}")
        else:
            # Check if auth is in progress
            if ai_client.auth_check_in_progress:
                row = box.row()
                row.label(text="Authentication in progress...", icon='SORTTIME')
            else:
                # Login prompt
                row = box.row()
                row.label(text="Free Tier", icon='SOLO_OFF')
                row.operator("gizmo.login", text="Sign In", icon='KEYFRAME')
                row.operator("gizmo.check_usage", text="", icon='INFO')
                
                box.label(text=f"Limited to {FREE_TIER_LIMITS['daily_queries']} queries/day")
        
        # Model selection dropdown
        model_box = layout.box()
        model_box.label(text="Model Selection:")
        model_box.prop(scene, "gizmo_selected_model", text="")
        
        # Direct input field and submission
        layout.label(text="Ask Gizmo:")
        row = layout.row(align=True)
        row.prop(scene, "gizmo_input", text="")
        row.operator("gizmo.process_input", text="", icon='PLAY')
        
        # Clear history button
        layout.operator("gizmo.clear_history", text="Clear History", icon='TRASH')
        
        # Result box
        if hasattr(scene, "gizmo_ai_result") and scene.gizmo_ai_result:
            box = layout.box()
            box.label(text="AI Response:")
            
            if hasattr(scene, "gizmo_ai_type"):
                if scene.gizmo_ai_type == "pending":
                    # Show loading indicator
                    box.label(text="Processing request...", icon='SORTTIME')
                elif scene.gizmo_ai_type == "code":
                    box.label(text="Code generated:")
                    box.operator("gizmo.execute_code", text="Run Code")
                else:
                    text = scene.gizmo_ai_result
                    # Split long text into multiple lines
                    if len(text) > 40:
                        lines = [text[i:i+40] for i in range(0, len(text), 40)]
                        for line in lines[:5]:  # Show only first 5 lines
                            box.label(text=line)
                        if len(lines) > 5:
                            box.label(text="...")
                    else:
                        box.label(text=text)


# Operator for executing code
class GIZMO_OT_execute_code(Operator):
    bl_idname = "gizmo.execute_code"
    bl_label = "Execute Code"
    bl_description = "Execute the generated code"
    
    def execute(self, context):
        if not hasattr(context.scene, "gizmo_ai_result") or not context.scene.gizmo_ai_result:
            self.report({'ERROR'}, "No code to execute")
            return {'CANCELLED'}
        
        # Get the code from the scene
        code_to_execute = context.scene.gizmo_ai_result
        
        # Create a one-time execution function that won't repeat
        def execute_once():
            global ai_client
            success = ai_client.execute_code(code_to_execute)
            
            if success:
                self.report({'INFO'}, "Code executed successfully")
            else:
                self.report({'ERROR'}, "Error executing code")
                
            return None  # Ensures timer won't repeat
        
        # Schedule execution on the main thread
        if hasattr(bpy, "app") and hasattr(bpy.app, "timers") and hasattr(bpy.app.timers, "register"):
            bpy.app.timers.register(execute_once, first_interval=0.1)
        else:
            # Fall back to direct execution if timers aren't available
            global ai_client
            success = ai_client.execute_code(code_to_execute)
            if success:
                self.report({'INFO'}, "Code executed successfully")
            else:
                self.report({'ERROR'}, "Error executing code")
        
        return {'FINISHED'}


# Operator for clearing chat history
class GIZMO_OT_clear_history(Operator):
    bl_idname = "gizmo.clear_history"
    bl_label = "Clear History"
    bl_description = "Clear chat history"
    
    def execute(self, context):
        global CHAT_HISTORY, ai_client
        CHAT_HISTORY.clear()
        ai_client.clear_memory()
        
        # Clear UI fields
        context.scene.gizmo_ai_result = ""
        context.scene.gizmo_ai_type = ""
        
        self.report({'INFO'}, "Chat history cleared")
        return {'FINISHED'}


# Authentication operators
class GIZMO_OT_login(Operator):
    bl_idname = "gizmo.login"
    bl_label = "Sign In"
    bl_description = "Sign in to access premium features"
    
    def execute(self, context):
        global ai_client
        auth_url = ai_client.get_auth_url()
        
        # Reset any previous auth check state
        ai_client.check_attempts = 0
        
        # Mark that we're starting a new auth check
        ai_client.auth_check_in_progress = True
        ai_client.last_auth_check_time = datetime.datetime.now()
        
        # Open browser to the login page with session ID
        webbrowser.open(auth_url)
        
        # Create a timer to poll for auth token from server
        if hasattr(bpy, "app") and hasattr(bpy.app, "timers") and hasattr(bpy.app.timers, "register"):
            bpy.app.timers.register(ai_client.check_auth_status, first_interval=2.0)
        else:
            # If timers aren't available, we can't do polling, so show a message
            self.report({'INFO'}, "Authentication initiated. Please check the web browser and restart Blender after signing in.")
        
        self.report({'INFO'}, "Opening browser for authentication...")
        return {'FINISHED'}


class GIZMO_OT_logout(Operator):
    bl_idname = "gizmo.logout"
    bl_label = "Sign Out"
    bl_description = "Sign out from your account"
    
    def execute(self, context):
        global ai_client
        ai_client.clear_auth_data()
        
        self.report({'INFO'}, "Signed out successfully")
        return {'FINISHED'}


class GIZMO_OT_check_usage(Operator):
    bl_idname = "gizmo.check_usage"
    bl_label = "Check Usage"
    bl_description = "Check your API usage and limits"
    
    def execute(self, context):
        global ai_client
        
        # Show a popup with usage info
        def draw_func(self, context):
            layout = self.layout
            
            if ai_client.is_authenticated():
                layout.label(text=f"Logged in as: {ai_client.auth_data.get('email', 'Unknown')}")
                subscription_tier = ai_client.auth_data.get('subscription_tier', 'free')
                tier_icon = 'FUND' if subscription_tier in ['business', 'developer'] else 'COLLECTION_COLOR_04' if subscription_tier == 'pro' else 'SOLO_OFF'
                layout.label(text=f"Account type: {subscription_tier.capitalize()}", icon=tier_icon)
                
                # Show server-provided usage if available
                server_usage = getattr(ai_client, 'last_server_usage', None)
                if server_usage:
                    layout.separator()
                    current_queries = server_usage.get('queryCount', 0)
                    daily_limit = server_usage.get('dailyLimit', 'Unknown')
                    
                    if daily_limit == "unlimited":
                        layout.label(text=f"Queries today: {current_queries} (Unlimited)")
                    else:
                        remaining = max(0, daily_limit - current_queries) if isinstance(daily_limit, int) else 0
                        layout.label(text=f"Queries used today: {current_queries}/{daily_limit}")
                        if isinstance(daily_limit, int):
                            layout.label(text=f"Remaining queries: {remaining}")
                    
                    # Show usage-based pricing status
                    usage_based_pricing_enabled = ai_client.auth_data.get('usage_based_pricing_enabled', False)
                    if usage_based_pricing_enabled:
                        if isinstance(daily_limit, int) and current_queries >= daily_limit:
                            layout.label(text="Usage-based pricing: Active", icon='FUND')
                            layout.label(text=f"You'll be charged for queries beyond {daily_limit}/day")
                        else:
                            layout.label(text="Usage-based pricing: Enabled", icon='CHECKMARK')
                    else:
                        layout.label(text="Usage-based pricing: Disabled", icon='X')
                else:
                    layout.separator()
                    layout.label(text="Usage data syncing...")
                    layout.label(text="Please make a query to see current usage")
                
            else:
                layout.label(text="Account type: Free", icon='SOLO_OFF')
                layout.operator(GIZMO_OT_login.bl_idname, text="Sign In for More Queries")
                
                layout.separator()
                limits = ai_client.get_current_limits()
                usage = ai_client.usage_data
                current_queries = usage.get('queries_today', 0)
                daily_limit = limits['daily_queries']
                remaining = max(0, daily_limit - current_queries)
                
                layout.label(text=f"Queries used today: {current_queries}/{daily_limit}")
                layout.label(text=f"Remaining queries: {remaining}")
        
        context.window_manager.popup_menu(draw_func, title="API Usage", icon='INFO')
        
        return {'FINISHED'}


# Custom input field operator with Enter key handling
class GIZMO_OT_input_field(Operator):
    bl_idname = "gizmo.input_field"
    bl_label = "Input Field"
    bl_description = "Input field with Enter key handling"
    
    input_text: StringProperty(
        name="Input",
        description="Enter your prompt here"
    )
    
    def execute(self, context):
        context.scene.gizmo_input = self.input_text
        bpy.ops.gizmo.process_input()
        return {'FINISHED'}
    
    def invoke(self, context, event):
        self.input_text = context.scene.gizmo_input
        return context.window_manager.invoke_props_dialog(self, width=400)
    
    def draw(self, context):
        layout = self.layout
        layout.prop(self, "input_text", text="")


def register():
    # Model choices for the dropdown
    model_items = [
        ('claude-3-5-sonnet-20240620', 'Claude 3.5 Sonnet', 'Claude 3.5 Sonnet model'),
        ('claude-3-7-sonnet-20240709', 'Claude 3.7 Sonnet', 'Claude 3.7 Sonnet model'),
        ('claude-3-opus-20240229', 'Claude 3 Opus', 'Claude 3 Opus model - most powerful'),
        ('claude-3-sonnet-20240229', 'Claude 3 Sonnet', 'Claude 3 Sonnet model - balanced'),
        ('claude-3-haiku-20240307', 'Claude 3 Haiku', 'Claude 3 Haiku model - fastest'),
        ('gpt-4o', 'GPT-4o', 'OpenAI GPT-4o model'),
        ('gpt-4-turbo', 'GPT-4 Turbo', 'OpenAI GPT-4 Turbo model'),
        ('gpt-3.5-turbo', 'GPT-3.5 Turbo', 'OpenAI GPT-3.5 Turbo model - fastest'),
        ('gemini-pro', 'Gemini Pro', 'Google Gemini Pro model')
    ]
    
    bpy.types.Scene.gizmo_selected_model = bpy.props.EnumProperty(
        name="AI Model",
        description="Select the AI model to use",
        items=model_items,
        default='claude-3-5-sonnet-20240620'
    )
    
    bpy.types.Scene.gizmo_input = StringProperty(
        name="Input",
        description="Enter your prompt here"
    )
    bpy.types.Scene.gizmo_ai_result = StringProperty(default="")
    bpy.types.Scene.gizmo_ai_type = StringProperty(default="")
    
    # Add debug flag
    bpy.types.Scene.gizmo_show_debug = bpy.props.BoolProperty(
        name="Show Debug Info",
        description="Show debugging information in the UI",
        default=False
    )
    
    bpy.utils.register_class(GIZMO_OT_process_input)
    bpy.utils.register_class(GIZMO_OT_execute_code)
    bpy.utils.register_class(GIZMO_OT_clear_history)
    bpy.utils.register_class(GIZMO_OT_input_field)
    bpy.utils.register_class(GIZMO_OT_login)
    bpy.utils.register_class(GIZMO_OT_logout)
    bpy.utils.register_class(GIZMO_OT_check_usage)
    bpy.utils.register_class(GIZMO_PT_ai_panel)
    
    # Start the periodic auth status check
    if hasattr(bpy, "app") and hasattr(bpy.app, "timers") and hasattr(bpy.app.timers, "register"):
        if not bpy.app.timers.is_registered(check_auth_status_periodic):
            bpy.app.timers.register(check_auth_status_periodic, persistent=True)
    else:
        print("Warning: Blender timers are not available. Authentication status checks will be disabled.")


def unregister():
    # Remove the timer if registered
    if hasattr(bpy, "app") and hasattr(bpy.app, "timers") and hasattr(bpy.app.timers, "is_registered"):
        if bpy.app.timers.is_registered(check_auth_status_periodic):
            bpy.app.timers.unregister(check_auth_status_periodic)
    
    bpy.utils.unregister_class(GIZMO_PT_ai_panel)
    bpy.utils.unregister_class(GIZMO_OT_execute_code)
    bpy.utils.unregister_class(GIZMO_OT_clear_history)
    bpy.utils.unregister_class(GIZMO_OT_input_field)
    bpy.utils.unregister_class(GIZMO_OT_process_input)
    bpy.utils.unregister_class(GIZMO_OT_login)
    bpy.utils.unregister_class(GIZMO_OT_logout)
    bpy.utils.unregister_class(GIZMO_OT_check_usage)
    
    del bpy.types.Scene.gizmo_input
    del bpy.types.Scene.gizmo_ai_result
    del bpy.types.Scene.gizmo_ai_type
    del bpy.types.Scene.gizmo_show_debug  # Remove debug flag


# Periodic authentication status check (runs every 15 seconds)
def check_auth_status_periodic():
    """Periodically check auth status and refresh UI if needed"""
    global ai_client
    
    try:
        # Skip if we're currently in the middle of a login flow
        if ai_client.auth_check_in_progress:
            return 15.0
            
        # If previously not authenticated but now we have auth data in the file
        need_refresh = False
        
        # Check if we should reload auth data from file
        if not ai_client.is_authenticated():
            old_auth_state = ai_client.is_authenticated()
            # Try to load auth data
            ai_client.load_auth_data()
            
            # If auth state changed, we need to refresh
            if old_auth_state != ai_client.is_authenticated():
                need_refresh = True
                print("Auth status changed from file, refreshing UI")
        
        # Also check if authenticated but token is expired
        elif ai_client.is_authenticated():
            # Check if token is expired
            if 'expires_at' in ai_client.auth_data:
                expires_at = datetime.datetime.fromisoformat(ai_client.auth_data['expires_at'])
                if datetime.datetime.now() > expires_at:
                    print("Auth token expired, clearing data")
                    ai_client.auth_data = None
                    need_refresh = True
            
            # If user logged in through a different Blender instance, refresh the token
            elif ai_client.last_auth_check_time is None or \
                 (datetime.datetime.now() - ai_client.last_auth_check_time).total_seconds() > 300:  # Every 5 minutes
                try:
                    # Get the token auth state from server
                    if ai_client.auth_data and 'token' in ai_client.auth_data:
                        # Optional: Verify token with server
                        pass
                except Exception as e:
                    print(f"Error checking token with server: {e}")
                
                ai_client.last_auth_check_time = datetime.datetime.now()
        
        # If auth status changed, refresh UI
        if need_refresh:
            # Force UI redraw in ALL areas
            for window in bpy.context.window_manager.windows:
                for area in window.screen.areas:
                    area.tag_redraw()
    
    except Exception as e:
        print(f"Error in periodic auth check: {e}")
    
    # Run again in 15 seconds (more frequent checks)
    return 15.0


if __name__ == "__main__":
    register() 