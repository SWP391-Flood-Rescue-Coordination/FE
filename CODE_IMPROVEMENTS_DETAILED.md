# 🔧 CODE IMPROVEMENT GUIDE - SPECIFIC FIXES

**Project:** Flood Rescue Coordination System  
**Generated:** April 5, 2026

---

## 📝 QUICK REFERENCE TABLE

| Issue | Severity | File(s) | Lines to Fix | Time |
|-------|----------|---------|--------------|------|
| Hardcoded JWT Secret | 🔴 CRITICAL | appsettings.json | All | 15 min |
| DB Password exposed | 🔴 CRITICAL | appsettings.json | All | 10 min |
| No error handling in Login | 🔴 CRITICAL | Login.jsx | Handler | 20 min |
| No refresh token implementation | 🔴 CRITICAL | api.js | Interceptor | 45 min |
| No protected routes | 🟡 HIGH | App.jsx | Router | 30 min |
| No input validation (Login) | 🟡 HIGH | Login.jsx | Handler | 25 min |
| No input validation (Register) | 🟡 HIGH | Register.jsx | Handler | 25 min |
| No error boundaries | 🟡 HIGH | App.jsx | Root | 30 min |
| localStorage not validated | 🟠 MEDIUM | Multiple | Read ops | 40 min |
| No timeout on API calls | 🟠 MEDIUM | api.js | Config | 5 min |
| No request logging | 🟠 MEDIUM | api.js | Interceptor | 20 min |
| CORS not configured | 🟠 MEDIUM | Program.cs | Startup | 15 min |
| No rate limiting | 🟠 MEDIUM | Program.cs | Middleware | 30 min |

---

## 🔐 SECURITY FIXES

### Fix #1: Remove Hardcoded Secrets from appsettings.json

**Status:** 🔴 **CRITICAL**  
**Severity:** Exposed secrets in version control

#### Problem
```json
// ❌ EXPOSED - DO NOT COMMIT
{
  "JwtSettings": {
    "SecretKey": "YourSuperSecretKeyForFloodRescueCoordination2026!@#$%^&*()"
  },
  "ConnectionStrings": {
    "DefaultConnection": "Server=DESKTOP-BRMBEND;Database=DisasterRescueReliefDB;User Id=sa;Password=12345;"
  }
}
```

#### Solution

**Step 1: Create appsettings.json with placeholders**
```json
{
  "JwtSettings": {
    "SecretKey": "${JWT_SECRET_KEY}",
    "Issuer": "FloodRescueCoordination",
    "Audience": "FloodRescueCoordinationUsers",
    "AccessTokenExpirationMinutes": 60,
    "RefreshTokenExpirationDays": 7
  },
  "ConnectionStrings": {
    "DefaultConnection": "${DB_CONNECTION_STRING}"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "AspNetCore": "Warning"
    }
  },
  "ResendSettings": {
    "ApiKey": "${RESEND_API_KEY}",
    "FromEmail": "${RESEND_FROM_EMAIL}"
  }
}
```

**Step 2: Add to .gitignore**
```
appsettings.Production.json
appsettings.Development.json
.env
.env.local
user-secrets
```

**Step 3: Use environment variables in Program.cs**
```csharp
var builder = WebApplicationBuilder.CreateBuilder(args);

// Add environment variables
builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile("appsettings.Development.json", optional: true)
    .AddEnvironmentVariables()
    .AddUserSecrets<Program>(); // For development

var app = builder.Build();

// Retrieve from configuration (which now comes from env vars in production)
var jwtSecret = app.Configuration["JwtSettings:SecretKey"] 
    ?? throw new InvalidOperationException("JWT secret not configured");
var connectionString = app.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Database connection string not configured");
```

**Step 4: For Development (User Secrets)**
```bash
# In terminal at project root
dotnet user-secrets set "JwtSettings:SecretKey" "YourDevelopmentSecret123!@#"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Database=TestDB;User Id=sa;Password=devPassword!1;"
```

**Step 5: For Production (Environment Variables)**
```bash
# Set in your hosting environment (Azure, Docker, etc.)
export JWT_SECRET_KEY="YourProductionSecret$(openssl rand -base64 32)"
export DB_CONNECTION_STRING="Server=prod-server;Database=ProdDB;User Id=sa;Password=SECURE_PASSWORD;"
export RESEND_API_KEY="re_xxx..."
```

---

### Fix #2: Configure CORS Properly

**Status:** 🟠 **MEDIUM**  
**File:** `Program.cs`

#### Problem
```csharp
// ❌ Current - potentially insecure
app.UseCors(); // Default CORS might not be configured properly
```

#### Solution
```csharp
// In ConfigureServices
var builder = WebApplicationBuilder.CreateBuilder(args);

// Define allowed origins based on environment
var allowedOrigins = builder.Environment.IsProduction()
    ? new[] { "https://yourdomain.com" }
    : new[] { "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", builder =>
        builder
            .WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .WithExposedHeaders("X-Total-Count", "X-Page-Number") // For pagination
    );
});

// In Configure middleware
var app = builder.Build();
app.UseCors("AllowFrontend");
```

---

### Fix #3: Add Rate Limiting

**Status:** 🟠 **MEDIUM**  
**File:** `Program.cs`

#### Solution
```csharp
using System.Threading.RateLimiting;

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Global limit: 1000 requests per minute per IP
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 1000,
                Window = TimeSpan.FromMinutes(1)
            }
        )
    );
});

// Per-endpoint limits
options.AddPolicy("Login", context =>
    RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: partition => new FixedWindowRateLimiterOptions
        {
            AutoReplenishment = true,
            PermitLimit = 5, // 5 attempts
            Window = TimeSpan.FromMinutes(15) // per 15 minutes
        }
    )
);

// In Configure middleware
var app = builder.Build();
app.UseRateLimiter();

// Apply to endpoint
app.MapPost("/api/auth/login", LogInAsync)
    .WithName("Login")
    .Accepts<LoginRequest>("application/json")
    .RequireRateLimiting("Login");
```

---

### Fix #4: Add Input Validation Middleware

**Status:** 🟡 **HIGH**  
**File:** Create `Middleware/ValidationMiddleware.cs`

#### Solution
```csharp
// Middleware/ValidationMiddleware.cs
public class ValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ValidationMiddleware> _logger;

    public ValidationMiddleware(RequestDelegate next, ILogger<ValidationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Log all requests
        _logger.LogInformation("Request: {Method} {Path} from {RemoteIP}",
            context.Request.Method,
            context.Request.Path,
            context.Connection.RemoteIpAddress);

        // Validate headers
        if (context.Request.Method != "GET" && 
            !context.Request.Headers.ContainsKey("Content-Type"))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new { error = "Content-Type header required" });
            return;
        }

        // Validate request size
        const long maxContentLength = 10 * 1024 * 1024; // 10 MB
        if (context.Request.ContentLength > maxContentLength)
        {
            context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
            await context.Response.WriteAsJsonAsync(new { error = "Request body too large" });
            return;
        }

        await _next(context);
    }
}

// In Program.cs
app.UseMiddleware<ValidationMiddleware>();
```

---

### Fix #5: Sanitize and Validate Inputs in Controllers

**Status:** 🟡 **HIGH**  
**File:** `API/Controllers/AuthController.cs`

#### Solution
```csharp
using System.ComponentModel.DataAnnotations;

public class LoginRequest
{
    [Required(ErrorMessage = "Phone is required")]
    [RegularExpression(@"^\d{10}$", ErrorMessage = "Phone must be exactly 10 digits")]
    public string Phone { get; set; }

    [Required(ErrorMessage = "Password is required")]
    [StringLength(100, MinimumLength = 6, 
        ErrorMessage = "Password must be between 6 and 100 characters")]
    public string Password { get; set; }
}

public class RegisterRequest
{
    [Required]
    [RegularExpression(@"^\d{10}$", ErrorMessage = "Invalid phone format")]
    public string Phone { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Name required")]
    public string FullName { get; set; }

    [Required]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    public string Email { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters")]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])", 
        ErrorMessage = "Password must contain uppercase, lowercase, number, and special character")]
    public string Password { get; set; }
}

// In controller
[HttpPost("login")]
public async Task<IActionResult> Login([FromBody] LoginRequest request)
{
    // ModelState validation happens automatically
    if (!ModelState.IsValid)
        return BadRequest(ModelState);

    try
    {
        var result = await _authService.LoginAsync(request.Phone, request.Password);
        return Ok(result);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Login failed for phone: {Phone}", request.Phone);
        return BadRequest(new { error = "Login failed" });
    }
}
```

---

## 🎯 FRONTEND FIXES

### Fix #6: Add Error Handling to Login Component

**Status:** 🔴 **CRITICAL**  
**File:** `src/components/Login.jsx`

#### Current Code (❌ Problematic)
```javascript
const handleLogin = async (e) => {
  e.preventDefault();
  const response = await authService.login(phone, password);
  localStorage.setItem('accessToken', response.data.accessToken);
  localStorage.setItem('refreshToken', response.data.refreshToken);
  localStorage.setItem('user', JSON.stringify(response.data.user));
  navigate('/');
};
```

#### Fixed Code (✅ Robust)
```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const validateInputs = () => {
    if (!phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!/^\d{10}$/.test(phone)) {
      setError('Phone must be exactly 10 digits');
      return false;
    }
    if (!password) {
      setError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Client-side validation
      if (!validateInputs()) {
        setIsLoading(false);
        return;
      }

      // Call API
      const response = await authService.login(phone, password);

      // Validate response
      if (!response?.data?.accessToken) {
        setError('Invalid response from server');
        return;
      }

      // Store tokens safely
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Navigate to appropriate dashboard based on role
      const role = response.data.user.role;
      const dashboards = {
        'ADMIN': '/admin',
        'COORDINATOR': '/rescue-coordinator',
        'MANAGER': '/manager',
        'RESCUE_TEAM': '/rescue-team',
        'CITIZEN': '/'
      };
      const redirectUrl = dashboards[role] || '/';
      navigate(redirectUrl);

    } catch (err) {
      console.error('Login error:', err);
      
      // Handle specific error types
      if (err.response?.status === 401) {
        setError('Invalid phone or password');
      } else if (err.response?.status === 429) {
        setError('Too many login attempts. Please try again later.');
      } else if (err.response?.status === 503) {
        setError('Service temporarily unavailable. Please try again.');
      } else if (err.code === 'ECONNABORTED') {
        setError('Request timeout. Please check your connection.');
      } else if (err.request && !err.response) {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin}>
        <h2>Login</h2>

        {error && (
          <div className="error-alert" role="alert">
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="Enter 10-digit phone"
            disabled={isLoading}
            required
            aria-invalid={error ? 'true' : 'false'}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              required
              aria-invalid={error ? 'true' : 'false'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="password-toggle"
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="login-button"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        <div className="form-links">
          <a href="/forgot-password">Forgot Password?</a>
          <a href="/register">New User? Register</a>
        </div>
      </form>
    </div>
  );
}
```

---

### Fix #7: Add Protected Routes Component

**Status:** 🟡 **HIGH**  
**File:** Create `src/components/ProtectedRoute.jsx`

#### Solution
```javascript
// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ allowedRoles = [] }) {
  // Get user from localStorage safely
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const token = localStorage.getItem('accessToken');

  // No token = not authenticated
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.warn(`User role ${user.role} not allowed. Required: ${allowedRoles.join(', ')}`);
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

// Usage in App.jsx:
// <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
//   <Route path="/admin" element={<AdminPage />} />
// </Route>
```

---

### Fix #8: Add Error Boundary Component

**Status:** 🟡 **HIGH**  
**File:** Create `src/components/ErrorBoundary.jsx`

#### Solution
```javascript
// src/components/ErrorBoundary.jsx
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary-container">
          <h1>⚠️ Something went wrong</h1>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage in App.jsx:
// <ErrorBoundary>
//   <Routes>
//     ...
//   </Routes>
// </ErrorBoundary>
```

---

### Fix #9: Add Timeout and Retry Logic to API Client

**Status:** 🟠 **MEDIUM**  
**File:** `src/services/api.js`

#### Current Code (❌ Problematic)
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

#### Fixed Code (✅ Robust)
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Retry configuration
const MAX_RETRIES = 3;
let retryCount = 0;

// Request interceptor
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers.Authorization !== false) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[API] ${config.method.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  response => {
    // Log successful response
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[API] ✓ ${response.status} ${response.config.url}`);
    }
    retryCount = 0; // Reset retry count on success
    return response;
  },
  async error => {
    const config = error.config;

    if (!config) return Promise.reject(error);

    // Handle 401 - Clear auth and redirect
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Retry on network errors (not 4xx/5xx responses)
    if (!error.response && retryCount < MAX_RETRIES) {
      retryCount += 1;
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[API] Retrying after ${delay}ms (attempt ${retryCount})`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(config);
    }

    // Log error
    console.error(`[API] ✗ Error in ${config.method.toUpperCase()} ${config.url}:`, error.message);

    return Promise.reject(error);
  }
);

export default api;
```

---

### Fix #10: Validate localStorage Data

**Status:** 🟠 **MEDIUM**  
**File:** Create `src/utils/storage.js`

#### Solution
```javascript
// src/utils/storage.js

/**
 * Safe wrapper for localStorage operations with validation
 */
export const StorageUtils = {
  /**
   * Get and validate user object
   */
  getUser: () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;

      const user = JSON.parse(userStr);

      // Validate required fields
      if (!user.id || !user.role || !user.phone) {
        console.warn('Invalid user object in localStorage');
        StorageUtils.clearAuth();
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      StorageUtils.clearAuth();
      return null;
    }
  },

  /**
   * Get and validate tokens
   */
  getTokens: () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!accessToken || !refreshToken) {
      return null;
    }

    // Basic JWT validation (check if properly formatted)
    if (!isValidJwt(accessToken) || !isValidJwt(refreshToken)) {
      console.warn('Invalid token format');
      StorageUtils.clearAuth();
      return null;
    }

    return { accessToken, refreshToken };
  },

  /**
   * Save authentication data
   */
  setAuth: (accessToken, refreshToken, user) => {
    try {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save auth data:', error);
      throw new Error('localStorage quota exceeded');
    }
  },

  /**
   * Clear authentication data
   */
  clearAuth: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  /**
   * Get guest request context (with validation)
   */
  getGuestContext: () => {
    try {
      const context = localStorage.getItem('guestRescueRequestTracking');
      if (!context) return null;

      const parsed = JSON.parse(context);
      
      // Validate structure
      if (!parsed.requestId || !parsed.timestamp) {
        return null;
      }

      // Check if not expired (24 hours)
      const age = Date.now() - parsed.timestamp;
      if (age > 24 * 60 * 60 * 1000) {
        StorageUtils.clearGuestContext();
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Error parsing guest context:', error);
      return null;
    }
  },

  /**
   * Save guest request context
   */
  setGuestContext: (context) => {
    try {
      localStorage.setItem(
        'guestRescueRequestTracking',
        JSON.stringify({
          ...context,
          timestamp: Date.now()
        })
      );
    } catch (error) {
      console.error('Failed to save guest context:', error);
    }
  },

  /**
   * Clear guest context
   */
  clearGuestContext: () => {
    localStorage.removeItem('guestRescueRequestTracking');
    localStorage.removeItem('guestRescueRequestDetails');
  }
};

/**
 * Validate JWT format (basic check)
 */
function isValidJwt(token) {
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

export default StorageUtils;
```

**Usage Example:**
```javascript
// Instead of:
const user = JSON.parse(localStorage.getItem('user'));

// Use:
import StorageUtils from '../utils/storage';
const user = StorageUtils.getUser(); // Safe, validated
```

---

### Fix #11: Add Request Timeout to api.js

**Status:** 🟠 **MEDIUM**  
**Already covered in Fix #9**

---

### Fix #12: Add Input Sanitization to RequestForm

**Status:** 🟠 **MEDIUM**  
**File:** `src/components/RequestForm.jsx`

#### Current Code (❌ Problematic)
```javascript
<textarea 
  value={description}
  onChange={(e) => setDescription(e.target.value)} 
/>
```

#### Fixed Code (✅ Safe)
```javascript
// Install: npm install dompurify

import DOMPurify from 'dompurify';

const sanitizeInput = (input) => {
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: []
  });
};

const validateCoordinates = (lat, lng) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return false;
  }

  // Vietnam coordinates range (rough bounds)
  return (
    latitude >= 8 && latitude <= 24 &&
    longitude >= 102 && longitude <= 110
  );
};

export default function RequestForm() {
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [errors, setErrors] = useState({});

  const handleDescriptionChange = (e) => {
    const sanitized = sanitizeInput(e.target.value);
    setDescription(sanitized);
  };

  const handleCoordinateChange = (field, value) => {
    const numValue = value.replace(/[^\d.-]/g, '');
    if (field === 'latitude') setLatitude(numValue);
    if (field === 'longitude') setLongitude(numValue);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!latitude || !longitude) {
      newErrors.location = 'Location coordinates are required';
    } else if (!validateCoordinates(latitude, longitude)) {
      newErrors.location = 'Invalid location (outside Vietnam)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await requestService.createRequest({
        description: sanitizeInput(description),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      });
    } catch (error) {
      setErrors({ submit: 'Failed to submit request' });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="description">Situation Description</label>
        <textarea
          id="description"
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Describe the situation (min 10 characters)"
          maxLength={500}
          required
        />
        {errors.description && <span className="error">{errors.description}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="latitude">Latitude</label>
        <input
          id="latitude"
          type="text"
          value={latitude}
          onChange={(e) => handleCoordinateChange('latitude', e.target.value)}
          placeholder="e.g., 10.7769"
          required
        />
        {errors.location && <span className="error">{errors.location}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="longitude">Longitude</label>
        <input
          id="longitude"
          type="text"
          value={longitude}
          onChange={(e) => handleCoordinateChange('longitude', e.target.value)}
          placeholder="e.g., 106.7009"
          required
        />
      </div>

      <button type="submit">Submit Request</button>
    </form>
  );
}
```

---

## 🧪 TESTING EXAMPLES

### Fix #13: Add Unit Test for authService

**Status:** ✅ **RECOMMENDED**  
**File:** Create `src/services/__tests__/authService.test.js`

#### Solution
```javascript
// src/services/__tests__/authService.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import authService from '../authService';
import api from '../api';

// Mock the api module
vi.mock('../api');

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('validateLoginInput', () => {
    it('should reject invalid phone', () => {
      expect(() => authService.validateLoginInput('123', 'password'))
        .toThrow('Invalid phone format');
    });

    it('should reject short password', () => {
      expect(() => authService.validateLoginInput('0123456789', '123'))
        .toThrow('Invalid password');
    });

    it('should accept valid inputs', () => {
      expect(() => authService.validateLoginInput('0123456789', 'password123'))
        .not.toThrow();
    });
  });

  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      const mockResponse = {
        data: {
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh',
          user: { id: 1, role: 'CITIZEN' }
        }
      };

      api.post.mockResolvedValue(mockResponse);

      await authService.login('0123456789', 'password123');

      expect(localStorage.getItem('accessToken')).toBe('mock-token');
      expect(localStorage.getItem('refreshToken')).toBe('mock-refresh');
    });

    it('should throw error on login failure', async () => {
      const mockError = new Error('Bad credentials');
      api.post.mockRejectedValue(mockError);

      await expect(authService.login('0123456789', 'wrong-password'))
        .rejects.toThrow('Bad credentials');
    });
  });

  describe('logout', () => {
    it('should clear localStorage on logout', () => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('user', JSON.stringify({ id: 1 }));

      authService.logout();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });
});
```

**Run tests:**
```bash
npm run test
```

---

## 📱 DATABASE INDEXES

### Fix #14: Add Missing Database Indexes

**Status:** 🟠 **MEDIUM**  
**File:** Create new migration or add to `database.sql`

#### Solution
```sql
-- Add performance indexes
CREATE INDEX idx_user_phone ON [Users](Phone);
CREATE INDEX idx_user_email ON [Users](Email);
CREATE INDEX idx_rescuerequest_status ON [RescueRequests](Status);
CREATE INDEX idx_rescuerequest_date ON [RescueRequests](CreatedDate DESC);
CREATE INDEX idx_rescueoperation_team ON [RescueOperations](TeamId);
CREATE INDEX idx_rescueoperation_status ON [RescueOperations](Status);
CREATE INDEX idx_stockhistory_date ON [StockHistory](CreatedDate DESC);
CREATE INDEX idx_stockhistory_itemid ON [StockHistory](ReliefItemId);
CREATE INDEX idx_vehicle_type ON [Vehicles](VehicleTypeId);

-- Composite indexes for common queries
CREATE INDEX idx_rescuerequest_status_date ON [RescueRequests](Status, CreatedDate DESC);
CREATE INDEX idx_user_role_status ON [Users](Role, IsActive);
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment Checks

#### Backend
- [ ] All secrets moved to environment variables
- [ ] CORS properly configured for production domain
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Database migrations applied
- [ ] Error handling added to all service methods
- [ ] Logging configured (Serilog or similar)
- [ ] Health check endpoint working
- [ ] API documentation updated (Swagger)

#### Frontend
- [ ] Error boundaries installed
- [ ] Protected routes configured
- [ ] localStorage validation implemented
- [ ] Input sanitization on all forms
- [ ] Build verified: `npm run build`
- [ ] Environment variables configured in `.env.production`
- [ ] Source maps disabled for production
- [ ] Service workers configured (if needed)

#### Infrastructure
- [ ] Database backups configured
- [ ] SSL certificates installed
- [ ] CDN configured for static assets
- [ ] Monitoring/alerting set up
- [ ] Log aggregation configured

---

## 📚 LEARNING RESOURCES

| Topic | Resource | Time |
|-------|----------|------|
| **JWT Security** | https://tools.ietf.org/html/rfc8725 | 30 min |
| **OWASP Top 10** | https://owasp.org/www-project-top-ten/ | 1 hour |
| **React Security** | https://cheatsheetseries.owasp.org/cheatsheets/React_Security_Cheat_Sheet.html | 45 min |
| **ASP.NET Core Security** | https://learn.microsoft.com/en-us/aspnet/core/security/ | 2 hours |
| **Testing React** | https://testing-library.com/docs/react-testing-library/intro/ | 2 hours |

---

**Status:** Ready for Implementation  
**Next Steps:** Prioritize fixes by severity and implement unit by unit

