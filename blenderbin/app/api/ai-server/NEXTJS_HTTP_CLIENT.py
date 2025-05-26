###############################################################################
# Imports
###############################################################################

import bpy
import types
import sys
import subprocess
import urllib.request
import json
import os
import tempfile
import uuid
import platform
import hashlib
import threading
from datetime import datetime, date
from bpy.app.handlers import persistent
import string
import random
import socketserver
import http.server
from urllib.parse import urlencode
import webbrowser
import base64
from io import BytesIO
import struct
import hmac
import re 
import queue
import time
from datetime import datetime, timedelta
from collections import deque
from threading import Lock
import gzip
import urllib.error
from urllib.request import Request, urlopen
import ctypes
import mmap
import math
import bl_math
import bl_ui
import bmesh
import mathutils
import gpu
import bgl
import traceback
from ctypes.util import find_library
import signal


###############################################################################
# ptrace debugger checker, and other integrity checks
###############################################################################

class CrossPlatformDebugProtection:
    """Cross-platform anti-debugging protection"""
    
    def __init__(self):
        self.platform = platform.system().lower()
        self.protected = False
        
    def setup_linux_protection(self):
        """Linux-specific protection using ptrace"""
        try:
            libc = ctypes.CDLL(find_library('c'), use_errno=True)
            
            # Constants for ptrace
            PTRACE_TRACEME = 0
            
            def ptrace(request, pid, addr, data):
                return libc.ptrace(request, pid, addr, data)
                
            # Try to detect if being traced
            if ptrace(PTRACE_TRACEME, 0, 0, 0) < 0:
                return False
                
            def handle_interrupt(signum, frame):
                sys.exit(1)
                
            signal.signal(signal.SIGTRAP, handle_interrupt)
            signal.signal(signal.SIGINT, handle_interrupt)
            
            return True
            
        except Exception:
            return False
            
    def setup_windows_protection(self):
        """Windows-specific protection"""
        try:
            # Load Windows API
            kernel32 = ctypes.windll.kernel32
            
            # Constants
            PROCESS_ALL_ACCESS = 0x1F0FFF
            
            def check_debugger():
                is_debugged = ctypes.c_bool()
                kernel32.IsDebuggerPresent(ctypes.byref(is_debugged))
                return is_debugged.value
                
            def prevent_debug_attach():
                # Get current process handle
                h_process = kernel32.GetCurrentProcess()
                
                # Set process debugging flag
                kernel32.SetHandleInformation(
                    h_process,
                    0x2,  # HANDLE_FLAG_PROTECT_FROM_CLOSE
                    0x1   # HANDLE_FLAG_INHERIT
                )
                
            if not check_debugger():
                prevent_debug_attach()
                return True
                
            return False
            
        except Exception:
            return False
            
    def setup_macos_protection(self):
        """macOS-specific protection"""
        try:
            # Load macOS system library
            libc = ctypes.CDLL(find_library('c'))
            
            # Constants
            PT_DENY_ATTACH = 31
            
            # Prevent debugger attachment
            result = libc.ptrace(PT_DENY_ATTACH, 0, 0, 0)
            
            def check_debugger():
                # Check for common debugger environment variables
                debug_vars = ['DYLD_INSERT_LIBRARIES', 'DYLD_FORCE_FLAT_NAMESPACE']
                return any(var in os.environ for var in debug_vars)
                
            return result == 0 and not check_debugger()
            
        except Exception:
            return False
            
    def protect_memory_region(self, addr, size):
        """Cross-platform memory protection"""
        try:
            if self.platform == 'linux':
                libc = ctypes.CDLL(None)
                PROT_READ = 0x1
                return libc.mprotect(addr, size, PROT_READ) == 0
                
            elif self.platform == 'windows':
                kernel32 = ctypes.windll.kernel32
                PAGE_READONLY = 0x02
                old_protect = ctypes.c_ulong(0)
                return kernel32.VirtualProtect(
                    addr, size, PAGE_READONLY, ctypes.byref(old_protect)
                )
                
            elif self.platform == 'darwin':  # macOS
                libc = ctypes.CDLL(find_library('c'))
                PROT_READ = 0x01
                return libc.mprotect(addr, size, PROT_READ) == 0
                
        except Exception:
            return False
            
        return False
        
    def verify_process_integrity(self):
        """Cross-platform process integrity verification"""
        try:
            if self.platform == 'linux':
                return self._verify_linux_integrity()
            elif self.platform == 'windows':
                return self._verify_windows_integrity()
            elif self.platform == 'darwin':
                return self._verify_macos_integrity()
                
        except Exception:
            return False
            
        return False
        
    def _verify_linux_integrity(self):
        """Linux-specific integrity checks"""
        try:
            # Check process maps
            with open('/proc/self/maps', 'r') as f:
                maps = f.read()
                if '[vdso]' not in maps:
                    return False
                    
            # Check process status
            with open('/proc/self/status', 'r') as f:
                status = f.read()
                if 'TracerPid:\t0' not in status:
                    return False
                    
            return True
            
        except Exception:
            return False
            
    def _verify_windows_integrity(self):
        """Windows-specific integrity checks"""
        try:
            kernel32 = ctypes.windll.kernel32
            
            # Check process DEP status
            dep_enabled = ctypes.c_bool()
            permanent = ctypes.c_bool()
            
            if not kernel32.GetProcessDEPPolicy(
                kernel32.GetCurrentProcess(),
                ctypes.byref(dep_enabled),
                ctypes.byref(permanent)
            ):
                return False
                
            # Additional Windows-specific checks can be added here
            
            return True
            
        except Exception:
            return False
            
    def _verify_macos_integrity(self):
        """macOS-specific integrity checks"""
        try:
            # Check for common debugging tools
            suspicious_processes = ['lldb', 'gdb', 'ida', 'hopper']
            
            # Use ps command to check running processes
            import subprocess
            ps = subprocess.Popen(['ps', 'ax'], stdout=subprocess.PIPE)
            output = ps.stdout.read().decode()
            
            if any(proc in output.lower() for proc in suspicious_processes):
                return False
                
            # Check for suspicious environment variables
            suspicious_vars = ['DYLD_INSERT_LIBRARIES', 'DYLD_FORCE_FLAT_NAMESPACE']
            if any(var in os.environ for var in suspicious_vars):
                return False
                
            return True
            
        except Exception:
            return False
            
    def start_protection(self):
        """Initialize protection based on platform"""
        if self.platform == 'linux':
            self.protected = self.setup_linux_protection()
        elif self.platform == 'windows':
            self.protected = self.setup_windows_protection()
        elif self.platform == 'darwin':
            self.protected = self.setup_macos_protection()
            
        # Start monitoring thread if protection was successful
        if self.protected:
            self._start_monitoring()
            
        return self.protected
        
    def _start_monitoring(self):
        """Start background monitoring thread"""
        def monitor():
            while True:
                if not self.verify_process_integrity():
                    sys.exit(1)
                time.sleep(1)
                
        thread = threading.Thread(target=monitor, daemon=True)
        thread.start()

def initialize_security():
    """Initialize all security measures"""
    protection = CrossPlatformDebugProtection()
    return protection.start_protection()

class SecureMemory:
    """Secure memory handling with protection against dumps"""
    def __init__(self):
        self.size = 4096

        # Use different mmap parameters based on platform
        if sys.platform.startswith('win'):
            # On Windows, use 'access' instead of MAP_PRIVATE/MAP_ANONYMOUS
            self.buffer = mmap.mmap(-1, self.size, access=mmap.ACCESS_WRITE)
        else:
            # On Linux/macOS:
            self.buffer = mmap.mmap(
                -1,
                self.size,
                mmap.MAP_PRIVATE | mmap.MAP_ANONYMOUS,
                mmap.PROT_READ | mmap.PROT_WRITE
            )
        
    def __enter__(self):
        if sys.platform.startswith('linux'):
            try:
                libc = ctypes.CDLL(None)
                MCL_CURRENT = 1
                MCL_FUTURE = 2
                libc.mlockall(MCL_CURRENT | MCL_FUTURE)
            except Exception as e:
                print(f"Memory locking failed: {e}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.secure_clear()

    def secure_write(self, data):
        self.buffer.write(data)

    def secure_read(self):
        self.buffer.seek(0)
        return self.buffer.read()

    def secure_clear(self):
        self.buffer.seek(0)
        self.buffer.write(b'\x00' * self.size)
        self.buffer.close()

class MemoryProtection:
    """Memory region protection"""
    def __init__(self):
        self.protected_regions = []
        
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.clear_protected_regions()
        
    def protect_region(self, addr, size):
        if sys.platform.startswith('linux'):
            try:
                libc = ctypes.CDLL(None)
                PROT_READ = 0x1
                libc.mprotect(addr, size, PROT_READ)
                self.protected_regions.append((addr, size))
            except Exception as e:
                print(f"Memory protection failed: {e}")
                
    def clear_protected_regions(self):
        if sys.platform.startswith('linux'):
            try:
                libc = ctypes.CDLL(None)
                PROT_READ = 0x1
                PROT_WRITE = 0x2
                for addr, size in self.protected_regions:
                    libc.mprotect(addr, size, PROT_READ | PROT_WRITE)
                    ctypes.memset(addr, 0, size)
            except Exception as e:
                print(f"Error clearing protected regions: {e}")

class ScriptExecutionContext:
    """Secure script execution environment with module namespace handling"""
    def __init__(self):
        # We track our own namespace if needed, not strictly required here
        self.namespace = {}
        # Names we want to restrict in builtins:
        self.restricted_names = {'eval', 'exec', 'compile'}

    def create_safe_dict(self, module_dict):
        """Create a secure execution environment that preserves module namespace."""
        # -- Fix: detect if __builtins__ is a dict or a module
        builtins_obj = __builtins__
        if not isinstance(builtins_obj, dict):
            # If it's a module, get its dict
            builtins_obj = builtins_obj.__dict__

        # Build our 'safe_dict', filtering out restricted builtins
        safe_dict = {
            '__builtins__': {
                name: obj for name, obj in builtins_obj.items()
                if name not in self.restricted_names
            },
            '__name__': module_dict.get('__name__', '__main__'),
            '__file__': module_dict.get('__file__', ''),
            '__package__': module_dict.get('__package__', None),

            # Example references to Blender or other modules (adapt as needed):
            'bpy': bpy,
            'bmesh': bmesh,
            'mathutils': mathutils,
            'bgl': bgl,
            'gpu': gpu,
            'bl_math': bl_math,
            'bl_ui': bl_ui,

            # Standard dependencies:
            'os': os,
            'sys': sys,
            'math': math,
            'random': random,
            'time': time,
            'json': json,
            'tempfile': tempfile,
            'hashlib': hashlib,
            'base64': base64,
            'gzip': gzip,
            'struct': struct,
            'hmac': hmac,

            # Blender handler decorator:
            'persistent': persistent,

            # Any loaders/utilities you inject:
            'script_loader': script_loader,
            'blend_loader': blend_loader,
            'call_ec2': call_ec2,
            'S3_BUCKET_NAME': S3_BUCKET_NAME,
            'load_script_info': load_script_info,
            'load_cached_image': load_cached_image,
            'download_and_execute_script': download_and_execute_script,
            'unload_script': unload_script,
            'refresh_ui': refresh_ui,
        }

        # Update the safe_dict with anything already in module_dict
        safe_dict.update(module_dict)
        return safe_dict

    def execute_script(self, script_content, module_dict):
        """Execute script in secure environment while preserving module namespace."""
        try:
            # Build our restricted globals
            restricted_globals = self.create_safe_dict(module_dict)

            # Actually execute the script
            # Add a check to make sure all parentheses are balanced
            if script_content.count('(') != script_content.count(')'):
                print(f"Syntax warning: Unbalanced parentheses in script")
                # Try to balance the parentheses by adding missing closing parentheses
                script_content = script_content + ')' * (script_content.count('(') - script_content.count(')'))
            
            exec(script_content, restricted_globals)

            # Update the original module_dict with new definitions from execution
            module_dict.clear()
            module_dict.update(restricted_globals)

            return True
        except Exception as e:
            print(f"Secure script execution error: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def verify_security(self, module_dict):
        """Verify no restricted operations are present in the final module."""
        for restricted in self.restricted_names:
            if restricted in module_dict:
                print(f"Warning: Restricted operation '{restricted}' found in module")
                del module_dict[restricted]


def verify_script_integrity(script_content, signature=None):
    """Verify script integrity"""
    if signature is None:
        return False
    try:
        h = hmac.new(API_KEY.encode(), script_content.encode(), hashlib.sha256)
        return hmac.compare_digest(h.hexdigest(), signature)
    except Exception:
        return False

def check_runtime_environment():
    """Verify runtime environment safety"""
    try:

        if not initialize_security():
            print("Security initialization failed")
            sys.exit(1)
            
        # Check for debugger
        if sys.gettrace() is not None:
            return False
            
        # Check for virtualization on Linux
        if sys.platform.startswith('linux'):
            try:
                with open('/proc/cpuinfo', 'r') as f:
                    if 'hypervisor' in f.read():
                        return False
            except:
                pass
                    
        return True
    except:
        return False

###############################################################################
# b1 info
###############################################################################

bl_info = {
    "name": "BlenderBin Main Hub File",
    "blender": (2, 80, 0),
    "category": "Object",
    "version": (1, 0, 0),
    "author": "BlenderBin",
    "location": "View3D > Tool Shelf > BlenderBin",
    "description": "Lists and runs addons from BlenderBin S3 bucket",
    "warning": "",
    "doc_url": "",
    "tracker_url": "",
    "support": "COMMUNITY",
}

###############################################################################
# Constants
###############################################################################

# Image URL and local path for download
IMAGE_URL = "https://blenderbin.s3.us-east-2.amazonaws.com/BACKEND/ADDON_REFERENCES/ADDON_ICONS/blenderbin+plugin+logo.png"
IMAGE_NAME = "blenderbin.png"
MAIN_IMAGE_PATH = os.path.join(bpy.app.tempdir, IMAGE_NAME)

BIG_IMAGE_URL = "https://blenderbin.s3.us-east-2.amazonaws.com/BACKEND/ADDON_REFERENCES/ADDON_ICONS/blenderbinbiglogo.png"
BIG_IMAGE_NAME = "bigblenderbin.png"
BIG_MAIN_IMAGE_PATH = os.path.join(bpy.app.tempdir, BIG_IMAGE_NAME)

EC2_SERVER_URL = "http://localhost:3000/api/server/http"
API_KEY = "KnC+93IAFHKw4xKV9q9XapGhWTyWMHTRFTi8fRQJ9c4="

# Session-based authentication URLs
AUTH_URL = "http://localhost:3000/signup"  # Authentication endpoint

S3_BUCKET_NAME = "blenderbin"

FAVORITES_FILE = os.path.join(tempfile.gettempdir(), "blenderbin_favorites.json")
PREFERENCES_FILE = os.path.join(tempfile.gettempdir(), "blenderbin_preferences.json")
AUTH_INFO_FILE = os.path.join(tempfile.gettempdir(), "blenderbin_auth.json")

###############################################################################
# Globals; cache to avoid repeated EC2 calls & downloads in load_script_info
###############################################################################

_load_script_info_cache = {}  # Maps script_path -> icon_path (or 'SCRIPT' if none)
addon_unlocked = False
has_subscription = False  # Track user subscription status
registered_classes = []
script_icons = {}
loaded_modules = {}
image_cache = {}
loaded_addon_panels = []
loaded_script_paths = set()

last_click_dates = {}
device_id = None
total_clicks = 0

is_initialized = False
initialization_attempted = False

icon_load_attempts = {}
icon_cache = {}
MAX_ICON_LOAD_ATTEMPTS = 3
ICON_RETRY_DELAY = 1.0

is_reloading = False

blend_loader = None

api_response_queue = queue.Queue()
script_loader = None

firebase_token = None  # Store the Firebase token in memory
_script_version_checks = {}  # Maps script_path -> version_hash
version_check_lock = threading.Lock()

# Session-based authentication globals
session_id = None
auth_check_in_progress = False
check_attempts = 0
last_auth_check_time = None

###############################################################################
# EC2 calls
###############################################################################

def call_ec2(endpoint, method='GET', data=None, max_retries=3, timeout=30, use_threading=True):
    """
    Make API calls to EC2 server with improved threading and nesting protection
    
    Args:
        endpoint (str): API endpoint to call
        method (str): HTTP method to use ('GET' or 'POST')
        data (dict): Data to send with the request
        max_retries (int): Maximum number of retry attempts
        timeout (int): Timeout for the request in seconds
        use_threading (bool): Whether to use threading for the request
        
    Returns:
        dict: Response data or None if the request failed
    """
    import time
    global firebase_token
    
    # Check if we're already in a thread to prevent nesting
    is_in_thread = threading.current_thread() != threading.main_thread()
    
    def make_direct_api_call():
        """Make the API call directly without threading"""
        for attempt in range(max_retries):
            try:
                url = f"{EC2_SERVER_URL}/{endpoint}"
                headers = {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY.strip()
                }
                
                if firebase_token:
                    headers['Firebase-Token'] = firebase_token.strip()
                    
                # Use less verbose logging in production
                if endpoint != 'unified_auth':  # Don't log auth calls as they contain sensitive info
                    print(f"API call: {method} {endpoint}")
                
                if data:
                    encoded_data = json.dumps(data).encode('utf-8') if data else None
                    req = urllib.request.Request(
                        url,
                        data=encoded_data,
                        headers=headers,
                        method='POST'
                    )
                else:
                    req = urllib.request.Request(
                        url,
                        headers=headers,
                        method='GET'
                    )

                with urllib.request.urlopen(req, timeout=10) as response:
                    response_data = response.read().decode('utf-8')
                    parsed_response = json.loads(response_data)
                    
                    # Handle token errors
                    if parsed_response.get('message') == 'Invalid Firebase token':
                        if "Token used too early" in str(parsed_response):
                            print("Token timing issue detected, waiting before retry...")
                            time.sleep(2)
                            continue
                    
                    return parsed_response

            except urllib.error.HTTPError as e:
                if e.code == 401:
                    error_body = e.read().decode('utf-8')
                    if "Token used too early" in error_body:
                        print("Token timing issue detected in error, waiting...")
                        time.sleep(2)
                        if attempt < max_retries - 1:
                            continue
                    
                    if "Invalid Firebase token" in error_body:
                        print("Firebase token invalid or expired")
                        if attempt < max_retries - 1:
                            if refresh_firebase_token():
                                continue
                    print(f"Authentication failed (attempt {attempt + 1})")
                    return None
                    
                elif attempt == max_retries - 1:
                    print(f"HTTP Error after {max_retries} attempts: {e.code} - {e.reason}")
                    return None
                    
            except Exception as e:
                print(f"API call error: {str(e)}")
                if attempt == max_retries - 1:
                    return None
                
            if attempt < max_retries - 1:
                sleep_time = 2 ** attempt
                print(f"Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)
        
        return None
    
    # If already in a thread or threading is disabled, make direct call
    if is_in_thread or not use_threading:
        return make_direct_api_call()
    
    # If in main thread and threading is enabled, use threading
    response_queue = queue.Queue()
    
    def make_threaded_api_call():
        result = make_direct_api_call()
        response_queue.put(result)
    
    # Start API call in background thread
    api_thread = threading.Thread(target=make_threaded_api_call)
    api_thread.daemon = True
    api_thread.start()
    
    try:
        # Wait for response with timeout
        return response_queue.get(timeout=timeout)
    except queue.Empty:
        print(f"API call to {endpoint} timed out after {timeout} seconds")
        return None
    except Exception as e:
        print(f"Error in threaded API call: {str(e)}")
        return None

###############################################################################
# Functions for checks
###############################################################################

def check_script_versions():
    """Check for script updates in the background"""
    global _script_version_checks
    
    def do_check():
        while True:
            try:
                with version_check_lock:
                    # Get all cached script paths
                    cache_dir = os.path.join(tempfile.gettempdir(), 'blenderbin_scripts_cache')
                    cache_file = os.path.join(cache_dir, "script_cache.json")
                    
                    if not os.path.exists(cache_file):
                        time.sleep(300)  # Sleep 5 minutes if no cache
                        continue
                        
                    try:
                        with open(cache_file, 'r') as f:
                            cache_data = json.load(f)
                    except Exception as e:
                        print(f"Error reading cache file: {str(e)}")
                        time.sleep(300)
                        continue
                        
                    for script_path, script_data in cache_data.items():
                        current_hash = script_data.get('version_hash')
                        
                        # Check with server
                        response = call_ec2('download_script', method='POST', data={
                            'bucket': S3_BUCKET_NAME,
                            'key': script_path,
                            'device_id': device_id,
                            'current_hash': current_hash
                        })
                        
                        if response and response.get('status') == 'success':
                            if not response.get('unchanged', False):
                                # Got new version
                                print(f"New version available for {script_path}")
                                
                                # Cache the new version
                                cache_script_content(script_path)
                                
                                # Update version hash
                                _script_version_checks[script_path] = response.get('version_hash')
                        
                        # Sleep briefly between checks to avoid hammering server
                        time.sleep(1)
                        
                # Sleep 5 minutes before next full check
                time.sleep(300)
                
            except Exception as e:
                print(f"Error in version check thread: {str(e)}")
                time.sleep(300)  # Sleep on error
                
    # Start the check thread
    check_thread = threading.Thread(target=do_check, daemon=True)
    check_thread.start()

def ensure_icons_loaded(context):
    """Ensure all script icons are properly loaded"""
    global icon_load_attempts, icon_cache
    
    def retry_icon_load():
        """Timer callback for retrying icon loads"""
        scripts_to_retry = []
        
        # Check Premium scripts
        if hasattr(context.scene, "blenderbin_scripts"):
            scripts_to_retry.extend([
                script for script in context.scene.blenderbin_scripts
                if script.path in icon_load_attempts and 
                icon_load_attempts[script.path] < MAX_ICON_LOAD_ATTEMPTS
            ])
            
        # Check Free scripts
        if hasattr(context.scene, "blenderbin_free_scripts"):
            scripts_to_retry.extend([
                script for script in context.scene.blenderbin_free_scripts
                if script.path in icon_load_attempts and 
                icon_load_attempts[script.path] < MAX_ICON_LOAD_ATTEMPTS
            ])
        
        if not scripts_to_retry:
            return None  # Stop timer
            
        for script in scripts_to_retry:
            if script.icon == 'SCRIPT' or not bpy.data.images.get(script.icon):
                icon_path = load_script_info(script.path)
                if os.path.isfile(icon_path):
                    script.icon = load_cached_image(icon_path)
                    icon_load_attempts[script.path] += 1
                    print(f"Retry {icon_load_attempts[script.path]}: Loaded icon for {script.path}")
                else:
                    print(f"Icon file not found for {script.path}")
        
        return ICON_RETRY_DELAY if any(
            attempts < MAX_ICON_LOAD_ATTEMPTS 
            for attempts in icon_load_attempts.values()
        ) else None
    
    bpy.app.timers.register(retry_icon_load, first_interval=ICON_RETRY_DELAY)

def ensure_script_icon_downloaded(icon_url, icon_name):
    """Check if the script icon exists in temp directory, if not, download it."""
    icon_temp_path = os.path.join(tempfile.gettempdir(), icon_name)

    if not os.path.exists(icon_temp_path):
        print(f"Icon {icon_name} not found in temp directory, downloading...")
        if download_image(icon_url, icon_temp_path):
            print(f"Icon {icon_name} downloaded successfully.")
        else:
            print(f"Failed to download icon {icon_name}.")
            return None
    else:
        print(f"Icon {icon_name} found in temp directory: {icon_temp_path}")

    return icon_temp_path

def ensure_classes_registered():
    global registered_classes
    if BLENDERBIN_PT_Panel not in registered_classes:
        bpy.utils.register_class(BLENDERBIN_PT_Panel)
        registered_classes.append(BLENDERBIN_PT_Panel)

###############################################################################
# Functions for credentials and authentication
###############################################################################

def refresh_firebase_token():
    """
    Try to refresh the Firebase token using unified_auth endpoint.
    Only called when server returns a 401 unauthorized response.
    Returns True if successful.
    """
    global firebase_token, device_id
    try:
        # Try to get saved auth info
        email, password, old_token = get_auth_info()
        if not email or not password:  # We need both for unified_auth
            print("No saved credentials found for token refresh")
            return False
            
        # Use unified_auth to get a fresh token
        auth_response = call_ec2('unified_auth', method='POST', data={
            'email': email,
            'password': password,
            'device_id': device_id
        })
        
        if auth_response and auth_response.get('status') == 'success':
            new_token = auth_response.get('firebase_token')
            if new_token:
                # Update both memory and storage
                firebase_token = new_token
                save_auth_info(email, password, new_token)
                print("Successfully refreshed Firebase token")
                return True
                
        return False
        
    except Exception as e:
        print(f"Error refreshing token: {str(e)}")
        return False

def save_auth_info(email, password, token):
    """Save authentication information securely"""
    auth_data = {
        'email': email,
        'password': password,
        'token': token,
        'timestamp': time.time()
    }
    try:
        with open(AUTH_INFO_FILE, 'w') as f:
            json.dump(auth_data, f)
    except Exception as e:
        print(f"Error saving auth info: {str(e)}")

def get_auth_info():
    """Get saved authentication information"""
    try:
        if os.path.exists(AUTH_INFO_FILE):
            with open(AUTH_INFO_FILE, 'r') as f:
                auth_data = json.load(f)
                return auth_data.get('email'), auth_data.get('password'), auth_data.get('token')
    except Exception as e:
        print(f"Error reading auth info: {str(e)}")
    return None, None, None

def clear_auth_info():
    """Clear saved authentication information"""
    try:
        if os.path.exists(AUTH_INFO_FILE):
            os.remove(AUTH_INFO_FILE)
    except Exception as e:
        print(f"Error clearing auth info: {str(e)}")

def save_credentials(email, password):
    """Save credentials and token in a single file"""
    global firebase_token
    auth_data = {
        "email": email,
        "password": password,
        "token": firebase_token,
        "timestamp": time.time()
    }
    with open(AUTH_INFO_FILE, 'w') as f:
        json.dump(auth_data, f)

def get_credentials():
    """Get saved credentials and token"""
    if os.path.exists(AUTH_INFO_FILE):
        with open(AUTH_INFO_FILE, 'r') as f:
            auth_data = json.load(f)
            return auth_data.get('email'), auth_data.get('password'), auth_data.get('token')
    return None, None, None

def delete_credentials():
    """Delete saved credentials"""
    if os.path.exists(AUTH_INFO_FILE):
        os.remove(AUTH_INFO_FILE)

def get_device_id():
    machine_id = uuid.getnode()
    system_info = platform.system() + platform.version() + platform.machine()
    device_id = hashlib.sha256(f"{machine_id}{system_info}".encode()).hexdigest()
    return device_id


def perform_auto_login():
    """
    Session-based authentication requires browser interaction, so auto-login is not supported.
    This function is kept for compatibility but does not perform automatic login.
    """
    print("Session-based authentication requires manual browser interaction.")
    print("Please use the 'Sign In' button to authenticate.")
    return None
    


###############################################################################
# Session-based authentication methods
###############################################################################

def get_session_id():
    """Get or create a unique session ID for authentication flow"""
    global session_id
    if session_id is None:
        session_id = str(uuid.uuid4())[:8]
    return session_id

def get_auth_url():
    """Get the authentication URL with session ID"""
    session = get_session_id()
    return f"{AUTH_URL}?session_id={session}"

def get_auth_callback_url():
    """Get the authentication callback URL based on the current AUTH_URL domain"""
    session = get_session_id()
    
    # Extract the domain and protocol from AUTH_URL
    if "localhost" in AUTH_URL:
        return f"http://localhost:3000/api/auth/callback?session_id={session}"
    else:
        # Extract domain from AUTH_URL
        from urllib.parse import urlparse
        parsed_url = urlparse(AUTH_URL)
        domain = f"{parsed_url.scheme}://{parsed_url.netloc}"
        return f"{domain}/api/auth/callback?session_id={session}"

def set_auth_token(token, user_info):
    """Set the authentication token and user info"""
    global firebase_token, addon_unlocked, has_subscription
    
    # Calculate expiration time (1 hour from now)
    expires_at = (datetime.now() + timedelta(hours=1)).isoformat()
    
    # Determine subscription tier
    subscription_tier = user_info.get("subscription_tier", "pro")
    has_subscription = user_info.get("has_subscription", False)
    
    # Debug logging for subscription status
    print(f"DEBUG: set_auth_token - has_subscription set to: {has_subscription}")
    print(f"DEBUG: set_auth_token - subscription_tier set to: {subscription_tier}")
    print(f"DEBUG: set_auth_token - user_info: {user_info}")
    
    # Get usage-based pricing setting
    usage_based_pricing_enabled = user_info.get("usage_based_pricing_enabled", False)
    
    # Set Firebase token
    firebase_token = token
    addon_unlocked = True
    
    # Update UI properties if context is available
    try:
        context = bpy.context
        if context and hasattr(context.scene, 'blenderbin_auth'):
            context.scene.blenderbin_auth.has_subscription = has_subscription
            print(f"DEBUG: set_auth_token - Updated UI has_subscription to: {has_subscription}")
    except Exception as e:
        print(f"DEBUG: set_auth_token - Could not update UI property: {e}")
    
    # Create auth data for storage
    auth_data = {
        "token": token,
        "email": user_info.get("email", "Unknown"),
        "user_id": user_info.get("uid", ""),
        "subscription_tier": subscription_tier,
        "usage_based_pricing_enabled": usage_based_pricing_enabled,
        "expires_at": expires_at,
        "authenticated_at": datetime.now().isoformat(),
        "session_id": get_session_id()
    }
    
    # Save auth info
    save_auth_info(user_info.get("email", ""), "", token)
    
    # Force refresh UI after authentication
    try:
        for window in bpy.context.window_manager.windows:
            for area in window.screen.areas:
                area.tag_redraw()
    except Exception as e:
        print(f"Error refreshing UI after authentication: {e}")

def check_auth_status():
    """Poll the server to check if authentication was completed"""
    global auth_check_in_progress, check_attempts, last_auth_check_time
    
    try:
        # Get the correct callback URL
        callback_url = get_auth_callback_url()
        
        print(f"Checking auth status at: {callback_url}")
        
        # Check auth status endpoint
        req = urllib.request.Request(callback_url, headers={'X-API-Key': API_KEY})
        
        with urllib.request.urlopen(req, timeout=5) as response:
            response_data = response.read().decode('utf-8')
            data = json.loads(response_data)
            print(f"Auth status response: {data}")
            
            if data.get("authenticated"):
                # User has authenticated, save the token
                token = data.get("token", "")
                user_info = data.get("user", {})
                
                # Debug logging for subscription status
                print(f"DEBUG: Auth response data: {data}")
                print(f"DEBUG: User info: {user_info}")
                print(f"DEBUG: has_subscription from server: {user_info.get('has_subscription', 'NOT_FOUND')}")
                print(f"DEBUG: subscription_tier from server: {user_info.get('subscription_tier', 'NOT_FOUND')}")
                
                if token:
                    set_auth_token(token, user_info)
                    
                    print(f"User authenticated: {user_info.get('email', 'Unknown')}")
                    
                    # Update UI properties
                    def update_ui():
                        try:
                            global has_subscription
                            context = bpy.context
                            props = context.scene.blenderbin_auth
                            
                            # Set both global variable and UI property
                            has_subscription = user_info.get("has_subscription", False)
                            props.has_subscription = has_subscription
                            
                            # Debug logging
                            print(f"DEBUG: update_ui - Global has_subscription: {has_subscription}")
                            print(f"DEBUG: update_ui - UI props.has_subscription: {props.has_subscription}")
                            print(f"DEBUG: update_ui - addon_unlocked: {addon_unlocked}")
                            
                            # Load user preferences and favorites
                            email = user_info.get("email", "")
                            if email:
                                use_subpanels = load_preferences_from_local(email)
                                props.use_subpanels = use_subpanels
                                
                                # Load saved favorites
                                free_favs, premium_favs = load_favorites_from_local(email)
                                if free_favs or premium_favs:
                                    print("Loading favorites from local JSON...")
                                    
                                    # Clear and repopulate favorites
                                    props.selected_free_scripts.clear()
                                    props.selected_premium_scripts.clear()
                                    context.scene.blenderbin_free_scripts.clear()
                                    context.scene.blenderbin_scripts.clear()
                                    
                                    # Re-populate free favorites
                                    for script in free_favs:
                                        item = props.selected_free_scripts.add()
                                        item.name = script.get('name', '')
                                        item.path = script.get('path', '')
                                        
                                        # Get icon
                                        icon_path = load_script_info(item.path)
                                        if os.path.isfile(icon_path):
                                            item.icon = load_cached_image(icon_path)
                                        else:
                                            item.icon = 'SCRIPT'
                                        
                                        # Mirror to panel collection
                                        panel_item = context.scene.blenderbin_free_scripts.add()
                                        panel_item.name = item.name
                                        panel_item.path = item.path
                                        panel_item.icon = item.icon
                                    
                                    # Re-populate premium favorites if user has subscription
                                    if props.has_subscription and premium_favs:
                                        for script in premium_favs:
                                            item = props.selected_premium_scripts.add()
                                            item.name = script.get('name', '')
                                            item.path = script.get('path', '')
                                            
                                            icon_path = load_script_info(item.path)
                                            if os.path.isfile(icon_path):
                                                item.icon = load_cached_image(icon_path)
                                            else:
                                                item.icon = 'SCRIPT'
                                            
                                            panel_item = context.scene.blenderbin_scripts.add()
                                            panel_item.name = item.name
                                            panel_item.path = item.path
                                            panel_item.icon = item.icon
                            
                            # Force UI refresh
                            for window in bpy.context.window_manager.windows:
                                for area in window.screen.areas:
                                    area.tag_redraw()
                                    
                        except Exception as e:
                            print(f"Error updating UI after authentication: {e}")
                        
                        return None
                    
                    # Use timer to update UI safely
                    bpy.app.timers.register(update_ui, first_interval=0.1)
                
                # Reset auth check state
                auth_check_in_progress = False
                check_attempts = 0
                
                # Don't check anymore
                return None
            else:
                # Authentication not yet completed
                print(f"Authentication not yet completed. Response: {data}")
                
                # If we've been checking for a while, show a message
                if check_attempts > 15:  # After about 30 seconds
                    def show_auth_timeout():
                        message = "Authentication timed out. Please try again."
                        print(message)
                        
                        # Force UI refresh
                        for window in bpy.context.window_manager.windows:
                            for area in window.screen.areas:
                                area.tag_redraw()
                    
                        return None
                    
                    bpy.app.timers.register(show_auth_timeout, first_interval=0.1)
                    
                    # Reset auth check state
                    auth_check_in_progress = False
                    check_attempts = 0
                    
                    return None
                    
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            print(f"Authentication error: Server returned {e.code}")
            
            def show_auth_error():
                message = "Server authentication error. Please try again later."
                print(message)
                
                # Force UI refresh
                for window in bpy.context.window_manager.windows:
                    for area in window.screen.areas:
                        area.tag_redraw()
                
                return None
            
            bpy.app.timers.register(show_auth_error, first_interval=0.1)
            
            # Reset auth check state
            auth_check_in_progress = False
            check_attempts = 0
            
            return None
    except Exception as e:
        print(f"Error checking auth status: {e}")
    
    # Keep checking every 2 seconds for 60 seconds (30 iterations)
    check_attempts += 1
    if check_attempts >= 30:
        print("Authentication timeout, stopping checks")
        
        def show_timeout_message():
            message = "Authentication timed out. Please try again."
            print(message)
            
            # Force UI refresh
            for window in bpy.context.window_manager.windows:
                for area in window.screen.areas:
                    area.tag_redraw()
            
            return None
        
        bpy.app.timers.register(show_timeout_message, first_interval=0.1)
        
        # Reset auth check state
        auth_check_in_progress = False
        check_attempts = 0
        
        return None
    
    return 2.0  # Check again in 2 seconds

def get_current_user_email():
    """Get the current user's email from saved auth info"""
    try:
        email, _, _ = get_auth_info()
        return email if email else None
    except Exception as e:
        print(f"Error getting current user email: {e}")
        return None

def debug_subscription_status():
    """Debug function to check current subscription status"""
    global has_subscription, addon_unlocked, firebase_token
    try:
        context = bpy.context
        props = context.scene.blenderbin_auth
        
        print("=== SUBSCRIPTION STATUS DEBUG ===")
        print(f"Global has_subscription: {has_subscription}")
        print(f"UI props.has_subscription: {props.has_subscription}")
        print(f"Global addon_unlocked: {addon_unlocked}")
        print(f"Firebase token exists: {firebase_token is not None}")
        
        # Check saved auth info
        email, _, token = get_auth_info()
        print(f"Saved auth email: {email}")
        print(f"Saved auth token exists: {token is not None}")
        print("=== END DEBUG ===")
    except Exception as e:
        print(f"Error in debug_subscription_status: {e}")

###############################################################################
# Removed automatic get_scripts_in_folder calls except in manual operators
###############################################################################

def get_scripts_in_folder(folder_path):
    """Get scripts in folder with threaded API call"""
    response_queue = queue.Queue()
    
    def make_api_call():
        try:
            response = call_ec2('get_scripts_in_folder', method='POST', data={
                'folder_path': folder_path
            })
            response_queue.put(response)
            if response and response.get('status') == 'success':
                print(f"Successfully fetched scripts for {folder_path}")
            else:
                print(f"Failed to get scripts: {response.get('message') if response else 'Unknown error'}")
        except Exception as e:
            print(f"Error in API call thread: {str(e)}")
            response_queue.put(None)
    
    # Start API call in separate thread
    api_thread = threading.Thread(target=make_api_call)
    api_thread.daemon = True  # Make thread daemon so it exits when main thread exits
    api_thread.start()
    
    try:
        # Wait for response with timeout
        response = response_queue.get(timeout=30)  # 30 second timeout
        
        if response and response.get('status') == 'success':
            scripts = response.get('scripts', [])
            print(f"Found {len(scripts)} scripts in {folder_path}")
            return scripts
        else:
            print(f"Failed to get scripts: {response.get('message') if response else 'Unknown error'}")
            return []
            
    except queue.Empty:
        print("API call timed out")
        return []
    except Exception as e:
        print(f"Error processing API response: {str(e)}")
        return []
    finally:
        # Clean up thread if still running
        if api_thread.is_alive():
            print("API thread still running, will exit when main thread exits")

def extract_blend_file_path(script_content):
    """Extract BLEND_FILE path from script content"""
    blend_match = re.search(r'BLEND_FILE\s*=\s*"(.*?)"', script_content)
    return blend_match.group(1) if blend_match else None

def get_last_version_check():
    """Get timestamp of last version check from local storage"""
    check_file = os.path.join(tempfile.gettempdir(), 'blenderbin_version_check.json')
    try:
        if os.path.exists(check_file):
            with open(check_file, 'r') as f:
                data = json.load(f)
                return data.get('last_check', 0)
    except Exception as e:
        print(f"Error reading version check file: {e}")
    return 0

def save_last_version_check(timestamp):
    """Save timestamp of last version check to local storage"""
    check_file = os.path.join(tempfile.gettempdir(), 'blenderbin_version_check.json')
    try:
        with open(check_file, 'w') as f:
            json.dump({'last_check': timestamp}, f)
    except Exception as e:
        print(f"Error saving version check timestamp: {e}")

def should_check_versions():
    """Determine if we should perform version check based on last check time"""
    last_check = get_last_version_check()
    now = time.time()
    
    # Convert timestamps to datetime objects
    last_check_dt = datetime.fromtimestamp(last_check)
    now_dt = datetime.fromtimestamp(now)
    
    # If it's been more than a week since last check
    if now - last_check > 7 * 24 * 60 * 60:
        # Check if it's Sunday
        if now_dt.weekday() == 6:  # 6 = Sunday
            return True
            
    return False

def check_script_versions():
    """Check for script updates in the background, but only on Sundays"""
    global _script_version_checks
    
    def do_check():
        while True:
            try:
                if should_check_versions():
                    print("Performing weekly version check...")
                    with version_check_lock:
                        # Get all cached script paths
                        cache_dir = os.path.join(tempfile.gettempdir(), 'blenderbin_scripts_cache')
                        cache_file = os.path.join(cache_dir, "script_cache.json")
                        
                        if not os.path.exists(cache_file):
                            time.sleep(300)  # Sleep 5 minutes if no cache
                            continue
                            
                        try:
                            with open(cache_file, 'r') as f:
                                cache_data = json.load(f)
                        except Exception as e:
                            print(f"Error reading cache file: {str(e)}")
                            time.sleep(300)
                            continue
                            
                        for script_path, script_data in cache_data.items():
                            current_hash = script_data.get('version_hash')
                            
                            # Check with server
                            response = call_ec2('download_script', method='POST', data={
                                'bucket': S3_BUCKET_NAME,
                                'key': script_path,
                                'device_id': device_id,
                                'current_hash': current_hash
                            })
                            
                            if response and response.get('status') == 'success':
                                if not response.get('unchanged', False):
                                    # Got new version
                                    print(f"New version available for {script_path}")
                                    
                                    # Cache the new version
                                    cache_script_content(script_path)
                                    
                                    # Update version hash
                                    _script_version_checks[script_path] = response.get('version_hash')
                            
                            # Sleep briefly between checks to avoid hammering server
                            time.sleep(1)
                            
                        # Save timestamp of successful check
                        save_last_version_check(time.time())
                        print("Weekly version check completed")
                        
                # Sleep 1 hour before checking again
                time.sleep(3600)
                
            except Exception as e:
                print(f"Error in version check thread: {str(e)}")
                time.sleep(3600)  # Sleep on error
                
    # Start the check thread
    check_thread = threading.Thread(target=do_check, daemon=True)
    check_thread.start()

def download_and_execute_script(script_path):
    """Enhanced script loading with comprehensive security, prioritizing cached content."""
    global loaded_modules, loaded_script_paths, script_loader, blend_loader, device_id

    if not check_runtime_environment():
        print("Unsafe runtime environment detected")
        return False

    # Initialize loaders securely
    if script_loader is None:
        script_loader = MemoryScriptLoader()
    if blend_loader is None:
        blend_loader = MemoryBlendLoader()
    
    try:
        if sys.platform.startswith('linux'):
            try:
                libc = ctypes.CDLL(None)
                MCL_CURRENT = 1
                MCL_FUTURE = 2
                libc.mlockall(MCL_CURRENT | MCL_FUTURE)
            except Exception as e:
                print(f"Memory locking failed: {e}")

        if device_id is None:
            device_id = get_device_id()
            
        with SecureMemory() as secure_mem:
            # Get cached content
            cached_response = get_cached_script_content(script_path)
            
            if cached_response:
                print(f"Using cached content for script: {script_path}")
                response = cached_response
            else:
                # No cache exists, must download
                print("No cached content found, downloading from server...")
                response = call_ec2('download_script', method='POST', data={
                    'bucket': S3_BUCKET_NAME,
                    'key': script_path,
                    'device_id': device_id
                })
                
                if response and response.get('status') == 'success':
                    cache_script_content(script_path)
                    if response.get('version_hash'):
                        with version_check_lock:
                            _script_version_checks[script_path] = response['version_hash']
            
            if not response or response.get('status') != 'success':
                print("Failed to get script content")
                return False
                
            script_name = os.path.splitext(os.path.basename(script_path))[0]
            
            # Load and decrypt script with memory protection
            with MemoryProtection() as mem_protection:
                if not script_loader.load_script(response):
                    return False
                    
                script_content = script_loader.get_loaded_script()
                if not script_content:
                    return False
                
                # Verify script integrity if signature provided
                signature = response.get('signature')
                if signature and not verify_script_integrity(script_content, signature):
                    print("Script integrity check failed")
                    return False

                # Split script into chunks and process separately
                script_chunks = []
                chunk_size = 4096
                
                # Process script in chunks
                for i in range(0, len(script_content), chunk_size):
                    chunk = script_content[i:i + chunk_size]
                    chunk_key = os.urandom(len(chunk))
                    processed_chunk = bytes(a ^ b for a, b in zip(chunk.encode(), chunk_key))
                    script_chunks.append((processed_chunk, chunk_key))
                
                # Clear original script content
                script_content = '\x00' * len(script_content)

                # Protect decrypted content
                content_addr = id(script_content)
                mem_protection.protect_region(content_addr, len(script_content))
                
                # Handle blend file if present
                blend_path = extract_blend_file_path(script_content)
                if blend_path:
                    with SecureMemory() as blend_mem:
                        blend_response = call_ec2('download_blend_file', method='POST', data={
                            'blend_path': blend_path
                        })
                        if blend_response and blend_response.get('status') == 'success':
                            encrypted_data = blend_response.get('encrypted_data')
                            if encrypted_data:
                                blend_mem.secure_write(encrypted_data)
                                if not blend_loader.load_blend(encrypted_data):
                                    print("Failed to load blend file")
                
                # Create module in protected memory
                module_name = f"blenderbin_script_{script_name}"
                if module_name in loaded_modules:
                    unload_script(module_name)
                
                script_module = types.ModuleType(module_name)
                sys.modules[module_name] = script_module
                
                # Track panels
                original_classes = set(cls for cls in bpy.types.Panel.__subclasses__())
                
                # Setup secure execution environment
                execution_context = ScriptExecutionContext()
                
                # Add protected loaders
                with MemoryProtection() as loader_protection:
                    script_module.__dict__['script_loader'] = script_loader
                    script_module.__dict__['blend_loader'] = blend_loader
                    loader_protection.protect_region(
                        id(script_module.__dict__), 
                        len(str(script_module.__dict__))
                    )
                
                # Reconstruct and execute script chunks securely
                try:
                    with MemoryProtection() as exec_protection:
                        # Reconstruct script from chunks
                        reconstructed_script = ""
                        for processed_chunk, chunk_key in script_chunks:
                            chunk = bytes(a ^ b for a, b in zip(processed_chunk, chunk_key))
                            reconstructed_script += chunk.decode()
                            chunk_key = b'\x00' * len(chunk_key)  # Clear chunk key

                        # Execute with security context
                        if not execution_context.execute_script(reconstructed_script, script_module.__dict__):
                            return False

                        # Clear reconstructed script
                        reconstructed_script = '\x00' * len(reconstructed_script)
                        
                        exec_protection.protect_region(
                            id(script_module), 
                            len(str(script_module))
                        )
                except Exception as e:
                    print(f"Script execution error: {str(e)}")
                    return False
                
                # Find new panels
                new_panels = set(cls for cls in bpy.types.Panel.__subclasses__()) - original_classes
                script_module.__blenderbin_panels__ = new_panels
                
                if hasattr(script_module, 'register'):
                    original_register = script_module.register
                    
                    def wrapped_register():
                        use_subpanels = bpy.context.scene.blenderbin_auth.use_subpanels
                        for panel in new_panels:
                            for attr in ['bl_parent_id', 'bl_region_type', 'bl_category']:
                                if hasattr(panel, attr):
                                    delattr(panel, attr)
                            
                            panel.bl_region_type = 'UI'
                            panel.bl_category = 'BlenderBin' if use_subpanels else script_name
                            panel.bl_space_type = 'VIEW_3D'
                            panel.bl_order = 4
                            
                            if hasattr(panel, 'draw') and not hasattr(panel, '_original_draw'):
                                panel._original_draw = panel.draw
                            
                            def create_draw_method(original):
                                def new_draw(self, context):
                                    if original and callable(original):
                                        original(self, context)
                                    else:
                                        self.layout.label(text=f"Content for {self.bl_label}")
                                return new_draw
                            
                            panel.draw = create_draw_method(getattr(panel, '_original_draw', None))
                        
                        original_register()
                    
                    script_module.register = wrapped_register
                    script_module.register()
                    
                    # Store references
                    script_icon_name = load_script_info(script_path)
                    script_icons[script_path] = script_icon_name
                    loaded_modules[module_name] = script_module
                    loaded_script_paths.add(script_path)
                    return True
                else:
                    print(f"No register function found in {script_path}")
                    return False
                    
    except Exception as e:
        print(f"Error in download_and_execute_script: {str(e)}")
        return False
        
    finally:
        # Clean up sensitive data
        if script_loader:
            script_loader.clear_sensitive_data()
        if blend_loader:
            blend_loader.clear_sensitive_data()
        
        # Release locked memory
        if sys.platform.startswith('linux'):
            try:
                libc = ctypes.CDLL(None)
                libc.munlockall()
            except:
                pass

        # Clear any remaining chunks
        try:
            script_chunks = None
            reconstructed_script = None
        except:
            pass

###############################################################################
# Icon Download / Check
###############################################################################

def ensure_script_icon_downloaded(icon_url, icon_name):
    """Check if script icon is in temp dir; if not, download it."""
    icon_temp_path = os.path.join(tempfile.gettempdir(), icon_name)
    if os.path.isfile(icon_temp_path):
        print(f"Icon {icon_name} is already in temp: {icon_temp_path}")
        return icon_temp_path
    # Otherwise download
    downloaded = download_image(icon_url, icon_temp_path)
    return downloaded  # or None if failed

def load_cached_image(icon_path):
    """Use Blender's image loading from a file path, caching if needed."""
    if not os.path.isfile(icon_path):
        return 'SCRIPT'
    # Minimal logic: just return icon_path for the "icon" property,
    # or actually load it with `bpy.data.images.load` if you want an icon_id.
    return icon_path

def load_cached_image(image_path):
    """Enhanced image loading with cache"""
    global icon_cache
    
    if image_path in icon_cache:
        image = bpy.data.images.get(icon_cache[image_path])
        if image and image.preview:
            return icon_cache[image_path]
    
    try:
        image = bpy.data.images.load(image_path, check_existing=True)
        image.reload()
        image.preview_ensure()
        icon_cache[image_path] = image.name
        return image.name
    except Exception as e:
        print(f"Error loading image {image_path}: {e}")
        return 'SCRIPT'

def download_image(url, file_path):
    """Download the image from the URL and save it to a file."""
    try:
        urllib.request.urlretrieve(url, file_path)
        print(f"Image downloaded to {file_path}")
        return file_path
    except Exception as e:
        print(f"Error downloading image: {e}")
        return None

def load_image(image_path):
    """Load the downloaded image in Blender."""
    try:
        image = bpy.data.images.load(image_path, check_existing=True)
        image.reload()
        image.preview_ensure()
        print(f"Image loaded: {image.name}")
        return image
    except Exception as e:
        print(f"Error loading image {image_path}: {e}")
        return None

def load_main_icon():
    """Load the main and big icons for the addon panels."""
    try:
        # Load main icon
        if os.path.exists(MAIN_IMAGE_PATH):
            main_image = bpy.data.images.load(MAIN_IMAGE_PATH, check_existing=True)
            main_image.reload()
            main_image.name = IMAGE_NAME  # Ensure name matches our constant
            main_image.preview_ensure()  # Force preview generation
            main_image.gl_load()  # Ensure GL texture
            print(f"Loaded main icon: {IMAGE_NAME}")
        else:
            print(f"Main icon path does not exist: {MAIN_IMAGE_PATH}")

        # Load big icon
        if os.path.exists(BIG_MAIN_IMAGE_PATH):
            big_image = bpy.data.images.load(BIG_MAIN_IMAGE_PATH, check_existing=True)
            big_image.reload()
            big_image.name = BIG_IMAGE_NAME  # Ensure name matches our constant
            big_image.preview_ensure()  # Force preview generation
            big_image.gl_load()  # Ensure GL texture
            print(f"Loaded big icon: {BIG_IMAGE_NAME}")
        else:
            print(f"Big icon path does not exist: {BIG_MAIN_IMAGE_PATH}")

    except Exception as e:
        print(f"Error loading icons: {str(e)}")
        
    return None

def get_script_icon_path(script_path):
    """
    1. Check if we already have the icon in temp from a previous session 
       or from the same session's _load_script_info_cache.
    2. If we do, skip calling server. 
    3. If not, call load_script_info to retrieve it.
    """
    already = icon_file_if_exists(script_path)
    if already:
        # We skip calling load_script_info again
        return already
    # Not in local temp (or wasn't previously cached)
    return load_script_info(script_path)

def icon_file_if_exists(script_path):
    """
    Returns a path to the icon file if it is in temp 
    (based on the script_icon_name from last time). 
    If no direct name is known, or the file is absent, return None.
    """
    # If we've called load_script_info before, itâ€™s in _load_script_info_cache
    path_in_cache = _load_script_info_cache.get(script_path)
    if path_in_cache and os.path.isfile(path_in_cache):
        return path_in_cache
    return None

###############################################################################
# Here is the newly cached load_script_info function
###############################################################################

def load_script_info(script_path):
    """Enhanced script info loading with threading for API calls and icon downloads"""
    global _load_script_info_cache
    
    icon_temp_dir = os.path.join(tempfile.gettempdir(), 'blenderbin_icons')
    script_hash = hashlib.md5(script_path.encode()).hexdigest()[:8]
    response_queue = queue.Queue()
    
    # Check local cache first
    if os.path.exists(icon_temp_dir):
        for filename in os.listdir(icon_temp_dir):
            if filename.startswith(script_hash + '_'):
                icon_path = os.path.join(icon_temp_dir, filename)
                if os.path.isfile(icon_path):
                    print(f"Found existing icon in temp: {icon_path}")
                    _load_script_info_cache[script_path] = icon_path
                    return icon_path

    # Check session cache
    if script_path in _load_script_info_cache:
        cached_path = _load_script_info_cache[script_path]
        if cached_path != 'SCRIPT' and os.path.isfile(cached_path):
            print(f"Using cached icon path: {cached_path}")
            return cached_path

    def fetch_icon_info():
        try:
            response = call_ec2('load_script_info', 'POST', data={'script_path': script_path})
            response_queue.put(response)
        except Exception as e:
            print(f"Error in API call: {e}")
            response_queue.put(None)

    # Start API call in background thread
    api_thread = threading.Thread(target=fetch_icon_info)
    api_thread.daemon = True
    api_thread.start()

    try:
        # Wait for response with timeout
        response = response_queue.get(timeout=30)

        if response and response.get('status') == 'success':
            script_icon_url = response.get('script_icon_url')
            script_icon_name = response.get('script_icon_name')
            
            if script_icon_url and script_icon_name:
                # Create temp directory if needed
                os.makedirs(icon_temp_dir, exist_ok=True)
                
                # Generate unique filename
                icon_filename = f"{script_hash}_{script_icon_name}"
                icon_temp_path = os.path.join(icon_temp_dir, icon_filename)

                def download_icon():
                    try:
                        urllib.request.urlretrieve(script_icon_url, icon_temp_path)
                        response_queue.put({"status": "success", "path": icon_temp_path})
                    except Exception as e:
                        print(f"Error downloading icon: {e}")
                        response_queue.put(None)

                if not os.path.isfile(icon_temp_path):
                    # Start download in new thread
                    download_thread = threading.Thread(target=download_icon)
                    download_thread.daemon = True
                    download_thread.start()
                    
                    # Wait for download with timeout
                    try:
                        download_result = response_queue.get(timeout=30)
                        if download_result and download_result.get("status") == "success":
                            _load_script_info_cache[script_path] = download_result["path"]
                            return download_result["path"]
                    except queue.Empty:
                        print("Icon download timed out")
                        _load_script_info_cache[script_path] = 'SCRIPT'
                        return 'SCRIPT'
                else:
                    _load_script_info_cache[script_path] = icon_temp_path
                    return icon_temp_path

    except queue.Empty:
        print("API call timed out")
    except Exception as e:
        print(f"Error loading script info: {e}")

    _load_script_info_cache[script_path] = 'SCRIPT'
    return 'SCRIPT'

def reload_all_scripts(context):
    """
    Example placeholder for reloading favorites from local JSON only.
    """
    global loaded_modules, loaded_script_paths, icon_cache, icon_load_attempts
    print("Reloading favorites from local JSON only, no EC2 calls here.")
    print("Reloading completed.")

def update_use_subpanels(self, context):
    global loaded_modules, loaded_script_paths
    
    props = context.scene.blenderbin_auth
    current_free_favs = [(item.name, item.path, item.icon) for item in props.selected_free_scripts]
    current_premium_favs = [(item.name, item.path, item.icon) for item in props.selected_premium_scripts]
    
    if addon_unlocked:
        email = get_current_user_email()
        if email:
            # Write preferences directly to file
            preferences_data = {
                'email': email,
                'use_subpanels': props.use_subpanels
            }
            try:
                with open(PREFERENCES_FILE, 'w') as f:
                    json.dump(preferences_data, f, indent=2)
                print(f"Saved preferences to {PREFERENCES_FILE}")
            except Exception as e:
                print(f"Error saving preferences to file: {e}")
    
    modules_to_unload = list(loaded_modules.keys())
    for module_name in modules_to_unload:
        unload_script(module_name)
    
    loaded_script_paths.clear()
    
    props.selected_free_scripts.clear()
    for name, path, icon in current_free_favs:
        item = props.selected_free_scripts.add()
        item.name = name
        item.path = path
        item.icon = icon
        
    if addon_unlocked:
        props.selected_premium_scripts.clear()
        for name, path, icon in current_premium_favs:
            item = props.selected_premium_scripts.add()
            item.name = name
            item.path = path
            item.icon = icon
    
    update_script_panels(context)
    refresh_ui()

def get_plugin_statistics():
    response = call_ec2('get_plugin_statistics', method='GET')
    if response and response.get('status') == 'success':
        return response.get('stats')
    else:
        print(f"Failed to get plugin statistics: {response.get('message') if response else 'Unknown error'}")
        return []

def display_plugin_rankings():
    stats = get_plugin_statistics()
    for plugin in stats:
        print(f"Plugin: {plugin['script_name']}")
        print(f"  Total Clicks: {plugin['total_clicks']}")
        print(f"  Unique Users: {plugin['unique_users']}")
        print(f"  Daily Active Users: {plugin['dau']}")
        print(f"  Weekly Active Users: {plugin['wau']}")
        print(f"  Weighted Score: {plugin['weighted_score']:.2f}")
        print()

###############################################################################
# Favorites + Preferences stored locally
###############################################################################
_favorites_cache = None
_preferences_cache = None

def save_favorites_to_memory(email, free_favorites, premium_favorites):
    """Safely store favorites in memory and JSON without overwriting with empties."""
    global _favorites_cache

    # 1. If both are empty, skip writing:
    if not free_favorites and not premium_favorites:
        print(f"[save_favorites_to_memory] Both free and premium favorites are empty for {email}.")
        print("Skipping writing JSON so we don't overwrite a possible non-empty file with empties.")
        return True  # Not necessarily an error; just skipping

    # 2. Convert to the needed script data WITHOUT storing 'icon'
    free_scripts = []
    for script in free_favorites:
        if isinstance(script, str):
            free_scripts.append({
                'name': os.path.splitext(os.path.basename(script))[0],
                'path': script
            })
        else:
            free_scripts.append({
                'name': script.name,
                'path': script.path
            })

    premium_scripts = []
    for script in premium_favorites:
        if isinstance(script, str):
            premium_scripts.append({
                'name': os.path.splitext(os.path.basename(script))[0],
                'path': script
            })
        else:
            premium_scripts.append({
                'name': script.name,
                'path': script.path
            })

    # 3. Populate the global cache and write to disk
    _favorites_cache = {
        'email': email,
        'free_favorites': free_scripts,
        'premium_favorites': premium_scripts
    }

    try:
        with open(FAVORITES_FILE, 'w') as f:
            json.dump(_favorites_cache, f, indent=2)
        print(f"Saved favorites WITHOUT icon paths to {FAVORITES_FILE}")
    except Exception as e:
        print(f"Error saving favorites to file: {e}")

    return True



def save_preferences_to_memory(email, use_subpanels):
    """Store preferences in memory"""
    global _preferences_cache
    _preferences_cache = {
        'email': email,
        'use_subpanels': use_subpanels
    }
    return True

def load_favorites_from_local(email):
    """
    Load favorites from local JSON, validating paths only when script browser data is available.
    Returns two lists of dicts: free_favs and premium_favs, each item having at least { 'name', 'path' }.
    """
    global _favorites_cache

    # Check memory cache first
    if _favorites_cache and _favorites_cache.get('email') == email:
        free_favs = _favorites_cache.get('free_favorites', [])
        premium_favs = _favorites_cache.get('premium_favorites', [])
    else:
        # Read from local favorites file
        if os.path.exists(FAVORITES_FILE):
            try:
                with open(FAVORITES_FILE, 'r') as f:
                    data = json.load(f)
                    if data.get('email') == email:
                        _favorites_cache = data
                        free_favs = data.get('free_favorites', [])
                        premium_favs = data.get('premium_favorites', [])
                    else:
                        return [], []
            except Exception as e:
                print(f"Error reading favorites file: {e}")
                return [], []
        else:
            return [], []

    # Only validate if script browser has loaded data
    if BLENDERBIN_OT_ScriptBrowser._scripts_loaded:
        valid_free_paths = set(BLENDERBIN_OT_ScriptBrowser._free_scripts)
        valid_premium_paths = set(BLENDERBIN_OT_ScriptBrowser._premium_scripts)
        valid_dev_paths = set(BLENDERBIN_OT_ScriptBrowser._developer_scripts)
        all_valid_paths = valid_free_paths | valid_premium_paths | valid_dev_paths

        valid_free_favs = []
        valid_premium_favs = []
        modified = False

        for fav in free_favs:
            if isinstance(fav, str):
                path = fav
                name = os.path.splitext(os.path.basename(fav))[0]
            else:
                path = fav.get('path')
                name = fav.get('name')

            if path in all_valid_paths:
                valid_free_favs.append({'name': name, 'path': path})
            else:
                modified = True
                print(f"Removing invalid free favorite path: {path}")

        for fav in premium_favs:
            if isinstance(fav, str):
                path = fav
                name = os.path.splitext(os.path.basename(fav))[0]
            else:
                path = fav.get('path')
                name = fav.get('name')

            if path in all_valid_paths:
                valid_premium_favs.append({'name': name, 'path': path})
            else:
                modified = True
                print(f"Removing invalid premium favorite path: {path}")

        if modified:
            _favorites_cache = {
                'email': email,
                'free_favorites': valid_free_favs,
                'premium_favorites': valid_premium_favs
            }
            try:
                with open(FAVORITES_FILE, 'w') as f:
                    json.dump(_favorites_cache, f, indent=2)
                print("Updated favorites file with valid paths only")
            except Exception as e:
                print(f"Error saving updated favorites: {e}")

            return valid_free_favs, valid_premium_favs
    
    # If script browser hasn't loaded data yet, return favorites as-is
    return free_favs, premium_favs

def load_preferences_from_local(email):
    """Load preferences from memory or file"""
    global _preferences_cache
    
    # Check memory first
    if _preferences_cache and _preferences_cache.get('email') == email:
        return _preferences_cache.get('use_subpanels', False)
    
    # If not in memory, try loading from file
    if os.path.exists(PREFERENCES_FILE):
        try:
            with open(PREFERENCES_FILE, 'r') as f:
                data = json.load(f)
                if data.get('email') == email:
                    _preferences_cache = data  # Cache it in memory
                    return data.get('use_subpanels', False)
        except Exception as e:
            print(f"Error reading preferences file: {e}")
    
    return False

def save_all_to_file():
    """Save both memory caches to files when Blender exits"""
    try:
        if _favorites_cache:
            with open(FAVORITES_FILE, 'w') as f:
                json.dump(_favorites_cache, f, indent=2)
            print(f"Saved favorites to {FAVORITES_FILE}")
            
        if _preferences_cache:
            with open(PREFERENCES_FILE, 'w') as f:
                json.dump(_preferences_cache, f, indent=2)
            print(f"Saved preferences to {PREFERENCES_FILE}")
            
    except Exception as e:
        print(f"Error saving to file: {e}")

def clear_memory_cache():
    """Clear memory caches"""
    global _favorites_cache, _preferences_cache
    _favorites_cache = None
    _preferences_cache = None

###############################################################################
# SSE classes
###############################################################################
class EventSourceManager:
    def __init__(self):
        self.event_source = None
        self.stop_event = threading.Event()
    
    def start_connection(self, device_id):
        """Start SSE connection to server"""
        print(f"Starting SSE connection for device: {device_id}")
        
        def run_connection():
            headers = {
                'X-API-Key': API_KEY
            }
            url = f"{EC2_SERVER_URL}/device_events/{device_id}"
            print(f"Connecting to SSE endpoint: {url}")
            
            while not self.stop_event.is_set():
                try:
                    print("Attempting to establish SSE connection...")
                    req = urllib.request.Request(url, headers=headers)
                    with urllib.request.urlopen(req) as response:
                        print("SSE connection established successfully")
                        for line in response:
                            if self.stop_event.is_set():
                                break
                                
                            line = line.decode('utf-8').strip()
                            if line.startswith('data: '):
                                try:
                                    data = json.loads(line[6:])
                                    print(f"Received SSE message: {data}")
                                    if data.get('type') == 'logout':
                                        print("Received logout event from server")
                                        def do_logout():
                                            if bpy.ops.object.logout_addon.poll():
                                                bpy.ops.object.logout_addon()
                                            return None
                                        bpy.app.timers.register(do_logout)
                                        break
                                except json.JSONDecodeError:
                                    print("Error parsing SSE data")
                                    
                except Exception as e:
                    print(f"SSE connection error: {str(e)}")
                    if not self.stop_event.is_set():
                        time.sleep(5)  # Wait before reconnecting
                    
        self.stop_event.clear()
        thread = threading.Thread(target=run_connection)
        thread.daemon = True
        thread.start()
        
    def stop_connection(self):
        """Stop SSE connection"""
        if not self.stop_event.is_set():
            print("Stopping SSE connection...")
            self.stop_event.set()
            # Notify server to clean up
            try:
                call_ec2('disconnect_device', method='POST', data={'device_id': device_id})
                print("Sent disconnect notification to server")
            except:
                print("Failed to send disconnect notification")

event_source_manager = EventSourceManager()

###############################################################################
# Caching classes
###############################################################################
class APICacheManager:
    def __init__(self, cache_dir=None, rate_limit_calls=10, rate_limit_period=60):
        self.cache_dir = cache_dir or os.path.join(tempfile.gettempdir(), 'blenderbin_cache')
        os.makedirs(self.cache_dir, exist_ok=True)
        
        self.rate_limit_calls = rate_limit_calls
        self.rate_limit_period = rate_limit_period
        self.call_history = deque(maxlen=rate_limit_calls)
        self.rate_limit_lock = Lock()
        self.cache_lock = Lock()
        
        self.cache_ttl = {
            'unified_auth': 60,
            'get_scripts_in_folder': 3600
        }

    def _can_make_call(self):
        with self.rate_limit_lock:
            now = time.time()
            self.call_history = deque(
                [t for t in self.call_history if now - t <= self.rate_limit_period],
                maxlen=self.rate_limit_calls
            )
            if len(self.call_history) < self.rate_limit_calls:
                self.call_history.append(now)
                return True
            return False

    def make_api_call(self, endpoint, method='GET', data=None, force_refresh=False):
        if not force_refresh and method == 'GET':
            cached = self.get_cached_response(endpoint, data)
            if cached is not None:
                return cached

        if not self._can_make_call():
            print(f"Rate limit exceeded for {endpoint}. Try again later.")
            return None

        response = call_ec2(endpoint, method, data)
        
        if response and method == 'GET':
            self.cache_response(endpoint, response, data)
            
        return response

    def get_cached_response(self, endpoint, params=None):
        cache_path = self._get_cache_path(endpoint, params)
        
        with self.cache_lock:
            if self._is_cache_valid(cache_path, endpoint):
                try:
                    with open(cache_path, 'r') as f:
                        cache_data = json.load(f)
                    return cache_data['response']
                except:
                    return None
        return None

    def _get_cache_path(self, endpoint, params=None):
        cache_key = f"{endpoint}"
        if params:
            param_str = json.dumps(params, sort_keys=True)
            cache_key += f"_{hash(param_str)}"
        return os.path.join(self.cache_dir, f"{cache_key}.json")

    def _is_cache_valid(self, cache_path, endpoint):
        if not os.path.exists(cache_path):
            return False
            
        try:
            with open(cache_path, 'r') as f:
                cache_data = json.load(f)
                
            cache_time = datetime.fromtimestamp(cache_data['timestamp'])
            ttl = self.cache_ttl.get(endpoint, 300)
            
            return datetime.now() - cache_time < timedelta(seconds=ttl)
        except:
            return False

    def cache_response(self, endpoint, response, params=None):
        cache_path = self._get_cache_path(endpoint, params)
        
        with self.cache_lock:
            try:
                cache_data = {
                    'timestamp': time.time(),
                    'response': response
                }
                with open(cache_path, 'w') as f:
                    json.dump(cache_data, f)
            except Exception as e:
                print(f"Error caching response: {e}")

    def clear_cache(self, endpoint=None):
        with self.cache_lock:
            if endpoint:
                cache_path = self._get_cache_path(endpoint)
                if os.path.exists(cache_path):
                    os.remove(cache_path)
            else:
                for file in os.listdir(self.cache_dir):
                    if file.endswith('.json'):
                        os.remove(os.path.join(self.cache_dir, file))

cache_manager = APICacheManager(rate_limit_calls=20, rate_limit_period=60)

def compare_script_content(cached_data, new_data):
    """Compare cached script content with new content.
    
    Args:
        cached_data (dict): Cached script data
        new_data (dict): New script data from server
        
    Returns:
        bool: True if content differs, False if same
    """
    if not cached_data or not new_data:
        return True
        
    # Compare relevant fields
    return (cached_data.get('encrypted_data') != new_data.get('encrypted_data') or
            cached_data.get('signature') != new_data.get('signature') or
            cached_data.get('encryption_type') != new_data.get('encryption_type'))

def cache_script_content(script_path):
    """Downloads and caches encrypted script content to a JSON file.
    
    Args:
        script_path (str): Path of the script to download and cache
        
    Returns:
        bool: True if caching successful, False otherwise
    """
    try:
        # Get the cached scripts directory
        cache_dir = os.path.join(tempfile.gettempdir(), 'blenderbin_scripts_cache')
        os.makedirs(cache_dir, exist_ok=True)
        
        # Generate cache filename using hash of script path
        script_hash = hashlib.md5(script_path.encode()).hexdigest()[:8]
        cache_file = os.path.join(cache_dir, f"script_cache.json")
        
        # Download script content
        response = call_ec2('download_script', method='POST', data={
            'bucket': S3_BUCKET_NAME,
            'key': script_path,
            'device_id': device_id
        })
        
        if not response or response.get('status') != 'success':
            print(f"Failed to download script content for caching: {script_path}")
            return False
            
        # Load existing cache if it exists
        cache_data = {}
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r') as f:
                    cache_data = json.load(f)
            except Exception as e:
                print(f"Error reading cache file: {e}")
                cache_data = {}
        
        # Add new script content to cache with timestamp
        cache_data[script_path] = {
            'timestamp': time.time(),
            'encrypted_data': response.get('encrypted_data'),
            'signature': response.get('signature'),
            'encryption_type': response.get('encryption_type')
        }
        
        # Save updated cache
        with open(cache_file, 'w') as f:
            json.dump(cache_data, f)
            
        print(f"Successfully cached script content for: {script_path}")
        return True
        
    except Exception as e:
        print(f"Error caching script content: {str(e)}")
        return False

def get_cached_script_content(script_path):
    """Retrieves cached script content if available.
    
    Args:
        script_path (str): Path of the script to retrieve
        
    Returns:
        dict: Cached response data if valid, None otherwise
    """
    try:
        cache_file = os.path.join(tempfile.gettempdir(), 'blenderbin_scripts_cache', "script_cache.json")
        
        if not os.path.exists(cache_file):
            return None
            
        with open(cache_file, 'r') as f:
            cache_data = json.load(f)
            
        if script_path not in cache_data:
            return None
            
        script_cache = cache_data[script_path]
        cache_time = script_cache.get('timestamp', 0)
        

            
        return {
            'status': 'success', 
            'encrypted_data': script_cache.get('encrypted_data'),
            'signature': script_cache.get('signature'),
            'encryption_type': script_cache.get('encryption_type')
        }
        
    except Exception as e:
        print(f"Error reading cached script content: {str(e)}")
        return None
    
def delete_cached_script_content(script_path):
    """Delete cached script content for a specific script path."""
    try:
        # Get the cached scripts directory
        cache_dir = os.path.join(tempfile.gettempdir(), 'blenderbin_scripts_cache')
        cache_file = os.path.join(cache_dir, "script_cache.json")
        
        if os.path.exists(cache_file):
            try:
                # Load existing cache
                with open(cache_file, 'r') as f:
                    cache_data = json.load(f)
                
                # Remove the script's cached content if it exists
                if script_path in cache_data:
                    del cache_data[script_path]
                    
                    # Save updated cache
                    with open(cache_file, 'w') as f:
                        json.dump(cache_data, f)
                        
                    print(f"Deleted cached content for: {script_path}")
                    return True
                else:
                    print(f"No cached content found for: {script_path}")
                    return True
                    
            except Exception as e:
                print(f"Error manipulating cache file: {str(e)}")
                return False
        else:
            print("No cache file exists")
            return True
            
    except Exception as e:
        print(f"Error deleting cached script content: {str(e)}")
        return False
    
def clean_invalid_cached_scripts(available_paths):
    """
    Clean up cached scripts that are no longer available in the script browser.
    
    Args:
        available_paths (set): Set of valid script paths from script browser
    """
    try:
        # Get the cached scripts directory
        cache_dir = os.path.join(tempfile.gettempdir(), 'blenderbin_scripts_cache')
        cache_file = os.path.join(cache_dir, "script_cache.json")
        
        if not os.path.exists(cache_file):
            print("No cache file exists to clean")
            return
            
        try:
            # Load existing cache
            with open(cache_file, 'r') as f:
                cache_data = json.load(f)
                
            # Find invalid paths
            cached_paths = set(cache_data.keys())
            invalid_paths = cached_paths - available_paths
            
            if invalid_paths:
                print(f"Found {len(invalid_paths)} invalid cached scripts to remove")
                
                # Remove invalid paths from cache
                for path in invalid_paths:
                    del cache_data[path]
                    print(f"Removed invalid cached script: {path}")
                    
                # Save updated cache
                with open(cache_file, 'w') as f:
                    json.dump(cache_data, f)
                    
                print("Cache cleanup completed")
            else:
                print("No invalid cached scripts found")
                
        except Exception as e:
            print(f"Error cleaning cache file: {str(e)}")
            
    except Exception as e:
        print(f"Error in cache cleanup: {str(e)}")

###############################################################################
# Operators
###############################################################################
class BLENDERBIN_OT_LoadFreeScripts(bpy.types.Operator):
    bl_idname = "object.blenderbin_load_free_scripts"
    bl_label = "Check for Updates"
    bl_description = "Lists available free addons from BlenderBin (manual call)."

    def load_script_batch(self, scripts, context, collection_lock):
        loaded_items = []
        for script in scripts:
            try:
                name = os.path.splitext(script.split('/')[-1])[0]
                icon_path = load_script_info(script)
                
                icon = 'SCRIPT'
                if os.path.isfile(icon_path):
                    icon = load_cached_image(icon_path)
                
                loaded_items.append({
                    'name': name,
                    'path': script,
                    'icon': icon
                })
            except Exception as e:
                print(f"Error loading script {script}: {e}")
        
        # Add batch of items to collection under lock
        with collection_lock:
            for item_data in loaded_items:
                item = context.scene.blenderbin_free_scripts.add()
                item.name = item_data['name']
                item.path = item_data['path']
                item.icon = item_data['icon']

    def execute(self, context):
        folder_path = 'BACKEND/ADDON_LIBRARY/FREE_ADDONS/'
        scripts = get_scripts_in_folder(folder_path)
        
        if not scripts:
            return {'CANCELLED'}
            
        # Clear collection
        context.scene.blenderbin_free_scripts.clear()
        
        # Create lock for thread-safe collection updates
        collection_lock = threading.Lock()
        
        # Split scripts into batches
        batch_size = 5  # Process 5 scripts per thread
        script_batches = [scripts[i:i+batch_size] for i in range(0, len(scripts), batch_size)]
        
        # Create and start threads
        threads = []
        for batch in script_batches:
            thread = threading.Thread(
                target=self.load_script_batch,
                args=(batch, context, collection_lock)
            )
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        self.report({'INFO'}, f"Found {len(scripts)} free addons from BlenderBin.")
        return {'FINISHED'}

class BLENDERBIN_OT_LoadScripts(bpy.types.Operator):
    bl_idname = "object.blenderbin_load_scripts"
    bl_label = "Check for Updates"
    bl_description = "Lists available addons from BlenderBin (manual call)."
    
    def load_script_batch(self, scripts, context, collection_lock):
        loaded_items = []
        for script in scripts:
            try:
                name = os.path.splitext(script.split('/')[-1])[0]
                icon = 'LOCKED'
                
                if addon_unlocked:
                    icon_path = load_script_info(script)
                    if os.path.isfile(icon_path):
                        icon = load_cached_image(icon_path)
                    else:
                        icon = 'SCRIPT'
                
                loaded_items.append({
                    'name': name,
                    'path': script,
                    'icon': icon
                })
            except Exception as e:
                print(f"Error loading script {script}: {e}")
        
        # Add batch of items to collection under lock
        with collection_lock:
            for item_data in loaded_items:
                item = context.scene.blenderbin_scripts.add()
                item.name = item_data['name']
                item.path = item_data['path']
                item.icon = item_data['icon']

    def execute(self, context):
        folder_path = 'BACKEND/ADDON_LIBRARY/PREMIUM_ADDONS/'
        scripts = get_scripts_in_folder(folder_path)
        
        if not scripts:
            return {'CANCELLED'}
            
        # Clear collection
        context.scene.blenderbin_scripts.clear()
        
        # Create lock for thread-safe collection updates
        collection_lock = threading.Lock()
        
        # Split scripts into batches
        batch_size = 5  # Process 5 scripts per thread
        script_batches = [scripts[i:i+batch_size] for i in range(0, len(scripts), batch_size)]
        
        # Create and start threads
        threads = []
        for batch in script_batches:
            thread = threading.Thread(
                target=self.load_script_batch,
                args=(batch, context, collection_lock)
            )
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
            
        self.report({'INFO'}, f"Found {len(scripts)} addons from BlenderBin.")
        return {'FINISHED'}

class BLENDERBIN_OT_OpenScriptWebsite(bpy.types.Operator):
    bl_idname = "object.blenderbin_open_script_website"
    bl_label = "View on BlenderBin"
    bl_description = "Open this addon's page on BlenderBin.com"

    script_name: bpy.props.StringProperty()

    def execute(self, context):
        url = f"https://blenderbin.com/{self.script_name}"
        bpy.ops.wm.url_open(url=url)
        return {'FINISHED'}

class BLENDERBIN_OT_RunFreeScript(bpy.types.Operator):
    bl_idname = "object.blenderbin_run_free_script"
    bl_label = "Run Free Script"
    bl_description = "Launch Free Addon."

    script_path: bpy.props.StringProperty()
    _timer = None
    _script_thread = None
    _result_queue = None

    def execute(self, context):
        # Create a queue for thread communication
        self._result_queue = queue.Queue()
        
        # Start script execution in a separate thread
        def script_thread_function():
            try:
                result = download_and_execute_script(self.script_path)
                self._result_queue.put(result)
            except Exception as e:
                print(f"Script execution thread error: {str(e)}")
                self._result_queue.put(False)
        
        self._script_thread = threading.Thread(target=script_thread_function)
        self._script_thread.daemon = True
        self._script_thread.start()
        
        # Start a timer to check for thread completion
        wm = context.window_manager
        self._timer = wm.event_timer_add(0.1, window=context.window)
        wm.modal_handler_add(self)
        
        # Show "loading" message
        self.report({'INFO'}, f"Loading free addon... Please wait.")
        
        return {'RUNNING_MODAL'}
    
    def modal(self, context, event):
        if event.type == 'TIMER':
            # Check if script thread is complete
            try:
                if not self._script_thread.is_alive():
                    # Thread is done, get the result
                    try:
                        result = self._result_queue.get(block=False)
                        return self.handle_script_result(context, result)
                    except queue.Empty:
                        # No result yet, this shouldn't happen but just in case
                        pass
                    
                # Also check the queue even if thread is still running
                try:
                    result = self._result_queue.get(block=False)
                    return self.handle_script_result(context, result)
                except queue.Empty:
                    # Still waiting for result
                    pass
            except Exception as e:
                print(f"Error in modal timer: {str(e)}")
                self.cleanup(context)
                self.report({'ERROR'}, "Script execution failed. Please try again.")
                return {'CANCELLED'}
                
        return {'RUNNING_MODAL'}
    
    def handle_script_result(self, context, result):
        self.cleanup(context)
        
        if result:
            self.report({'INFO'}, f"Addon loaded successfully.")
            # Force UI refresh
            refresh_ui()
            return {'FINISHED'}
        else:
            self.report({'ERROR'}, "Failed to load addon.")
            return {'CANCELLED'}
    
    def cleanup(self, context):
        # Remove the timer
        if self._timer:
            context.window_manager.event_timer_remove(self._timer)
            self._timer = None
        
class BLENDERBIN_OT_RunScript(bpy.types.Operator):
    bl_idname = "object.blenderbin_run_script"
    bl_label = "Run Script"
    bl_description = "Launch Addon."

    script_path: bpy.props.StringProperty()
    _timer = None
    _script_thread = None
    _result_queue = None

    def execute(self, context):
        # Create a queue for thread communication
        self._result_queue = queue.Queue()
        
        # Start script execution in a separate thread
        def script_thread_function():
            try:
                result = download_and_execute_script(self.script_path)
                self._result_queue.put(result)
            except Exception as e:
                print(f"Script execution thread error: {str(e)}")
                self._result_queue.put(False)
        
        self._script_thread = threading.Thread(target=script_thread_function)
        self._script_thread.daemon = True
        self._script_thread.start()
        
        # Start a timer to check for thread completion
        wm = context.window_manager
        self._timer = wm.event_timer_add(0.1, window=context.window)
        wm.modal_handler_add(self)
        
        # Show "loading" message
        self.report({'INFO'}, f"Loading addon... Please wait.")
        
        return {'RUNNING_MODAL'}
    
    def modal(self, context, event):
        if event.type == 'TIMER':
            # Check if script thread is complete
            try:
                if not self._script_thread.is_alive():
                    # Thread is done, get the result
                    try:
                        result = self._result_queue.get(block=False)
                        return self.handle_script_result(context, result)
                    except queue.Empty:
                        # No result yet, this shouldn't happen but just in case
                        pass
                    
                # Also check the queue even if thread is still running
                try:
                    result = self._result_queue.get(block=False)
                    return self.handle_script_result(context, result)
                except queue.Empty:
                    # Still waiting for result
                    pass
            except Exception as e:
                print(f"Error in modal timer: {str(e)}")
                self.cleanup(context)
                self.report({'ERROR'}, "Script execution failed. Please try again.")
                return {'CANCELLED'}
                
        return {'RUNNING_MODAL'}
    
    def handle_script_result(self, context, result):
        self.cleanup(context)
        
        if result:
            self.report({'INFO'}, f"Addon loaded successfully.")
            # Force UI refresh
            refresh_ui()
            return {'FINISHED'}
        else:
            self.report({'ERROR'}, "Failed to load addon.")
            return {'CANCELLED'}
    
    def cleanup(self, context):
        # Remove the timer
        if self._timer:
            context.window_manager.event_timer_remove(self._timer)
            self._timer = None

class BLENDERBIN_OT_TrashFreeScripts(bpy.types.Operator):
    bl_idname = "object.blenderbin_trash_free_scripts"
    bl_label = "Remove all free addons"
    bl_description = "Unload and unregister all loaded free scripts"

    def execute(self, context):
        global loaded_modules, loaded_script_paths
        
        modules_to_unload = [
            module_name for module_name, module in loaded_modules.items()
            if any(path.startswith('BACKEND/FREE_SCRIPTS/') for path in loaded_script_paths)
        ]
        
        for module_name in modules_to_unload:
            unload_script(module_name)
        
        loaded_script_paths = {
            path for path in loaded_script_paths
            if not path.startswith('BACKEND/FREE_SCRIPTS/')
        }

        self.report({'INFO'}, "All free scripts have been unloaded and unregistered successfully.")
        return {'FINISHED'}

class OBJECT_OT_device_switch_popup(bpy.types.Operator):
    bl_idname = "object.device_switch_popup"
    bl_label = "Device In Use"
    bl_options = {'REGISTER', 'INTERNAL'}

    # Note: Session-based auth doesn't need email/password properties

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)

    def draw(self, context):
        layout = self.layout
        layout.label(text="This account is already in use on another device.")
        layout.label(text="Would you like to switch to this device?")
        layout.label(text="(This will log out the other device)")
        row = layout.row()
        row.operator("object.switch_device", text="Yes, Switch to This Device")
        row.operator("object.cancel_switch", text="No, Cancel")

class OBJECT_OT_switch_device(bpy.types.Operator):
    bl_idname = "object.switch_device"
    bl_label = "Switch Device"
    
    # Note: Session-based auth doesn't need email property

    def execute(self, context):
        global device_id
        # Just unlock addon again - the unified endpoint handles device switching
        if bpy.ops.object.unlock_addon.poll():
            return bpy.ops.object.unlock_addon()
        return {'CANCELLED'}

class OBJECT_OT_cancel_switch(bpy.types.Operator):
    bl_idname = "object.cancel_switch"
    bl_label = "Cancel Switch"
    
    def execute(self, context):
        return {'FINISHED'}
    
def execute_developer_script(encrypted_data, auth_response):
    """
    Executes a developer script that comes encrypted in the auth response.
    Matches functionality with download_and_execute_script for consistency.
    
    Args:
        encrypted_data: The encrypted script data from the auth response
        auth_response: The full auth response dict for additional context
    
    Returns:
        bool: True if execution successful, False otherwise
    """
    global script_loader, loaded_modules, blend_loader
    
    if script_loader is None:
        script_loader = MemoryScriptLoader()
    if blend_loader is None:
        blend_loader = MemoryBlendLoader()
    
    try:
        # Load and decrypt the developer script
        encrypted_dev_data = auth_response.get('encrypted_data')
        if encrypted_dev_data and auth_response.get('encryption_type') == 'STREAM-CIPHER-HMAC-IV':
            if not script_loader.load_script({'status': 'success', 'encrypted_data': encrypted_dev_data}):
                print("Failed to load encrypted developer script")
                return False
                    
        script_content = script_loader.get_loaded_script()
        if not script_content:
            print("Failed to get decrypted script content")
            return False
            
        print("Successfully decrypted developer script")
        
        # Create a new Python module for the dev panel
        module_name = "BLENDERBIN_PT_dev_panel"
        
        # If already loaded, unload first
        if module_name in loaded_modules:
            unload_script(module_name)
        
        # Create new module
        dev_module = types.ModuleType(module_name)
        sys.modules[module_name] = dev_module
        
        # Track panels before execution
        original_classes = set(cls for cls in bpy.types.Panel.__subclasses__())
        
        # Add loaders to module
        dev_module.__dict__['script_loader'] = script_loader
        dev_module.__dict__['blend_loader'] = blend_loader
        
        # Set up complete namespace with required globals
        namespace = {
            '__name__': module_name,
            '__file__': module_name,
            'bpy': bpy,
            'os': os,
            'tempfile': tempfile,
            'json': json,
            'urllib': urllib,
            'persistent': persistent,
            'sys': sys,
            'types': types,
            'queue': queue,
            'script_loader': script_loader,
            'blend_loader': blend_loader,
            'call_ec2': call_ec2,
            'S3_BUCKET_NAME': S3_BUCKET_NAME,
            # Add these important globals from parent script
            'addon_unlocked': addon_unlocked,
            'loaded_script_paths': loaded_script_paths,
            'loaded_modules': loaded_modules,
            'script_icons': script_icons,
            'load_script_info': load_script_info,
            'load_cached_image': load_cached_image,
            'download_and_execute_script': download_and_execute_script,
            'unload_script': unload_script,
            'refresh_ui': refresh_ui
        }
        
        try:
            # Execute script content with namespace
            exec(script_content, namespace)
            dev_module.__dict__.update(namespace)
            print("Executed developer script successfully")
            
            # Find new panels
            new_panels = set(cls for cls in bpy.types.Panel.__subclasses__()) - original_classes
            
            # Check for blend file
            blend_path = extract_blend_file_path(script_content)
            if blend_path:
                blend_response = call_ec2('download_blend_file', method='POST', data={
                    'blend_path': blend_path
                })
                if blend_response and blend_response.get('status') == 'success':
                    try:
                        encrypted_data = blend_response.get('encrypted_data')
                        if encrypted_data:
                            if blend_loader.load_blend(encrypted_data):
                                print(f"Successfully loaded encrypted blend file from {blend_path}")
                                dev_module.__blend_file_path__ = blend_path
                            else:
                                print(f"Failed to load encrypted blend file from {blend_path}")
                    except Exception as e:
                        print(f"Error loading blend file: {str(e)}")
            
            # If it has a register() function, wrap it
            if hasattr(dev_module, 'register'):
                original_register = dev_module.register
                
                def wrapped_register():
                    """Wrapper to handle panel registration and ensure persistence"""
                    # use_subpanels = bpy.context.scene.blenderbin_auth.use_subpanels
                    
                    # Configure panels
                    for panel in new_panels:
                        for attr in ['bl_parent_id', 'bl_region_type', 'bl_category']:
                            if hasattr(panel, attr):
                                delattr(panel, attr)
                                
                        if panel:
                           
                            panel.bl_region_type = 'UI'
                            panel.bl_category = 'BlenderBin'
                            panel.bl_space_type = 'VIEW_3D'
                            panel.bl_order = 3
                        else:
                            panel.bl_region_type = 'UI'
                            panel.bl_space_type = 'VIEW_3D'
                            panel.bl_category = module_name
                            panel.bl_order = 3
                        
                        if hasattr(panel, 'draw') and not hasattr(panel, '_original_draw'):
                            panel._original_draw = panel.draw
                        
                        def create_draw_method(original):
                            def new_draw(self, context):
                                if original and callable(original):
                                    original(self, context)
                                else:
                                    self.layout.label(text=f"Content for {self.bl_label}")
                            return new_draw
                        
                        panel.draw = create_draw_method(getattr(panel, '_original_draw', None))
                    
                    # Store panels for unregistration
                    dev_module.__blenderbin_panels__ = new_panels
                    
                    try:
                        # Call original register
                        original_register()
                        # Store module references
                        loaded_modules[module_name] = dev_module
                        sys.modules[module_name] = dev_module
                    except Exception as e:
                        print(f"Error in wrapped register: {str(e)}")
                        raise
                
                # Replace register with wrapped version
                dev_module.register = wrapped_register
                dev_module.register()
                return True
                
            else:
                print("Developer script has no register() function")
                return False
                
        except Exception as e:
            print(f"Error executing developer script: {str(e)}")
            return False
            
    except Exception as e:
        print(f"Error processing developer script: {str(e)}")
        return False

class OBJECT_OT_session_login(bpy.types.Operator):
    bl_idname = "object.session_login"
    bl_label = "Sign In"
    bl_description = "Sign in to access premium features"
    
    def execute(self, context):
        global auth_check_in_progress, check_attempts, last_auth_check_time
        
        auth_url = get_auth_url()
        
        # Reset any previous auth check state
        check_attempts = 0
        
        # Mark that we're starting a new auth check
        auth_check_in_progress = True
        last_auth_check_time = datetime.now()
        
        # Open browser to the login page with session ID
        webbrowser.open(auth_url)
        
        # Create a timer to poll for auth token from server
        if hasattr(bpy, "app") and hasattr(bpy.app, "timers") and hasattr(bpy.app.timers, "register"):
            bpy.app.timers.register(check_auth_status, first_interval=2.0)
        else:
            # If timers aren't available, we can't do polling, so show a message
            self.report({'INFO'}, "Authentication initiated. Please check the web browser and restart Blender after signing in.")
        
        self.report({'INFO'}, "Opening browser for authentication...")
        return {'FINISHED'}

class OBJECT_OT_unlock_addon(bpy.types.Operator):
    bl_idname = "object.unlock_addon"
    bl_label = "Unlock Addon"
    
    forced: bpy.props.BoolProperty(default=False)
    _timer = None
    _auth_thread = None
    _thread_result = None
    _result_queue = None

    def execute(self, context):
        global addon_unlocked, device_id, has_subscription, event_source_manager, firebase_token, script_loader
        
        # This operator is kept for backward compatibility but session-based auth is preferred
        # For session-based auth, use OBJECT_OT_session_login instead
        props = context.scene.blenderbin_auth
        
        # Try to get email/password from saved auth info for legacy compatibility
        email, password, _ = get_auth_info()
        if not email or not password:
            self.report({'ERROR'}, "No saved credentials found. Please use the 'Sign In' button for authentication.")
            return {'CANCELLED'}
            
        device_id = get_device_id()
        
        print(f"Starting unified authentication for device: {device_id}")
        
        # Create a queue for thread communication
        self._result_queue = queue.Queue()
        
        # Start authentication in a separate thread
        def auth_thread_function():
            try:
                # Make the "unified_auth" call to your server
                auth_response = call_ec2('unified_auth', method='POST', data={
                    'email': email,
                    'password': password,
                    'device_id': device_id
                })
                self._result_queue.put(auth_response)
            except Exception as e:
                print(f"Authentication thread error: {str(e)}")
                self._result_queue.put(None)
        
        self._auth_thread = threading.Thread(target=auth_thread_function)
        self._auth_thread.daemon = True
        self._auth_thread.start()
        
        # Start a timer to check for thread completion
        wm = context.window_manager
        self._timer = wm.event_timer_add(0.1, window=context.window)
        wm.modal_handler_add(self)
        
        # Show "authenticating" message
        self.report({'INFO'}, "Authenticating... Please wait.")
        
        return {'RUNNING_MODAL'}
    
    def modal(self, context, event):
        if event.type == 'TIMER':
            # Check if authentication thread is complete
            try:
                if not self._auth_thread.is_alive():
                    # Thread is done, get the result
                    try:
                        auth_response = self._result_queue.get(block=False)
                        return self.handle_auth_response(context, auth_response)
                    except queue.Empty:
                        # No result yet, this shouldn't happen but just in case
                        pass
                    
                # Also check the queue even if thread is still running
                try:
                    auth_response = self._result_queue.get(block=False)
                    return self.handle_auth_response(context, auth_response)
                except queue.Empty:
                    # Still waiting for result
                    pass
            except Exception as e:
                print(f"Error in modal timer: {str(e)}")
                self.cleanup(context)
                self.report({'ERROR'}, "Authentication failed. Please try again.")
                return {'CANCELLED'}
                
        return {'RUNNING_MODAL'}
    
    def handle_auth_response(self, context, auth_response):
        global addon_unlocked, has_subscription, firebase_token, script_loader
        
        self.cleanup(context)
        
        if auth_response and auth_response.get('status') == 'success':
            # Mark the addon as unlocked, set subscription info
            addon_unlocked = True
            has_subscription = auth_response.get('has_subscription', False)
            props = context.scene.blenderbin_auth
            props.has_subscription = has_subscription
            
            # Capture Firebase token (if returned)
            firebase_token = auth_response.get('firebase_token')
            if not firebase_token:
                print("Warning: No Firebase token received")
                self.report({'ERROR'}, "Authentication error: No token received")
                return {'CANCELLED'}

            # If the response includes an encrypted developer script, handle that
            encrypted_dev_data = auth_response.get('encrypted_data')
            if encrypted_dev_data and auth_response.get('encryption_type') == 'STREAM-CIPHER-HMAC-IV':
                print("Developer script received, attempting to load...")
                if script_loader is None:
                    script_loader = MemoryScriptLoader()
                
                if execute_developer_script(encrypted_dev_data, auth_response):
                    print("Developer script loaded and registered successfully")
                else:
                    print("Failed to load developer script")
            
            # Save auth info so we can auto-login next time
            email = user_info.get("email", "") if 'user_info' in locals() else get_current_user_email()
            if not email:
                # Try to get from saved auth info
                email, _, _ = get_auth_info()
            
            if email:
                save_auth_info(email, "", firebase_token)
            
            # If SSE / event streaming is part of your flow, start it
            sse_url = auth_response.get('sse_url')
            if sse_url:
                print(f"Starting SSE connection using URL: {sse_url}")
                event_source_manager.start_connection(device_id)
            
            # If device was switched, show a notification
            if auth_response.get('device_switched'):
                self.report({'INFO'}, "Switched to this device. Other device will be logged out.")
            
            # Also save credentials for auto login if we have them
            if email:
                save_credentials(email, "")
            
            # Load user preferences from local JSON
            if email:
                use_subpanels = load_preferences_from_local(email)
                props.use_subpanels = use_subpanels

                # Attempt to load any saved favorites from local JSON
                free_favs, premium_favs = load_favorites_from_local(email)

                # -------------------------------------------------------------
                # Key Fix: Only clear collections if we actually have data
                # -------------------------------------------------------------
                if free_favs or premium_favs:
                    print("Loading favorites from local JSON...")

                    # Wipe out the existing in-memory favorites
                    props.selected_free_scripts.clear()
                    props.selected_premium_scripts.clear()
                    context.scene.blenderbin_free_scripts.clear()
                    context.scene.blenderbin_scripts.clear()

                    # Re-populate free favorites
                    for script in free_favs:
                        item = props.selected_free_scripts.add()
                        item.name = script.get('name', '')
                        item.path = script.get('path', '')

                        # Always re-fetch the icon path:
                        icon_path = load_script_info(item.path)
                        if os.path.isfile(icon_path):
                            item.icon = load_cached_image(icon_path)
                        else:
                            item.icon = 'SCRIPT'

                        # Also set panel_item the same:
                        panel_item = context.scene.blenderbin_free_scripts.add()
                        panel_item.name = item.name
                        panel_item.path = item.path
                        panel_item.icon = item.icon

                    # Re-populate premium favorites (only if user has subscription)
                    if has_subscription and premium_favs:
                        for script in premium_favs:
                            item = props.selected_premium_scripts.add()
                            item.name = script.get('name', '')
                            item.path = script.get('path', '')
                            
                            icon_path = load_script_info(item.path)
                            if os.path.isfile(icon_path):
                                item.icon = load_cached_image(icon_path)
                            else:
                                item.icon = 'SCRIPT'
                            
                            panel_item = context.scene.blenderbin_scripts.add()
                            panel_item.name = item.name
                            panel_item.path = item.path
                            panel_item.icon = item.icon
                else:
                    # If no favorites were found for that email, do NOT clear memory
                    print("No favorites found (or mismatch email). Not clearing current memory to avoid overwriting JSON.")

            msg = "Unlocked premium" if has_subscription else "Unlocked free features"
            self.report({'INFO'}, msg)
            return {'FINISHED'}
            
        else:
            # Authentication / server connection failed
            error_msg = auth_response.get('message', 'Authentication failed') if auth_response else 'Connection failed'
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}
    
    def cleanup(self, context):
        # Remove the timer
        if self._timer:
            context.window_manager.event_timer_remove(self._timer)
            self._timer = None

class OBJECT_OT_logout(bpy.types.Operator):
    bl_idname = "object.logout_addon"
    bl_label = "Logout"
    bl_description = "Logout and delete saved credentials"

    def execute(self, context):
        global addon_unlocked, device_id, event_source_manager, firebase_token
        global session_id, auth_check_in_progress, check_attempts, has_subscription
        
        # Stop SSE connection first
        event_source_manager.stop_connection()
        
        # Clear Firebase token and session data
        firebase_token = None
        session_id = None
        auth_check_in_progress = False
        check_attempts = 0
        has_subscription = False  # Reset subscription status
        
        # Clear saved auth info
        clear_auth_info()
        
        # Clear collections
        context.scene.blenderbin_auth.selected_free_scripts.clear()
        context.scene.blenderbin_auth.selected_premium_scripts.clear()
        context.scene.blenderbin_free_scripts.clear()
        context.scene.blenderbin_scripts.clear()

        # Reset global states
        device_id = None
        addon_unlocked = False

        # Special handling for developer panel - unregister it first if it exists
        dev_module_name = "BLENDERBIN_PT_dev_panel"
        if dev_module_name in loaded_modules:
            module = loaded_modules[dev_module_name]
            try:
                # Get panels before unregistering
                panels_to_unregister = getattr(module, '__blenderbin_panels__', set())
                
                # Attempt to call unregister
                if hasattr(module, 'unregister'):
                    try:
                        module.unregister()
                        print("Unregistered developer panel")
                    except Exception as e:
                        print(f"Error unregistering developer module: {e}")
                
                # Force unregister any remaining panels
                for panel in panels_to_unregister:
                    try:
                        if hasattr(bpy.utils, "unregister_class"):
                            bpy.utils.unregister_class(panel)
                    except Exception as e:
                        print(f"Error unregistering developer panel {panel.__name__}: {e}")
                
                # Remove from loaded modules and sys.modules
                del loaded_modules[dev_module_name]
                if dev_module_name in sys.modules:
                    del sys.modules[dev_module_name]
                
                print("Developer panel cleanup complete")
                
            except Exception as e:
                print(f"Error during developer panel cleanup: {e}")

        # Now unload all other scripts
        modules_to_unload = list(loaded_modules.keys())
        for module_name in modules_to_unload:
            unload_script(module_name)
        loaded_script_paths.clear()

        # Clear credentials and UI
        delete_credentials()
        context.scene.blenderbin_auth.has_subscription = False
        context.area.tag_redraw()

        self.report({'INFO'}, "Logged out successfully.")
        return {'FINISHED'}

class MemoryScriptLoader:
    """Handles secure loading of encrypted and compressed Python scripts with IV support"""
    
    def __init__(self):
        self.key = b"rvh2imWO5XWSihxLbWRt6Daxg8ju9MUwHFbqo3VSYN0="
        self._loaded_script_data = None
        self.iv_size = 16  # 16-byte (128-bit) IV

    def clear_sensitive_data(self):
        """Clear sensitive data from memory"""
        if self._loaded_script_data:
            try:
                self._loaded_script_data = '\x00' * len(self._loaded_script_data)
                self._loaded_script_data = None
            except Exception as e:
                print(f"Error clearing script data: {e}")
        
    def _derive_key(self, salt, key_length=32):
        return hashlib.pbkdf2_hmac(
            'sha256', 
            self.key, 
            salt, 
            100000,
            dklen=key_length
        )
    
    def decrypt_script(self, encrypted_data):
        try:
            print(f"Decrypting data of type: {type(encrypted_data)}")
            
            if not isinstance(encrypted_data, (str, bytes)):
                print(f"Invalid data type for decryption: {type(encrypted_data)}")
                return None
                
            # Handle base64 string
            if isinstance(encrypted_data, str):
                try:
                    encrypted_data = encrypted_data.strip()
                    padding = len(encrypted_data) % 4
                    if padding:
                        encrypted_data += '=' * (4 - padding)
                    encrypted_data = base64.b64decode(encrypted_data)
                except Exception as e:
                    print(f"Base64 decode error: {str(e)}")
                    return None
            
            # Verify minimum length (salt + HMAC + IV + at least 1 byte data)
            min_length = 16 + 32 + self.iv_size + 1
            if len(encrypted_data) < min_length:
                print(f"Encrypted data too short: {len(encrypted_data)} bytes")
                return None
            
            # Extract components with IV
            salt = encrypted_data[:16]
            hmac_received = encrypted_data[16:48]
            iv = encrypted_data[48:48 + self.iv_size]
            ciphertext = encrypted_data[48 + self.iv_size:]
            
            print(f"Salt length: {len(salt)}, HMAC length: {len(hmac_received)}, IV length: {len(iv)}, Ciphertext length: {len(ciphertext)}")
            
            # Derive key
            derived_key = self._derive_key(salt)
            
            # Verify HMAC (include IV in verification)
            h = hmac.new(derived_key, iv + ciphertext, hashlib.sha256)
            if not hmac.compare_digest(h.digest(), hmac_received):
                print("HMAC verification failed")
                return None
            
            # Generate keystream using IV and decrypt
            keystream = self._generate_keystream(derived_key, iv, len(ciphertext))
            decrypted = bytes(a ^ b for a, b in zip(ciphertext, keystream))
            
            # Decompress
            try:
                print("Attempting to decompress decrypted data...")
                decompressed = gzip.decompress(decrypted)
                decrypted_text = decompressed.decode('utf-8')
                
                # Check for syntax issues and try to fix them
                try:
                    compile(decrypted_text, '<string>', 'exec')
                except SyntaxError as e:
                    print(f"Syntax error in decrypted script: {e}")
                    # Check for and fix common syntax issues
                    fixed_text = self._fix_syntax_issues(decrypted_text)
                    if fixed_text != decrypted_text:
                        # Verify fix worked
                        try:
                            compile(fixed_text, '<string>', 'exec')
                            print("Syntax issues fixed successfully")
                            return fixed_text
                        except SyntaxError as e2:
                            print(f"Syntax fix failed: {e2}")
                
                return decrypted_text
            except Exception as e:
                print(f"Decompression error: {str(e)}")
                return None
            
        except Exception as e:
            print(f"Decryption error: {str(e)}")
            if isinstance(encrypted_data, (str, bytes)):
                print(f"Encrypted data length: {len(encrypted_data)}")
            return None
            
    def _generate_keystream(self, key, iv, length):
        """Generate keystream using both key and IV"""
        result = bytearray()
        counter = 0
        while len(result) < length:
            counter_bytes = struct.pack('<Q', counter)
            # Include IV in keystream generation
            h = hashlib.sha256(key + iv + counter_bytes).digest()
            result.extend(h)
            counter += 1
        return bytes(result[:length])
    
    def _fix_syntax_issues(self, script_text):
        """Fix common syntax issues in script text"""
        fixed_text = script_text
        
        # Fix unbalanced parentheses
        open_parens = fixed_text.count('(')
        close_parens = fixed_text.count(')')
        if open_parens > close_parens:
            missing = open_parens - close_parens
            print(f"Adding {missing} missing closing parentheses")
            fixed_text += ')' * missing
        
        # Fix unbalanced brackets
        open_brackets = fixed_text.count('[')
        close_brackets = fixed_text.count(']')
        if open_brackets > close_brackets:
            missing = open_brackets - close_brackets
            print(f"Adding {missing} missing closing brackets")
            fixed_text += ']' * missing
        
        # Fix unbalanced braces
        open_braces = fixed_text.count('{')
        close_braces = fixed_text.count('}')
        if open_braces > close_braces:
            missing = open_braces - close_braces
            print(f"Adding {missing} missing closing braces")
            fixed_text += '}' * missing
        
        # Fix missing colons in class/function definitions
        lines = fixed_text.split('\n')
        for i, line in enumerate(lines):
            # Check for class/def lines that look like they need a colon
            if (line.lstrip().startswith('class ') or line.lstrip().startswith('def ')) and \
               not line.rstrip().endswith(':') and \
               not line.rstrip().endswith(',') and \
               not line.rstrip().endswith('\\'):
                lines[i] = line.rstrip() + ':'
                print(f"Added missing colon to line: {line}")
        
        # Check for incomplete string literals
        # This is complex and would need more advanced parsing
        
        return '\n'.join(lines)
        
    def load_script(self, response):
        """Load encrypted script data from server response"""
        try:
            print(f"load_script received data of type: {type(response)}")
            
            if isinstance(response, dict):
                if response.get('status') != 'success':
                    print(f"Error in response: {response}")
                    return False
                    
                encrypted_data = response.get('encrypted_data')
                print(f"Extracted encrypted_data from response: {type(encrypted_data)}")
                
                if not encrypted_data:
                    print("No encrypted_data found in response")
                    return False
            else:
                encrypted_data = response
            
            # Decrypt script with improved syntax checking and fixing
            decrypted_script = self.decrypt_script(encrypted_data)
            if not decrypted_script:
                print("Failed to decrypt script data")
                return False
            
            # Store the decrypted and fixed script
            self._loaded_script_data = decrypted_script
            print("Successfully loaded and decrypted script")
            return True
            
        except Exception as e:
            print(f"Error in load_script: {str(e)}")
            return False
            
    def get_loaded_script(self):
        return self._loaded_script_data

class MemoryBlendLoader:
    """Handles secure loading of encrypted and compressed blend files with IV support"""
    
    def __init__(self):
        self.key = b"5WbJosg6emIjSUNUemWRX8NQ63Xsc6L0mqtWlwjXePA="
        self._loaded_blend_data = None
        self.iv_size = 16  # 16-byte (128-bit) IV

    def clear_sensitive_data(self):
        """Clear sensitive data from memory"""
        if self._loaded_blend_data:
            try:
                self._loaded_blend_data = b'\x00' * len(self._loaded_blend_data)
                self._loaded_blend_data = None
            except Exception as e:
                print(f"Error clearing blend data: {e}")
        
    def _derive_key(self, salt, key_length=32):
        return hashlib.pbkdf2_hmac(
            'sha256', 
            self.key, 
            salt, 
            100000,
            dklen=key_length
        )
    
    def decrypt_file(self, encrypted_data):
        try:
            if isinstance(encrypted_data, str):
                encrypted_data = base64.b64decode(encrypted_data)
                
            # Verify minimum length
            min_length = 16 + 32 + self.iv_size + 1
            if len(encrypted_data) < min_length:
                print(f"Encrypted data too short: {len(encrypted_data)} bytes")
                return None
                
            # Extract components with IV
            salt = encrypted_data[:16]
            hmac_received = encrypted_data[16:48]
            iv = encrypted_data[48:48 + self.iv_size]
            ciphertext = encrypted_data[48 + self.iv_size:]
            
            derived_key = self._derive_key(salt)
            
            # Verify HMAC (include IV in verification)
            h = hmac.new(derived_key, iv + ciphertext, hashlib.sha256)
            if not hmac.compare_digest(h.digest(), hmac_received):
                print("HMAC verification failed")
                return None
            
            # Generate keystream using IV and decrypt
            keystream = self._generate_keystream(derived_key, iv, len(ciphertext))
            decrypted = bytes(a ^ b for a, b in zip(ciphertext, keystream))
            
            # Decompress
            decompressed = gzip.decompress(decrypted)
            return decompressed
            
        except Exception as e:
            print(f"Decryption error: {str(e)}")
            return None
    
    def _generate_keystream(self, key, iv, length):
        """Generate keystream using both key and IV"""
        result = bytearray()
        counter = 0
        while len(result) < length:
            counter_bytes = struct.pack('<Q', counter)
            # Include IV in keystream generation
            h = hashlib.sha256(key + iv + counter_bytes).digest()
            result.extend(h)
            counter += 1
        return bytes(result[:length])
            
    def load_blend(self, encrypted_data):
        try:
            decrypted_data = self.decrypt_file(encrypted_data)
            if not decrypted_data:
                print("Failed to decrypt blend file data")
                return False
                
            self._loaded_blend_data = decrypted_data
            
            with tempfile.NamedTemporaryFile(suffix='.blend', delete=False) as tmp_file:
                try:
                    tmp_file.write(self._loaded_blend_data)
                    tmp_file.flush()
                    
                    with bpy.data.libraries.load(tmp_file.name) as (data_from, data_to):
                        for attr in dir(data_to):
                            if not attr.startswith('__'):
                                setattr(data_to, attr, getattr(data_from, attr))
                finally:
                    try:
                        os.unlink(tmp_file.name)
                    except:
                        pass
            return True
            
        except Exception as e:
            print(f"Error loading blend file: {str(e)}")
            return False
            
    def get_loaded_blend_data(self):
        return self._loaded_blend_data
    
class BLENDERBIN_OT_UnloadScript(bpy.types.Operator):
    bl_idname = "object.blenderbin_unload_script"
    bl_label = "Unload Script"
    bl_description = "Unload and unregister the addon"

    script_path: bpy.props.StringProperty()

    def execute(self, context):
        script_name = os.path.splitext(os.path.basename(self.script_path))[0]
        module_name = f"blenderbin_script_{script_name}"
        if module_name in loaded_modules:
            unload_script(module_name)
            loaded_script_paths.discard(self.script_path)
            return {'FINISHED'}
        else:
            return {'CANCELLED'}
        
class BLENDERBIN_OT_ScriptBrowser(bpy.types.Operator):
    bl_idname = "object.blenderbin_script_browser"
    bl_label = "Script Browser"
    
    _free_scripts = []
    _premium_scripts = []
    _developer_scripts = []
    _scripts_loaded = False
    
    def load_scripts(self):
        if not self._scripts_loaded:
            print("Loading scripts for browser...")
            has_dev_panel = 'BLENDERBIN_PT_dev_panel' in sys.modules
            
            folder_paths = [
                'BACKEND/ADDON_LIBRARY/FREE_ADDONS/',
                'BACKEND/ADDON_LIBRARY/PREMIUM_ADDONS/'
            ]
            
            if has_dev_panel:
                folder_paths.append('BACKEND/ADDON_LIBRARY/TEST_ADDONS/')
            
            response = call_ec2('get_scripts_in_folder', method='POST', 
                              data={'folder_paths': folder_paths})
            
            if response and response.get('status') == 'success':
                script_data = response.get('scripts', {})
                self._free_scripts = script_data.get('BACKEND/ADDON_LIBRARY/FREE_ADDONS/', [])
                self._premium_scripts = script_data.get('BACKEND/ADDON_LIBRARY/PREMIUM_ADDONS/', [])
                if has_dev_panel:
                    self._developer_scripts = script_data.get('BACKEND/ADDON_LIBRARY/TEST_ADDONS/', [])
                
                # Create set of all available paths
                all_paths = set(self._free_scripts + self._premium_scripts + self._developer_scripts)
                
                # Clean up any cached scripts that are no longer available
                clean_invalid_cached_scripts(all_paths)
                
                # Also clean up favorites if needed
                current_email = get_current_user_email()
                if current_email:
                    props = bpy.context.scene.blenderbin_auth
                    
                    # Clean free scripts
                    invalid_free = [
                        item for item in props.selected_free_scripts 
                        if item.path not in all_paths
                    ]
                    for item in invalid_free:
                        idx = props.selected_free_scripts.find(item.name)
                        if idx >= 0:
                            props.selected_free_scripts.remove(idx)
                            delete_cached_script_content(item.path)
                            
                    # Clean premium scripts
                    invalid_premium = [
                        item for item in props.selected_premium_scripts 
                        if item.path not in all_paths
                    ]
                    for item in invalid_premium:
                        idx = props.selected_premium_scripts.find(item.name)
                        if idx >= 0:
                            props.selected_premium_scripts.remove(idx)
                            delete_cached_script_content(item.path)
                            
                    # Save updated favorites if any were removed
                    if invalid_free or invalid_premium:
                        favorites_data = {
                            'email': current_email,
                            'free_favorites': [
                                {'name': item.name, 'path': item.path}
                                for item in props.selected_free_scripts
                            ],
                            'premium_favorites': [
                                {'name': item.name, 'path': item.path}
                                for item in props.selected_premium_scripts
                            ]
                        }
                        with open(FAVORITES_FILE, 'w') as f:
                            json.dump(favorites_data, f, indent=2)
                
                print(f"Loaded {len(self._free_scripts)} free scripts, {len(self._premium_scripts)} premium scripts, and {len(self._developer_scripts)} developer scripts")
                self._scripts_loaded = True
            else:
                print(f"Failed to load scripts: {response.get('message') if response else 'Unknown error'}")
                
    def draw(self, context):
        layout = self.layout
        props = context.scene.blenderbin_auth
        
        has_dev_panel = 'BLENDERBIN_PT_dev_panel' in sys.modules
        column_factor = 0.33 if has_dev_panel else 0.5
        
        split = layout.split(factor=column_factor)
        
        # Free Scripts Column
        free_col = split.column()
        free_col.label(text="Free Addons", icon='FILE_SCRIPT')
        free_box = free_col.box()
        
        if self._free_scripts:
            for script in self._free_scripts:
                script_name = os.path.splitext(script.split('/')[-1])[0]
                row = free_box.row()
                row.scale_y = 1.5
                is_selected = any(s.path == script for s in props.selected_free_scripts)
                row.operator("object.toggle_script_selection", 
                           text=script_name,
                           icon='CHECKBOX_HLT' if is_selected else 'CHECKBOX_DEHLT',
                           depress=is_selected).script_data = f"free|{script}"
        else:
            free_box.label(text="Loading free scripts...")
        
        remaining_split = split.split(factor=0.5 if has_dev_panel else 1.0)
        
        # Premium Scripts Column
        premium_col = remaining_split.column()
        premium_col.label(text="Premium Addons", icon='SOLO_ON' if addon_unlocked else 'LOCKED')
        premium_box = premium_col.box()
        
        if not addon_unlocked:
            info_box = premium_box.box()
            info_box.scale_y = 1.5
            info_box.label(text="Sign in to unlock premium addons", icon='INFO')
            info_box.label(text="Visit BlenderBin.com to learn more")
        
        if self._premium_scripts:
            for script in self._premium_scripts:
                script_name = os.path.splitext(script.split('/')[-1])[0]
                row = premium_box.row()
                if addon_unlocked:
                    is_selected = any(s.path == script for s in props.selected_premium_scripts)
                    row.scale_y = 1.5
                    row.operator("object.toggle_script_selection",
                               text=script_name,
                               icon='CHECKBOX_HLT' if is_selected else 'CHECKBOX_DEHLT',
                               depress=is_selected).script_data = f"premium|{script}"
                else:
                    website_op = row.operator(
                        "object.blenderbin_open_script_website",
                        text=script_name,
                        icon='LOCKED'
                    )
                    website_op.script_name = script_name
        else:
            premium_box.label(text="Loading premium scripts...")
            
        # Developer Scripts Column
        if has_dev_panel:
            dev_col = remaining_split.column()
            dev_col.label(text="Developer Addons", icon='CONSOLE')
            dev_box = dev_col.box()
            
            if self._developer_scripts:
                for script in self._developer_scripts:
                    script_name = os.path.splitext(script.split('/')[-1])[0]
                    row = dev_box.row()
                    row.scale_y = 1.5
                    
                    # Check if script is selected in dev panel
                    is_selected = False
                    if hasattr(context.scene, "blenderbin_dev_auth"):
                        is_selected = any(s.path == script for s in context.scene.blenderbin_dev_auth.selected_dev_scripts)
                    
                    op = row.operator("object.toggle_script_selection",
                                    text=script_name,
                                    icon='CHECKBOX_HLT' if is_selected else 'CHECKBOX_DEHLT',
                                    depress=is_selected)
                    op.script_data = f"dev|{script}"
            else:
                dev_box.label(text="Loading developer scripts...")
    
    def execute(self, context):
        return {'FINISHED'}
    
    def invoke(self, context, event):
        self._scripts_loaded = False
        self.load_scripts()
        return context.window_manager.invoke_props_dialog(self, width=800)

class BLENDERBIN_OT_ToggleScriptSelection(bpy.types.Operator):
    bl_idname = "object.toggle_script_selection"
    bl_label = "Toggle Script"
    
    script_data: bpy.props.StringProperty()
    
    def execute(self, context):
        script_type, script_path = self.script_data.split('|')
        
        # Debug logging for premium script check
        if script_type == "premium":
            print(f"DEBUG: Premium script check - addon_unlocked: {addon_unlocked}")
            print(f"DEBUG: Premium script check - has_subscription (global): {has_subscription}")
            print(f"DEBUG: Premium script check - props.has_subscription: {context.scene.blenderbin_auth.has_subscription}")
        
        if script_type == "premium" and (not addon_unlocked or not has_subscription):
            self.report({'WARNING'}, "Please login to select premium addons")
            return {'CANCELLED'}
            
        props = context.scene.blenderbin_auth
        
        try:
            def add_script_to_collection(collection, target_collection, script_path):
                """Helper to add script to collections and handle caching"""
                item = collection.add()
                item.name = os.path.splitext(script_path.split('/')[-1])[0]
                item.path = script_path
                
                # Get icon
                icon_path = load_script_info(script_path)
                if os.path.isfile(icon_path):
                    item.icon = load_cached_image(icon_path)
                else:
                    item.icon = 'SCRIPT'
                    
                # Mirror to target collection
                new_item = target_collection.add()
                new_item.name = item.name
                new_item.path = item.path
                new_item.icon = item.icon
                
                # Handle caching - only download if no cache exists
                if not get_cached_script_content(script_path):
                    response = call_ec2('download_script', method='POST', data={
                        'bucket': S3_BUCKET_NAME,
                        'key': script_path,
                        'device_id': device_id
                    })
                    
                    if response and response.get('status') == 'success':
                        cache_script_content(script_path)
            
            if script_type == "dev":
                # Handle developer scripts
                if not hasattr(context.scene, "blenderbin_dev_auth"):
                    self.report({'ERROR'}, "Developer panel not initialized")
                    return {'CANCELLED'}
                    
                dev_props = context.scene.blenderbin_dev_auth
                dev_collection = dev_props.selected_dev_scripts
                
                # Check if script already exists
                existing = None
                for item in dev_collection:
                    if item.path == script_path:
                        existing = item
                        break
                
                if existing:
                    # Remove from collection and delete cached content
                    idx = dev_collection.find(existing.name)
                    if idx >= 0:
                        dev_collection.remove(idx)
                        delete_cached_script_content(script_path)
                else:
                    # Add to collection and handle caching
                    item = dev_collection.add()
                    item.name = os.path.splitext(script_path.split('/')[-1])[0]
                    item.path = script_path
                    
                    # Get icon
                    icon_path = load_script_info(script_path)
                    if os.path.isfile(icon_path):
                        item.icon = load_cached_image(icon_path)
                    else:
                        item.icon = 'SCRIPT'
                    
                    # Only download if no cache exists
                    if not get_cached_script_content(script_path):
                        response = call_ec2('download_script', method='POST', data={
                            'bucket': S3_BUCKET_NAME,
                            'key': script_path,
                            'device_id': device_id
                        })
                        
                        if response and response.get('status') == 'success':
                            cache_script_content(script_path)
                
                # Save dev favorites
                dev_favorites = [{
                    'name': item.name,
                    'path': item.path
                } for item in dev_collection]
                
                dev_favorites_file = os.path.join(tempfile.gettempdir(), "blenderbin_dev_favorites.json")
                with open(dev_favorites_file, 'w') as f:
                    json.dump(dev_favorites, f, indent=2)

            else:
                # Handle free/premium scripts
                collection = props.selected_free_scripts if script_type == "free" else props.selected_premium_scripts
                target_collection = context.scene.blenderbin_free_scripts if script_type == "free" else context.scene.blenderbin_scripts
                
                existing = None
                for item in collection:
                    if item.path == script_path:
                        existing = item
                        break
                        
                if existing:
                    # Remove from collections and delete cached content
                    idx = collection.find(existing.name)
                    if idx >= 0:
                        collection.remove(idx)
                        delete_cached_script_content(script_path)
                        
                    for i, titem in enumerate(target_collection):
                        if titem.path == script_path:
                            target_collection.remove(i)
                            break
                else:
                    # Add to collections and handle caching
                    add_script_to_collection(collection, target_collection, script_path)

                # Save favorites if addon is unlocked (session-based auth)
                if addon_unlocked:
                    # Get current user email from saved auth info for favorites file
                    email, _, _ = get_auth_info()
                    if email:
                        favorites_data = {
                            'email': email,
                            'free_favorites': [
                                {'name': item.name, 'path': item.path}
                                for item in props.selected_free_scripts
                            ],
                            'premium_favorites': [
                                {'name': item.name, 'path': item.path}
                                for item in props.selected_premium_scripts
                            ]
                        }
                        with open(FAVORITES_FILE, 'w') as f:
                            json.dump(favorites_data, f, indent=2)

            # Force UI refresh for both script browser and panels
            for window in context.window_manager.windows:
                for area in window.screen.areas:
                    area.tag_redraw()

            return {'FINISHED'}
            
        except Exception as e:
            print(f"Error in toggle script: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'CANCELLED'}
        
###############################################################################
# Panels
###############################################################################

class BLENDERBIN_PT_Options(bpy.types.Panel):
    bl_idname = "BLENDERBIN_PT_options"
    bl_label = "BlenderBin Options"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'BlenderBin'
    bl_order = 0
    bl_options = {'HIDE_HEADER'}
    
    def draw_header(self, context):
        img = bpy.data.images.get(IMAGE_NAME)
        if img and img.preview:
            self.layout.label(text="", icon_value=img.preview.icon_id)
        else:
            self.layout.label(text="")

    def draw(self, context):
        layout = self.layout
        props = context.scene.blenderbin_auth
        
        options_box = layout.box()
        options_col = options_box.column(align=True)
        options_col.scale_x = 0.7
        options_col.scale_y = 1.5
        
        options_col.prop(props, "use_subpanels", text="Use Subpanels")
        options_col.operator("object.blenderbin_script_browser", 
            icon='WINDOW', text="Browse Addon Library")
        
        if addon_unlocked:
            options_col.operator("object.logout_addon", 
                icon='QUIT', text="Logout")

class BLENDERBIN_PT_FreePanel(bpy.types.Panel):
    bl_idname = "BLENDERBIN_PT_free_panel"
    bl_label = "Free Downloaded Addons"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'BlenderBin'
    bl_order = 1

    def draw_header(self, context):
        img = bpy.data.images.get(IMAGE_NAME)  # Use the literal name instead of IMAGE_NAME
        if img and img.preview:
            self.layout.label(text="", icon_value=img.preview.icon_id)
        else:
            self.layout.label(text="")

    def draw(self, context):
        layout = self.layout
        props = context.scene.blenderbin_auth

        # Add search box
        search_box = layout.box()
        search_col = search_box.column(align=True)
        search_col.scale_x = 1
        search_col.scale_y = 1.3
        search_col.prop(props, "free_search_keyword", text="Search")

        # Get free scripts collection
        scripts_collection = context.scene.blenderbin_free_scripts
        search_keyword = props.free_search_keyword.strip().lower()

        # Filter scripts based on search
        filtered_items = [
            item for item in scripts_collection
            if search_keyword in item.name.strip().lower()
        ]

        plugins_box = layout.box()

        if filtered_items:
            for item in filtered_items:
                row = plugins_box.row(align=True)
                box = row.box()
                box.scale_x = 1.3
                box.scale_y = 1.3

                if item.path in loaded_script_paths:
                    split = box.split(factor=0.9, align=True)
                    button_col = split.row(align=True)
                    trash_col = split.row(align=True)
                else:
                    button_col = box.row(align=True)

                # Handle icon display
                if item.icon and item.icon != 'SCRIPT':
                    image = bpy.data.images.get(item.icon)
                    if image and image.preview:
                        button_col.label(icon_value=image.preview.icon_id)
                    else:
                        button_col.label(icon='SCRIPT')
                else:
                    button_col.label(icon='SCRIPT')

                # Add run button
                run_op = button_col.operator(
                    "object.blenderbin_run_free_script", 
                    text=item.name,
                    depress=(item.path in loaded_script_paths)
                )
                run_op.script_path = item.path

                # Add trash button if script is loaded
                if item.path in loaded_script_paths:
                    trash_op = trash_col.operator(
                        "object.blenderbin_unload_script",
                        text="",
                        icon='TRASH',
                        emboss=False
                    )
                    trash_op.script_path = item.path
        else:
            plugins_box.label(text="No plugins found. Add some from the Browse Available Addons menu.")

class BLENDERBIN_PT_Panel(bpy.types.Panel):
    bl_idname = "BLENDERBIN_PT_panel"
    bl_label = "Premium Downloaded Addons"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'BlenderBin'
    bl_order = 2

    def draw_header(self, context):
        img = bpy.data.images.get(IMAGE_NAME)  # Use the literal name instead of IMAGE_NAME 
        if img and img.preview:
            self.layout.label(text="", icon_value=img.preview.icon_id)
        else:
            self.layout.label(text="")

    def draw(self, context):
        layout = self.layout
        props = context.scene.blenderbin_auth

        print(f"Drawing premium panel. has_subscription: {props.has_subscription}, addon_unlocked: {addon_unlocked}")
        print(f"DEBUG: Global has_subscription variable: {has_subscription}")
        print(f"DEBUG: Props has_subscription: {props.has_subscription}")
        print(f"DEBUG: addon_unlocked: {addon_unlocked}")
        
        # Call debug function to get complete status
        debug_subscription_status()

        if not addon_unlocked:
            row_image = layout.row()
            row_image.alignment = 'CENTER'

            img = bpy.data.images.get(BIG_IMAGE_NAME)
            if img and img.preview:
                row_image.scale_y = 2
                row_image.scale_x = 1
                row_image.label(text="", icon_value=img.preview.icon_id)
            else:
                row_image.label(text="")

            row_text = layout.row()
            row_text.alignment = 'CENTER'
            row_text.label(text="Sign In to BlenderBin")
            row_text.scale_y = 1

            auth_box = layout.box()
            col = auth_box.column(align=True)
            col.scale_x = 1
            col.scale_y = 1.5

            # Check if authentication is in progress
            global auth_check_in_progress
            if auth_check_in_progress:
                col.label(text="Authentication in progress...", icon='SORTTIME')
                col.label(text="Please complete sign-in in your browser")
            else:
                split = col.split(factor=0.1, align=True)
                col_icon = split.column(align=True)
                col_icon.label(icon='LOCKED')
                col_text = split.column(align=True)
                col_text.operator("object.session_login", text="Sign In")

            layout.separator()

        else:
            search_box = layout.box()
            search_col = search_box.column(align=True)
            search_col.scale_x = 1
            search_col.scale_y = 1.3
            search_col.prop(props, "search_keyword", text="Search")

            if not props.has_subscription:
                box = layout.box()
                box.label(text="Premium Features Locked", icon='LOCKED')
                box.label(text="Subscribe to access premium addons")
                box.operator("wm.url_open", text="Get Premium Access").url = "https://blenderbin.com"
                
                search_keyword = props.search_keyword.strip().lower()
                filtered_items = [
                    item for item in context.scene.blenderbin_scripts
                    if search_keyword in item.name.strip().lower()
                ]
                for item in filtered_items:
                    row = box.row(align=True)
                    row.scale_x = 1.3
                    row.scale_y = 1.3
                    row.label(icon='LOCKED', text=item.name)
                return

            # img = bpy.data.images.get(IMAGE_NAME)
            # if img and img.preview:
            #     layout.separator()
            #     layout.label(text="Currently available:" , icon_value=img.preview.icon_id)

            plugins_box = layout.box()
            search_keyword = props.search_keyword.strip().lower()

            filtered_items = [
                item for item in props.selected_premium_scripts
                if search_keyword in item.name.strip().lower()
            ]

            if filtered_items:
                for item in filtered_items:
                    row = plugins_box.row(align=True)
                    box = row.box()
                    box.scale_x = 1.3
                    box.scale_y = 1.3

                    if item.path in loaded_script_paths:
                        split = box.split(factor=0.9, align=True)
                        button_col = split.row(align=True)
                        trash_col = split.row(align=True)
                    else:
                        button_col = box.row(align=True)

                    script_icon_name = item.icon
                    image = bpy.data.images.get(script_icon_name)
                    if image and image.preview:
                        script_icon_id = image.preview.icon_id
                        button_col.label(icon_value=script_icon_id)
                    else:
                        button_col.label(icon='SCRIPT')
                    
                    run_op = button_col.operator(
                        "object.blenderbin_run_script", 
                        text=item.name,
                        depress=(item.path in loaded_script_paths)
                    )
                    run_op.script_path = item.path

                    if item.path in loaded_script_paths:
                        trash_col.operator("object.blenderbin_unload_script", text="", icon='TRASH', emboss=False).script_path = item.path
            else:
                plugins_box.label(text="No matching plugins found.")

###############################################################################
# Reload UI
###############################################################################

def update_script_panels(context):
    """
    Clears and re-populates the UI panels based on what's in
    `selected_free_scripts` and `selected_premium_scripts`.
    Always calls get_script_icon_path (or load_script_info) so the icon
    gets re-downloaded or re-cached if missing.
    """
    props = context.scene.blenderbin_auth
    context.scene.blenderbin_free_scripts.clear()
    context.scene.blenderbin_scripts.clear()

    print("Updating script panels with saved favorites...")

    # Load free scripts
    for item in props.selected_free_scripts:
        new_item = context.scene.blenderbin_free_scripts.add()
        new_item.name = item.name
        new_item.path = item.path

        # Always ask get_script_icon_path/load_script_info for the real icon path
        icon_path = get_script_icon_path(item.path)
        if icon_path != 'SCRIPT' and os.path.isfile(icon_path):
            new_item.icon = load_cached_image(icon_path)
        else:
            new_item.icon = 'SCRIPT'

        print(f"Added free script: {new_item.name} with icon: {new_item.icon}")

    # Load premium scripts only if the user is unlocked
    if addon_unlocked:
        for item in props.selected_premium_scripts:
            new_item = context.scene.blenderbin_scripts.add()
            new_item.name = item.name
            new_item.path = item.path

            icon_path = get_script_icon_path(item.path)
            if icon_path != 'SCRIPT' and os.path.isfile(icon_path):
                new_item.icon = load_cached_image(icon_path)
            else:
                new_item.icon = 'SCRIPT'

            print(f"Added premium script: {new_item.name} with icon: {new_item.icon}")

    refresh_ui()

def reload_addon():
    global is_reloading
    if is_reloading:
        print("Addon is already reloading. Skipping additional reload request.")
        return
    is_reloading = True
    print("Scheduling BlenderBin addon reload...")
    bpy.app.timers.register(do_reload, first_interval=0.1)

def do_reload():
    global is_reloading
    try:
        print("Unregistering BlenderBin addon...")
        unregister()
        print("Registering BlenderBin addon...")
        register()
        print("BlenderBin addon reloaded successfully.")
    except Exception as e:
        print(f"Error during addon reload: {e}")
    is_reloading = False
    return None

def refresh_ui():
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            area.tag_redraw()

###############################################################################
# Persistant handlers
###############################################################################

@persistent
def on_exit_handler(dummy):
    save_all_to_file()
    clear_memory_cache()

@persistent
def on_file_load(dummy):
    print("Blender file loaded, re-loading from local favorites...")
    reload_addon()
    
    bpy.context.scene.blenderbin_scripts.clear()
    bpy.context.scene.blenderbin_free_scripts.clear()
    
    if addon_unlocked:
        email = get_current_user_email()
        if email:
            free_favs, premium_favs = load_favorites_from_local(email)
            props = bpy.context.scene.blenderbin_auth
            
            props.selected_free_scripts.clear()
            props.selected_premium_scripts.clear()
            
            for script_path in free_favs:
                item = props.selected_free_scripts.add()
                item.path = script_path
                item.name = os.path.splitext(script_path.split('/')[-1])[0]
                icon_path = load_script_info(script_path)
                if os.path.isfile(icon_path):
                    item.icon = load_cached_image(icon_path)
                else:
                    item.icon = 'SCRIPT'
            
            for script_path in premium_favs:
                item = props.selected_premium_scripts.add()
                item.path = script_path
                item.name = os.path.splitext(script_path.split('/')[-1])[0]
                icon_path = load_script_info(script_path)
                if os.path.isfile(icon_path):
                    item.icon = load_cached_image(icon_path)
                else:
                    item.icon = 'SCRIPT'
                        
            update_script_panels(bpy.context)
            print(f"Loaded favorites - Free: {len(free_favs)}, Premium: {len(premium_favs)}")
    
    refresh_ui()

@persistent
def on_new_file(dummy):
    print("New file created, reinitializing BlenderBin (local favorites only).")
    reload_addon()
    
    def perform_sync():
        if addon_unlocked:
            email = get_current_user_email()
            if email:
                props = bpy.context.scene.blenderbin_auth
                current_free_favs = [item.path for item in props.selected_free_scripts]
                current_premium_favs = [item.path for item in props.selected_premium_scripts]
                
                save_favorites_to_memory(email, current_free_favs, current_premium_favs)
                free_favs, premium_favs = load_favorites_from_local(email)
                
                props.selected_free_scripts.clear()
                props.selected_premium_scripts.clear()
                bpy.context.scene.blenderbin_scripts.clear()
                bpy.context.scene.blenderbin_free_scripts.clear()
                
                for script_path in free_favs:
                    item = props.selected_free_scripts.add()
                    item.path = script_path
                    item.name = os.path.splitext(script_path.split('/')[-1])[0]
                    icon_path = load_script_info(script_path)
                    if os.path.isfile(icon_path):
                        item.icon = load_cached_image(icon_path)
                    else:
                        item.icon = 'SCRIPT'
                    
                    panel_item = bpy.context.scene.blenderbin_free_scripts.add()
                    panel_item.name = item.name
                    panel_item.path = item.path
                    panel_item.icon = item.icon
                
                for script_path in premium_favs:
                    item = props.selected_premium_scripts.add()
                    item.path = script_path
                    item.name = os.path.splitext(script_path.split('/')[-1])[0]
                    icon_path = load_script_info(script_path)
                    if os.path.isfile(icon_path):
                        item.icon = load_cached_image(icon_path)
                    else:
                        item.icon = 'SCRIPT'
                    
                    panel_item = bpy.context.scene.blenderbin_scripts.add()
                    panel_item.name = item.name
                    panel_item.path = item.path
                    panel_item.icon = item.icon
                
                print("Reloaded favorites into UI for new file")
                refresh_ui()
        return None
    
    bpy.app.timers.register(perform_sync, first_interval=1.0)
    ensure_classes_registered()

@persistent 
def on_window_open(dummy):
    print("New Blender window opened, loading favorites from local only...")
    reload_addon()
    if addon_unlocked:
        email = get_current_user_email()
        if email:
            free_favs, premium_favs = load_favorites_from_local(email)
            update_script_panels(bpy.context)
    refresh_ui()
    ensure_classes_registered()

@persistent
def save_post_handler(dummy):
    print("Project saved, refreshing BlenderBin UI (local only).")
    refresh_ui()
    ensure_classes_registered()

@persistent
def load_post_handler(dummy):
    print("File loaded, reinitializing BlenderBin from local favorites.")
    refresh_ui()
    ensure_classes_registered()

@persistent
def save_handler(dummy):
    print("Project is being saved...")

@persistent
def save_favorites_handler(dummy):
    if addon_unlocked:
        email = get_current_user_email()
        if email:
            save_all_to_file()

@persistent
def load_handler(dummy):
    global is_initialized, initialization_attempted
    if not initialization_attempted:
        print("Initializing BlenderBin after file load (local favorites only)...")
        try:
            def delayed_init():
                def perform_login():
                    email, password = get_credentials()
                    if email and password:
                        print("Attempting auto-login with saved credentials (delayed init)...")
                        context = bpy.context
                        # Note: Session-based auth doesn't use email/password properties on the UI
                        
                        if bpy.ops.object.unlock_addon.poll():
                            result = bpy.ops.object.unlock_addon()
                            if result == {'FINISHED'}:
                                print("Delayed init login successful, loading local favorites & prefs...")
                                def load_favorites_and_prefs():
                                    try:
                                        use_subpanels = load_preferences_from_local(email)
                                        context.scene.blenderbin_auth.use_subpanels = use_subpanels
                                        
                                        free_favs, premium_favs = load_favorites_from_local(email)
                                        props = context.scene.blenderbin_auth
                                        
                                        props.selected_free_scripts.clear()
                                        props.selected_premium_scripts.clear()
                                        context.scene.blenderbin_scripts.clear()
                                        context.scene.blenderbin_free_scripts.clear()
                                        
                                        for script_path in free_favs:
                                            item = props.selected_free_scripts.add()
                                            item.path = script_path
                                            item.name = os.path.splitext(script_path.split('/')[-1])[0]
                                            icon_path = load_script_info(script_path)
                                            if os.path.isfile(icon_path):
                                                item.icon = load_cached_image(icon_path)
                                            else:
                                                item.icon = 'SCRIPT'
                                            panel_item = context.scene.blenderbin_free_scripts.add()
                                            panel_item.name = item.name
                                            panel_item.path = item.path
                                            panel_item.icon = item.icon
                                        
                                        if addon_unlocked:
                                            for script_path in premium_favs:
                                                item = props.selected_premium_scripts.add()
                                                item.path = script_path
                                                item.name = os.path.splitext(script_path.split('/')[-1])[0]
                                                icon_path = load_script_info(script_path)
                                                if os.path.isfile(icon_path):
                                                    item.icon = load_cached_image(icon_path)
                                                else:
                                                    item.icon = 'SCRIPT'
                                                panel_item = context.scene.blenderbin_scripts.add()
                                                panel_item.name = item.name
                                                panel_item.path = item.path
                                                panel_item.icon = item.icon
                                        
                                        print(f"Loaded favorites - Free: {len(free_favs)}, Premium: {len(premium_favs)}")
                                        def final_refresh():
                                            refresh_ui()
                                            return None
                                        bpy.app.timers.register(final_refresh, first_interval=0.5)
                                    except Exception as e:
                                        print(f"Error loading favorites and preferences: {str(e)}")
                                    return None
                                
                                bpy.app.timers.register(load_favorites_and_prefs, first_interval=1.0)
                    return None
                
                bpy.app.timers.register(perform_login, first_interval=2.0)
                return None
            
            bpy.app.timers.register(delayed_init, first_interval=1.0)
            is_initialized = True
        except Exception as e:
            print(f"Error during initialization: {e}")
        finally:
            initialization_attempted = True

@persistent
def ensure_addon_enabled(dummy):
    addon_name = __package__ or os.path.splitext(os.path.basename(__file__))[0]
    if not addon_name in bpy.context.preferences.addons:
        print(f"Re-enabling addon {addon_name}...")
        bpy.ops.preferences.addon_enable(module=addon_name)
        bpy.ops.wm.save_userpref()

@persistent
def sync_favorites_handler(dummy):
    def do_sync():
        if addon_unlocked:
            try:
                email = get_current_user_email()
                if email:
                    props = bpy.context.scene.blenderbin_auth
                    free_favs = [item.path for item in props.selected_free_scripts]
                    premium_favs = [item.path for item in props.selected_premium_scripts]
                    
                    print("Syncing favorites before operation...")
                    if save_favorites_to_memory(email, free_favs, premium_favs):
                        print("Favorites synced successfully")
                    else:
                        print("Failed to sync favorites, will retry...")
                        return 0.5
            except Exception as e:
                print(f"Error syncing favorites: {str(e)}")
                return 0.5
        return None
    
    bpy.app.timers.register(do_sync, first_interval=0.1)

###############################################################################
# Blender property groups, operators, panels, etc.
###############################################################################

class BlenderBinScriptItem(bpy.types.PropertyGroup):
    name: bpy.props.StringProperty(name="Script Name")
    path: bpy.props.StringProperty(name="Script Path")
    icon: bpy.props.StringProperty(name="Script Icon", default="SCRIPT")
    
class BlenderBinAuthProperties(bpy.types.PropertyGroup):
    search_keyword: bpy.props.StringProperty(
        name="Search",
        description="Search for a plugin.",
        update=lambda self, context: context.area.tag_redraw()
    )
    free_search_keyword: bpy.props.StringProperty(
        name="Search",
        description="Search for a free plugin.",
        update=lambda self, context: context.area.tag_redraw()
    )
    use_subpanels: bpy.props.BoolProperty(
        name="Use Subpanels",
        description="Display addons as subpanels (ON) or as separate N-panel tabs (OFF)",
        default=True,
        update=update_use_subpanels
    )
    has_subscription: bpy.props.BoolProperty(
        name="Has Subscription",
        description="Indicates if the user has a subscription",
        default=False
    )
    selected_free_scripts: bpy.props.CollectionProperty(type=BlenderBinScriptItem)
    selected_premium_scripts: bpy.props.CollectionProperty(type=BlenderBinScriptItem)

###############################################################################
# Trash used addons
###############################################################################

def unload_script(module_name):
    global loaded_modules, loaded_script_paths, blend_loader
    
    # Skip unloading developer panel during normal script operations
    if module_name == "BLENDERBIN_PT_dev_panel":
        return
    
    if module_name in loaded_modules:
        module = loaded_modules[module_name]
        
        try:
            panels_to_unregister = getattr(module, '__blenderbin_panels__', set())
            
            if hasattr(module, 'unregister'):
                try:
                    module.unregister()
                    print(f"Unregistered {module_name}")
                except Exception as e:
                    print(f"Error in module unregister: {e}")
            
            try:
                script_path = next((path for path in loaded_script_paths if module_name in path), None)
                if script_path:
                    script_response = call_ec2('download_script', method='POST', data={
                        'bucket': S3_BUCKET_NAME,
                        'key': script_path
                    })
                    if script_response and script_response.get('status') == 'success':
                        script_content = script_response.get('script_content')
                        blend_path = extract_blend_file_path(script_content)
                        
                        if blend_path:
                            for library in bpy.data.libraries:
                                if library.filepath == bpy.path.abspath("//"):
                                    for attr in dir(bpy.data):
                                        if not attr.startswith('__') and hasattr(bpy.data, attr):
                                            data_collection = getattr(bpy.data, attr)
                                            if hasattr(data_collection, "remove"):
                                                for item in data_collection:
                                                    if getattr(item, "library", None) == library:
                                                        data_collection.remove(item)
                                    bpy.data.libraries.remove(library)
                            print(f"Cleaned up blend file data from {blend_path}")
            except Exception as e:
                print(f"Error cleaning up blend file data: {e}")
            
            for panel in panels_to_unregister:
                try:
                    for attr in ['bl_parent_id', 'bl_region_type', 'bl_category', '_original_draw']:
                        if hasattr(panel, attr):
                            delattr(panel, attr)
                    if hasattr(bpy.utils, "unregister_class"):
                        bpy.utils.unregister_class(panel)
                except Exception as e:
                    print(f"Error unregistering panel {panel.__name__}: {e}")
            
            module_path = next((path for path in loaded_script_paths if module_name in path), None)
            if module_path:
                loaded_script_paths.discard(module_path)
            
            if module_name in sys.modules:
                del sys.modules[module_name]
            
            del loaded_modules[module_name]
            
        except Exception as e:
            print(f"Error during script unload: {e}")

    if addon_unlocked:
        email = get_current_user_email()
        if email:
            props = bpy.context.scene.blenderbin_auth
            free_favs = [item.path for item in props.selected_free_scripts]
            premium_favs = [item.path for item in props.selected_premium_scripts]
            save_favorites_to_memory(email, free_favs, premium_favs)

###############################################################################
# Register and unregister functions
###############################################################################

def register():
    global registered_classes, device_id, is_initialized
    device_id = get_device_id()
    
    try:
        check_script_versions()

        if download_image(IMAGE_URL, MAIN_IMAGE_PATH) and download_image(BIG_IMAGE_URL, BIG_MAIN_IMAGE_PATH):
            bpy.app.timers.register(load_main_icon, first_interval=1.0)

        if on_file_load not in bpy.app.handlers.load_post:
            bpy.app.handlers.load_post.append(on_file_load)
        if on_new_file not in bpy.app.handlers.load_post:
            bpy.app.handlers.load_post.append(on_new_file)
        if on_window_open not in bpy.app.handlers.load_post:
            bpy.app.handlers.load_post.append(on_window_open)
        bpy.app.handlers.save_pre.append(save_favorites_handler)
        if ensure_addon_enabled not in bpy.app.handlers.load_post:
            bpy.app.handlers.load_post.append(ensure_addon_enabled)
        if reload_addon not in bpy.app.handlers.load_post:
            bpy.app.handlers.load_post.append(reload_addon)

        bpy.app.handlers.save_pre.append(sync_favorites_handler)
        bpy.app.handlers.load_pre.append(sync_favorites_handler)

        print("Started device status checker")

        bpy.utils.register_class(BLENDERBIN_OT_OpenScriptWebsite)
        registered_classes.append(BLENDERBIN_OT_OpenScriptWebsite)

        bpy.utils.register_class(OBJECT_OT_device_switch_popup)
        registered_classes.append(OBJECT_OT_device_switch_popup)
        bpy.utils.register_class(OBJECT_OT_switch_device)
        registered_classes.append(OBJECT_OT_switch_device)
        bpy.utils.register_class(OBJECT_OT_cancel_switch)
        registered_classes.append(OBJECT_OT_cancel_switch)
        
        bpy.utils.register_class(BLENDERBIN_PT_FreePanel)
        registered_classes.append(BLENDERBIN_PT_FreePanel)
        bpy.utils.register_class(BLENDERBIN_OT_LoadFreeScripts)
        registered_classes.append(BLENDERBIN_OT_LoadFreeScripts)
        bpy.utils.register_class(BLENDERBIN_OT_RunFreeScript)
        registered_classes.append(BLENDERBIN_OT_RunFreeScript)
        bpy.utils.register_class(BLENDERBIN_OT_TrashFreeScripts)
        registered_classes.append(BLENDERBIN_OT_TrashFreeScripts)

        bpy.utils.register_class(BlenderBinScriptItem)
        registered_classes.append(BlenderBinScriptItem)
        
        bpy.utils.register_class(BLENDERBIN_OT_LoadScripts)
        registered_classes.append(BLENDERBIN_OT_LoadScripts)
        bpy.utils.register_class(BLENDERBIN_OT_RunScript)
        registered_classes.append(BLENDERBIN_OT_RunScript)
        
        bpy.utils.register_class(OBJECT_OT_session_login)
        registered_classes.append(OBJECT_OT_session_login)
        bpy.utils.register_class(OBJECT_OT_logout)
        registered_classes.append(OBJECT_OT_logout)
        bpy.utils.register_class(OBJECT_OT_debug_subscription)
        registered_classes.append(OBJECT_OT_debug_subscription)

        bpy.utils.register_class(BLENDERBIN_PT_Options)
        registered_classes.append(BLENDERBIN_PT_Options)
        bpy.utils.register_class(BLENDERBIN_PT_Panel)
        registered_classes.append(BLENDERBIN_PT_Panel)
        
        bpy.utils.register_class(BlenderBinAuthProperties)
        registered_classes.append(BlenderBinAuthProperties)

        bpy.utils.register_class(BLENDERBIN_OT_UnloadScript)
        registered_classes.append(BLENDERBIN_OT_UnloadScript)
        
        bpy.types.Scene.blenderbin_free_scripts = bpy.props.CollectionProperty(type=BlenderBinScriptItem)
        bpy.types.Scene.blenderbin_auth = bpy.props.PointerProperty(type=BlenderBinAuthProperties)
        bpy.types.Scene.blenderbin_scripts = bpy.props.CollectionProperty(type=BlenderBinScriptItem)

        bpy.utils.register_class(BLENDERBIN_OT_ScriptBrowser)
        registered_classes.append(BLENDERBIN_OT_ScriptBrowser)
        bpy.utils.register_class(BLENDERBIN_OT_ToggleScriptSelection)
        registered_classes.append(BLENDERBIN_OT_ToggleScriptSelection)

        bpy.app.handlers.save_post.append(save_post_handler)
        bpy.app.handlers.load_post.append(load_post_handler)
        if hasattr(bpy.app.handlers, 'quit_pre'):
            bpy.app.handlers.quit_pre.append(on_exit_handler)
        else:
            bpy.app.handlers.save_pre.append(on_exit_handler)
        
        bpy.app.timers.register(perform_auto_login, first_interval=0.1)

        if not is_initialized:
            addon_name = __name__.split('.')[0]
            bpy.ops.preferences.addon_enable(module=addon_name)
            if load_handler not in bpy.app.handlers.load_post:
                bpy.app.handlers.load_post.append(load_handler)

            bpy.app.timers.register(lambda: ensure_icons_loaded(bpy.context), first_interval=1.0)

        # Download the main images for use in the U
            
        addon_name = __name__
        bpy.utils.enable_addon(addon_name)

        def enable_addon():
            try:
                addon_name = __package__ or os.path.splitext(os.path.basename(__file__))[0]
                if not addon_name in bpy.context.preferences.addons:
                    print(f"Enabling addon {addon_name}...")
                    bpy.ops.preferences.addon_enable(module=addon_name)
                    bpy.ops.wm.save_userpref()
                    print(f"Addon {addon_name} enabled successfully")
                else:
                    print(f"Addon {addon_name} is already enabled")
                    
                if not is_initialized:
                    if load_handler not in bpy.app.handlers.load_post:
                        bpy.app.handlers.load_post.append(load_handler)
                    
                    bpy.app.timers.register(lambda: ensure_icons_loaded(bpy.context), first_interval=1.0)
                return None
            except Exception as e:
                print(f"Error enabling addon: {e}")
                return 1.0
            
        bpy.app.timers.register(enable_addon, first_interval=0.1)

        

    except Exception as e:
        print(f"Error during registration: {e}")

def unregister():
    global registered_classes, is_initialized

    if save_post_handler in bpy.app.handlers.save_post:
        bpy.app.handlers.save_post.remove(save_post_handler)
    if load_post_handler in bpy.app.handlers.load_post:
        bpy.app.handlers.load_post.remove(load_post_handler)
    if on_file_load in bpy.app.handlers.load_post:
        bpy.app.handlers.load_post.remove(on_file_load)
    if load_handler in bpy.app.handlers.load_post:
        bpy.app.handlers.load_post.remove(load_handler)
    if ensure_addon_enabled in bpy.app.handlers.load_post:
        bpy.app.handlers.load_post.remove(ensure_addon_enabled)
    if hasattr(bpy.app.handlers, 'quit_pre'):
        if on_exit_handler in bpy.app.handlers.quit_pre:
            bpy.app.handlers.quit_pre.remove(on_exit_handler)
    else:
        if on_exit_handler in bpy.app.handlers.save_pre:
            bpy.app.handlers.save_pre.remove(on_exit_handler)

    is_initialized = False

    try:
        if on_file_load in bpy.app.handlers.load_post:
            bpy.app.handlers.load_post.remove(on_file_load)
        if on_new_file in bpy.app.handlers.load_post:
            bpy.app.handlers.load_post.remove(on_new_file)
        if on_window_open in bpy.app.handlers.load_post:
            bpy.app.handlers.load_post.remove(on_window_open)
        if reload_addon in bpy.app.handlers.load_post:
            bpy.app.handlers.load_post.remove(reload_addon)
        bpy.app.handlers.save_post.remove(save_post_handler)
    except ValueError:
        print("Some handlers were not registered, skipping removal.")

    for cls in reversed(registered_classes):
        try:
            bpy.utils.unregister_class(cls)
        except RuntimeError:
            print(f"Failed to unregister {cls.__name__}, might already be unregistered")
    
    registered_classes.clear()

    try:
        del bpy.types.Scene.blenderbin_auth
        del bpy.types.Scene.blenderbin_scripts
        del bpy.types.Scene.blenderbin_free_scripts
    except AttributeError:
        pass

    modules_to_unload = list(loaded_modules.keys())
    for module_name in modules_to_unload:
        unload_script(module_name)

class OBJECT_OT_debug_subscription(bpy.types.Operator):
    bl_idname = "object.debug_subscription"
    bl_label = "Debug Subscription Status"
    bl_description = "Print detailed subscription status information"
    
    def execute(self, context):
        debug_subscription_status()
        return {'FINISHED'}

class OBJECT_OT_session_login(bpy.types.Operator):
    bl_idname = "object.session_login"
    bl_label = "Sign In"
    bl_description = "Sign in to access premium features"
    
    def execute(self, context):
        global auth_check_in_progress, check_attempts, last_auth_check_time
        
        auth_url = get_auth_url()
        
        # Reset any previous auth check state
        check_attempts = 0
        
        # Mark that we're starting a new auth check
        auth_check_in_progress = True
        last_auth_check_time = datetime.now()
        
        # Open browser to the login page with session ID
        webbrowser.open(auth_url)
        
        # Create a timer to poll for auth token from server
        if hasattr(bpy, "app") and hasattr(bpy.app, "timers") and hasattr(bpy.app.timers, "register"):
            bpy.app.timers.register(check_auth_status, first_interval=2.0)
        else:
            # If timers aren't available, we can't do polling, so show a message
            self.report({'INFO'}, "Authentication initiated. Please check the web browser and restart Blender after signing in.")
        
        self.report({'INFO'}, "Opening browser for authentication...")
        return {'FINISHED'}

if __name__ == "__main__":
    register()
