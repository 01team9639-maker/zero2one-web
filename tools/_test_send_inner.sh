#!/bin/sh
# The actual send.php test cases. Invoked by tools/test_send.sh, which decides
# whether to run it directly or inside the php:8.3-cli container — do not run
# this one by hand.
cd "$(dirname "$0")/.." 2>/dev/null || cd /app

STATE=/tmp/z2o-rate-test
PORT=8099
export Z2O_RATE_STATE_DIR="$STATE"
export Z2O_TEST_ALLOWED_ORIGIN="http://127.0.0.1:$PORT"
ORIGIN="-H Origin:http://127.0.0.1:$PORT"

rm -rf "$STATE" /tmp/z2o-mail.out
printf '#!/bin/sh\ncat >> /tmp/z2o-mail.out\nprintf "\\n===EOM===\\n" >> /tmp/z2o-mail.out\n' > /tmp/z2o-catch-mail
chmod +x /tmp/z2o-catch-mail

php -d sendmail_path=/tmp/z2o-catch-mail -S "127.0.0.1:$PORT" -t . >/tmp/z2o-php.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT
sleep 2

PASS=0
FAIL=0
VALID='{"lang":"en","name":"Sara Al-Otaibi","company":"Anaqa Store","email":"buyer@example.com","phone":"0530307054","service":"Search Engine Optimization (SEO)","message":"We need SEO for our Riyadh store, we are invisible on Google."}'

# expect <label> <wanted-status> <body-json> [extra curl args…]
expect() {
    label="$1"; want="$2"; body="$3"; shift 3
    got=$(curl -s -o /tmp/z2o-body -w '%{http_code}' -X POST "http://127.0.0.1:$PORT/send.php" \
        -H 'Content-Type: application/json' -H 'Accept: application/json' \
        "$@" --data "$body")
    if [ "$got" = "$want" ]; then
        PASS=$((PASS + 1)); printf '  ok    %-52s %s\n' "$label" "$got"
    else
        FAIL=$((FAIL + 1)); printf '  FAIL  %-52s got %s, want %s\n' "$label" "$got" "$want"
        sed 's/^/          /' /tmp/z2o-body; echo
    fi
}

fresh() { rm -rf "$STATE"; }

echo "── validation ─────────────────────────────────────────────────────"
fresh; expect "forged <select> value rejected" 422 \
    "$(printf '%s' "$VALID" | sed 's/Search Engine Optimization (SEO)/Free Forever/')" $ORIGIN
fresh; expect "bad phone rejected" 422 \
    "$(printf '%s' "$VALID" | sed 's/0530307054/12345/')" $ORIGIN
fresh; expect "short name + missing phone rejected" 422 \
    '{"lang":"en","name":"A","service":"Not sure yet"}' $ORIGIN
fresh; expect "minimal three-field lead accepted" 200 \
    '{"lang":"en","name":"Sara Al-Otaibi","phone":"0530307054","service":"Not sure yet"}' $ORIGIN
fresh; expect "forged Arabic <select> value rejected" 422 \
    '{"lang":"ar","name":"محمد العتيبي","email":"a@b.com","service":"خدمة غير موجودة","message":"نحتاج تحسين محركات البحث لمتجرنا."}' $ORIGIN
fresh; expect "oversized body rejected" 413 \
    "$(php -r 'echo json_encode(["lang"=>"en","name"=>"A B","email"=>"a@b.com","service"=>"Not sure yet","message"=>str_repeat("x",70000)]);')" $ORIGIN

echo
echo "── bots and CSRF ──────────────────────────────────────────────────"
fresh; expect "honeypot filled -> silent success" 200 \
    "$(printf '%s' "$VALID" | sed 's/"lang":"en"/"lang":"en","website":"http:\/\/spam.example"/')" $ORIGIN
fresh; expect "cross-origin POST blocked" 403 "$VALID" -H 'Origin: https://evil.example'
fresh; expect "Sec-Fetch-Site: cross-site blocked" 403 "$VALID" -H 'Sec-Fetch-Site: cross-site'

printf '  '
got=$(curl -s -o /dev/null -w '%{http_code}' -H 'Accept: application/json' "http://127.0.0.1:$PORT/send.php")
if [ "$got" = "405" ]; then PASS=$((PASS + 1)); printf 'ok    %-52s %s\n' "GET rejected" "$got"
else FAIL=$((FAIL + 1)); printf 'FAIL  %-52s got %s, want 405\n' "GET rejected" "$got"; fi

echo
echo "── rate limiting ──────────────────────────────────────────────────"
fresh; expect "1st valid submission accepted" 200 "$VALID" $ORIGIN
expect "2nd immediate submission rate-limited" 429 "$VALID" $ORIGIN

echo
echo "── no-JS fallback ─────────────────────────────────────────────────"
got=$(curl -s -o /tmp/z2o-body -w '%{http_code}' -X POST "http://127.0.0.1:$PORT/send.php" \
    -H 'Accept: text/html' $ORIGIN --data 'name=A&email=&service=Not+sure+yet&message=short&lang=en')
if [ "$got" = "422" ] && grep -q '<h1>' /tmp/z2o-body; then
    PASS=$((PASS + 1)); printf '  ok    %-52s %s + HTML page\n' "form navigation gets HTML, not JSON" "$got"
else
    FAIL=$((FAIL + 1)); printf '  FAIL  %-52s got %s\n' "form navigation gets HTML, not JSON" "$got"
fi

echo
echo "── composed mail ──────────────────────────────────────────────────"
# start from an empty capture so the assertions below see exactly two messages
rm -f /tmp/z2o-mail.out
fresh
curl -s -o /dev/null -X POST "http://127.0.0.1:$PORT/send.php" \
    -H 'Content-Type: application/json' -H 'Accept: application/json' $ORIGIN \
    --data '{"lang":"en","name":"Bob\r\nBcc: spam@evil.com","email":"buyer@example.com","phone":"0530307054","service":"Not sure yet","message":"Trying to smuggle a Bcc header into the mail."}'
fresh
curl -s -o /dev/null -X POST "http://127.0.0.1:$PORT/send.php" \
    -H 'Content-Type: application/json' -H 'Accept: application/json' $ORIGIN \
    --data '{"lang":"ar","name":"محمد العتيبي","company":"متجر أناقة","email":"buyer@example.com","phone":"+966530307054","service":"تحسين محركات البحث (SEO)","message":"نحتاج تحسين محركات البحث لمتجرنا في الرياض."}'

# Header counts and body contents both need the base64 bodies decoded, so this
# is all done in one PHP pass over the captured messages.
php -r '
$raw = file_get_contents("/tmp/z2o-mail.out");
$msgs = array_values(array_filter(array_map("trim", explode("===EOM===", $raw))));
$checks = [];
$checks["two messages captured"] = [count($msgs), 2];

$bcc = 0; $to = 0; $from = 0;
$decoded = [];
foreach ($msgs as $msg) {
    [$head, $body] = array_pad(preg_split("/\r?\n\r?\n/", $msg, 2), 2, "");
    $bcc  += preg_match_all("/^Bcc:/mi", $head);
    $to   += preg_match_all("/^To:/mi", $head);
    $from += preg_match_all("/^From:/mi", $head);
    preg_match("/^Subject: ((?:.|\n[ \t])*)$/m", $head, $m);
    $decoded[] = [
        "subject" => isset($m[1]) ? mb_decode_mimeheader(preg_replace("/\r?\n[ \t]/", "", $m[1])) : "",
        "body"    => base64_decode(preg_replace("/\s+/", "", $body)),
        "head"    => $head,
    ];
}
$checks["no injected Bcc header"]       = [$bcc, 0];
$checks["exactly one To: per message"]  = [$to, 2];
$checks["exactly one From: per message"] = [$from, 2];

$en = $decoded[0]; $ar = $decoded[1];
$checks["CRLF stripped from display name"] =
    [substr_count($en["head"], "Reply-To: \"BobBcc: spam@evil.com\""), 1];
$checks["Saudi phone normalised to +966"] =
    [(int) str_contains($en["body"], "Phone: +966530307054"), 1];
$checks["Arabic subject round-trips"] =
    [(int) (str_contains($ar["subject"], "طلب جديد") && str_contains($ar["subject"], "تحسين محركات البحث")), 1];
$checks["Arabic body round-trips"] =
    [(int) (str_contains($ar["body"], "متجر أناقة") && str_contains($ar["body"], "لغة الصفحة: ar")), 1];

$fail = 0;
foreach ($checks as $label => [$got, $want]) {
    $ok = $got === $want;
    if (!$ok) $fail++;
    printf("  %s  %-52s %s\n", $ok ? "ok   " : "FAIL ", $label, $ok ? $got : "got $got, want $want");
}
printf("  ----  subject: %s\n", $ar["subject"]);
file_put_contents("/tmp/z2o-mail-checks", (string) (count($checks) - $fail) . " " . (string) $fail);
exit($fail === 0 ? 0 : 1);
' || true
read -r mp mf < /tmp/z2o-mail-checks
PASS=$((PASS + mp))
FAIL=$((FAIL + mf))

check_mail() {
    label="$1"; want="$2"; got="$3"
    if [ "$got" = "$want" ]; then PASS=$((PASS + 1)); printf '  ok    %-52s %s\n' "$label" "$got"
    else FAIL=$((FAIL + 1)); printf '  FAIL  %-52s got %s, want %s\n' "$label" "$got" "$want"; fi
}

echo
echo "── state on disk ──────────────────────────────────────────────────"
perms=$(ls -l "$STATE/state.json" | cut -c1-10)
raw=$(grep -c '127\.0\.0\.1' "$STATE/state.json" 2>/dev/null || true)
check_mail "state.json is 0600"          "-rw-------" "$perms"
check_mail "no raw IP stored (HMAC only)" 0 "$raw"

echo
echo "═══════════════════════════════════════════════════════════════════"
echo "$PASS passed · $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
