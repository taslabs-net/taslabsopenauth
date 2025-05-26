# WordPress Taslabs ID Integration Setup

## Quick Setup Steps

### 1. Add the Code
Copy the contents of `wordpress-oauth-integration.php` and add it to your WordPress site in one of these ways:

**Option A: Add to theme's functions.php**
```php
// Add the code to: wp-content/themes/your-theme/functions.php
```

**Option B: Create a custom plugin**
1. Create file: `wp-content/plugins/taslabs-oauth/taslabs-oauth.php`
2. Add plugin header:
```php
<?php
/**
 * Plugin Name: Taslabs OAuth
 * Description: Integrate with Taslabs ID OAuth server
 * Version: 1.0
 */

// Add the integration code here
```

### 2. Configuration
The code is pre-configured for:
- **OAuth Server**: `https://auth.taslabs.net`
- **Client ID**: `wordpress-site`
- **Callback URL**: `https://test.schenanigans.dev/taslabs-oauth-callback`

### 3. User Experience

**For Visitors:**
1. Go to `/wp-admin` or `/wp-login.php`
2. See "🔐 Sign in with Taslabs ID" button
3. Click → Redirected to auth.taslabs.net
4. Enter email → Get verification code via email
5. Enter code → Redirected back to WordPress, logged in

**For Content:**
Use shortcode anywhere: `[taslabs_login]`

### 4. Features Included

✅ **Auto-creates WordPress users** from Taslabs ID  
✅ **Links existing users** by email  
✅ **Stores Taslabs ID** in user profile  
✅ **Verification status** tracking  
✅ **Login button** on wp-login.php  
✅ **Shortcode** for anywhere: `[taslabs_login]`  
✅ **User profile** shows Taslabs ID info  

### 5. Security
- Only allows `wordpress-site` client ID
- Validates callback URLs
- Creates secure WordPress sessions
- Stores Taslabs ID for future reference

## Testing
1. Visit: `https://test.schenanigans.dev/wp-admin`
2. Should see Taslabs ID login button
3. Click to test OAuth flow

## Troubleshooting
- Check WordPress error logs
- Verify callback URL matches exactly
- Ensure OAuth server allows `wordpress-site` client