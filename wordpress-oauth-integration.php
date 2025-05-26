<?php
/**
 * WordPress Taslabs ID OAuth Integration
 * Add this to your WordPress theme's functions.php or as a plugin
 */

// OAuth Configuration
define('TASLABS_OAUTH_URL', 'https://auth.taslabs.net');
define('TASLABS_CLIENT_ID', 'wordpress-site');
define('TASLABS_REDIRECT_URI', home_url('/taslabs-oauth-callback'));

// Add login button to WordPress login page
add_action('login_form', 'taslabs_add_oauth_button');
function taslabs_add_oauth_button() {
    $oauth_url = TASLABS_OAUTH_URL . '/authorize?' . http_build_query([
        'client_id' => TASLABS_CLIENT_ID,
        'response_type' => 'code',
        'redirect_uri' => TASLABS_REDIRECT_URI,
        'scope' => 'email'
    ]);
    
    echo '<div style="margin: 20px 0; text-align: center;">';
    echo '<a href="' . esc_url($oauth_url) . '" class="button button-primary" style="width: 100%; padding: 10px; text-decoration: none;">';
    echo '🔐 Sign in with Taslabs ID';
    echo '</a>';
    echo '</div>';
}

// Handle OAuth callback
add_action('init', 'taslabs_handle_oauth_callback');
function taslabs_handle_oauth_callback() {
    if (!isset($_GET['code']) || !str_contains($_SERVER['REQUEST_URI'], 'taslabs-oauth-callback')) {
        return;
    }
    
    $code = sanitize_text_field($_GET['code']);
    
    // Exchange code for access token
    $token_response = wp_remote_post(TASLABS_OAUTH_URL . '/token', [
        'body' => [
            'grant_type' => 'authorization_code',
            'client_id' => TASLABS_CLIENT_ID,
            'code' => $code,
            'redirect_uri' => TASLABS_REDIRECT_URI
        ]
    ]);
    
    if (is_wp_error($token_response)) {
        wp_die('OAuth error: ' . $token_response->get_error_message());
    }
    
    $token_data = json_decode(wp_remote_retrieve_body($token_response), true);
    
    if (!isset($token_data['access_token'])) {
        wp_die('OAuth error: Invalid token response');
    }
    
    // Get user info
    $user_response = wp_remote_get(TASLABS_OAUTH_URL . '/userinfo', [
        'headers' => [
            'Authorization' => 'Bearer ' . $token_data['access_token']
        ]
    ]);
    
    if (is_wp_error($user_response)) {
        wp_die('OAuth error: ' . $user_response->get_error_message());
    }
    
    $user_data = json_decode(wp_remote_retrieve_body($user_response), true);
    
    // Create or login user
    $user = taslabs_create_or_login_user($user_data);
    
    if ($user) {
        wp_set_current_user($user->ID);
        wp_set_auth_cookie($user->ID);
        wp_redirect(admin_url());
        exit;
    } else {
        wp_die('Failed to create or login user');
    }
}

// Create or login WordPress user
function taslabs_create_or_login_user($oauth_user_data) {
    $email = $oauth_user_data['email'];
    $user_id = $oauth_user_data['id'];
    
    // Check if user exists by email
    $existing_user = get_user_by('email', $email);
    
    if ($existing_user) {
        // Update user meta with Taslabs ID
        update_user_meta($existing_user->ID, 'taslabs_id', $user_id);
        return $existing_user;
    }
    
    // Create new user
    $username = sanitize_user(explode('@', $email)[0]);
    $counter = 1;
    $original_username = $username;
    
    // Ensure unique username
    while (username_exists($username)) {
        $username = $original_username . $counter;
        $counter++;
    }
    
    $user_id_wp = wp_create_user($username, wp_generate_password(), $email);
    
    if (is_wp_error($user_id_wp)) {
        return false;
    }
    
    // Add user meta
    update_user_meta($user_id_wp, 'taslabs_id', $user_id);
    update_user_meta($user_id_wp, 'taslabs_verified', true);
    
    return get_user_by('id', $user_id_wp);
}

// Add Taslabs ID info to user profile
add_action('show_user_profile', 'taslabs_show_profile_fields');
add_action('edit_user_profile', 'taslabs_show_profile_fields');
function taslabs_show_profile_fields($user) {
    $taslabs_id = get_user_meta($user->ID, 'taslabs_id', true);
    $is_verified = get_user_meta($user->ID, 'taslabs_verified', true);
    ?>
    <h3>Taslabs ID Integration</h3>
    <table class="form-table">
        <tr>
            <th><label>Taslabs ID</label></th>
            <td>
                <?php if ($taslabs_id): ?>
                    <code><?php echo esc_html($taslabs_id); ?></code>
                    <?php if ($is_verified): ?>
                        <span style="color: green;">✓ Verified</span>
                    <?php endif; ?>
                <?php else: ?>
                    <em>Not connected to Taslabs ID</em>
                <?php endif; ?>
            </td>
        </tr>
    </table>
    <?php
}

// Add custom CSS for login button
add_action('login_enqueue_scripts', 'taslabs_login_styles');
function taslabs_login_styles() {
    ?>
    <style>
        .taslabs-oauth-btn {
            background: linear-gradient(135deg, #0051c3 0%, #2C7CB0 100%) !important;
            border: none !important;
            border-radius: 6px !important;
            color: white !important;
            font-weight: 600 !important;
            text-shadow: none !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        }
        .taslabs-oauth-btn:hover {
            background: linear-gradient(135deg, #003d91 0%, #1f5a85 100%) !important;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
        }
    </style>
    <?php
}

// Shortcode for OAuth login button (use anywhere: [taslabs_login])
add_shortcode('taslabs_login', 'taslabs_login_shortcode');
function taslabs_login_shortcode($atts) {
    if (is_user_logged_in()) {
        return '<p>You are already logged in.</p>';
    }
    
    $oauth_url = TASLABS_OAUTH_URL . '/authorize?' . http_build_query([
        'client_id' => TASLABS_CLIENT_ID,
        'response_type' => 'code',
        'redirect_uri' => TASLABS_REDIRECT_URI,
        'scope' => 'email'
    ]);
    
    return '<a href="' . esc_url($oauth_url) . '" class="button taslabs-oauth-btn" style="display: inline-block; padding: 12px 24px; text-decoration: none; border-radius: 6px; background: linear-gradient(135deg, #0051c3 0%, #2C7CB0 100%); color: white; font-weight: 600;">🔐 Sign in with Taslabs ID</a>';
}
?>