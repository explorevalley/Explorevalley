<?php
/**
 * Plugin Name: Cab Booking Single File Starter
 * Description: Single-file starter implementation for a cab booking workflow with WooCommerce.
 * Version: 1.0.0
 * Author: Local
 * Text Domain: wctm-single-file-starter
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('WCTM_Single_File_Starter')) {
    class WCTM_Single_File_Starter {
        const CAB_CPT = 'wctm_sf_cab';
        const BOOKING_CPT = 'wctm_sf_booking';
        const ENDPOINT = 'cab-bookings';

        public function __construct() {
            add_action('init', [$this, 'register_post_types']);
            add_action('init', [$this, 'register_taxonomies']);
            add_action('add_meta_boxes', [$this, 'add_cab_meta_box']);
            add_action('save_post', [$this, 'save_cab_meta'], 10, 2);

            add_shortcode('wctm-cab-search-form', [$this, 'render_search_shortcode']);
            add_shortcode('wctm-cab-search', [$this, 'render_search_shortcode']);

            add_action('template_redirect', [$this, 'handle_add_to_cart_request']);
            add_filter('woocommerce_add_cart_item_data', [$this, 'add_cart_item_data'], 10, 3);
            add_action('woocommerce_before_calculate_totals', [$this, 'set_cart_item_price'], 20);
            add_filter('woocommerce_get_item_data', [$this, 'display_cart_item_data'], 10, 2);
            add_action('woocommerce_checkout_create_order_line_item', [$this, 'add_order_line_item_meta'], 10, 4);
            add_action('woocommerce_checkout_order_processed', [$this, 'create_booking_posts'], 20, 1);

            add_action('init', [$this, 'add_account_endpoint']);
            add_filter('query_vars', [$this, 'add_account_query_var'], 0);
            add_filter('woocommerce_account_menu_items', [$this, 'add_account_menu_item']);
            add_action('woocommerce_account_' . self::ENDPOINT . '_endpoint', [$this, 'render_account_bookings']);

            add_action('admin_menu', [$this, 'add_tools_page']);
        }

        public static function activate() {
            $instance = new self();
            $instance->register_post_types();
            $instance->register_taxonomies();
            $instance->add_account_endpoint();

            if (!get_page_by_path('cab-search')) {
                wp_insert_post([
                    'post_type' => 'page',
                    'post_status' => 'publish',
                    'post_title' => 'Cab Search',
                    'post_name' => 'cab-search',
                    'post_content' => '[wctm-cab-search-form]',
                ]);
            }

            flush_rewrite_rules();
        }

        public static function deactivate() {
            flush_rewrite_rules();
        }

        public function register_post_types() {
            register_post_type(self::CAB_CPT, [
                'labels' => [
                    'name' => __('Cabs', 'wctm-single-file-starter'),
                    'singular_name' => __('Cab', 'wctm-single-file-starter'),
                ],
                'public' => true,
                'show_in_rest' => true,
                'menu_icon' => 'dashicons-car',
                'supports' => ['title', 'editor', 'thumbnail'],
                'rewrite' => ['slug' => 'cab'],
            ]);

            register_post_type(self::BOOKING_CPT, [
                'labels' => [
                    'name' => __('Cab Bookings', 'wctm-single-file-starter'),
                    'singular_name' => __('Cab Booking', 'wctm-single-file-starter'),
                ],
                'public' => false,
                'publicly_queryable' => false,
                'show_ui' => true,
                'show_in_menu' => 'edit.php?post_type=' . self::CAB_CPT,
                'supports' => ['title'],
                'capability_type' => 'post',
                'map_meta_cap' => true,
            ]);
        }

        public function register_taxonomies() {
            register_taxonomy('wctm_sf_cab_cat', self::CAB_CPT, [
                'label' => __('Cab Categories', 'wctm-single-file-starter'),
                'public' => true,
                'hierarchical' => true,
                'show_in_rest' => true,
                'rewrite' => ['slug' => 'cab-category'],
            ]);
        }

        public function add_cab_meta_box() {
            add_meta_box(
                'wctm_sf_cab_meta',
                __('Cab Settings', 'wctm-single-file-starter'),
                [$this, 'render_cab_meta_box'],
                self::CAB_CPT,
                'normal',
                'high'
            );
        }

        public function render_cab_meta_box($post) {
            wp_nonce_field('wctm_sf_cab_meta_nonce', 'wctm_sf_cab_meta_nonce');
            $cab_no = get_post_meta($post->ID, '_wctm_sf_cab_no', true);
            $from = get_post_meta($post->ID, '_wctm_sf_from', true);
            $to = get_post_meta($post->ID, '_wctm_sf_to', true);
            $price = get_post_meta($post->ID, '_wctm_sf_price', true);
            $seats = get_post_meta($post->ID, '_wctm_sf_total_seats', true);
            echo '<p><label>Cab No</label><br><input type="text" name="wctm_sf_cab_no" value="' . esc_attr($cab_no) . '" class="widefat"></p>';
            echo '<p><label>Pickup</label><br><input type="text" name="wctm_sf_from" value="' . esc_attr($from) . '" class="widefat"></p>';
            echo '<p><label>Drop</label><br><input type="text" name="wctm_sf_to" value="' . esc_attr($to) . '" class="widefat"></p>';
            echo '<p><label>Base Price</label><br><input type="number" min="0" step="0.01" name="wctm_sf_price" value="' . esc_attr($price) . '" class="widefat"></p>';
            echo '<p><label>Total Seats</label><br><input type="number" min="1" step="1" name="wctm_sf_total_seats" value="' . esc_attr($seats ?: 4) . '" class="widefat"></p>';
        }

        public function save_cab_meta($post_id, $post) {
            if ($post->post_type !== self::CAB_CPT) {
                return;
            }
            if (!isset($_POST['wctm_sf_cab_meta_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['wctm_sf_cab_meta_nonce'])), 'wctm_sf_cab_meta_nonce')) {
                return;
            }
            if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
                return;
            }
            if (!current_user_can('edit_post', $post_id)) {
                return;
            }

            update_post_meta($post_id, '_wctm_sf_cab_no', isset($_POST['wctm_sf_cab_no']) ? sanitize_text_field(wp_unslash($_POST['wctm_sf_cab_no'])) : '');
            update_post_meta($post_id, '_wctm_sf_from', isset($_POST['wctm_sf_from']) ? sanitize_text_field(wp_unslash($_POST['wctm_sf_from'])) : '');
            update_post_meta($post_id, '_wctm_sf_to', isset($_POST['wctm_sf_to']) ? sanitize_text_field(wp_unslash($_POST['wctm_sf_to'])) : '');
            update_post_meta($post_id, '_wctm_sf_price', isset($_POST['wctm_sf_price']) ? wc_format_decimal(wp_unslash($_POST['wctm_sf_price'])) : '0');
            update_post_meta($post_id, '_wctm_sf_total_seats', isset($_POST['wctm_sf_total_seats']) ? absint($_POST['wctm_sf_total_seats']) : 4);
        }

        public function render_search_shortcode($atts) {
            $atts = shortcode_atts([
                'search_page' => '',
            ], $atts);

            $from = isset($_GET['wctm_from']) ? sanitize_text_field(wp_unslash($_GET['wctm_from'])) : '';
            $to = isset($_GET['wctm_to']) ? sanitize_text_field(wp_unslash($_GET['wctm_to'])) : '';
            $date = isset($_GET['wctm_date']) ? sanitize_text_field(wp_unslash($_GET['wctm_date'])) : '';

            ob_start();
            ?>
            <form method="get" style="display:grid;gap:12px;max-width:640px;">
                <input type="text" name="wctm_from" placeholder="Pickup location" value="<?php echo esc_attr($from); ?>" required>
                <input type="text" name="wctm_to" placeholder="Drop location" value="<?php echo esc_attr($to); ?>" required>
                <input type="date" name="wctm_date" value="<?php echo esc_attr($date); ?>" required>
                <button type="submit"><?php esc_html_e('Search Cabs', 'wctm-single-file-starter'); ?></button>
            </form>
            <?php

            if ($from && $to && $date) {
                $query = new WP_Query([
                    'post_type' => self::CAB_CPT,
                    'post_status' => 'publish',
                    'posts_per_page' => 20,
                    'meta_query' => [
                        'relation' => 'AND',
                        [
                            'key' => '_wctm_sf_from',
                            'value' => $from,
                            'compare' => 'LIKE',
                        ],
                        [
                            'key' => '_wctm_sf_to',
                            'value' => $to,
                            'compare' => 'LIKE',
                        ],
                    ],
                ]);

                echo '<div style="margin-top:16px;display:grid;gap:12px;">';
                if ($query->have_posts()) {
                    while ($query->have_posts()) {
                        $query->the_post();
                        $cab_id = get_the_ID();
                        $price = (float) get_post_meta($cab_id, '_wctm_sf_price', true);
                        echo '<div style="border:1px solid #ddd;padding:12px;">';
                        echo '<h4>' . esc_html(get_the_title()) . '</h4>';
                        echo '<p>' . esc_html($from) . ' → ' . esc_html($to) . ' | ' . esc_html($date) . '</p>';
                        echo '<p>' . wp_kses_post(wc_price($price)) . '</p>';
                        echo '<form method="post">';
                        wp_nonce_field('wctm_sf_add_to_cart', 'wctm_sf_nonce');
                        echo '<input type="hidden" name="wctm_sf_action" value="add_to_cart">';
                        echo '<input type="hidden" name="wctm_sf_cab_id" value="' . esc_attr($cab_id) . '">';
                        echo '<input type="hidden" name="wctm_sf_from" value="' . esc_attr($from) . '">';
                        echo '<input type="hidden" name="wctm_sf_to" value="' . esc_attr($to) . '">';
                        echo '<input type="hidden" name="wctm_sf_date" value="' . esc_attr($date) . '">';
                        echo '<label>Seats</label> <input type="number" name="wctm_sf_qty" min="1" max="6" value="1" required>';
                        echo ' <button type="submit">' . esc_html__('Book Cab', 'wctm-single-file-starter') . '</button>';
                        echo '</form>';
                        echo '</div>';
                    }
                    wp_reset_postdata();
                } else {
                    echo '<p>' . esc_html__('No cabs found.', 'wctm-single-file-starter') . '</p>';
                }
                echo '</div>';
            }

            return ob_get_clean();
        }

        public function handle_add_to_cart_request() {
            if (!isset($_POST['wctm_sf_action']) || $_POST['wctm_sf_action'] !== 'add_to_cart') {
                return;
            }
            if (!isset($_POST['wctm_sf_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['wctm_sf_nonce'])), 'wctm_sf_add_to_cart')) {
                return;
            }
            if (!function_exists('WC') || !WC()->cart) {
                return;
            }

            $cab_id = isset($_POST['wctm_sf_cab_id']) ? absint($_POST['wctm_sf_cab_id']) : 0;
            $qty = isset($_POST['wctm_sf_qty']) ? max(1, absint($_POST['wctm_sf_qty'])) : 1;
            if (!$cab_id) {
                return;
            }

            WC()->cart->add_to_cart($cab_id, $qty, 0, [], [
                'wctm_sf_cab_id' => $cab_id,
                'wctm_sf_from' => isset($_POST['wctm_sf_from']) ? sanitize_text_field(wp_unslash($_POST['wctm_sf_from'])) : '',
                'wctm_sf_to' => isset($_POST['wctm_sf_to']) ? sanitize_text_field(wp_unslash($_POST['wctm_sf_to'])) : '',
                'wctm_sf_date' => isset($_POST['wctm_sf_date']) ? sanitize_text_field(wp_unslash($_POST['wctm_sf_date'])) : '',
                'wctm_sf_qty' => $qty,
                'unique_key' => md5(wp_json_encode([
                    $cab_id,
                    isset($_POST['wctm_sf_from']) ? sanitize_text_field(wp_unslash($_POST['wctm_sf_from'])) : '',
                    isset($_POST['wctm_sf_to']) ? sanitize_text_field(wp_unslash($_POST['wctm_sf_to'])) : '',
                    isset($_POST['wctm_sf_date']) ? sanitize_text_field(wp_unslash($_POST['wctm_sf_date'])) : '',
                    microtime(true),
                ])),
            ]);

            wp_safe_redirect(wc_get_checkout_url());
            exit;
        }

        public function add_cart_item_data($cart_item_data, $product_id) {
            if (isset($cart_item_data['wctm_sf_cab_id'])) {
                return $cart_item_data;
            }
            return $cart_item_data;
        }

        public function set_cart_item_price($cart) {
            if (is_admin() && !defined('DOING_AJAX')) {
                return;
            }
            foreach ($cart->get_cart() as $cart_item_key => $cart_item) {
                if (empty($cart_item['wctm_sf_cab_id'])) {
                    continue;
                }
                $cab_id = absint($cart_item['wctm_sf_cab_id']);
                $price = (float) get_post_meta($cab_id, '_wctm_sf_price', true);
                if ($price > 0 && isset($cart_item['data']) && is_object($cart_item['data'])) {
                    $cart_item['data']->set_price($price);
                }
            }
        }

        public function display_cart_item_data($item_data, $cart_item) {
            if (empty($cart_item['wctm_sf_cab_id'])) {
                return $item_data;
            }
            $item_data[] = [
                'name' => __('Pickup', 'wctm-single-file-starter'),
                'value' => isset($cart_item['wctm_sf_from']) ? $cart_item['wctm_sf_from'] : '',
            ];
            $item_data[] = [
                'name' => __('Drop', 'wctm-single-file-starter'),
                'value' => isset($cart_item['wctm_sf_to']) ? $cart_item['wctm_sf_to'] : '',
            ];
            $item_data[] = [
                'name' => __('Journey Date', 'wctm-single-file-starter'),
                'value' => isset($cart_item['wctm_sf_date']) ? $cart_item['wctm_sf_date'] : '',
            ];
            return $item_data;
        }

        public function add_order_line_item_meta($item, $cart_item_key, $values, $order) {
            if (empty($values['wctm_sf_cab_id'])) {
                return;
            }
            $item->add_meta_data('_wctm_sf_cab_id', absint($values['wctm_sf_cab_id']), true);
            $item->add_meta_data('_wctm_sf_from', isset($values['wctm_sf_from']) ? sanitize_text_field($values['wctm_sf_from']) : '', true);
            $item->add_meta_data('_wctm_sf_to', isset($values['wctm_sf_to']) ? sanitize_text_field($values['wctm_sf_to']) : '', true);
            $item->add_meta_data('_wctm_sf_date', isset($values['wctm_sf_date']) ? sanitize_text_field($values['wctm_sf_date']) : '', true);
        }

        public function create_booking_posts($order_id) {
            $order = wc_get_order($order_id);
            if (!$order) {
                return;
            }

            foreach ($order->get_items() as $item_id => $item) {
                $cab_id = absint($item->get_meta('_wctm_sf_cab_id', true));
                if (!$cab_id) {
                    continue;
                }

                $booking_id = wp_insert_post([
                    'post_type' => self::BOOKING_CPT,
                    'post_status' => 'publish',
                    'post_title' => 'Booking #' . $order_id . ' - ' . $item_id,
                ]);

                if (!$booking_id || is_wp_error($booking_id)) {
                    continue;
                }

                update_post_meta($booking_id, '_wctm_sf_order_id', $order_id);
                update_post_meta($booking_id, '_wctm_sf_order_item_id', $item_id);
                update_post_meta($booking_id, '_wctm_sf_cab_id', $cab_id);
                update_post_meta($booking_id, '_wctm_sf_user_id', $order->get_user_id());
                update_post_meta($booking_id, '_wctm_sf_from', sanitize_text_field((string) $item->get_meta('_wctm_sf_from', true)));
                update_post_meta($booking_id, '_wctm_sf_to', sanitize_text_field((string) $item->get_meta('_wctm_sf_to', true)));
                update_post_meta($booking_id, '_wctm_sf_date', sanitize_text_field((string) $item->get_meta('_wctm_sf_date', true)));
                update_post_meta($booking_id, '_wctm_sf_qty', (int) $item->get_quantity());
                update_post_meta($booking_id, '_wctm_sf_total', (float) $item->get_total());
            }
        }

        public function add_account_endpoint() {
            add_rewrite_endpoint(self::ENDPOINT, EP_ROOT | EP_PAGES);
        }

        public function add_account_query_var($vars) {
            $vars[] = self::ENDPOINT;
            return $vars;
        }

        public function add_account_menu_item($items) {
            $new_items = [];
            foreach ($items as $key => $label) {
                $new_items[$key] = $label;
                if ($key === 'orders') {
                    $new_items[self::ENDPOINT] = __('Cab Bookings', 'wctm-single-file-starter');
                }
            }
            return $new_items;
        }

        public function render_account_bookings() {
            $user_id = get_current_user_id();
            if (!$user_id) {
                echo '<p>' . esc_html__('Please login first.', 'wctm-single-file-starter') . '</p>';
                return;
            }

            $bookings = get_posts([
                'post_type' => self::BOOKING_CPT,
                'post_status' => 'publish',
                'posts_per_page' => 50,
                'meta_key' => '_wctm_sf_user_id',
                'meta_value' => $user_id,
                'orderby' => 'date',
                'order' => 'DESC',
            ]);

            echo '<h3>' . esc_html__('My Cab Bookings', 'wctm-single-file-starter') . '</h3>';
            if (!$bookings) {
                echo '<p>' . esc_html__('No bookings found.', 'wctm-single-file-starter') . '</p>';
                return;
            }

            echo '<table style="width:100%;border-collapse:collapse;">';
            echo '<thead><tr><th align="left">Order</th><th align="left">Route</th><th align="left">Date</th><th align="left">Seats</th><th align="left">Total</th></tr></thead><tbody>';
            foreach ($bookings as $booking) {
                $order_id = (int) get_post_meta($booking->ID, '_wctm_sf_order_id', true);
                $from = (string) get_post_meta($booking->ID, '_wctm_sf_from', true);
                $to = (string) get_post_meta($booking->ID, '_wctm_sf_to', true);
                $date = (string) get_post_meta($booking->ID, '_wctm_sf_date', true);
                $qty = (int) get_post_meta($booking->ID, '_wctm_sf_qty', true);
                $total = (float) get_post_meta($booking->ID, '_wctm_sf_total', true);
                echo '<tr>';
                echo '<td>#' . esc_html((string) $order_id) . '</td>';
                echo '<td>' . esc_html($from . ' → ' . $to) . '</td>';
                echo '<td>' . esc_html($date) . '</td>';
                echo '<td>' . esc_html((string) $qty) . '</td>';
                echo '<td>' . wp_kses_post(wc_price($total)) . '</td>';
                echo '</tr>';
            }
            echo '</tbody></table>';
        }

        public function add_tools_page() {
            add_submenu_page(
                'edit.php?post_type=' . self::CAB_CPT,
                __('Single File Starter', 'wctm-single-file-starter'),
                __('Starter Info', 'wctm-single-file-starter'),
                'manage_options',
                'wctm-sf-tools',
                [$this, 'render_tools_page']
            );
        }

        public function render_tools_page() {
            echo '<div class="wrap"><h1>' . esc_html__('Single File Starter', 'wctm-single-file-starter') . '</h1>';
            echo '<p>' . esc_html__('Use shortcode: [wctm-cab-search-form].', 'wctm-single-file-starter') . '</p>';
            echo '<p>' . esc_html__('My Account endpoint: /my-account/' . self::ENDPOINT . '/', 'wctm-single-file-starter') . '</p></div>';
        }
    }

    register_activation_hook(__FILE__, ['WCTM_Single_File_Starter', 'activate']);
    register_deactivation_hook(__FILE__, ['WCTM_Single_File_Starter', 'deactivate']);
    new WCTM_Single_File_Starter();
}
