<?php
/**
 * send.php — contact-form handler for zero2one.sa
 *
 * Plain PHP mail() only, no external service, no dependencies — which is what
 * Hostinger gives us. Posts arrive from the enquiry form on /contact/ (English)
 * and /ar/contact/ (Arabic); both point at this one file.
 *
 * The hardening here follows the handler we already run in production on
 * datarecovery-sa: strict server-side validation, a whitelist for the <select>
 * (a forged option value is rejected, not merely "not empty"), header-injection
 * stripping, a honeypot, and an atomic rate limiter whose state lives outside
 * the document root and fails closed.
 *
 * The $ALLOWED block below is GENERATED from the actual <option> values in
 * contact/index.html and ar/contact/index.html — run tools/build_form.py after
 * editing the form so the whitelist can never drift out of sync with it.
 */
declare(strict_types=1);

/* ----------------------------- configuration ----------------------------- */
$TO_EMAIL     = 'info@zero2one.sa';
$FROM_EMAIL   = 'noreply@zero2one.sa';
$FROM_NAME    = 'ZERO 2 ONE';
$ALLOWED_ORIGINS = ['https://zero2one.sa', 'https://www.zero2one.sa'];
$IP_COOLDOWN_SECONDS = 30;   // one admitted valid attempt per observed IP
$MAIL_RATE_WINDOWS = [       // aggregate budgets protecting the mailbox
    ['seconds' => 60,    'limit' => 5],
    ['seconds' => 3600,  'limit' => 30],
    ['seconds' => 86400, 'limit' => 100],
];
$MAX_POST = 65536;           // hard cap on request body size
const Z2O_RATE_STATE_VERSION = 1;
const Z2O_RATE_STATE_MAX_BYTES = 65536;

/* >>> BEGIN generated whitelist — tools/build_form.py (do not edit by hand) */
$ALLOWED = [
    'service' => [
        'Not sure yet',
        'Website Design and Development',
        'Search Engine Optimization (SEO)',
        'Advertising Campaign Management',
        'Brand Identity Development',
        'Social Media Management and Content Creation',
        'E-commerce and Custom Systems Development',
        'لست متأكداً بعد',
        'تصميم وتطوير المواقع',
        'تحسين محركات البحث (SEO)',
        'إدارة الحملات الإعلانية',
        'تطوير الهوية التجارية',
        'إدارة وسائل التواصل وصناعة المحتوى',
        'تطوير المتاجر والأنظمة المخصّصة',
    ],
];
/* <<< END generated whitelist */

/* ------------------------------- plumbing -------------------------------- */
header_remove('X-Powered-By');
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
header('Cross-Origin-Opener-Policy: same-origin');
header('Cross-Origin-Resource-Policy: same-origin');
header('X-Permitted-Cross-Domain-Policies: none');
header("Content-Security-Policy: default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");

/* English is the site default; Arabic lives under /ar/. */
$LANG = 'en';

function msg(string $en, string $ar): string {
    global $LANG;
    return $LANG === 'ar' ? $ar : $en;
}

/** A JS-disabled browser navigates to send.php directly; give it HTML, not JSON.
 *  Our fetch() asks for application/json; a plain form navigation asks for HTML. */
function client_prefers_html(): bool {
    $accept = strtolower((string) ($_SERVER['HTTP_ACCEPT'] ?? ''));
    return strpos($accept, 'text/html') !== false && strpos($accept, 'application/json') === false;
}

function respond(bool $ok, string $message, int $status = 200): void {
    global $LANG;
    http_response_code($status);
    if (client_prefers_html()) {
        header('Content-Type: text/html; charset=UTF-8');
        header("Content-Security-Policy: default-src 'none'; base-uri 'none'; style-src 'unsafe-inline'; form-action 'none'; frame-ancestors 'none'");
        $ar   = $LANG === 'ar';
        $dir  = $ar ? 'rtl' : 'ltr';
        $home = $ar ? '/ar/contact/' : '/contact/';
        $head = $ok ? ($ar ? 'شكراً لتواصلك' : 'Thank you')
                    : ($ar ? 'حدث خطأ' : 'Something went wrong');
        $back = $ar ? 'العودة إلى الموقع' : 'Back to the site';
        $e = static function (string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); };
        echo '<!DOCTYPE html><html lang="' . $e($LANG) . '" dir="' . $dir . '"><head>'
            . '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            . '<meta name="robots" content="noindex"><title>' . $e($head) . '</title>'
            . '<style>'
            . 'html{background:#1C1D20;color:#fff;font-family:system-ui,-apple-system,sans-serif}'
            . 'body{display:flex;min-height:100vh;margin:0;align-items:center;justify-content:center}'
            . 'main{max-width:34em;padding:2rem;text-align:center}'
            . 'h1{font-size:1.7rem;margin:0 0 .75em}p{line-height:1.6;opacity:.85;margin:0 0 1.75em}'
            . 'a{display:inline-block;padding:.85em 2em;border-radius:2em;background:#F9460E;'
            . 'color:#fff;text-decoration:none;font-weight:600}'
            . '</style></head>'
            . '<body><main><h1>' . $e($head) . '</h1><p>' . $e($message) . '</p>'
            . '<p><a href="' . $e($home) . '">' . $e($back) . '</a></p>'
            . '</main></body></html>';
        exit;
    }
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['success' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

/** Strip anything that could forge extra mail headers. */
function no_header_injection(string $v): string {
    return trim(str_replace(["\r", "\n", "\0", '%0a', '%0d', '%0A', '%0D'], '', $v));
}

/** Drop control characters but keep newlines/tabs (used for the message box). */
function clean_text(string $v): string {
    $v = str_replace("\0", '', $v);
    $out = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v);
    return trim($out === null ? $v : $out);
}

function mb_len(string $v): int {
    if (function_exists('mb_strlen')) return mb_strlen($v, 'UTF-8');
    $count = preg_match_all('/./us', $v, $unused);
    return is_int($count) ? $count : strlen($v);
}

function valid_utf8(string $v): bool {
    return function_exists('mb_check_encoding')
        ? mb_check_encoding($v, 'UTF-8')
        : preg_match('//u', $v) === 1;
}

/** Arabic/Persian numerals -> ASCII, so a phone typed in Arabic still validates. */
function ascii_digits(string $v): string {
    $from = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩','۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
    $to   = ['0','1','2','3','4','5','6','7','8','9','0','1','2','3','4','5','6','7','8','9'];
    return str_replace($from, $to, $v);
}

/** RFC 2047 encoded-word for non-ASCII header values (subject, display name). */
function encode_header(string $v): string {
    if (preg_match('/^[\x20-\x7E]*$/', $v) === 1) return $v;   // pure ASCII
    if (function_exists('mb_encode_mimeheader')) {
        return mb_encode_mimeheader($v, 'UTF-8', 'B', "\r\n");
    }
    return '=?UTF-8?B?' . base64_encode($v) . '?=';
}

/**
 * Display name for From/Reply-To. RFC 5322 requires a display-name containing
 * specials (: @ , < > …) to be a quoted-string, and non-ASCII to be an
 * encoded-word. Getting this wrong yields a malformed header.
 */
function encode_display_name(string $v): string {
    if ($v === '') return '';
    if (preg_match('/^[\x20-\x7E]*$/', $v) === 1) {
        return '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], $v) . '"';
    }
    return encode_header($v);
}

function normalize_origin(string $origin): ?string {
    if ($origin === '' || preg_match('/[\x00-\x20\x7F]/', $origin) === 1) return null;
    $parts = parse_url($origin);
    if (!is_array($parts) || isset($parts['user']) || isset($parts['pass'])
        || isset($parts['query']) || isset($parts['fragment'])
        || (isset($parts['path']) && $parts['path'] !== '' && $parts['path'] !== '/')) return null;
    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    $host = strtolower((string) ($parts['host'] ?? ''));
    if (($scheme !== 'https' && $scheme !== 'http') || $host === '') return null;
    $port = $parts['port'] ?? ($scheme === 'https' ? 443 : 80);
    if (!is_int($port) || $port < 1 || $port > 65535) return null;
    return $scheme . '://' . $host . ':' . $port;
}

function field(array $in, string $key): string {
    return isset($in[$key]) && is_string($in[$key]) ? $in[$key] : '';
}

/* --------------------------- rate-limit storage --------------------------- */
/**
 * State lives outside the public document root. Deployments that cannot write
 * to the parent directory must set Z2O_RATE_STATE_DIR to an absolute private
 * directory shared by every PHP worker for this site.
 */
function rate_state_directory(string $recipient): string {
    $configured = getenv('Z2O_RATE_STATE_DIR');
    if (is_string($configured) && trim($configured) !== '') {
        $configured = rtrim(trim($configured), '/');
        if ($configured === '' || $configured[0] !== '/' || strpos($configured, "\0") !== false) {
            throw new RuntimeException('Invalid rate-limit state directory configuration.');
        }
        return $configured;
    }
    $namespace = substr(hash('sha256', __DIR__ . "\0" . $recipient), 0, 24);
    return dirname(__DIR__) . '/.z2o-rate-' . $namespace;
}

function rate_path_within(string $path, string $root): bool {
    $path = rtrim($path, '/');
    $root = rtrim($root, '/');
    return $path === $root || strpos($path, $root . '/') === 0;
}

/** Reject state paths inside either the application or configured document root. */
function rate_assert_private_location(string $path): void {
    $roots = [realpath(__DIR__)];
    $documentRoot = trim((string) ($_SERVER['DOCUMENT_ROOT'] ?? ''));
    if ($documentRoot !== '') $roots[] = realpath($documentRoot);
    foreach ($roots as $root) {
        if (is_string($root) && $root !== '' && rate_path_within($path, $root)) {
            throw new RuntimeException('Rate-limit state directory must be outside the public document root.');
        }
    }
}

/** Create or verify a private, non-symlink state directory. */
function rate_secure_directory(string $directory): string {
    if (is_link($directory)) {
        throw new RuntimeException('Rate-limit state directory must not be a symlink.');
    }
    $probe = $directory;
    while (!file_exists($probe) && dirname($probe) !== $probe) $probe = dirname($probe);
    $probeReal = realpath($probe);
    if (is_string($probeReal)) rate_assert_private_location($probeReal);

    if (!is_dir($directory)) {
        if (file_exists($directory) || (!@mkdir($directory, 0700, true) && !is_dir($directory))) {
            throw new RuntimeException('Rate-limit state directory is unavailable.');
        }
        @chmod($directory, 0700);
    }
    clearstatcache(true, $directory);
    if (is_link($directory) || !is_dir($directory) || !is_writable($directory)) {
        throw new RuntimeException('Rate-limit state directory is not private and writable.');
    }
    $permissions = @fileperms($directory);
    if ($permissions === false || (($permissions & 0077) !== 0)) {
        throw new RuntimeException('Rate-limit state directory permissions are too broad.');
    }
    $real = realpath($directory);
    if ($real === false) {
        throw new RuntimeException('Rate-limit state directory cannot be resolved.');
    }
    rate_assert_private_location($real);
    return $real;
}

/** Load or atomically create the private HMAC key used for IP fingerprints, so
 *  raw visitor IPs are never written to disk. */
function rate_ip_secret(string $directory): string {
    $secretFile = $directory . '/ip-key.bin';
    if (is_link($secretFile)) {
        throw new RuntimeException('Rate-limit fingerprint key must not be a symlink.');
    }
    if (!file_exists($secretFile)) {
        try {
            $secret = random_bytes(32);
            $temporary = $directory . '/ip-key.' . bin2hex(random_bytes(12)) . '.tmp';
        } catch (Throwable $e) {
            throw new RuntimeException('Rate-limit fingerprint key could not be generated.', 0, $e);
        }
        $handle = @fopen($temporary, 'x+b');
        if ($handle === false) {
            throw new RuntimeException('Rate-limit fingerprint key cannot be created.');
        }
        $closed = false;
        try {
            @chmod($temporary, 0600);
            $offset = 0;
            while ($offset < strlen($secret)) {
                $written = @fwrite($handle, substr($secret, $offset));
                if (!is_int($written) || $written <= 0) {
                    throw new RuntimeException('Rate-limit fingerprint key write failed.');
                }
                $offset += $written;
            }
            if (!@fflush($handle)) {
                throw new RuntimeException('Rate-limit fingerprint key flush failed.');
            }
            @fclose($handle);
            $closed = true;
            if (!@rename($temporary, $secretFile)) {
                throw new RuntimeException('Rate-limit fingerprint key replacement failed.');
            }
            @chmod($secretFile, 0600);
        } finally {
            if (!$closed && is_resource($handle)) @fclose($handle);
            if (is_file($temporary) && !is_link($temporary)) @unlink($temporary);
        }
    }

    clearstatcache(true, $secretFile);
    $permissions = @fileperms($secretFile);
    $size = @filesize($secretFile);
    if (is_link($secretFile) || !is_file($secretFile) || $size !== 32
        || $permissions === false || (($permissions & 0077) !== 0)) {
        throw new RuntimeException('Rate-limit fingerprint key is unsafe.');
    }
    $secret = @file_get_contents($secretFile, false, null, 0, 33);
    if (!is_string($secret) || strlen($secret) !== 32) {
        throw new RuntimeException('Rate-limit fingerprint key cannot be read safely.');
    }
    return $secret;
}

function rate_empty_state(string $namespace): array {
    return ['version' => Z2O_RATE_STATE_VERSION, 'namespace' => $namespace, 'attempts' => [], 'ips' => []];
}

/** Read and strictly validate the bounded on-disk rate state. */
function rate_read_state(string $stateFile, string $namespace): array {
    if (is_link($stateFile)) {
        throw new RuntimeException('Invalid rate-limit state file.');
    }
    if (!file_exists($stateFile)) return rate_empty_state($namespace);
    if (!is_file($stateFile)) {
        throw new RuntimeException('Invalid rate-limit state file.');
    }
    $size = @filesize($stateFile);
    $permissions = @fileperms($stateFile);
    if ($size === false || $size > Z2O_RATE_STATE_MAX_BYTES
        || $permissions === false || (($permissions & 0077) !== 0)) {
        throw new RuntimeException('Rate-limit state file is invalid or oversized.');
    }
    $raw = @file_get_contents($stateFile, false, null, 0, Z2O_RATE_STATE_MAX_BYTES + 1);
    if (!is_string($raw) || strlen($raw) > Z2O_RATE_STATE_MAX_BYTES) {
        throw new RuntimeException('Rate-limit state file cannot be read safely.');
    }
    try {
        $state = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    } catch (Throwable $e) {
        throw new RuntimeException('Rate-limit state file is corrupt.', 0, $e);
    }
    if (!is_array($state)
        || ($state['version'] ?? null) !== Z2O_RATE_STATE_VERSION
        || !hash_equals($namespace, is_string($state['namespace'] ?? null) ? $state['namespace'] : '')
        || !is_array($state['attempts'] ?? null)
        || !is_array($state['ips'] ?? null)
        || count($state['attempts']) > 1000
        || count($state['ips']) > 1000) {
        throw new RuntimeException('Rate-limit state schema is invalid.');
    }
    foreach ($state['attempts'] as $timestamp) {
        if (!is_int($timestamp) || $timestamp < 0) {
            throw new RuntimeException('Rate-limit attempt state is invalid.');
        }
    }
    foreach ($state['ips'] as $key => $timestamp) {
        if (!is_string($key) || preg_match('/^[a-f0-9]{64}$/', $key) !== 1
            || !is_int($timestamp) || $timestamp < 0) {
            throw new RuntimeException('Rate-limit IP state is invalid.');
        }
    }
    return $state;
}

/** Atomically replace the state file while the caller holds the global lock. */
function rate_write_state(string $directory, string $stateFile, array $state): void {
    try {
        $json = json_encode($state, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $suffix = bin2hex(random_bytes(12));
    } catch (Throwable $e) {
        throw new RuntimeException('Rate-limit state could not be encoded.', 0, $e);
    }
    if (!is_string($json) || strlen($json) > Z2O_RATE_STATE_MAX_BYTES) {
        throw new RuntimeException('Rate-limit state exceeds its safety bound.');
    }
    $temporary = $directory . '/state.' . $suffix . '.tmp';
    $handle = @fopen($temporary, 'x+b');
    if ($handle === false) {
        throw new RuntimeException('Rate-limit temporary state file cannot be created.');
    }
    $closed = false;
    try {
        @chmod($temporary, 0600);
        $offset = 0;
        $length = strlen($json);
        while ($offset < $length) {
            $written = @fwrite($handle, substr($json, $offset));
            if (!is_int($written) || $written <= 0) {
                throw new RuntimeException('Rate-limit state write failed.');
            }
            $offset += $written;
        }
        if (!@fflush($handle)) {
            throw new RuntimeException('Rate-limit state flush failed.');
        }
        @fclose($handle);
        $closed = true;
        if (!@rename($temporary, $stateFile)) {
            throw new RuntimeException('Rate-limit state replacement failed.');
        }
        @chmod($stateFile, 0600);
        clearstatcache(true, $stateFile);
        $permissions = @fileperms($stateFile);
        if ($permissions === false || (($permissions & 0077) !== 0) || is_link($stateFile)) {
            throw new RuntimeException('Rate-limit state file permissions are unsafe.');
        }
    } finally {
        if (!$closed && is_resource($handle)) @fclose($handle);
        if (is_file($temporary) && !is_link($temporary)) @unlink($temporary);
    }
}

/**
 * Atomically admit one valid attempt under the per-IP and shared windows.
 * Admission is persisted before mail() and is deliberately not rolled back if
 * the transport fails, so a retry storm cannot bypass the budget.
 */
function rate_limit_admit(string $ip, string $recipient, string $directory,
                          int $now, int $ipCooldown, array $windows): array {
    if ($now < 0 || $ipCooldown < 1 || !$windows) {
        throw new RuntimeException('Rate-limit policy is invalid.');
    }
    $maxWindow = 0;
    foreach ($windows as $window) {
        $seconds = $window['seconds'] ?? null;
        $limit = $window['limit'] ?? null;
        if (!is_int($seconds) || !is_int($limit) || $seconds < 1 || $limit < 1) {
            throw new RuntimeException('Rate-limit window is invalid.');
        }
        $maxWindow = max($maxWindow, $seconds);
    }

    $directory = rate_secure_directory($directory);
    $lockFile = $directory . '/state.lock';
    $stateFile = $directory . '/state.json';
    if (is_link($lockFile)) {
        throw new RuntimeException('Rate-limit lock file must not be a symlink.');
    }
    $lock = @fopen($lockFile, 'c+b');
    if ($lock === false) {
        throw new RuntimeException('Rate-limit lock cannot be opened.');
    }
    @chmod($lockFile, 0600);
    clearstatcache(true, $lockFile);
    $lockPermissions = @fileperms($lockFile);
    if (is_link($lockFile) || $lockPermissions === false || (($lockPermissions & 0077) !== 0)) {
        @fclose($lock);
        throw new RuntimeException('Rate-limit lock permissions are unsafe.');
    }
    if (!@flock($lock, LOCK_EX)) {
        @fclose($lock);
        throw new RuntimeException('Rate-limit lock cannot be acquired.');
    }

    try {
        $ipSecret = rate_ip_secret($directory);
        $namespace = hash_hmac('sha256', $recipient, $ipSecret);
        $state = rate_read_state($stateFile, $namespace);
        $oldestAllowed = $now - $maxWindow;
        $attempts = [];
        foreach ($state['attempts'] as $timestamp) {
            if ($timestamp > $oldestAllowed) $attempts[] = $timestamp;
        }
        sort($attempts, SORT_NUMERIC);

        $ips = [];
        foreach ($state['ips'] as $key => $timestamp) {
            if (($now - $timestamp) < $ipCooldown) $ips[$key] = $timestamp;
        }

        $ipKey = hash_hmac('sha256', $ip, $ipSecret);
        $retryAfter = 0;
        $scope = '';
        if (isset($ips[$ipKey])) {
            $retryAfter = max($retryAfter, $ips[$ipKey] + $ipCooldown - $now);
            $scope = 'ip';
        }
        foreach ($windows as $window) {
            $windowAttempts = [];
            $cutoff = $now - $window['seconds'];
            foreach ($attempts as $timestamp) {
                if ($timestamp > $cutoff) $windowAttempts[] = $timestamp;
            }
            if (count($windowAttempts) >= $window['limit']) {
                $wait = $windowAttempts[0] + $window['seconds'] - $now;
                if ($wait > $retryAfter) {
                    $retryAfter = $wait;
                    $scope = 'global';
                }
            }
        }
        if ($retryAfter > 0) {
            return ['allowed' => false, 'retryAfter' => max(1, $retryAfter), 'scope' => $scope];
        }

        $attempts[] = $now;
        $ips[$ipKey] = $now;
        ksort($ips, SORT_STRING);
        $state['attempts'] = $attempts;
        $state['ips'] = $ips;
        rate_write_state($directory, $stateFile, $state);
        return ['allowed' => true, 'retryAfter' => 0, 'scope' => ''];
    } finally {
        @flock($lock, LOCK_UN);
        @fclose($lock);
    }
}

/* Test harnesses load the real functions without handling HTTP. */
if (defined('Z2O_LIBRARY_ONLY') && Z2O_LIBRARY_ONLY === true) return;

/* --------------------------- request gatekeeping -------------------------- */
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(false, msg('Unsupported request method.', 'طريقة الطلب غير مدعومة.'), 405);
}

/* Browser-side CSRF defence. Non-browser clients that omit these hints still
   face the normal validation, honeypot and atomic rate budgets. */
$fetchSite = strtolower(trim((string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '')));
if ($fetchSite === 'cross-site') {
    respond(false, msg('Cross-site submissions are not allowed.', 'مصدر الطلب غير مسموح.'), 403);
}
$origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
if ($origin !== '') {
    $allowedOrigins = $ALLOWED_ORIGINS;
    $testOrigin = getenv('Z2O_TEST_ALLOWED_ORIGIN');
    if (PHP_SAPI === 'cli-server' && is_string($testOrigin) && $testOrigin !== '') {
        $allowedOrigins[] = $testOrigin;
    }
    $normalizedOrigin = normalize_origin($origin);
    $originAllowed = false;
    if (is_string($normalizedOrigin)) {
        foreach ($allowedOrigins as $allowedOrigin) {
            $normalizedAllowed = normalize_origin($allowedOrigin);
            if (is_string($normalizedAllowed) && hash_equals($normalizedAllowed, $normalizedOrigin)) {
                $originAllowed = true;
                break;
            }
        }
    }
    if (!$originAllowed) {
        respond(false, msg('Cross-origin submissions are not allowed.', 'مصدر الطلب غير مسموح.'), 403);
    }
}

$len = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($len > $MAX_POST) {
    respond(false, msg('Request body is too large.', 'حجم الطلب كبير جدًا.'), 413);
}

$in = $_POST;
if (!$in) {                                     // allow a bounded JSON body too
    $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    $mediaType = trim(explode(';', $contentType, 2)[0]);
    if ($mediaType !== 'application/json') {
        respond(false, msg('Unsupported content type.', 'نوع البيانات غير مدعوم.'), 415);
    }
    $rawResult = @file_get_contents('php://input', false, null, 0, $MAX_POST + 1);
    if (!is_string($rawResult)) {
        respond(false, msg('The request body could not be read.', 'تعذّرت قراءة الطلب.'), 400);
    }
    if (strlen($rawResult) > $MAX_POST) {
        respond(false, msg('Request body is too large.', 'حجم الطلب كبير جدًا.'), 413);
    }
    try {
        $decoded = json_decode($rawResult, true, 16, JSON_THROW_ON_ERROR);
        if (is_array($decoded)) $in = $decoded;
    } catch (Throwable $e) {
        respond(false, msg('Invalid JSON body.', 'صيغة JSON غير صالحة.'), 400);
    }
}
if (!is_array($in) || !$in) {
    respond(false, msg('No data received.', 'لم تصل أي بيانات.'), 400);
}
if (count($in) > 16) {
    respond(false, msg('Too many request fields.', 'عدد الحقول غير صالح.'), 400);
}

/* every value must be valid UTF-8 before we touch it */
foreach ($in as $v) {
    if (!is_string($v)) {
        respond(false, msg('Invalid request field shape.', 'صيغة الحقول غير صالحة.'), 400);
    }
    if (!valid_utf8($v)) {
        respond(false, msg('Invalid character encoding.', 'ترميز البيانات غير صالح.'), 400);
    }
}

$LANG = field($in, 'lang') === 'ar' ? 'ar' : 'en';

/* honeypot — bots fill it, humans never see it. Pretend success, send nothing. */
if (trim(field($in, 'website')) !== '') {
    respond(true, msg('Your enquiry was received.', 'تم استلام طلبك.'));
}

$remoteAddress = trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
$ip = filter_var($remoteAddress, FILTER_VALIDATE_IP) !== false ? $remoteAddress : 'unknown';

/* ------------------------------- validation ------------------------------- */
$errors = [];

$name = no_header_injection(clean_text(field($in, 'name')));
if (mb_len($name) < 2 || mb_len($name) > 100) {
    $errors[] = msg('Name must be between 2 and 100 characters.',
                    'الاسم يجب أن يكون بين 2 و100 حرف.');
}

/* Company is optional — an enquiry from an individual is perfectly normal. */
$company = no_header_injection(clean_text(field($in, 'company')));
if (mb_len($company) > 100) {
    $errors[] = msg('Company name is too long.', 'اسم الشركة طويل جدًا.');
}

$emailRaw = no_header_injection(clean_text(field($in, 'email')));
$email = null;
if ($emailRaw === '') {
    $errors[] = msg('An email address is required.', 'البريد الإلكتروني مطلوب.');
} elseif (strlen($emailRaw) > 254 || !filter_var($emailRaw, FILTER_VALIDATE_EMAIL)) {
    $errors[] = msg('Invalid email address.', 'صيغة البريد الإلكتروني غير صحيحة.');
} else {
    $email = $emailRaw;
}

/**
 * Phone is optional. A Saudi mobile is normalised to +9665XXXXXXXX; we also
 * accept a plain international number, because the agency works across the GCC
 * and rejecting a valid Kuwaiti or Emirati number would lose the enquiry.
 */
$phoneRaw = ascii_digits(clean_text(field($in, 'phone')));
$phone = null;
if ($phoneRaw !== '') {
    $p = preg_replace('/[^\d+]/', '', str_replace([' ', '-', '(', ')', '.'], '', $phoneRaw));
    if (is_string($p)) {
        if (strpos($p, '00') === 0) $p = '+' . substr($p, 2);
        if (preg_match('/^0(5\d{8})$/', $p, $m))            $phone = '+966' . $m[1];
        elseif (preg_match('/^\+?966(5\d{8})$/', $p, $m))    $phone = '+966' . $m[1];
        elseif (preg_match('/^\+(\d{8,15})$/', $p, $m))      $phone = '+' . $m[1];
    }
    if ($phone === null) {
        $errors[] = msg('Invalid phone number. Use 05XXXXXXXX, +9665XXXXXXXX, or +<country code><number>.',
                        'رقم الجوال غير صحيح. استخدم 05XXXXXXXX أو +9665XXXXXXXX أو +<رمز الدولة><الرقم>.');
    }
}

$message = clean_text(field($in, 'message'));
if (mb_len($message) < 10 || mb_len($message) > 5000) {
    $errors[] = msg('Your message must be between 10 and 5000 characters.',
                    'الرسالة يجب أن تكون بين 10 و5000 حرف.');
}

/* strict whitelist — a forged <option> value is rejected, not just "not empty" */
$service = clean_text(field($in, 'service'));
if (!in_array($service, $ALLOWED['service'], true)) {
    $errors[] = msg('Invalid value for field: service.', 'قيمة غير مسموحة في حقل الخدمة.');
    $service = '';
}

if ($errors) {
    respond(false, implode(' ', $errors), 422);
}

/* Every fully valid attempt consumes both budgets before any mail side effect. */
try {
    $rate = rate_limit_admit($ip, $TO_EMAIL, rate_state_directory($TO_EMAIL),
                             time(), $IP_COOLDOWN_SECONDS, $MAIL_RATE_WINDOWS);
} catch (Throwable $e) {
    error_log('Contact-form rate limiter unavailable: ' . $e->getMessage());
    header('Retry-After: 60');
    respond(false, msg('The service is temporarily busy. Please try again shortly, or reach us on WhatsApp.',
                       'الخدمة مشغولة مؤقتًا. الرجاء المحاولة لاحقًا أو التواصل عبر واتساب.'), 503);
}
if (!$rate['allowed']) {
    $wait = (int) $rate['retryAfter'];
    header('Retry-After: ' . $wait);
    respond(false, msg("The safe submission limit was reached. Please try again in {$wait}s.",
                       "تم بلوغ حد الإرسال الآمن. الرجاء المحاولة بعد {$wait} ثانية."), 429);
}

/* --------------------------- compose the email ---------------------------- */
$labels = $LANG === 'ar'
    ? ['name' => 'الاسم', 'company' => 'الشركة', 'email' => 'البريد', 'phone' => 'الجوال',
       'service' => 'الخدمة', 'message' => 'الرسالة', 'meta' => 'بيانات الإرسال',
       'page' => 'لغة الصفحة', 'time' => 'الوقت', 'none' => '(غير مذكور)']
    : ['name' => 'Name', 'company' => 'Company', 'email' => 'Email', 'phone' => 'Phone',
       'service' => 'Service', 'message' => 'Message', 'meta' => 'Submission',
       'page' => 'Page language', 'time' => 'Time', 'none' => '(not provided)'];

$subject = msg('New enquiry', 'طلب جديد') . ' — ' . $service . ' — ' . $name;

try {
    $when = (new DateTime('now', new DateTimeZone('Asia/Riyadh')))->format('Y-m-d H:i');
} catch (Throwable $e) {
    $when = gmdate('Y-m-d H:i') . ' UTC';
}

$lines = [
    $labels['name']    . ': ' . $name,
    $labels['company'] . ': ' . ($company !== '' ? $company : $labels['none']),
    $labels['email']   . ': ' . $email,
    $labels['phone']   . ': ' . ($phone ?? $labels['none']),
    $labels['service'] . ': ' . $service,
    '',
    str_repeat('-', 40),
    $labels['message'] . ':',
    $message,
    str_repeat('-', 40),
    '',
    $labels['meta'] . ':',
    '  ' . $labels['page'] . ': ' . $LANG,
    '  ' . $labels['time'] . ': ' . $when . ' (Asia/Riyadh)',
];
$body = chunk_split(base64_encode(implode("\r\n", $lines)), 76, "\r\n");

$headers = [
    'From: ' . encode_display_name($FROM_NAME) . ' <' . $FROM_EMAIL . '>',
    'Reply-To: ' . encode_display_name($name) . ' <' . $email . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
];

$headerStr = implode("\r\n", $headers);
$encSubject = encode_header($subject);

$sent = @mail($TO_EMAIL, $encSubject, $body, $headerStr, '-f' . $FROM_EMAIL);
if (!$sent) {                                  // some hosts reject the -f switch
    $sent = @mail($TO_EMAIL, $encSubject, $body, $headerStr);
}

if (!$sent) {
    respond(false, msg('The message could not be sent right now. Please reach us on WhatsApp.',
                       'تعذّر إرسال الرسالة حاليًا. الرجاء التواصل عبر واتساب.'), 500);
}

respond(true, msg('Thanks — your enquiry has reached us. We reply the same business day.',
                  'شكراً لك — وصلنا طلبك. نردّ في نفس يوم العمل.'));
